import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { useCommuneBoundary } from '../hooks/gis-map/useCommuneBoundary'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/rootReducer'
import {
  GOOGLE_HYBRID_STYLE,
  DEFAULT_MAP_CENTER,
  MAP_MAX_ZOOM,
  toLngLatBounds,
  toBoundaryGeoJSON,
  getCommuneBboxInfo,
} from '../utils/gis-map/mapUtils'
import type { CommuneBbox } from '../types/admin/communes'
import { calculateDistanceMeters } from '../utils/gis-map/routeUtils'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

// Chừa lề phải/trên để nhãn ĐẦU/CUỐI TUYẾN không đè lên cột nút điều khiển bản đồ
const ROUTE_FIT_PADDING = { top: 70, bottom: 50, left: 60, right: 90 }
const ROUTE_FIT_SMOOTH = { padding: ROUTE_FIT_PADDING, maxZoom: 17, duration: 400 } as const
const ROUTE_FIT_INSTANT = { padding: ROUTE_FIT_PADDING, maxZoom: 17, duration: 0 } as const

export interface SegmentPoleItem {
  id: string
  code?: string
  coord: [number, number]
  status?: string
  atlas?: string
}

/** Bản đồ lộ trình một tuyến đường cùng các cột đèn thuộc tuyến (hỗ trợ kéo thả tinh chỉnh vị trí cột khi truyền editablePoleIds). */
export interface SegmentRouteMapProps {
  coordinates?: [number, number][]
  startCoord?: [number, number] // [lng, lat]
  endCoord?: [number, number] // [lng, lat]
  height?: string
  poles?: SegmentPoleItem[]
  communeId?: string | null
  communeBbox?: CommuneBbox | null
  editablePoleIds?: string[]
  invalidPoleIds?: string[]
  /** Thứ tự các cột báo cáo để luôn hiển thị nhãn #1, #2... trên bản đồ kể cả khi đang khóa ở bước khác */
  orderedReportPoleIds?: string[]
  /** Callback khi người dùng bấm vào ghim cột báo cáo đang khóa trên bản đồ để chuyển nhanh sang bước chỉnh cột đó */
  onSelectPoleStep?: (poleId: string) => void
  onPoleLocationChange?: (poleId: string, lng: number, lat: number) => void
}

// Coordinate validator (checks if longitude and latitude are in valid range)
const isValidCoord = (c?: [number, number]): c is [number, number] => {
  return (
    Array.isArray(c) &&
    c.length === 2 &&
    Number.isFinite(c[0]) &&
    Number.isFinite(c[1]) &&
    c[0] > 50 &&
    c[0] < 180 &&
    c[1] > 0 &&
    c[1] < 90
  )
}

// Check if coordinate matches an existing pole within tolerance (~10m)
const isMatchingPoleCoord = (pt: [number, number], poles: SegmentPoleItem[], threshold = 0.0001): boolean => {
  if (!poles || poles.length === 0 || !isValidCoord(pt)) return false
  return poles.some((p) => isValidCoord(p.coord) && Math.hypot(p.coord[0] - pt[0], p.coord[1] - pt[1]) < threshold)
}

// Mốc đỉnh của lộ trình: cột đèn vàng viền đen, mốc thường trắng viền xanh, đầu/cuối tô màu riêng
const createVertexMarkerElement = (isStart: boolean, isEnd: boolean, isSingle: boolean, isPole: boolean) => {
  const el = document.createElement('div')
  el.className = 'segment-vertex-handle'
  el.style.width = '22px'
  el.style.height = '22px'
  el.style.display = 'flex'
  el.style.alignItems = 'center'
  el.style.justifyContent = 'center'
  el.style.userSelect = 'none'
  el.style.pointerEvents = 'auto'
  el.style.zIndex = isPole ? '20' : '30'

  const ringColor = isPole ? '#0f172a' : isSingle || isStart ? '#10b981' : isEnd ? '#f43f5e' : '#0284c7'
  const coreColor = isPole ? '#fde047' : isSingle || isStart ? '#10b981' : isEnd ? '#f43f5e' : '#ffffff'
  const shadow = isPole ? '0 1px 6px rgba(0,0,0,0.65)' : '0 2px 8px rgba(2, 132, 199, 0.7)'

  el.innerHTML = `
    <div class="vertex-dot" style="
      pointer-events: none;
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: ${coreColor};
      border: 2.5px solid ${ringColor};
      box-shadow: ${shadow};
    "></div>
  `
  return el
}

