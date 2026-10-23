import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Compass, Move, Search, Scan, Crosshair, MapPin, X } from 'lucide-react'
import type { CommuneBbox } from '../../../types/admin/communes'
import {
  GOOGLE_HYBRID_STYLE,
  DEFAULT_MAP_CENTER,
  toLngLatBounds,
  MAP_MAX_ZOOM,
  MAP_DEFAULT_MIN_ZOOM,
  FIT_BOUNDS_COMMUNE,
  FIT_BOUNDS_COMMUNE_INSTANT,
} from '../../../utils/gis-map/mapUtils'

export interface ValidatedBbox {
  min_lng: number
  min_lat: number
  max_lng: number
  max_lat: number
}

export interface CommuneBboxMapProps {
  bbox?: CommuneBbox | null
  communeName?: string
  onChangeBbox?: (bbox: CommuneBbox | null) => void
  readOnly?: boolean
  isCreateMode?: boolean
  height?: string
  initialCenter?: [number, number]
  initialZoom?: number
  resetKey?: number
}

interface CommuneLocationSuggestion {
  name: string
  fullName: string
  lng: number
  lat: number
}

const removeVietnameseTones = (str: string) =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()

type HandleKey = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'

const HANDLE_KEYS: HandleKey[] = ['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w']
const MIN_BBOX_SPAN = 0.0005

