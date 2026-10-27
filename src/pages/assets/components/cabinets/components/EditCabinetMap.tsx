import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Layers, Crosshair, Eye, EyeOff } from 'lucide-react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../../../redux/rootReducer'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import { parseLineStringWkt } from '../../../../../utils/gis-map/routeUtils'
import {
  GOOGLE_HYBRID_STYLE,
  DEFAULT_MAP_CENTER,
  MAP_MAX_ZOOM,
  toLngLatBounds,
  toBboxPolygonGeoJSON,
  getCommuneBboxInfo,
} from '../../../../../utils/gis-map/mapUtils'

export interface EditCabinetMapProps {
  lat: number
  lng: number
  currentCabinetId?: string | null
  currentExternalRef?: string | null
  activeSegmentId?: string | null
  availableSegments?: SegmentListItem[]
  segmentCoords?: [number, number][]
  otherCabinets?: CabinetListItem[]
  onChangeCoords: (coords: { lat: number; lng: number }) => void
  communeId?: string | null
}

export const EditCabinetMap: React.FC<EditCabinetMapProps> = ({
  lat,
  lng,
  currentCabinetId,
  currentExternalRef,
  availableSegments = [],
  segmentCoords = [],
  otherCabinets = [],
  onChangeCoords,
  communeId,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const currentCabinetMarkerRef = useRef<maplibregl.Marker | null>(null)
  const isUserInteractingRef = useRef<boolean>(false)
  const otherMarkersRef = useRef<maplibregl.Marker[]>([])

  const currentUser = useSelector((state: RootState) => state?.auth?.user)
  const mapBounds = currentUser?.map_bounds
  const adminCommunes = useSelector((state: RootState) => state?.adminCommunes?.communes)

  const communeBoundsInfo = useMemo(() => {
    return getCommuneBboxInfo(communeId, currentUser?.communes, adminCommunes, mapBounds)
  }, [communeId, currentUser, adminCommunes, mapBounds])
  const mapSegments = useSelector((state: RootState) => state.map.segments)

  // Tạo GeoJSON FeatureCollection chứa toàn bộ các tuyến đường trên GIS
  const allRoutesGeoJson = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = []

    if (mapSegments && mapSegments.length > 0) {
      mapSegments.forEach((seg) => {
        if (
          seg.geometry?.type === 'LineString' &&
          Array.isArray(seg.geometry.coordinates) &&
          seg.geometry.coordinates.length >= 2
        ) {
          features.push({
            type: 'Feature',
            properties: {
              segment_id: seg.properties?.segment_id || '',
              segment_name: seg.properties?.segment_name || '',
            },
            geometry: {
              type: 'LineString',
              coordinates: seg.geometry.coordinates as [number, number][],
            },
          })
        }
      })
    }

    if (features.length === 0 && availableSegments && availableSegments.length > 0) {
      availableSegments.forEach((seg) => {
        if ('geom_wkt' in seg && typeof seg.geom_wkt === 'string') {
          const parsed = parseLineStringWkt(seg.geom_wkt)
          if (parsed.length >= 2) {
            features.push({
              type: 'Feature',
              properties: {
                segment_id: seg.segment_id || '',
                segment_name: seg.segment_name || '',
              },
              geometry: {
                type: 'LineString',
                coordinates: parsed,
              },
            })
          }
        }
      })
    }

    return {
      type: 'FeatureCollection',
      features,
    }
  }, [mapSegments, availableSegments])

  const [showOtherCabinets, setShowOtherCabinets] = useState(false)

  const allRoutesGeoJsonRef = useRef(allRoutesGeoJson)
  allRoutesGeoJsonRef.current = allRoutesGeoJson
  const segmentCoordsRef = useRef(segmentCoords)
  segmentCoordsRef.current = segmentCoords
  const onChangeCoordsRef = useRef(onChangeCoords)
  onChangeCoordsRef.current = onChangeCoords

  // Lọc triệt để tủ đang sửa khỏi danh sách các tủ khác (chống double 100%)
  const filteredOtherCabinets = useMemo(() => {
    return otherCabinets.filter((c) => {
      if (!c.location || !Number.isFinite(c.location.lng) || !Number.isFinite(c.location.lat)) {
        return false
      }
      if (currentCabinetId && c.cabinet_id && c.cabinet_id.toLowerCase() === currentCabinetId.toLowerCase()) {
        return false
      }
      if (currentExternalRef && c.external_ref && c.external_ref.toLowerCase() === currentExternalRef.toLowerCase()) {
        return false
      }
      if (
        Number.isFinite(lng) &&
        Number.isFinite(lat) &&
        Math.abs(c.location.lng - lng) < 0.00003 &&
        Math.abs(c.location.lat - lat) < 0.00003
      ) {
        return false
      }
      return true
    })
  }, [otherCabinets, currentCabinetId, currentExternalRef, lng, lat])

  // Khởi tạo MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return

    let isMounted = true

    // Xác định tâm chính xác ngay tại vị trí tủ điện hoặc từ mapBounds Backend
    const isCoordValid = Number.isFinite(lng) && Number.isFinite(lat) && lng !== 0 && lat !== 0
    const initialCenter: [number, number] = isCoordValid
      ? [lng, lat]
      : typeof mapBounds?.center?.lng === 'number' &&
        typeof mapBounds?.center?.lat === 'number' &&
        Number.isFinite(mapBounds.center.lng) &&
        Number.isFinite(mapBounds.center.lat)
      ? [mapBounds.center.lng, mapBounds.center.lat]
      : DEFAULT_MAP_CENTER

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: GOOGLE_HYBRID_STYLE,
      center: initialCenter,
      zoom: isCoordValid ? 18 : 15, // Cận cảnh thực địa rõ nét
      maxZoom: MAP_MAX_ZOOM,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    })

    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.resize()
        }
      })
      resizeObserver.observe(mapContainerRef.current)
    }

    // Marker Tủ điện màu tím nổi bật có tia sét ⚡ kéo thả định vị
    const markerEl = document.createElement('div')
    markerEl.className = 'edit-cabinet-marker select-none'
    markerEl.style.cursor = 'grab'
    markerEl.innerHTML = `
      <div class="cabinet-pin-icon" style="
        width: 38px;
        height: 38px;
        background: linear-gradient(135deg, #8b5cf6, #6d28d9);
        border: 2.5px solid #ffffff;
        border-radius: 12px;
        box-shadow: 0 0 0 2.5px #581c87, 0 4px 16px rgba(124, 58, 237, 0.85), 0 3px 8px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fde047;
        font-size: 19px;
        font-weight: 900;
        transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease;
      ">⚡</div>
    `

    const pinInner = markerEl.querySelector('.cabinet-pin-icon') as HTMLElement | null

    const marker = new maplibregl.Marker({
      element: markerEl,
      draggable: true,
      anchor: 'center',
    })
      .setLngLat(initialCenter)
      .addTo(map)

    currentCabinetMarkerRef.current = marker

    markerEl.addEventListener('mouseenter', () => {
      if (pinInner) pinInner.style.transform = 'scale(1.12)'
    })
    markerEl.addEventListener('mouseleave', () => {
      if (pinInner) pinInner.style.transform = 'scale(1)'
    })

    marker.on('dragstart', () => {
      markerEl.style.cursor = 'grabbing'
      if (pinInner) {
        pinInner.style.transform = 'scale(1.2)'
        pinInner.style.boxShadow = '0 0 0 3px #fde047, 0 8px 24px rgba(124, 58, 237, 0.95), 0 6px 12px rgba(0,0,0,0.6)'
      }
    })

    const handleMarkerDrag = () => {
      isUserInteractingRef.current = true
      const pos = marker.getLngLat()
      onChangeCoordsRef.current({
        lng: Number(pos.lng.toFixed(6)),
        lat: Number(pos.lat.toFixed(6)),
      })
    }

    marker.on('drag', handleMarkerDrag)
    marker.on('dragend', () => {
      markerEl.style.cursor = 'grab'
      if (pinInner) {
        pinInner.style.transform = 'scale(1)'
        pinInner.style.boxShadow = '0 0 0 2.5px #581c87, 0 4px 16px rgba(124, 58, 237, 0.85), 0 3px 8px rgba(0,0,0,0.5)'
      }
      handleMarkerDrag()
    })

    // Sự kiện nhấp chuột (click) lên bản đồ để di chuyển tủ điện ngay lập tức
    map.on('click', (e: maplibregl.MapMouseEvent) => {
      isUserInteractingRef.current = true
      const clickedLng = Number(e.lngLat.lng.toFixed(6))
      const clickedLat = Number(e.lngLat.lat.toFixed(6))
      onChangeCoordsRef.current({
        lng: clickedLng,
        lat: clickedLat,
      })
      if (currentCabinetMarkerRef.current) {
        currentCabinetMarkerRef.current.setLngLat([clickedLng, clickedLat])
      }
    })

    map.on('load', () => {
      if (!isMounted) return

      const activeBounds = communeBoundsInfo.bounds || toLngLatBounds(mapBounds?.bbox)
      if (activeBounds) {
        map.setMaxBounds(activeBounds)
        const camera = map.cameraForBounds(activeBounds, { padding: 30 })
        if (typeof camera?.zoom === 'number' && Number.isFinite(camera.zoom)) {
          map.setMinZoom(camera.zoom)
        }
      }

      const bboxGeoJson = toBboxPolygonGeoJSON(communeBoundsInfo.bbox || mapBounds?.bbox)
      if (!map.getSource('commune-bbox-boundary')) {
        map.addSource('commune-bbox-boundary', {
          type: 'geojson',
          data: bboxGeoJson || { type: 'FeatureCollection', features: [] },
        })

        map.addLayer({
          id: 'commune-bbox-fill',
          type: 'fill',
          source: 'commune-bbox-boundary',
          paint: {
            'fill-color': '#0284c7',
            'fill-opacity': 0.04,
          },
        })

        map.addLayer({
          id: 'commune-bbox-line',
          type: 'line',
          source: 'commune-bbox-boundary',
          paint: {
            'line-color': '#38bdf8',
            'line-width': 2,
            'line-dasharray': [3, 2],
            'line-opacity': 0.85,
          },
        })
      }

      setTimeout(() => {
        map.resize()
        // Focus thẳng 100% vào vị trí tủ điện khi load xong
        if (Number.isFinite(lng) && Number.isFinite(lat) && lng !== 0 && lat !== 0) {
          map.jumpTo({
            center: [lng, lat],
            zoom: 18,
          })
        }
      }, 150)

      map.getCanvas().style.cursor = 'crosshair'

      // 1. Source & layer vẽ TOÀN BỘ các tuyến đường trên GIS (đường nền màu dịu)
      if (!map.getSource('edit-cabinet-all-routes')) {
        map.addSource('edit-cabinet-all-routes', {
          type: 'geojson',
          data: allRoutesGeoJsonRef.current,
        })

        map.addLayer({
          id: 'edit-cabinet-all-routes-glow',
          type: 'line',
          source: 'edit-cabinet-all-routes',
          paint: {
            'line-color': '#475569',
            'line-width': 4.5,
            'line-opacity': 0.4,
          },
        })

        map.addLayer({
          id: 'edit-cabinet-all-routes-core',
          type: 'line',
          source: 'edit-cabinet-all-routes',
          paint: {
            'line-color': '#94a3b8',
            'line-width': 2.5,
            'line-opacity': 0.75,
          },
        })
      }

      // 2. Source & layer vẽ tuyến đường đang chọn / liên kết của tủ điện (Highlight nổi bật)
      if (!map.getSource('edit-cabinet-route')) {
        map.addSource('edit-cabinet-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: segmentCoordsRef.current.length >= 2 ? segmentCoordsRef.current : [],
            },
          },
        })

        map.addLayer({
          id: 'edit-cabinet-route-glow',
          type: 'line',
          source: 'edit-cabinet-route',
          paint: {
            'line-color': '#0284c7',
            'line-width': 8,
            'line-opacity': 0.7,
          },
        })

        map.addLayer({
          id: 'edit-cabinet-route-core',
          type: 'line',
          source: 'edit-cabinet-route',
          paint: {
            'line-color': '#38bdf8',
            'line-width': 4,
            'line-opacity': 1,
          },
        })
      }
    })

    return () => {
      isMounted = false
      resizeObserver?.disconnect()
      marker.remove()
      otherMarkersRef.current.forEach((m) => m.remove())
      otherMarkersRef.current = []
      map.remove()
      mapRef.current = null
      currentCabinetMarkerRef.current = null
    }
  }, [mapBounds]) // Chỉ khởi tạo 1 lần

  // Cập nhật Bbox, giới hạn và khung viền khi communeBoundsInfo hoặc mapBounds thay đổi
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const activeBounds = communeBoundsInfo.bounds || toLngLatBounds(mapBounds?.bbox)
    if (activeBounds) {
      map.setMaxBounds(activeBounds)
      const camera = map.cameraForBounds(activeBounds, { padding: 30 })
      if (typeof camera?.zoom === 'number' && Number.isFinite(camera.zoom)) {
        map.setMinZoom(camera.zoom)
      }
    }

    const source = map.getSource('commune-bbox-boundary') as maplibregl.GeoJSONSource | undefined
    if (source) {
      const bboxGeoJson = toBboxPolygonGeoJSON(communeBoundsInfo.bbox || mapBounds?.bbox)
      source.setData(bboxGeoJson || ({ type: 'FeatureCollection', features: [] } as any))
    }
  }, [communeBoundsInfo, mapBounds])

  // Cập nhật GeoJSON toàn bộ các tuyến đường khi mapSegments thay đổi
  useEffect(() => {
    if (!mapRef.current) return
    const src = mapRef.current.getSource('edit-cabinet-all-routes') as maplibregl.GeoJSONSource
    if (src) {
      src.setData(allRoutesGeoJson)
    }
  }, [allRoutesGeoJson])

  // Cập nhật GeoJSON tuyến đường active và focus nhanh tới tuyến đường khi người dùng chọn
  useEffect(() => {
    if (!mapRef.current) return
    const src = mapRef.current.getSource('edit-cabinet-route') as maplibregl.GeoJSONSource
    if (src) {
      src.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: segmentCoords.length >= 2 ? segmentCoords : [],
        },
      })
    }

    // Tự động focus nhanh tới tuyến đường khi người dùng chọn tuyến
    if (segmentCoords.length >= 2) {
      const bounds = new maplibregl.LngLatBounds()
      segmentCoords.forEach((pt) => bounds.extend(pt))
      mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 17 })
    }
  }, [segmentCoords])

  // Tự động focus camera và dời ghim (giữ nguyên 100% mức zoom hiện tại) khi tọa độ thay đổi
  useEffect(() => {
    const map = mapRef.current
    if (
      !map ||
      !Number.isFinite(lng) ||
      !Number.isFinite(lat) ||
      lng === 0 ||
      lat === 0
    ) {
      return
    }

    if (currentCabinetMarkerRef.current) {
      const currentPos = currentCabinetMarkerRef.current.getLngLat()
      if (
        Math.abs(currentPos.lng - lng) > 0.000001 ||
        Math.abs(currentPos.lat - lat) > 0.000001
      ) {
        currentCabinetMarkerRef.current.setLngLat([lng, lat])
      }
    }

    // Nếu người dùng vừa trực tiếp kéo ghim hoặc click trên bản đồ thì không can thiệp camera hay zoom
    if (isUserInteractingRef.current) {
      isUserInteractingRef.current = false
      return
    }

    // Nếu thay đổi từ bên ngoài: lướt nhẹ nhàng đến tọa độ mới nhưng GIỮ NGUYÊN mức zoom hiện tại
    const currentZoom = typeof map.getZoom === 'function' ? map.getZoom() : undefined
    if (typeof map.easeTo === 'function') {
      map.easeTo({
        center: [lng, lat],
        ...(currentZoom !== undefined ? { zoom: currentZoom } : {}),
        duration: 300,
        essential: true,
      })
    } else if (typeof map.flyTo === 'function') {
      map.flyTo({
        center: [lng, lat],
        ...(currentZoom !== undefined ? { zoom: currentZoom } : {}),
        duration: 300,
        essential: true,
      })
    }
  }, [lng, lat, currentCabinetId])

  // Đồng bộ markers các tủ lân cận (chỉ hiển thị khi người dùng bật xem)
  useEffect(() => {
    if (!mapRef.current) return

    // Xóa các marker cũ
    otherMarkersRef.current.forEach((m) => m.remove())
    otherMarkersRef.current = []

    if (!showOtherCabinets) return

    filteredOtherCabinets.forEach((c) => {
      if (c.location && Number.isFinite(c.location.lng) && Number.isFinite(c.location.lat)) {
        const otherEl = document.createElement('div')
        otherEl.style.cssText = `
          width: 22px;
          height: 22px;
          background: #475569;
          border: 2px solid #ffffff;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #cbd5e1;
          font-size: 11px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
          opacity: 0.75;
          cursor: pointer;
        `
        otherEl.title = `${c.cabinet_name || c.external_ref || 'Tủ điện khác'}`
        otherEl.innerHTML = '⚡'

        const m = new maplibregl.Marker({
          element: otherEl,
          anchor: 'center',
        })
          .setLngLat([c.location.lng, c.location.lat])
          .addTo(mapRef.current!)

        otherMarkersRef.current.push(m)
      }
    })
  }, [showOtherCabinets, filteredOtherCabinets])

  // Hàm đưa camera quay về vị trí tủ đang sửa (bảo lưu mức zoom của người dùng)
  const handleRecenter = () => {
    const map = mapRef.current
    if (map && Number.isFinite(lng) && Number.isFinite(lat) && lng !== 0 && lat !== 0) {
      const currentZoom = typeof map.getZoom === 'function' ? map.getZoom() : undefined
      const targetZoom = currentZoom !== undefined ? Math.max(currentZoom, 16) : 18
      if (typeof map.easeTo === 'function') {
        map.easeTo({
          center: [lng, lat],
          zoom: targetZoom,
          duration: 350,
          essential: true,
        })
      } else if (typeof map.flyTo === 'function') {
        map.flyTo({
          center: [lng, lat],
          zoom: targetZoom,
          duration: 350,
          essential: true,
        })
      }
    }
  }

  return (
    <div className="relative w-full h-full min-h-[360px] md:min-h-[460px] bg-slate-900 overflow-hidden rounded-2xl md:rounded-r-3xl md:rounded-l-none border border-slate-700/60 shadow-inner">
      {/* Container bản đồ */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Legend & Bảng điều khiển trực quan */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-lg text-[11px] text-white max-w-[280px] space-y-2 select-none">
        <div className="flex items-center justify-between gap-1.5 font-bold text-amber-300 pb-1 border-b border-slate-700/60">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Định Vị Tủ Điện GIS</span>
          </div>
          <span className="text-[10px] text-purple-300 font-semibold">Zoom 18</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-purple-600 border border-white flex items-center justify-center text-[10px] text-yellow-300 font-bold shrink-0 shadow-xs">
            ⚡
          </div>
          <span className="text-slate-200 font-medium">Tủ đang sửa (Kéo hoặc nhấp chuột để đặt)</span>
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <div className="w-4 h-1.5 rounded-full bg-sky-400 shrink-0 shadow-xs" />
          <span className="text-sky-300 font-medium text-[10px]">Tuyến đường liên kết</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-1.5 rounded-full bg-slate-400 shrink-0" />
          <span className="text-slate-300 font-medium text-[10px]">Các tuyến đường khác</span>
        </div>

        {/* Toggle ẩn/hiện các tủ khác để tránh rối mắt */}
        {filteredOtherCabinets.length > 0 && (
          <div className="pt-1 border-t border-slate-800 flex items-center justify-between">
            <span className="text-slate-300 text-[10px]">
              Tủ khác ({filteredOtherCabinets.length}):
            </span>
            <button
              type="button"
              onClick={() => setShowOtherCabinets(!showOtherCabinets)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded text-[10px] font-medium flex items-center gap-1 cursor-pointer transition"
            >
              {showOtherCabinets ? (
                <>
                  <EyeOff className="w-3 h-3 text-rose-400" />
                  <span>Ẩn bớt</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3 text-emerald-400" />
                  <span>Hiện {filteredOtherCabinets.length} tủ</span>
                </>
              )}
            </button>
          </div>
        )}

        <p className="text-[10px] text-amber-200/90 pt-1 border-t border-slate-800">
          💡 Nhấp chuột lên bản đồ hoặc kéo ghim ⚡ để đặt vị trí thực địa chính xác.
        </p>
      </div>

      {/* Nút bấm quay về tâm vị trí tủ điện */}
      <button
        type="button"
        onClick={handleRecenter}
        title="Quay về vị trí tủ điện"
        className="absolute bottom-4 right-4 z-10 p-2.5 bg-purple-700/90 hover:bg-purple-600 active:scale-95 text-white rounded-xl shadow-lg backdrop-blur-md border border-purple-400/40 cursor-pointer flex items-center gap-1.5 text-xs font-semibold transition"
      >
        <Crosshair className="w-4 h-4 text-amber-300 animate-pulse" />
        <span className="hidden sm:inline">Về vị trí tủ</span>
      </button>
    </div>
  )
}