// Nhãn ĐẦU / CUỐI TUYẾN (huy hiệu nhỏ có mũi nhọn chỉ xuống)
const createTerminalPinElement = (isStart: boolean, label: string) => {
  const el = document.createElement('div')
  el.className = 'segment-terminal-pin'
  el.style.display = 'flex'
  el.style.flexDirection = 'column'
  el.style.alignItems = 'center'
  el.style.pointerEvents = 'auto'
  el.style.zIndex = '40'
  el.style.userSelect = 'none'

  const themeColor = isStart ? '#10b981' : '#f43f5e'

  el.innerHTML = `
    <div class="pin-badge" style="
      position: relative;
      display: flex;
      align-items: center;
      gap: 3.5px;
      padding: 2px 6px;
      background: ${themeColor};
      color: #ffffff;
      font-size: 9px;
      font-weight: 700;
      font-family: inherit;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.4);
      transform: translateY(-2px);
      letter-spacing: 0.2px;
      white-space: nowrap;
    ">
      <span style="display: inline-block; width: 4.5px; height: 4.5px; border-radius: 50%; background: #ffffff;"></span>
      <span>${label}</span>
    </div>
    <div style="
      width: 0;
      height: 0;
      border-left: 3.5px solid transparent;
      border-right: 3.5px solid transparent;
      border-top: 5px solid ${themeColor};
      margin-top: -2px;
    "></div>
  `
  return el
}

// Ghim cột đèn cho phép Quản lý giữ chuột kéo thả để tinh chỉnh vị trí trên ảnh vệ tinh (hoặc hiển thị nhãn thứ tự bước khi khóa)
const createDraggablePoleMarkerElement = (
  label: string,
  isInvalid: boolean,
  isEditable = true,
  stepNumber?: number
) => {
  const el = document.createElement('div')
  el.className = 'segment-draggable-pole-pin'
  el.style.display = 'flex'
  el.style.flexDirection = 'column'
  el.style.alignItems = 'center'
  el.style.pointerEvents = 'auto'
  el.style.zIndex = isEditable ? '48' : '44'
  el.style.userSelect = 'none'
  el.style.cursor = isEditable ? 'grab' : 'pointer'
  const prefix = stepNumber != null ? `#${stepNumber} ` : ''
  el.title = isEditable
    ? `Cột ${prefix}${label} — Giữ chuột và kéo để điều chỉnh tọa độ GPS`
    : `Cột ${prefix}${label} — Bấm để chọn chỉnh sửa cột này`

  const badgeBg = isInvalid ? '#e11d48' : isEditable ? '#7c3aed' : '#334155'
  const dotBg = isInvalid ? '#fb7185' : isEditable ? '#fde047' : '#e2e8f0'
  const dotBorder = isInvalid ? '#881337' : isEditable ? '#4c1d95' : '#1e293b'
  const badgePrefix = isEditable ? `✥ ${prefix}` : prefix

  el.innerHTML = `
    <div class="draggable-pole-badge" style="
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2.5px 7px;
      background: ${badgeBg};
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      border-radius: 6px;
      border: 1.5px solid #ffffff;
      box-shadow: 0 3px 8px rgba(0,0,0,0.45);
      white-space: nowrap;
      transform: translateY(-2px);
    ">
      <span class="draggable-pole-text">${badgePrefix}${label}</span>
    </div>
    <div class="draggable-pole-arrow" style="
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 5px solid ${badgeBg};
      margin-top: -2px;
    "></div>
    <div class="draggable-pole-dot" style="
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: ${dotBg};
      border: 2.5px solid ${dotBorder};
      box-shadow: 0 0 0 2px rgba(255,255,255,0.85), 0 2px 6px rgba(0,0,0,0.5);
      margin-top: -1px;
    "></div>
  `
  return el
}

const areCoordsEqual = (a: [number, number][], b: [number, number][]): boolean => {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i][0] - b[i][0]) > 0.0000001 || Math.abs(a[i][1] - b[i][1]) > 0.0000001) {
      return false
    }
  }
  return true
}

