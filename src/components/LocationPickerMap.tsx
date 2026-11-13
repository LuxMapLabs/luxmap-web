import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/rootReducer'
import {
  GOOGLE_HYBRID_STYLE,
  DEFAULT_MAP_CENTER,
  applyMapBoundsLimits,
  MAP_MAX_ZOOM,
  MAP_ASSET_PICKER_ZOOM,
  MAP_DEFAULT_MIN_ZOOM,
  FIT_BOUNDS_COMMUNE_INSTANT,
} from '../utils/gis-map/mapUtils'
import type { CommuneBbox } from '../types/admin/communes'
import { Crosshair, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

export interface LocationPickerMapProps {
  lat: number
  lng: number
  originalLat?: number
  originalLng?: number
  onChange?: (coords: { lat: number; lng: number }) => void
  height?: string
  readOnly?: boolean
  initialZoom?: number
  /** Khung địa bàn (BBox xã): có thì vẽ viền và căn bản đồ vừa khung khi mở. */
  boundary?: CommuneBbox | null
  /** Chưa có vị trí: không vẽ ghim cho tới khi người dùng bấm lên bản đồ (`lat`/`lng` chỉ dùng để căn bản đồ). */
  unpicked?: boolean
}

const BOUNDARY_SOURCE = 'picker-boundary-source'

/** BBox đủ 4 cạnh hữu hạn và có diện tích; thiếu thì không vẽ. */
const boundaryRing = (b?: CommuneBbox | null): [number, number][] | null => {
  if (!b) return null
  const { min_lng, min_lat, max_lng, max_lat } = b
  const values = [min_lng, min_lat, max_lng, max_lat]
  if (!values.every((v) => typeof v === 'number' && Number.isFinite(v))) return null
  if (min_lng! >= max_lng! || min_lat! >= max_lat!) return null
  return [
    [min_lng!, min_lat!],
    [max_lng!, min_lat!],
    [max_lng!, max_lat!],
    [min_lng!, max_lat!],
    [min_lng!, min_lat!],
  ]
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  lat,
  lng,
  originalLat,
  originalLng,
  onChange,
  height = '240px',
  readOnly = false,
  initialZoom = MAP_ASSET_PICKER_ZOOM,
  boundary,
  unpicked = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const isDraggingRef = useRef<boolean>(false)
  // Chỉ đọc lúc mở: ghim xuất hiện ở lần bấm đầu tiên, sau đó bản đồ chạy như bình thường.
  const startedEmptyRef = useRef(unpicked)
  const placedRef = useRef(!unpicked)
  const [placed, setPlaced] = useState(!unpicked)

  // Track initial/original coords for reset button
  const initialCoordsRef = useRef<{ lat: number; lng: number }>({
    lat: typeof originalLat === 'number' && Number.isFinite(originalLat) ? originalLat : lat,
    lng: typeof originalLng === 'number' && Number.isFinite(originalLng) ? originalLng : lng,
  })

  useEffect(() => {
    if (
      typeof originalLat === 'number' &&
      Number.isFinite(originalLat) &&
      typeof originalLng === 'number' &&
      Number.isFinite(originalLng)
    ) {
      initialCoordsRef.current = { lat: originalLat, lng: originalLng }
    }
  }, [originalLat, originalLng])

  const mapBounds = useSelector((state: RootState) => state?.auth?.user?.map_bounds)

  // Valid coordinate fallback prioritizing mapBounds.center from Backend
  const fallbackLat =
    typeof mapBounds?.center?.lat === 'number' && Number.isFinite(mapBounds.center.lat)
      ? mapBounds.center.lat
      : DEFAULT_MAP_CENTER[1]
  const fallbackLng =
    typeof mapBounds?.center?.lng === 'number' && Number.isFinite(mapBounds.center.lng)
      ? mapBounds.center.lng
      : DEFAULT_MAP_CENTER[0]

  const validLat = Number.isFinite(lat) && lat >= -90 && lat <= 90 && lat !== 0 ? lat : fallbackLat
  const validLng = Number.isFinite(lng) && lng >= -180 && lng <= 180 && lng !== 0 ? lng : fallbackLng

  const [currentDisplayCoords, setCurrentDisplayCoords] = useState<{ lat: number; lng: number }>({
    lat: validLat,
    lng: validLng,
  })

  // Round coordinate to 6 decimal places (~10cm precision)
  const roundCoord = (val: number) => Math.round(val * 1000000) / 1000000

  // Create custom marker element with pulse glow
  const createMarkerElement = useCallback(() => {
    const el = document.createElement('div')
    el.className = 'location-picker-pin-wrapper'
    el.style.display = 'flex'
    el.style.flexDirection = 'column'
    el.style.alignItems = 'center'
    el.style.cursor = readOnly ? 'default' : 'move'

    el.innerHTML = `
      <div class="pin-head-shape" style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        background: radial-gradient(circle at 35% 35%, #fbbf24 0%, #f59e0b 60%, #d97706 100%);
        border: 2.5px solid #ffffff;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 14px rgba(245, 158, 11, 0.55), 0 2px 6px rgba(0, 0, 0, 0.35);
        transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.16s ease;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background-color: #ffffff;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
      <div style="
        width: 10px;
        height: 4px;
        background: rgba(0,0,0,0.35);
        border-radius: 50%;
        margin-top: 2px;
        filter: blur(1px);
      "></div>
    `

    if (!readOnly) {
      const head = el.querySelector('.pin-head-shape') as HTMLElement | null
      el.onmouseenter = () => {
        if (head) {
          head.style.transform = 'rotate(-45deg) scale(1.14)'
          head.style.filter = 'drop-shadow(0 6px 14px rgba(245, 158, 11, 0.65))'
        }
      }
      el.onmouseleave = () => {
        if (head && !isDraggingRef.current) {
          head.style.transform = 'rotate(-45deg) scale(1)'
          head.style.filter = 'none'
        }
      }
    }

    return el
  }, [readOnly])

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return

    const initialCenter: [number, number] = [validLng, validLat]

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: GOOGLE_HYBRID_STYLE,
      center: initialCenter,
      zoom: initialZoom,
      minZoom: MAP_DEFAULT_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      attributionControl: false,
    })

    mapRef.current = map

    // Create marker
    const markerEl = createMarkerElement()
    const marker = new maplibregl.Marker({
      element: markerEl,
      draggable: !readOnly,
      anchor: 'bottom',
    })
      .setLngLat(initialCenter)
    if (placedRef.current) marker.addTo(map)

    markerRef.current = marker

    // Marker Drag Events
    marker.on('dragstart', () => {
      isDraggingRef.current = true
      markerEl.style.cursor = 'move'
      const head = markerEl.querySelector('.pin-head-shape') as HTMLElement | null
      if (head) {
        head.style.transform = 'rotate(-45deg) scale(1.2)'
        head.style.filter = 'drop-shadow(0 8px 18px rgba(245, 158, 11, 0.8))'
      }
    })

    marker.on('drag', () => {
      const pos = marker.getLngLat()
      setCurrentDisplayCoords({
        lat: roundCoord(pos.lat),
        lng: roundCoord(pos.lng),
      })
    })

    marker.on('dragend', () => {
      isDraggingRef.current = false
      markerEl.style.cursor = 'move'
      const head = markerEl.querySelector('.pin-head-shape') as HTMLElement | null
      if (head) {
        head.style.transform = 'rotate(-45deg) scale(1)'
        head.style.filter = 'none'
      }
      const pos = marker.getLngLat()
      const newLat = roundCoord(pos.lat)
      const newLng = roundCoord(pos.lng)
      setCurrentDisplayCoords({ lat: newLat, lng: newLng })
      onChange?.({ lat: newLat, lng: newLng })
    })

    // Click on map to move marker
    if (!readOnly) {
      map.on('click', (e: maplibregl.MapMouseEvent) => {
        const newLat = roundCoord(e.lngLat.lat)
        const newLng = roundCoord(e.lngLat.lng)
        marker.setLngLat([newLng, newLat])
        if (!placedRef.current) {
          marker.addTo(map)
          placedRef.current = true
          setPlaced(true)
        }
        setCurrentDisplayCoords({ lat: newLat, lng: newLng })
        onChange?.({ lat: newLat, lng: newLng })
        map.easeTo({ center: [newLng, newLat], duration: 300 })
      })
    }

    // Resize handling for modal transition
    const resizeTimer = setTimeout(() => {
      map.resize()
    }, 200)

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        map.resize()
      })
      resizeObserver.observe(containerRef.current)
    }

    map.on('load', () => {
      applyMapBoundsLimits(map, mapBounds)
    })

    return () => {
      clearTimeout(resizeTimer)
      resizeObserver?.disconnect()
      marker.remove()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [createMarkerElement, readOnly, initialZoom, mapBounds])

  // Viền địa bàn: vẽ khung BBox xã (cùng kiểu trang Địa bàn & Khung BBox) và căn bản đồ vừa khung.
  const ring = boundaryRing(boundary)
  const ringKey = ring ? ring.flat().join(',') : ''
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ring) return
    const draw = () => {
      const data = {
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Polygon' as const, coordinates: [ring] },
      }
      const source = map.getSource(BOUNDARY_SOURCE) as maplibregl.GeoJSONSource | undefined
      if (source) {
        source.setData(data)
      } else {
        map.addSource(BOUNDARY_SOURCE, { type: 'geojson', data })
        map.addLayer({
          id: 'picker-boundary-fill',
          type: 'fill',
          source: BOUNDARY_SOURCE,
          paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.12 },
        })
        map.addLayer({
          id: 'picker-boundary-line',
          type: 'line',
          source: BOUNDARY_SOURCE,
          paint: { 'line-color': '#2563eb', 'line-width': 2.5, 'line-dasharray': [3, 2] },
        })
      }
      // Giới hạn theo tài khoản (map_bounds) có thể trùng mép xã, làm fitBounds bị kẹp lệch sang một bên.
      // Khi đã có khung xã thì giới hạn quanh khung đó, nới thêm nửa khung mỗi phía.
      const [[minLng, minLat], , [maxLng, maxLat]] = ring
      const padLng = (maxLng - minLng) / 2
      const padLat = (maxLat - minLat) / 2
      map.setMaxBounds([
        [minLng - padLng, minLat - padLat],
        [maxLng + padLng, maxLat + padLat],
      ])
      map.setMinZoom(MAP_DEFAULT_MIN_ZOOM)
      map.fitBounds([ring[0], ring[2]], FIT_BOUNDS_COMMUNE_INSTANT)
    }
    if (map.isStyleLoaded()) draw()
    else map.once('load', draw)
    // Modal còn đang giãn kích thước lúc mở: căn lại khung theo mỗi lần resize trong giây đầu.
    const refit = () => map.fitBounds([ring[0], ring[2]], FIT_BOUNDS_COMMUNE_INSTANT)
    map.on('resize', refit)
    const stopRefit = setTimeout(() => map.off('resize', refit), 1000)
    return () => {
      clearTimeout(stopRefit)
      map.off('resize', refit)
    }
    // ringKey thay cho ring: chỉ vẽ lại khi toạ độ khung đổi, không phải mỗi lần render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringKey])

  // Cập nhật Bbox và minZoom khi mapBounds từ Redux thay đổi
  useEffect(() => {
    if (mapRef.current) {
      applyMapBoundsLimits(mapRef.current, mapBounds)
    }
  }, [mapBounds])

  // Sync external prop changes (e.g. user manually typing lat/lng in input fields)
  useEffect(() => {
    if (isDraggingRef.current) return
    if (!mapRef.current || !markerRef.current) return

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

    const currentMarkerLngLat = markerRef.current.getLngLat()
    const diffLat = Math.abs(currentMarkerLngLat.lat - lat)
    const diffLng = Math.abs(currentMarkerLngLat.lng - lng)

    // Only update if difference is noticeable (> 0.000001)
    if (diffLat > 0.000001 || diffLng > 0.000001) {
      const newCenter: [number, number] = [lng, lat]
      markerRef.current.setLngLat(newCenter)
      setCurrentDisplayCoords({ lat: roundCoord(lat), lng: roundCoord(lng) })
      mapRef.current.flyTo({ center: newCenter, duration: 400 })
    }
  }, [lat, lng])

  // Map Controls Helpers
  const handleZoomIn = () => {
    mapRef.current?.zoomIn({ duration: 250 })
  }

  const handleZoomOut = () => {
    mapRef.current?.zoomOut({ duration: 250 })
  }

  const handleRecenter = () => {
    if (!mapRef.current || !markerRef.current) return
    const pos = markerRef.current.getLngLat()
    mapRef.current.flyTo({ center: [pos.lng, pos.lat], zoom: 17, duration: 400 })
  }

  const handleResetToInitial = () => {
    if (!mapRef.current || !markerRef.current || readOnly) return
    const orig = initialCoordsRef.current
    markerRef.current.setLngLat([orig.lng, orig.lat])
    setCurrentDisplayCoords({ lat: roundCoord(orig.lat), lng: roundCoord(orig.lng) })
    onChange?.({ lat: roundCoord(orig.lat), lng: roundCoord(orig.lng) })
    mapRef.current.flyTo({ center: [orig.lng, orig.lat], zoom: 17, duration: 400 })
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner group">
      {/* Map Canvas Container */}
      <div
        ref={containerRef}
        style={{ height, width: '100%' }}
        className="w-full bg-blue-50"
      />

      {/* Floating Control Buttons */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Phóng to"
          className="w-7 h-7 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 backdrop-blur-md rounded-lg shadow-md border border-slate-200/80 dark:border-slate-600/80 flex items-center justify-center transition cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Thu nhỏ"
          className="w-7 h-7 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 backdrop-blur-md rounded-lg shadow-md border border-slate-200/80 dark:border-slate-600/80 flex items-center justify-center transition cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        {placed && (
          <button
            type="button"
            onClick={handleRecenter}
            title="Căn giữa vào ghim"
            className="w-7 h-7 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 backdrop-blur-md rounded-lg shadow-md border border-slate-200/80 dark:border-slate-600/80 flex items-center justify-center transition cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        )}
        {/* Mở lúc chưa có ghim thì không có "vị trí ban đầu" để khôi phục. */}
        {!readOnly && !startedEmptyRef.current && (
          <button
            type="button"
            onClick={handleResetToInitial}
            title="Khôi phục vị trí ban đầu"
            className="w-7 h-7 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-amber-600 dark:text-amber-400 backdrop-blur-md rounded-lg shadow-md border border-slate-200/80 dark:border-slate-600/80 flex items-center justify-center transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Coordinate Badge (Bottom Left) */}
      <div className="absolute bottom-2 left-2 z-10">
        <div className="px-2 py-0.5 rounded-md bg-slate-950/85 backdrop-blur-md text-[10px] font-mono text-slate-300 border border-slate-800 flex items-center gap-1.5 shadow-md">
          <span className="text-amber-400 font-bold">GPS:</span>
          <span>
            {placed
              ? `${currentDisplayCoords.lat.toFixed(6)}, ${currentDisplayCoords.lng.toFixed(6)}`
              : 'Bấm lên bản đồ để đặt ghim'}
          </span>
        </div>
      </div>
    </div>
  )
}
export default LocationPickerMap