export const CommuneBboxMap: React.FC<CommuneBboxMapProps> = ({
  bbox,
  communeName = '',
  onChangeBbox,
  readOnly = false,
  isCreateMode = false,
  height = '420px',
  initialCenter,
  initialZoom = 13.5,
  resetKey = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const isMapLoadedRef = useRef(false)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  // Trạng thái nút tick cho phép di chuyển toàn bộ khung BBox
  const [isMoveBoxEnabled, setIsMoveBoxEnabled] = useState(false)
  const isMoveBoxEnabledRef = useRef(false)
  isMoveBoxEnabledRef.current = isMoveBoxEnabled

  // Trạng thái vẽ 1 khung BBox mới (chỉ cho phép khi chưa có BBox trên bản đồ ở chế độ Thêm mới)
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const isDrawingModeRef = useRef(false)
  isDrawingModeRef.current = isDrawingMode
  const drawStartRef = useRef<{ lng: number; lat: number } | null>(null)

  // Trạng thái thanh Search lọc Xã / Phường / Thị trấn (chỉ hiện ở chế độ Thêm mới)
  const [searchQuery, setSearchQuery] = useState('')
  const [remoteResults, setRemoteResults] = useState<CommuneLocationSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Kiểm soát chỉ tự động fitBounds khi mới nạp BBox lần đầu lúc mở Modal hoặc khi bấm Đặt lại
  const hasInitialFittedRef = useRef(false)
  const isDraggingHandleRef = useRef(false)
  const boxMoveStartRef = useRef<{
    startLng: number
    startLat: number
    initialBbox: ValidatedBbox
  } | null>(null)
  const fitTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearFitTimers = useCallback(() => {
    fitTimersRef.current.forEach((t) => clearTimeout(t))
    fitTimersRef.current = []
  }, [])

  // Markers cho 8 chốt kéo (4 góc + 4 cạnh giữa) và điểm tâm chữ thập
  const handleMarkersRef = useRef<
    Partial<Record<HandleKey, maplibregl.Marker>> & {
      center?: maplibregl.Marker
    }
  >({})

  // Hàm chuẩn hóa tọa độ hỗ trợ cả number lẫn chuỗi có dấu phẩy hoặc chấm
  const parseCoordValue = (val: unknown): number | null => {
    if (typeof val === 'number' && Number.isFinite(val)) return val
    if (typeof val === 'string') {
      const normalized = val.trim().replace(',', '.')
      const num = parseFloat(normalized)
      if (Number.isFinite(num)) return num
    }
    return null
  }

  // Tính toán bounds hợp lệ
  const activeBbox = useMemo<ValidatedBbox | null>(() => {
    if (!bbox) return null
    const min_lng = parseCoordValue(bbox.min_lng)
    const min_lat = parseCoordValue(bbox.min_lat)
    const max_lng = parseCoordValue(bbox.max_lng)
    const max_lat = parseCoordValue(bbox.max_lat)

    if (
      min_lng !== null &&
      min_lat !== null &&
      max_lng !== null &&
      max_lat !== null
    ) {
      return {
        min_lng: Math.min(min_lng, max_lng),
        max_lng: Math.max(min_lng, max_lng),
        min_lat: Math.min(min_lat, max_lat),
        max_lat: Math.max(min_lat, max_lat),
      }
    }
    return null
  }, [bbox])

  // Tính kích thước khung ước lượng theo km (X km × Y km)
  const bboxDimensionText = useMemo(() => {
    if (!activeBbox) return ''
    const deltaLng = Math.abs(activeBbox.max_lng - activeBbox.min_lng)
    const deltaLat = Math.abs(activeBbox.max_lat - activeBbox.min_lat)
    // 1 độ vĩ ~ 111.32 km, 1 độ kinh tại vĩ độ ~11° ~ 109.2 km
    const widthKm = (deltaLng * 109.2).toFixed(2)
    const heightKm = (deltaLat * 111.32).toFixed(2)
    return `${widthKm} km × ${heightKm} km`
  }, [activeBbox])

  // Refs luôn giữ giá trị mới nhất để tránh hoàn toàn lỗi Stale Closure trong MapLibre callbacks & timers
  const activeBboxRef = useRef<ValidatedBbox | null>(activeBbox)
  activeBboxRef.current = activeBbox

  const onChangeBboxRef = useRef(onChangeBbox)
  onChangeBboxRef.current = onChangeBbox

  const communeNameRef = useRef(communeName)
  communeNameRef.current = communeName

  const readOnlyRef = useRef(readOnly)
  readOnlyRef.current = readOnly

  // Cập nhật Polygon Layer trên MapLibre (Khung BBox Toàn Địa Bàn)
  const updateBboxLayer = useCallback((targetBbox: ValidatedBbox | null) => {
    const map = mapRef.current
    if (!map || !isMapLoadedRef.current) return

    const source = map.getSource('commune-bbox-source') as maplibregl.GeoJSONSource | undefined
    if (!source) return

    if (!targetBbox) {
      source.setData({ type: 'FeatureCollection', features: [] })
      return
    }

    const { min_lng, min_lat, max_lng, max_lat } = targetBbox

    source.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: communeNameRef.current },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [min_lng, max_lat],
                [max_lng, max_lat],
                [max_lng, min_lat],
                [min_lng, min_lat],
                [min_lng, max_lat],
              ],
            ],
          },
        },
      ],
    })
  }, [])

  // Tạo phần tử Handle kéo (4 góc vuông + 4 cạnh giữa mang nhãn Bắc - Nam - Tây - Đông)
  const createHandleElement = (key: HandleKey) => {
    const wrapper = document.createElement('div')
    wrapper.className = `bbox-handle-wrapper bbox-handle-${key}`
    wrapper.style.zIndex = '50'

    const inner = document.createElement('div')
    const isCorner = key === 'nw' || key === 'ne' || key === 'se' || key === 'sw'

    if (isCorner) {
      inner.style.width = '16px'
      inner.style.height = '16px'
      inner.style.borderRadius = '4px'
    } else {
      const edgeLabelMap: Record<'n' | 's' | 'e' | 'w', string> = {
        n: 'Bắc',
        s: 'Nam',
        w: 'Tây',
        e: 'Đông',
      }
      inner.textContent = edgeLabelMap[key]
      inner.style.padding = '2px 8px'
      inner.style.borderRadius = '999px'
      inner.style.color = '#ffffff'
      inner.style.fontSize = '10.5px'
      inner.style.fontWeight = '800'
      inner.style.lineHeight = '1.25'
      inner.style.letterSpacing = '0.02em'
      inner.style.whiteSpace = 'nowrap'
      inner.style.userSelect = 'none'
      inner.style.display = 'flex'
      inner.style.alignItems = 'center'
      inner.style.justifyContent = 'center'
    }

    inner.style.backgroundColor = '#1d4ed8'
    inner.style.border = '2px solid #ffffff'
    inner.style.boxShadow = '0 2px 8px rgba(0,0,0,0.6)'
    inner.style.transition = 'transform 0.12s ease, background-color 0.12s ease'

    const cursorMap: Record<HandleKey, string> = {
      nw: 'nwse-resize',
      se: 'nwse-resize',
      ne: 'nesw-resize',
      sw: 'nesw-resize',
      n: 'ns-resize',
      s: 'ns-resize',
      e: 'ew-resize',
      w: 'ew-resize',
    }
    const titleMap: Record<HandleKey, string> = {
      nw: 'Kéo góc Tây-Bắc (NW)',
      ne: 'Kéo góc Đông-Bắc (NE)',
      se: 'Kéo góc Đông-Nam (SE)',
      sw: 'Kéo góc Tây-Nam (SW)',
      n: 'Kéo cạnh Bắc (max_lat)',
      s: 'Kéo cạnh Nam (min_lat)',
      e: 'Kéo cạnh Đông (max_lng)',
      w: 'Kéo cạnh Tây (min_lng)',
    }

    wrapper.style.cursor = cursorMap[key]
    wrapper.title = titleMap[key]

    wrapper.onmouseenter = () => {
      inner.style.transform = 'scale(1.18)'
      inner.style.backgroundColor = '#2563eb'
    }
    wrapper.onmouseleave = () => {
      inner.style.transform = 'scale(1)'
      inner.style.backgroundColor = '#1d4ed8'
    }

    wrapper.appendChild(inner)
    return wrapper
  }

  // Biểu tượng Chữ Thập (Crosshair ✛) CỐ ĐỊNH tại Tâm địa bàn
  const createCenterCrosshairElement = () => {
    const el = document.createElement('div')
    el.className = 'center-crosshair-marker'
    el.style.width = '24px'
    el.style.height = '24px'
    el.style.display = 'flex'
    el.style.alignItems = 'center'
    el.style.justifyContent = 'center'
    el.style.pointerEvents = 'none'
    el.style.userSelect = 'none'
    el.title = 'Tâm địa bàn (Center)'

    el.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5))">
        <circle cx="12" cy="12" r="3" stroke="#2563eb" stroke-width="1.8" fill="#ffffff" />
        <line x1="12" y1="2" x2="12" y2="7.5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
        <line x1="12" y1="2" x2="12" y2="7.5" stroke="#2563eb" stroke-width="1.6" stroke-linecap="round" />
        <line x1="12" y1="16.5" x2="12" y2="22" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
        <line x1="12" y1="16.5" x2="12" y2="22" stroke="#2563eb" stroke-width="1.6" stroke-linecap="round" />
        <line x1="2" y1="12" x2="7.5" y2="12" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
        <line x1="2" y1="12" x2="7.5" y2="12" stroke="#2563eb" stroke-width="1.6" stroke-linecap="round" />
        <line x1="16.5" y1="12" x2="22" y2="12" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
        <line x1="16.5" y1="12" x2="22" y2="12" stroke="#2563eb" stroke-width="1.6" stroke-linecap="round" />
      </svg>
    `
    return el
  }

  // Tính tọa độ [lng, lat] cho từng chốt dựa trên BBox
  const getHandlePositions = (b: ValidatedBbox): Record<HandleKey, [number, number]> => {
    const centerLng = Number(((b.min_lng + b.max_lng) / 2).toFixed(6))
    const centerLat = Number(((b.min_lat + b.max_lat) / 2).toFixed(6))
    return {
      nw: [b.min_lng, b.max_lat],
      ne: [b.max_lng, b.max_lat],
      se: [b.max_lng, b.min_lat],
      sw: [b.min_lng, b.min_lat],
      n: [centerLng, b.max_lat],
      s: [centerLng, b.min_lat],
      e: [b.max_lng, centerLat],
      w: [b.min_lng, centerLat],
    }
  }

  // Đồng bộ vị trí tất cả Markers mà KHÔNG xóa DOM khi đang kéo
  const syncMarkers = useCallback((targetBbox: ValidatedBbox | null) => {
    const map = mapRef.current
    if (!map || !isMapLoadedRef.current) return

    if (!targetBbox) {
      Object.values(handleMarkersRef.current).forEach((m) => m?.remove())
      handleMarkersRef.current = {}
      return
    }

    const { min_lng, min_lat, max_lng, max_lat } = targetBbox
    const centerLng = Number(((min_lng + max_lng) / 2).toFixed(6))
    const centerLat = Number(((min_lat + max_lat) / 2).toFixed(6))

    // 1. Chữ thập tâm địa bàn
    if (!handleMarkersRef.current.center) {
      const crosshairEl = createCenterCrosshairElement()
      handleMarkersRef.current.center = new maplibregl.Marker({
        element: crosshairEl,
        anchor: 'center',
        draggable: false,
      })
        .setLngLat([centerLng, centerLat])
        .addTo(map)
    } else {
      handleMarkersRef.current.center.setLngLat([centerLng, centerLat])
    }

    // 2. Nếu readOnly thì ẩn các chốt kéo
    if (readOnlyRef.current) {
      HANDLE_KEYS.forEach((k) => {
        if (handleMarkersRef.current[k]) {
          handleMarkersRef.current[k]?.remove()
          delete handleMarkersRef.current[k]
        }
      })
      return
    }

    // 3. Khởi tạo (nếu chưa có) hoặc cập nhật tọa độ 8 chốt kéo (4 góc + 4 cạnh giữa)
    const positions = getHandlePositions(targetBbox)

    HANDLE_KEYS.forEach((key) => {
      const existing = handleMarkersRef.current[key]
      if (existing) {
        existing.setLngLat(positions[key])
        return
      }

      const el = createHandleElement(key)
      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
        draggable: true,
      })
        .setLngLat(positions[key])
        .addTo(map)

      marker.on('dragstart', () => {
        isDraggingHandleRef.current = true
        clearFitTimers()
      })

      marker.on('drag', () => {
        const cur = activeBboxRef.current
        if (!cur) return

        const p = marker.getLngLat()
        const lng = Number(p.lng.toFixed(6))
        const lat = Number(p.lat.toFixed(6))

        let nextMinLng = cur.min_lng
        let nextMaxLng = cur.max_lng
        let nextMinLat = cur.min_lat
        let nextMaxLat = cur.max_lat

        if (key === 'nw' || key === 'sw' || key === 'w') {
          nextMinLng = Math.min(lng, Number((cur.max_lng - MIN_BBOX_SPAN).toFixed(6)))
        }
        if (key === 'ne' || key === 'se' || key === 'e') {
          nextMaxLng = Math.max(lng, Number((cur.min_lng + MIN_BBOX_SPAN).toFixed(6)))
        }
        if (key === 'nw' || key === 'ne' || key === 'n') {
          nextMaxLat = Math.max(lat, Number((cur.min_lat + MIN_BBOX_SPAN).toFixed(6)))
        }
        if (key === 'sw' || key === 'se' || key === 's') {
          nextMinLat = Math.min(lat, Number((cur.max_lat - MIN_BBOX_SPAN).toFixed(6)))
        }

        const nextBbox: ValidatedBbox = {
          min_lng: nextMinLng,
          max_lng: nextMaxLng,
          min_lat: nextMinLat,
          max_lat: nextMaxLat,
        }

        activeBboxRef.current = nextBbox
        updateBboxLayer(nextBbox)

        // Cập nhật vị trí tất cả chốt và chữ thập tâm mượt mà theo khung mới
        const nextPositions = getHandlePositions(nextBbox)
        HANDLE_KEYS.forEach((k) => {
          handleMarkersRef.current[k]?.setLngLat(nextPositions[k])
        })
        handleMarkersRef.current.center?.setLngLat([
          Number(((nextBbox.min_lng + nextBbox.max_lng) / 2).toFixed(6)),
          Number(((nextBbox.min_lat + nextBbox.max_lat) / 2).toFixed(6)),
        ])

        onChangeBboxRef.current?.(nextBbox)
      })

      marker.on('dragend', () => {
        isDraggingHandleRef.current = false
        if (activeBboxRef.current) {
          const finalPositions = getHandlePositions(activeBboxRef.current)
          HANDLE_KEYS.forEach((k) => {
            handleMarkersRef.current[k]?.setLngLat(finalPositions[k])
          })
        }
      })

      handleMarkersRef.current[key] = marker
    })
  }, [updateBboxLayer])

  // Hàm căn chỉnh camera vào khung BBox (hỗ trợ cả chế độ Detail khóa biên và chế độ Edit mở tự do)
  const applyCameraFit = useCallback((targetBbox: ValidatedBbox, instant: boolean) => {
    const map = mapRef.current
    if (!map || !isMapLoadedRef.current) return

    const bounds = toLngLatBounds(targetBbox)
    if (!bounds) return

    // Mở khóa tạm thời trước khi fitBounds để không bị giới hạn cũ cản trở
    map.setMinZoom(MAP_DEFAULT_MIN_ZOOM)
    map.setMaxZoom(MAP_MAX_ZOOM)
    map.setMaxBounds(null)

    map.fitBounds(bounds, instant ? FIT_BOUNDS_COMMUNE_INSTANT : FIT_BOUNDS_COMMUNE)

    // Chỉ khóa cứng minZoom và maxBounds khi ở chế độ Xem chi tiết (readOnly = true)
    if (readOnlyRef.current) {
      const camera = map.cameraForBounds(bounds, { padding: 40 })
      if (typeof camera?.zoom === 'number' && Number.isFinite(camera.zoom)) {
        map.setMinZoom(camera.zoom)
      }
      const deltaLng = (targetBbox.max_lng - targetBbox.min_lng) * 0.25
      const deltaLat = (targetBbox.max_lat - targetBbox.min_lat) * 0.25
      map.setMaxBounds([
        [targetBbox.min_lng - deltaLng, targetBbox.min_lat - deltaLat],
        [targetBbox.max_lng + deltaLng, targetBbox.max_lat + deltaLat],
      ])
    }
  }, [])

  // Tìm kiếm địa danh cấp Xã / Phường / Thị trấn từ OpenStreetMap Nominatim Việt Nam
  const handleSearchCommuneInput = (value: string) => {
    setSearchQuery(value)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    const trimmed = value.trim()
    if (trimmed.length < 2) {
      setRemoteResults([])
      setIsSearching(false)
      setIsSearchOpen(false)
      return
    }

    setIsSearchOpen(true)
    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&featureType=settlement&countrycodes=vn&dedupe=1&limit=20&q=${encodeURIComponent(trimmed)}`
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'vi' },
        })
        if (!res.ok) {
          setIsSearching(false)
          return
        }
        const data = await res.json()
        if (Array.isArray(data)) {
          const validClasses = new Set(['boundary', 'place'])
          const validAdminTypes = new Set([
            'suburb',
            'village',
            'town',
            'quarter',
            'commune',
            'municipality',
            'administrative',
            'neighbourhood',
          ])
          const excludedPoiPattern =
            /\b(uy ban|ubnd|tru so|dang uy|hdnd|hoi dong nhan dan|mttq|cong an|tram y te|benh vien|truong|cho|nha van hoa|buu dien|chua|nha tho|dinh|duong|hem|ngo|cau|khu cong nghiep|cong ty|chi nhanh|cua hang|khach san|ngan hang|so nha)\b/i

          const seenKeys = new Set<string>()
          const filtered: CommuneLocationSuggestion[] = []

          for (const rawItem of data) {
            const item = rawItem as Record<string, unknown>
            const itemClass = String(item.class || item.category || '').toLowerCase()
            const addrType = String(item.addresstype || item.type || '').toLowerCase()

            // Chỉ nhận đơn vị ranh giới hành chính hoặc điểm dân cư cấp hành chính, loại bỏ mọi POI/tòa nhà/cơ quan
            if (!validClasses.has(itemClass) || !validAdminTypes.has(addrType)) {
              continue
            }

            const displayName = String(item.display_name || '')
            const rawParts = displayName
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean)

            const firstPart = String(item.name || rawParts[0] || '').trim()
            if (!firstPart) continue

            const normalizedFirst = removeVietnameseTones(firstPart)
            // Loại bỏ tuyệt đối các vị trí cụ thể (UBND, Trụ sở, Đảng ủy, Trường học, Đường...)
            if (excludedPoiPattern.test(normalizedFirst)) {
              continue
            }

            // Loại bỏ các cấp Tỉnh / Thành phố / Quận / Huyện nếu tên không phải cấp Xã / Phường / Thị trấn
            if (
              /^(tinh|thanh pho|quan|huyen|thi xa)\b/i.test(normalizedFirst) &&
              !/^(xa|phuong|thi tran)\b/i.test(normalizedFirst)
            ) {
              continue
            }

            // Làm sạch chuỗi địa chỉ hành chính: bỏ mã bưu chính (5-6 số), số nhà lẻ, tên quốc gia và các phần tử trùng lặp
            const cleanAdminParts: string[] = []
            for (const part of rawParts) {
              const normPart = removeVietnameseTones(part)
              if (/^\d{4,6}$/.test(part)) continue
              if (/^\d+[a-z]?(\/\d+)*$/i.test(part)) continue
              if (normPart === 'viet nam' || normPart === 'vietnam') continue
              if (excludedPoiPattern.test(normPart)) continue
              if (
                cleanAdminParts.length === 0 ||
                removeVietnameseTones(cleanAdminParts[cleanAdminParts.length - 1]) !== normPart
              ) {
                cleanAdminParts.push(part)
              }
            }

            const cleanName = cleanAdminParts[0] || firstPart
            const cleanFullName =
              cleanAdminParts.length > 0 ? cleanAdminParts.join(', ') : cleanName

            const lng = parseFloat(String(item.lon))
            const lat = parseFloat(String(item.lat))
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue

            const dedupeKey = removeVietnameseTones(cleanFullName)
            if (seenKeys.has(dedupeKey)) continue
            seenKeys.add(dedupeKey)

            filtered.push({
              name: cleanName,
              fullName: cleanFullName,
              lng,
              lat,
            })

            if (filtered.length >= 8) break
          }

          setRemoteResults(filtered)
        }
      } catch {
        setRemoteResults([])
      } finally {
        setIsSearching(false)
      }
    }, 350)
  }

  // Khi chọn 1 xã/phường từ thanh Search: chỉ di chuyển camera bản đồ tới địa điểm đó (không tự vẽ BBox)
  const handleSelectSearchSuggestion = (item: CommuneLocationSuggestion) => {
    setSearchQuery(item.name)
    setIsSearchOpen(false)
    if (mapRef.current && isMapLoadedRef.current) {
      mapRef.current.flyTo({
        center: [item.lng, item.lat],
        zoom: 13.5,
        duration: 650,
      })
    }
  }

  // Khởi tạo bản đồ MapLibre
  useEffect(() => {
    if (!containerRef.current) return

    let defaultCenter: [number, number] = initialCenter || DEFAULT_MAP_CENTER
    const initialBbox = activeBboxRef.current
    const initialBounds = initialBbox ? toLngLatBounds(initialBbox) : null

    if (initialBbox) {
      defaultCenter = [
        (initialBbox.min_lng + initialBbox.max_lng) / 2,
        (initialBbox.min_lat + initialBbox.max_lat) / 2,
      ]
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: GOOGLE_HYBRID_STYLE,
      ...(initialBounds
        ? {
            bounds: initialBounds,
            fitBoundsOptions: { padding: 40, maxZoom: MAP_MAX_ZOOM },
          }
        : {
            center: defaultCenter,
            zoom: initialZoom,
          }),
      maxZoom: MAP_MAX_ZOOM,
      minZoom: MAP_DEFAULT_MIN_ZOOM,
      attributionControl: false,
    })

    mapRef.current = map

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')

    map.on('load', () => {
      isMapLoadedRef.current = true

      if (!map.getSource('commune-bbox-source')) {
        map.addSource('commune-bbox-source', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        })

        map.addLayer({
          id: 'commune-bbox-fill',
          type: 'fill',
          source: 'commune-bbox-source',
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.16,
          },
        })

        map.addLayer({
          id: 'commune-bbox-line',
          type: 'line',
          source: 'commune-bbox-source',
          paint: {
            'line-color': '#2563eb',
            'line-width': 2.5,
            'line-dasharray': [3, 2],
          },
        })
      }

      // Kích hoạt state để đồng bộ với BBox từ useState ở component cha
      setIsMapLoaded(true)
    })

    // Chức năng vẽ 1 khung BBox mới (khi chưa có BBox) hoặc kéo di chuyển toàn bộ khung BBox (khi đã tick "Di chuyển khung")
    const isPointInsideBbox = (lng: number, lat: number, b: ValidatedBbox) =>
      lng >= b.min_lng && lng <= b.max_lng && lat >= b.min_lat && lat <= b.max_lat

    map.on('mousedown', (e) => {
      if (readOnlyRef.current || isDraggingHandleRef.current) return

      // 1. Chế độ kéo chuột vẽ 1 khung BBox mới (chỉ cho phép khi chưa có khung BBox nào trên bản đồ)
      if (isDrawingModeRef.current && !activeBboxRef.current) {
        e.preventDefault()
        map.dragPan.disable()
        isDraggingHandleRef.current = true
        hasInitialFittedRef.current = true
        clearFitTimers()
        drawStartRef.current = {
          lng: e.lngLat.lng,
          lat: e.lngLat.lat,
        }
        map.getCanvas().style.cursor = 'crosshair'
        return
      }

      // 2. Chế độ kéo di chuyển toàn bộ khung BBox (khi đã tick "Di chuyển khung")
      if (!isMoveBoxEnabledRef.current) return
      const cur = activeBboxRef.current
      if (!cur) return

      if (isPointInsideBbox(e.lngLat.lng, e.lngLat.lat, cur)) {
        e.preventDefault()
        map.dragPan.disable()
        isDraggingHandleRef.current = true
        clearFitTimers()
        boxMoveStartRef.current = {
          startLng: e.lngLat.lng,
          startLat: e.lngLat.lat,
          initialBbox: { ...cur },
        }
        map.getCanvas().style.cursor = 'grabbing'
      }
    })

    map.on('mousemove', (e) => {
      // 1. Đang kéo chuột vẽ khung BBox đầu tiên
      const drawStart = drawStartRef.current
      if (drawStart) {
        const minLng = Number(Math.min(drawStart.lng, e.lngLat.lng).toFixed(6))
        const maxLng = Number(Math.max(drawStart.lng, e.lngLat.lng).toFixed(6))
        const minLat = Number(Math.min(drawStart.lat, e.lngLat.lat).toFixed(6))
        const maxLat = Number(Math.max(drawStart.lat, e.lngLat.lat).toFixed(6))

        if (maxLng - minLng >= MIN_BBOX_SPAN && maxLat - minLat >= MIN_BBOX_SPAN) {
          const drawnBbox: ValidatedBbox = {
            min_lng: minLng,
            max_lng: maxLng,
            min_lat: minLat,
            max_lat: maxLat,
          }
          activeBboxRef.current = drawnBbox
          updateBboxLayer(drawnBbox)
          syncMarkers(drawnBbox)
          onChangeBboxRef.current?.(drawnBbox)
        }
        return
      }

      // 2. Đang kéo di chuyển toàn bộ khung BBox
      const moveState = boxMoveStartRef.current
      if (moveState) {
        const dLng = e.lngLat.lng - moveState.startLng
        const dLat = e.lngLat.lat - moveState.startLat
        const init = moveState.initialBbox

        const nextBbox: ValidatedBbox = {
          min_lng: Number((init.min_lng + dLng).toFixed(6)),
          max_lng: Number((init.max_lng + dLng).toFixed(6)),
          min_lat: Number((init.min_lat + dLat).toFixed(6)),
          max_lat: Number((init.max_lat + dLat).toFixed(6)),
        }

        activeBboxRef.current = nextBbox
        updateBboxLayer(nextBbox)

        const nextPositions = getHandlePositions(nextBbox)
        HANDLE_KEYS.forEach((k) => {
          handleMarkersRef.current[k]?.setLngLat(nextPositions[k])
        })
        handleMarkersRef.current.center?.setLngLat([
          Number(((nextBbox.min_lng + nextBbox.max_lng) / 2).toFixed(6)),
          Number(((nextBbox.min_lat + nextBbox.max_lat) / 2).toFixed(6)),
        ])

        onChangeBboxRef.current?.(nextBbox)
        return
      }

      // 3. Đổi con trỏ chuột theo trạng thái
      if (!readOnlyRef.current && isDrawingModeRef.current && !activeBboxRef.current) {
        map.getCanvas().style.cursor = 'crosshair'
      } else if (!readOnlyRef.current && isMoveBoxEnabledRef.current && activeBboxRef.current) {
        if (isPointInsideBbox(e.lngLat.lng, e.lngLat.lat, activeBboxRef.current)) {
          map.getCanvas().style.cursor = 'move'
        } else {
          map.getCanvas().style.cursor = ''
        }
      } else {
        map.getCanvas().style.cursor = ''
      }
    })

    const finishBoxMove = () => {
      if (drawStartRef.current) {
        drawStartRef.current = null
        isDraggingHandleRef.current = false
        map.dragPan.enable()
        // Nếu đã vẽ thành công 1 khung BBox thì tắt chế độ vẽ ngay để khóa không cho vẽ cái thứ 2
        if (activeBboxRef.current) {
          isDrawingModeRef.current = false
          setIsDrawingMode(false)
          map.getCanvas().style.cursor = ''
        }
      }
      if (boxMoveStartRef.current) {
        boxMoveStartRef.current = null
        isDraggingHandleRef.current = false
        map.dragPan.enable()
        map.getCanvas().style.cursor = isMoveBoxEnabledRef.current ? 'move' : ''
      }
    }

    map.on('mouseup', finishBoxMove)
    window.addEventListener('mouseup', finishBoxMove)

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize()
      }
    })
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      window.removeEventListener('mouseup', finishBoxMove)
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
      clearFitTimers()
      resizeObserver.disconnect()
      Object.values(handleMarkersRef.current).forEach((m) => m?.remove())
      handleMarkersRef.current = {}
      isMapLoadedRef.current = false
      hasInitialFittedRef.current = false
      isDraggingHandleRef.current = false
      boxMoveStartRef.current = null
      drawStartRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [clearFitTimers, updateBboxLayer, syncMarkers])

  // Khi đã có khung BBox (activeBbox !== null) và không còn đang giữ chuột vẽ, tự động tắt chế độ vẽ để khóa vẽ cái thứ 2
  useEffect(() => {
    if (activeBbox && !drawStartRef.current && isDrawingMode) {
      setIsDrawingMode(false)
      if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = ''
      }
    }
  }, [activeBbox, isDrawingMode])

  // Khi người dùng tắt nút tick "Di chuyển khung", đảm bảo trả lại cursor mặc định và bật lại dragPan
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!isMoveBoxEnabled) {
      boxMoveStartRef.current = null
      isDraggingHandleRef.current = false
      map.dragPan.enable()
      if (!isDrawingModeRef.current) {
        map.getCanvas().style.cursor = ''
      }
    }
  }, [isMoveBoxEnabled])

  // Khi người dùng bấm nút "Đặt lại" (resetKey tăng), căn chỉnh lại camera về khung BBox gốc (hoặc tắt di chuyển khi xóa khung)
  useEffect(() => {
    if (resetKey > 0 && isMapLoaded) {
      if (activeBboxRef.current) {
        applyCameraFit(activeBboxRef.current, false)
      } else {
        setIsMoveBoxEnabled(false)
        setIsDrawingMode(false)
      }
    }
  }, [resetKey, isMapLoaded, applyCameraFit])

  // Đồng bộ hình vẽ BBox, 8 chốt kéo và tự động fitBounds chuẩn xác ngay khi cả Map và BBox từ useState sẵn sàng
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return

    // Luôn vẽ khung Polygon và cập nhật vị trí các chốt
    updateBboxLayer(activeBbox)
    syncMarkers(activeBbox)

    if (!activeBbox) {
      hasInitialFittedRef.current = false
      return
    }

    // Nếu ở chế độ readOnly (Detail) hoặc lần đầu tiên nhận được BBox trong chế độ Edit: thực hiện fitBounds tức thì (duration: 0)
    if (readOnly || !hasInitialFittedRef.current) {
      hasInitialFittedRef.current = true
      clearFitTimers()
      applyCameraFit(activeBbox, true)

      // Chuẩn hóa lại khung nhìn sau khi hiệu ứng mở Modal hoàn tất (chỉ chạy nếu người dùng chưa chạm kéo chốt)
      const timer1 = setTimeout(() => {
        if (mapRef.current && !isDraggingHandleRef.current && activeBboxRef.current) {
          mapRef.current.resize()
          applyCameraFit(activeBboxRef.current, true)
        }
      }, 150)

      const timer2 = setTimeout(() => {
        if (mapRef.current && !isDraggingHandleRef.current && activeBboxRef.current) {
          mapRef.current.resize()
          applyCameraFit(activeBboxRef.current, true)
        }
      }, 400)

      fitTimersRef.current = [timer1, timer2]
    }
  }, [isMapLoaded, activeBbox, readOnly, updateBboxLayer, syncMarkers, applyCameraFit, clearFitTimers])

  return (
    <div
      style={{ height, minHeight: '380px' }}
      className="relative w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm bg-slate-900 select-none flex flex-col"
    >
      {/* Thanh công cụ phía trên bản đồ */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none">
        {/* Hàng 1: Bên trái là Thanh Search (khi Thêm mới) hoặc Kích thước (khi Sửa/Chi tiết); Bên phải là Nút Vẽ hoặc Nút tick Di chuyển khung */}
        {isCreateMode && !readOnly ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              {/* Thanh Search lọc Xã / Phường / Thị trấn (Tông sáng trang nhã) */}
              <div className="relative flex-1 min-w-[210px] max-w-xs pointer-events-auto">
                <div className="flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-md px-3 py-1.5 gap-2">
                  <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchCommuneInput(e.target.value)}
                    onFocus={() => {
                      if (searchQuery.trim().length >= 2) setIsSearchOpen(true)
                    }}
                    placeholder="Tìm xã, phường, thị trấn..."
                    className="w-full bg-transparent text-[11px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setRemoteResults([])
                        setIsSearchOpen(false)
                      }}
                      className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Danh sách gợi ý Xã / Phường / Thị trấn */}
                {isSearchOpen && searchQuery.trim().length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-xl max-h-48 overflow-y-auto p-1 z-30">
                    {isSearching && (
                      <div className="px-2.5 py-1.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                        Đang tìm xã/phường...
                      </div>
                    )}
                    {!isSearching && remoteResults.length === 0 && (
                      <div className="px-2.5 py-2 text-[10.5px] text-slate-500 dark:text-slate-400 text-center">
                        Không tìm thấy xã/phường phù hợp
                      </div>
                    )}
                    {remoteResults.map((item, idx) => (
                      <button
                        key={`${item.name}-${idx}`}
                        type="button"
                        onClick={() => handleSelectSearchSuggestion(item)}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="truncate">
                          <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {item.fullName}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phía tay phải ngang hàng với thanh tìm kiếm: Chưa có BBox thì hiện "Vẽ khung BBox", đã vẽ xong thì hiện nút tick "Di chuyển khung" */}
              {!activeBbox ? (
                <button
                  type="button"
                  onClick={() => {
                    const next = !isDrawingMode
                    setIsDrawingMode(next)
                    if (mapRef.current) {
                      mapRef.current.getCanvas().style.cursor = next ? 'crosshair' : ''
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl backdrop-blur-md border text-[11px] font-bold shadow-lg flex items-center gap-1.5 pointer-events-auto cursor-pointer transition ${
                    isDrawingMode
                      ? 'bg-amber-500 border-amber-300 text-white ring-2 ring-amber-400/40'
                      : 'bg-blue-600/95 border-blue-400 text-white hover:bg-blue-500'
                  }`}
                  title="Nhấn để bật chế độ kéo chuột vẽ 1 khung Bounding Box trên bản đồ"
                >
                  {isDrawingMode ? (
                    <Crosshair className="w-3.5 h-3.5 animate-pulse" />
                  ) : (
                    <Scan className="w-3.5 h-3.5" />
                  )}
                  <span>{isDrawingMode ? 'Kéo chuột trên map để vẽ...' : 'Vẽ khung BBox'}</span>
                </button>
              ) : (
                <label
                  className={`px-2.5 py-1.5 rounded-xl backdrop-blur-md border text-[11px] font-bold shadow-lg flex items-center gap-1.5 pointer-events-auto cursor-pointer transition ${
                    isMoveBoxEnabled
                      ? 'bg-blue-600/95 border-blue-400 text-white'
                      : 'bg-slate-900/85 border-slate-700/80 text-slate-200 hover:bg-slate-800/90'
                  }`}
                  title="Tick chọn để nắm kéo di chuyển toàn bộ khung BBox; bỏ tick để khóa vị trí khung"
                >
                  <input
                    type="checkbox"
                    checked={isMoveBoxEnabled}
                    onChange={(e) => setIsMoveBoxEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-white cursor-pointer"
                  />
                  <Move className="w-3.5 h-3.5" />
                  <span>Di chuyển khung</span>
                </label>
              )}
            </div>

            {activeBbox && (
              <div className="flex items-center">
                <div className="px-2.5 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-white text-[11px] font-bold shadow-lg flex items-center gap-1.5 pointer-events-auto">
                  <span className="text-slate-300 font-medium">Kích thước:</span>
                  <span className="text-blue-400 font-mono">{bboxDimensionText}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          activeBbox && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="px-2.5 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-white text-[11px] font-bold shadow-lg flex items-center gap-1.5 pointer-events-auto">
                <span className="text-slate-300 font-medium">Kích thước:</span>
                <span className="text-blue-400 font-mono">{bboxDimensionText}</span>
              </div>

              {!readOnly && (
                <label
                  className={`px-2.5 py-1.5 rounded-xl backdrop-blur-md border text-[11px] font-bold shadow-lg flex items-center gap-1.5 pointer-events-auto cursor-pointer transition ${
                    isMoveBoxEnabled
                      ? 'bg-blue-600/95 border-blue-400 text-white'
                      : 'bg-slate-900/85 border-slate-700/80 text-slate-200 hover:bg-slate-800/90'
                  }`}
                  title="Tick chọn để nắm kéo di chuyển toàn bộ khung BBox; bỏ tick để khóa vị trí khung"
                >
                  <input
                    type="checkbox"
                    checked={isMoveBoxEnabled}
                    onChange={(e) => setIsMoveBoxEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-white cursor-pointer"
                  />
                  <Move className="w-3.5 h-3.5" />
                  <span>Di chuyển khung</span>
                </label>
              )}
            </div>
          )
        )}
      </div>

      {/* Container Bản đồ */}
      <div
        ref={containerRef}
        onClick={() => {
          if (isSearchOpen) setIsSearchOpen(false)
        }}
        style={{ height: '100%', minHeight: '380px' }}
        className={`w-full h-full flex-1 min-h-[380px] ${
          isDrawingMode && !activeBbox ? 'cursor-crosshair' : 'cursor-grab'
        }`}
      />

      {/* Trạng thái chưa có BBox trong chế độ xem chi tiết */}
      {readOnly && !activeBbox && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 text-center z-10">
          <Compass className="w-10 h-10 text-slate-400 mb-2" />
          <p className="text-sm font-bold text-white">Chưa thiết lập khung bao bản đồ (BBox)</p>
          <p className="text-xs text-slate-300 max-w-xs mt-1">
            Địa bàn này chưa được xác định tọa độ vùng bao. Vui lòng chuyển sang chế độ Chỉnh sửa để
            vẽ khung.
          </p>
        </div>
      )}
    </div>
  )
}
export default CommuneBboxMap