// Bỏ các điểm trùng nhau liên tiếp
const dedupeConsecutive = (coords: [number, number][]): [number, number][] => {
  const out: [number, number][] = []
  coords.forEach((pt) => {
    const prev = out[out.length - 1]
    if (!prev || Math.abs(prev[0] - pt[0]) > 0.000001 || Math.abs(prev[1] - pt[1]) > 0.000001) out.push(pt)
  })
  return out
}

export const SegmentRouteMap: React.FC<SegmentRouteMapProps> = ({
  coordinates = [],
  startCoord,
  endCoord,
  height = '240px',
  poles = [],
  communeId,
  communeBbox,
  editablePoleIds = [],
  invalidPoleIds = [],
  orderedReportPoleIds = [],
  onSelectPoleStep,
  onPoleLocationChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const loadedRef = useRef(false)
  const startMarkerRef = useRef<maplibregl.Marker | null>(null)
  const endMarkerRef = useRef<maplibregl.Marker | null>(null)
  const vertexMarkersRef = useRef<maplibregl.Marker[]>([])
  const draggablePoleMarkersRef = useRef<
    Map<
      string,
      {
        marker: maplibregl.Marker
        isInvalid: boolean
        isEditable: boolean
        stepNumber?: number
      }
    >
  >(new Map())
  const draggingPoleIdRef = useRef<string | null>(null)
  const currentCoordsRef = useRef<[number, number][]>([])
  const onPoleLocationChangeRef = useRef(onPoleLocationChange)
  onPoleLocationChangeRef.current = onPoleLocationChange
  const onSelectPoleStepRef = useRef(onSelectPoleStep)
  onSelectPoleStepRef.current = onSelectPoleStep

  const currentUser = useSelector((state: RootState) => state?.auth?.user)
  const mapBounds = currentUser?.map_bounds
  const userCommunes = currentUser?.communes
  const adminCommunes = useSelector((state: RootState) => state?.adminCommunes?.communes)

  const communeBoundsInfo = useMemo(() => {
    if (communeBbox) {
      const bounds = toLngLatBounds(communeBbox)
      if (bounds) {
        const center: [number, number] = [
          (bounds[0][0] + bounds[1][0]) / 2,
          (bounds[0][1] + bounds[1][1]) / 2,
        ]
        return { bbox: communeBbox, center, bounds }
      }
    }
    return getCommuneBboxInfo(communeId, userCommunes, adminCommunes, mapBounds)
  }, [communeBbox, communeId, userCommunes, adminCommunes, mapBounds])

  const communeBoundary = useCommuneBoundary(communeId)
  const boundaryRef = useRef(communeBoundary)
  boundaryRef.current = communeBoundary

  const polesRef = useRef<SegmentPoleItem[]>(poles)
  polesRef.current = poles

  const startLng = startCoord?.[0]
  const startLat = startCoord?.[1]
  const endLng = endCoord?.[0]
  const endLat = endCoord?.[1]
  const stableStartCoord = useMemo<[number, number] | undefined>(
    () =>
      typeof startLng === 'number' && typeof startLat === 'number'
        ? [startLng, startLat]
        : undefined,
    [startLng, startLat]
  )
  const stableEndCoord = useMemo<[number, number] | undefined>(
    () =>
      typeof endLng === 'number' && typeof endLat === 'number'
        ? [endLng, endLat]
        : undefined,
    [endLng, endLat]
  )

  // Hộp bao của lộ trình + cột đèn
  const getBounds = useCallback((coords?: [number, number][]): maplibregl.LngLatBoundsLike | null => {
    const pts: [number, number][] = []
    const source = coords && coords.length > 0 ? coords : currentCoordsRef.current
    source.forEach((pt) => isValidCoord(pt) && pts.push(pt))
    if (!coords || coords.length === 0) {
      if (isValidCoord(stableStartCoord)) pts.push(stableStartCoord)
      if (isValidCoord(stableEndCoord)) pts.push(stableEndCoord)
    }
    polesRef.current.forEach((p) => isValidCoord(p.coord) && pts.push(p.coord))
    if (pts.length === 0) return null

    let minLng = Math.min(...pts.map((p) => p[0]))
    let maxLng = Math.max(...pts.map((p) => p[0]))
    let minLat = Math.min(...pts.map((p) => p[1]))
    let maxLat = Math.max(...pts.map((p) => p[1]))
    if (minLng === maxLng) {
      minLng -= 0.0015
      maxLng += 0.0015
    }
    if (minLat === maxLat) {
      minLat -= 0.0015
      maxLat += 0.0015
    }
    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ]
  }, [stableStartCoord, stableEndCoord])

  // Vẽ lại đường, các mốc đỉnh và hai nhãn đầu/cuối theo lộ trình mới
  const renderRoute = useCallback(
    (coords: [number, number][]) => {
      currentCoordsRef.current = coords
      const map = mapRef.current
      if (!map || !loadedRef.current) return

      const valid = coords.filter(isValidCoord)
      ;(map.getSource('route-line') as maplibregl.GeoJSONSource | undefined)?.setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: valid.length >= 2 ? valid : valid.length === 1 ? [valid[0], valid[0]] : [],
        },
        properties: {},
      })

      // Khi đang giữ chuột kéo ghim cột, không xóa/tạo lại DOM mốc đỉnh liên tục để tránh giật lag
      if (!draggingPoleIdRef.current) {
        vertexMarkersRef.current.forEach((m) => m.remove())
        vertexMarkersRef.current = valid.map((pt, idx) =>
          new maplibregl.Marker({
            element: createVertexMarkerElement(
              idx === 0,
              idx === valid.length - 1,
              valid.length === 1,
              isMatchingPoleCoord(pt, polesRef.current)
            ),
            anchor: 'center',
          })
            .setLngLat(pt)
            .addTo(map)
        )
      }

      const placePin = (
        ref: React.MutableRefObject<maplibregl.Marker | null>,
        coord: [number, number] | undefined,
        isStart: boolean
      ) => {
        if (!isValidCoord(coord)) {
          ref.current?.remove()
          ref.current = null
          return
        }
        if (ref.current) {
          ref.current.setLngLat(coord)
        } else {
          ref.current = new maplibregl.Marker({
            element: createTerminalPinElement(isStart, isStart ? 'ĐẦU TUYẾN' : 'CUỐI TUYẾN'),
            anchor: 'bottom',
          })
            .setLngLat(coord)
            .addTo(map)
        }
      }
      const effectiveStart = valid[0] ?? stableStartCoord
      const effectiveEnd = valid.length > 1 ? valid[valid.length - 1] : stableEndCoord
      const hasDistinctLine =
        valid.length >= 2 ||
        (isValidCoord(effectiveStart) &&
          isValidCoord(effectiveEnd) &&
          calculateDistanceMeters(effectiveStart, effectiveEnd) > 0.5)
      placePin(startMarkerRef, hasDistinctLine ? effectiveStart : undefined, true)
      placePin(endMarkerRef, hasDistinctLine ? effectiveEnd : undefined, false)
    },
    [stableStartCoord, stableEndCoord]
  )

  // Khởi tạo bản đồ một lần
  useEffect(() => {
    if (!containerRef.current) return
    const draggablePoleMarkers = draggablePoleMarkersRef.current

    const validPoles = poles.filter((p) => isValidCoord(p.coord))
    const validRawCoords = coordinates.filter(isValidCoord)
    const hasStart = isValidCoord(startCoord)
    const hasEnd = isValidCoord(endCoord)

    let initialCoords: [number, number][] = []
    if (validRawCoords.length > 0) {
      initialCoords = [...validRawCoords]
    } else if (validPoles.length > 0) {
      const s = hasStart ? startCoord! : validPoles[0].coord
      const e = hasEnd ? endCoord! : validPoles[validPoles.length - 1].coord
      const sorted = [...validPoles].sort(
        (a, b) => calculateDistanceMeters(s, a.coord) - calculateDistanceMeters(s, b.coord)
      )
      initialCoords = [s, ...sorted.map((p) => p.coord), e]
    } else if (hasStart && hasEnd) {
      initialCoords = [startCoord!, endCoord!]
    }
    const route = dedupeConsecutive(initialCoords)
    currentCoordsRef.current = route

    const fallbackCenter: [number, number] = communeBoundsInfo.center
      ? communeBoundsInfo.center
      : typeof mapBounds?.center?.lng === 'number' &&
        typeof mapBounds?.center?.lat === 'number' &&
        Number.isFinite(mapBounds.center.lng) &&
        Number.isFinite(mapBounds.center.lat)
      ? [mapBounds.center.lng, mapBounds.center.lat]
      : DEFAULT_MAP_CENTER

    const center: [number, number] =
      route.length > 0 ? route[0] : hasStart ? startCoord! : validPoles.length > 0 ? validPoles[0].coord : fallbackCenter

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: GOOGLE_HYBRID_STYLE,
      center,
      zoom: 15,
      minZoom: 6,
      maxZoom: MAP_MAX_ZOOM,
      attributionControl: false,
    })
    mapRef.current = map

    // Chỉ cho cuộn-zoom sau khi bấm vào bản đồ, để cuộn hộp thoại không bị bản đồ chiếm
    map.scrollZoom.disable()
    map.on('click', () => map.scrollZoom.enable())
    map.on('mouseout', () => map.scrollZoom.disable())

    map.on('load', () => {
      const activeBounds = communeBoundsInfo.bounds || toLngLatBounds(mapBounds?.bbox)

      // Khung ranh giới xã
      const bboxGeoJson = toBoundaryGeoJSON(boundaryRef.current, communeBoundsInfo.bbox || mapBounds?.bbox)
      map.addSource('commune-bbox-boundary', {
        type: 'geojson',
        data: bboxGeoJson || { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'commune-bbox-fill',
        type: 'fill',
        source: 'commune-bbox-boundary',
        paint: { 'fill-color': '#0284c7', 'fill-opacity': 0.04 },
      })
      map.addLayer({
        id: 'commune-bbox-line',
        type: 'line',
        source: 'commune-bbox-boundary',
        paint: { 'line-color': '#38bdf8', 'line-width': 2, 'line-dasharray': [3, 2], 'line-opacity': 0.85 },
      })

      if (route.length === 0 && !hasStart && validPoles.length === 0 && activeBounds) {
        map.fitBounds(activeBounds, { padding: 40, duration: 0 })
      }

      // Đường lộ trình
      map.addSource('route-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: route.length >= 2 ? route : [] },
          properties: {},
        },
      })
      map.addLayer({
        id: 'route-line-glow',
        type: 'line',
        source: 'route-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0284c7',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 5, 16, 9],
          'line-opacity': 0.45,
          'line-blur': 2,
        },
      })
      map.addLayer({
        id: 'route-line-core',
        type: 'line',
        source: 'route-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#38bdf8',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2.8, 16, 4.5],
          'line-opacity': 0.95,
        },
      })

      // Cột đèn
      map.addSource('segment-poles', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: validPoles.map((p) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: p.coord },
            properties: { id: p.id, code: p.code || p.id, status: p.status || 'normal', atlas: p.atlas || '' },
          })),
        },
      })
      map.addLayer({
        id: 'segment-poles-core',
        type: 'circle',
        source: 'segment-poles',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 2, 16, 3],
          'circle-color': '#fde047',
          'circle-stroke-width': 1.2,
          'circle-stroke-color': '#0f172a',
          'circle-opacity': 0.9,
        },
      })

      loadedRef.current = true
      renderRoute(route)
      syncEditableMarkers(polesRef.current, editablePoleIds, invalidPoleIds, orderedReportPoleIds)

      const b = getBounds()
      if (b) map.fitBounds(b, ROUTE_FIT_SMOOTH)
      setTimeout(() => mapRef.current?.resize(), 200)
    })

    // Resize khi hộp thoại hiện ra
    const resizeTimer = setTimeout(() => {
      map.resize()
      const b = getBounds()
      if (b) map.fitBounds(b, ROUTE_FIT_INSTANT)
    }, 220)

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => map.resize())
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      clearTimeout(resizeTimer)
      resizeObserver?.disconnect()
      loadedRef.current = false
      startMarkerRef.current?.remove()
      endMarkerRef.current?.remove()
      startMarkerRef.current = null
      endMarkerRef.current = null
      vertexMarkersRef.current.forEach((m) => m.remove())
      vertexMarkersRef.current = []
      draggablePoleMarkers.forEach((entry) => entry.marker.remove())
      draggablePoleMarkers.clear()
      map.remove()
      mapRef.current = null
    }
    // Bản đồ chỉ khởi tạo một lần; thay đổi lộ trình sau đó được xử lý ở effect bên dưới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Đồng bộ các ghim cột cho phép kéo thả tinh chỉnh vị trí (và các ghim cột báo cáo theo thứ tự bước)
  const syncEditableMarkers = useCallback(
    (
      currentPoles: SegmentPoleItem[],
      editableIds: string[],
      invalidIds: string[],
      orderedReportIds: string[] = []
    ) => {
      const map = mapRef.current
      if (!map || !loadedRef.current) return

      const validPoles = currentPoles.filter((p) => isValidCoord(p.coord))
      const polesSource = map.getSource('segment-poles') as maplibregl.GeoJSONSource | undefined
      polesSource?.setData({
        type: 'FeatureCollection',
        features: validPoles.map((p) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: p.coord },
          properties: { id: p.id, code: p.code || p.id, status: p.status || 'normal', atlas: p.atlas || '' },
        })),
      })

      const editableSet = new Set(editableIds)
      const invalidSet = new Set(invalidIds)
      const orderedIndexMap = new Map<string, number>()
      orderedReportIds.forEach((id, idx) => {
        orderedIndexMap.set(id, idx + 1)
      })

      // Hiển thị ghim cho mọi cột nằm trong editableIds HOẶC trong orderedReportIds
      const activePinPoles = validPoles.filter(
        (p) => editableSet.has(p.id) || orderedIndexMap.has(p.id)
      )
      const activeIds = new Set(activePinPoles.map((p) => p.id))

      // Gỡ bỏ các marker không còn nằm trong danh sách hiển thị
      Array.from(draggablePoleMarkersRef.current.entries()).forEach(([id, entry]) => {
        if (!activeIds.has(id)) {
          entry.marker.remove()
          draggablePoleMarkersRef.current.delete(id)
        }
      })

      activePinPoles.forEach((p) => {
        const isInvalid = invalidSet.has(p.id)
        const isEditable = editableSet.has(p.id)
        const stepNumber = orderedReportIds.length >= 2 ? orderedIndexMap.get(p.id) : undefined
        const label = p.code || p.id
        const currentEntry = draggablePoleMarkersRef.current.get(p.id)

        if (currentEntry) {
          if (draggingPoleIdRef.current !== p.id) {
            currentEntry.marker.setLngLat(p.coord)
          }
          if (currentEntry.isEditable !== isEditable) {
            currentEntry.marker.setDraggable(isEditable)
          }
          if (
            currentEntry.isInvalid !== isInvalid ||
            currentEntry.isEditable !== isEditable ||
            currentEntry.stepNumber !== stepNumber
          ) {
            const el = currentEntry.marker.getElement()
            el.style.zIndex = isEditable ? '48' : '44'
            el.style.cursor = isEditable ? 'grab' : 'pointer'
            const prefix = stepNumber != null ? `#${stepNumber} ` : ''
            el.title = isEditable
              ? `Cột ${prefix}${label} — Giữ chuột và kéo để điều chỉnh tọa độ GPS`
              : `Cột ${prefix}${label} — Bấm để chọn chỉnh sửa cột này`

            const badge = el.querySelector('.draggable-pole-badge') as HTMLElement | null
            const textSpan = el.querySelector('.draggable-pole-text') as HTMLElement | null
            const arrow = el.querySelector('.draggable-pole-arrow') as HTMLElement | null
            const dot = el.querySelector('.draggable-pole-dot') as HTMLElement | null
            const badgeBg = isInvalid ? '#e11d48' : isEditable ? '#7c3aed' : '#334155'
            if (badge) badge.style.background = badgeBg
            if (arrow) arrow.style.borderTopColor = badgeBg
            if (textSpan) {
              textSpan.textContent = `${isEditable ? `✥ ${prefix}` : prefix}${label}`
            }
            if (dot) {
              dot.style.background = isInvalid ? '#fb7185' : isEditable ? '#fde047' : '#e2e8f0'
              dot.style.borderColor = isInvalid ? '#881337' : isEditable ? '#4c1d95' : '#1e293b'
            }
            currentEntry.isInvalid = isInvalid
            currentEntry.isEditable = isEditable
            currentEntry.stepNumber = stepNumber
          }
        } else {
          const el = createDraggablePoleMarkerElement(label, isInvalid, isEditable, stepNumber)
          el.addEventListener('click', (e) => {
            e.stopPropagation()
            onSelectPoleStepRef.current?.(p.id)
          })
          const marker = new maplibregl.Marker({
            element: el,
            draggable: isEditable,
            anchor: 'bottom',
          })
            .setLngLat(p.coord)
            .addTo(map)

          let rafId: number | null = null
          marker.on('dragstart', () => {
            draggingPoleIdRef.current = p.id
            el.style.cursor = 'grabbing'
          })
          marker.on('drag', () => {
            if (rafId !== null) return
            rafId = window.requestAnimationFrame(() => {
              rafId = null
              const lngLat = marker.getLngLat()
              const newLng = Math.round(lngLat.lng * 1000000) / 1000000
              const newLat = Math.round(lngLat.lat * 1000000) / 1000000
              onPoleLocationChangeRef.current?.(p.id, newLng, newLat)
            })
          })
          marker.on('dragend', () => {
            if (rafId !== null) {
              window.cancelAnimationFrame(rafId)
              rafId = null
            }
            const lngLat = marker.getLngLat()
            const newLng = Math.round(lngLat.lng * 1000000) / 1000000
            const newLat = Math.round(lngLat.lat * 1000000) / 1000000
            draggingPoleIdRef.current = null
            el.style.cursor = 'grab'
            onPoleLocationChangeRef.current?.(p.id, newLng, newLat)
            renderRoute(currentCoordsRef.current)
          })

          draggablePoleMarkersRef.current.set(p.id, {
            marker,
            isInvalid,
            isEditable,
            stepNumber,
          })
        }
      })
    },
    [renderRoute]
  )

  // Cập nhật các ghim cột khi danh sách cột hoặc trạng thái hợp lệ thay đổi
  useEffect(() => {
    syncEditableMarkers(poles, editablePoleIds, invalidPoleIds, orderedReportPoleIds)
  }, [poles, editablePoleIds, invalidPoleIds, orderedReportPoleIds, syncEditableMarkers])

  // Cập nhật khung ranh giới xã khi đổi địa bàn
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    const source = map.getSource('commune-bbox-boundary') as maplibregl.GeoJSONSource | undefined
    const bboxGeoJson = toBoundaryGeoJSON(boundaryRef.current, communeBoundsInfo.bbox || mapBounds?.bbox)
    source?.setData(bboxGeoJson || { type: 'FeatureCollection', features: [] })

    const activeBounds = communeBoundsInfo.bounds || toLngLatBounds(mapBounds?.bbox)
    if (currentCoordsRef.current.length === 0 && activeBounds) {
      map.fitBounds(activeBounds, { padding: 40, duration: 600 })
    }
  }, [communeBoundsInfo, mapBounds, communeBoundary])

  // Vẽ lại khi lộ trình truyền vào đổi
  useEffect(() => {
    if (areCoordsEqual(coordinates, currentCoordsRef.current)) return
    renderRoute(coordinates)
  }, [coordinates, renderRoute])

  const handleFitBounds = () => {
    const map = mapRef.current
    if (!map) return
    const bounds = getBounds()
    if (bounds) {
      map.fitBounds(bounds, ROUTE_FIT_SMOOTH)
    } else if (communeBoundsInfo.bounds) {
      map.fitBounds(communeBoundsInfo.bounds, { padding: 40, duration: 600 })
    } else if (mapBounds?.bbox) {
      const b = toLngLatBounds(mapBounds.bbox)
      if (b) map.fitBounds(b, { padding: 40, duration: 600 })
    }
  }

  const controlClass =
    'w-7 h-7 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 backdrop-blur-md rounded-lg shadow-md border border-slate-200/80 dark:border-slate-600/80 flex items-center justify-center transition cursor-pointer'

  const effectiveMinHeight = height && height !== '100%' ? height : '340px'

  return (
    <div
      style={{ height, minHeight: effectiveMinHeight }}
      className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner group"
    >
      <div
        ref={containerRef}
        style={{ height: '100%', width: '100%', minHeight: effectiveMinHeight }}
        className="w-full h-full bg-blue-50"
      />

      <div className="absolute top-2 right-2 z-50 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn({ duration: 250 })}
          title="Phóng to"
          className={`${controlClass} text-slate-700 dark:text-slate-200`}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut({ duration: 250 })}
          title="Thu nhỏ"
          className={`${controlClass} text-slate-700 dark:text-slate-200`}
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleFitBounds}
          title="Bao quát toàn tuyến"
          className={`${controlClass} text-blue-600 dark:text-blue-400`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default SegmentRouteMap
