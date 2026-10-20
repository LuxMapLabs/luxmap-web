import React, { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Layers } from 'lucide-react'
import type { FeatureCollection } from 'geojson'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import {
  GOOGLE_HYBRID_STYLE,
  DEFAULT_MAP_CENTER,
} from '../../../../../utils/gis-map/mapUtils'
import {
  snapPointToPolyline,
  resolveNonOverlappingRoutePoint,
} from '../../../../../utils/gis-map/routeUtils'

export interface EditPoleMapProps {
  lat: number
  lng: number
  segmentCoords: [number, number][]
  otherPolesGeoJSON: FeatureCollection
  currentCabinet?: CabinetListItem | null
  onChangeCoords: (coords: { lat: number; lng: number }) => void
}

export const EditPoleMap: React.FC<EditPoleMapProps> = ({
  lat,
  lng,
  segmentCoords,
  otherPolesGeoJSON,
  currentCabinet,
  onChangeCoords,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const currentPoleMarkerRef = useRef<maplibregl.Marker | null>(null)
  const cabinetMarkerRef = useRef<maplibregl.Marker | null>(null)
  const existingPolePopupRef = useRef<maplibregl.Popup | null>(null)

  const segmentCoordsRef = useRef(segmentCoords)
  segmentCoordsRef.current = segmentCoords

  const otherPolesGeoJSONRef = useRef(otherPolesGeoJSON)
  otherPolesGeoJSONRef.current = otherPolesGeoJSON

  const onChangeCoordsRef = useRef(onChangeCoords)
  onChangeCoordsRef.current = onChangeCoords

  const initialCoordsRef = useRef<[number, number]>([lng, lat])

  // Helper trích xuất các điểm cột khác làm chướng ngại vật
  const getObstaclePoints = (): [number, number][] => {
    const features = otherPolesGeoJSONRef.current?.features || []
    const points: [number, number][] = []
    features.forEach((feat) => {
      if (feat.geometry && feat.geometry.type === 'Point' && Array.isArray(feat.geometry.coordinates)) {
        const coord = feat.geometry.coordinates
        if (coord.length >= 2 && Number.isFinite(coord[0]) && Number.isFinite(coord[1])) {
          points.push([coord[0], coord[1]])
        }
      }
    })
    return points
  }

  // Helper tính vị trí snap an toàn (tránh đè cột khác)
  const getSnappedSafeCoord = (rawLng: number, rawLat: number): [number, number] => {
    const coords = segmentCoordsRef.current
    if (!coords || coords.length < 2) return [rawLng, rawLat]
    const obstacles = getObstaclePoints()
    return resolveNonOverlappingRoutePoint(rawLng, rawLat, coords, obstacles, 15)
  }

  const getSnappedSafeCoordRef = useRef(getSnappedSafeCoord)
  getSnappedSafeCoordRef.current = getSnappedSafeCoord

  // Khởi tạo MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return

    let isMounted = true

    const [initLng, initLat] = initialCoordsRef.current
    const initialCenter: [number, number] =
      Number.isFinite(initLng) && Number.isFinite(initLat)
        ? [initLng, initLat]
        : DEFAULT_MAP_CENTER

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: GOOGLE_HYBRID_STYLE,
      center: initialCenter,
      zoom: 17,
      maxZoom: 20,
      pitch: 0,
      bearing: 0,
    })

    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')

    // Tạo Marker chấm tròn LED cam 16px kéo thả định vị cột
    const markerEl = document.createElement('div')
    markerEl.className = 'edit-pole-marker cursor-grab active:cursor-grabbing select-none'
    markerEl.innerHTML = `
      <div style="
        width: 16px;
        height: 16px;
        background: #f97316;
        border: 2.5px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 0 2px #ea580c, 0 0 10px rgba(249, 115, 22, 0.8), 0 2px 6px rgba(0,0,0,0.5);
        transition: transform 0.1s ease;
      "></div>
    `

    const marker = new maplibregl.Marker({
      element: markerEl,
      draggable: true,
      anchor: 'center',
    })
      .setLngLat(initialCenter)
      .addTo(map)

    currentPoleMarkerRef.current = marker

    const handleMarkerDrag = () => {
      const pos = marker.getLngLat()
      if (segmentCoordsRef.current.length >= 2) {
        const snappedPoint = getSnappedSafeCoordRef.current(pos.lng, pos.lat)
        marker.setLngLat(snappedPoint)
        onChangeCoordsRef.current({
          lng: Number(snappedPoint[0].toFixed(6)),
          lat: Number(snappedPoint[1].toFixed(6)),
        })
      } else {
        onChangeCoordsRef.current({
          lng: Number(pos.lng.toFixed(6)),
          lat: Number(pos.lat.toFixed(6)),
        })
      }
    }

    marker.on('drag', handleMarkerDrag)
    marker.on('dragend', handleMarkerDrag)

    // Click bản đồ để dời vị trí ghim (bám tim đường & tránh đè cột)
    map.on('click', (e: maplibregl.MapMouseEvent) => {
      if (segmentCoordsRef.current.length >= 2) {
        const snappedPoint = getSnappedSafeCoordRef.current(e.lngLat.lng, e.lngLat.lat)
        marker.setLngLat(snappedPoint)
        onChangeCoordsRef.current({
          lng: Number(snappedPoint[0].toFixed(6)),
          lat: Number(snappedPoint[1].toFixed(6)),
        })
      } else {
        const newPos: [number, number] = [
          Number(e.lngLat.lng.toFixed(6)),
          Number(e.lngLat.lat.toFixed(6)),
        ]
        marker.setLngLat(newPos)
        onChangeCoordsRef.current({ lng: newPos[0], lat: newPos[1] })
      }
    })

    map.on('load', () => {
      if (!isMounted) return

      setTimeout(() => {
        map.resize()
      }, 150)

      // 1. Source & layer vẽ tuyến đường
      if (!map.getSource('edit-segment-route')) {
        map.addSource('edit-segment-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: segmentCoordsRef.current,
            },
          },
        })

        map.addLayer({
          id: 'edit-segment-route-casing',
          type: 'line',
          source: 'edit-segment-route',
          paint: {
            'line-color': '#0284c7',
            'line-width': 7,
            'line-opacity': 0.6,
          },
        })

        map.addLayer({
          id: 'edit-segment-route-line',
          type: 'line',
          source: 'edit-segment-route',
          paint: {
            'line-color': '#38bdf8',
            'line-width': 4.5,
            'line-opacity': 0.95,
          },
        })
      }

      // 2. Source & layer vẽ các cột khác trên tuyến (chấm vàng)
      if (!map.getSource('other-segment-poles')) {
        map.addSource('other-segment-poles', {
          type: 'geojson',
          data: otherPolesGeoJSONRef.current,
        })

        map.addLayer({
          id: 'other-poles-circle',
          type: 'circle',
          source: 'other-segment-poles',
          paint: {
            'circle-color': '#fde047',
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 16, 5],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#0f172a',
          },
        })

        // Hover popup hiển thị mã cột khác
        map.on('mouseenter', 'other-poles-circle', (e: maplibregl.MapLayerMouseEvent) => {
          map.getCanvas().style.cursor = 'pointer'
          if (!e.features || !e.features[0]) return
          const feat = e.features[0]
          let coords: [number, number] = [e.lngLat.lng, e.lngLat.lat]
          if (feat.geometry && feat.geometry.type === 'Point' && Array.isArray(feat.geometry.coordinates)) {
            coords = [feat.geometry.coordinates[0], feat.geometry.coordinates[1]]
          }
          const code = feat.properties?.code || feat.properties?.id || 'Cột'

          if (!existingPolePopupRef.current) {
            existingPolePopupRef.current = new maplibregl.Popup({
              closeButton: false,
              closeOnClick: false,
              offset: 8,
            })
          }

          existingPolePopupRef.current
            .setLngLat(coords)
            .setHTML(
              `<div style="font-size: 11px; font-weight: 700; color: #0f172a; padding: 2px 4px; white-space: nowrap;">` +
                `💡 Cột khác: <span style="color: #2563eb;">${code}</span>` +
                `</div>`
            )
            .addTo(map)
        })

        map.on('mouseleave', 'other-poles-circle', () => {
          map.getCanvas().style.cursor = ''
          if (existingPolePopupRef.current) {
            existingPolePopupRef.current.remove()
          }
        })
      }

      // Fit bounds bao quát tuyến đường
      if (segmentCoordsRef.current.length >= 2) {
        const bounds = new maplibregl.LngLatBounds()
        segmentCoordsRef.current.forEach((coord) => bounds.extend(coord))
        bounds.extend([initialCenter[0], initialCenter[1]])
        map.fitBounds(bounds, { padding: 40, maxZoom: 18, duration: 600 })
      }
    })

    return () => {
      isMounted = false
      if (existingPolePopupRef.current) {
        existingPolePopupRef.current.remove()
        existingPolePopupRef.current = null
      }
      if (currentPoleMarkerRef.current) {
        currentPoleMarkerRef.current.remove()
        currentPoleMarkerRef.current = null
      }
      if (cabinetMarkerRef.current) {
        cabinetMarkerRef.current.remove()
        cabinetMarkerRef.current = null
      }
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Đồng bộ vị trí Marker khi lat / lng thay đổi từ ngoài form
  useEffect(() => {
    if (
      currentPoleMarkerRef.current &&
      Number.isFinite(lng) &&
      Number.isFinite(lat)
    ) {
      const currentPos = currentPoleMarkerRef.current.getLngLat()
      if (
        Math.abs(currentPos.lng - lng) > 0.000001 ||
        Math.abs(currentPos.lat - lat) > 0.000001
      ) {
        currentPoleMarkerRef.current.setLngLat([lng, lat])
      }
    }
  }, [lng, lat])

  const prevSegmentCoordsKeyRef = useRef<string>('')

  // 1. Cập nhật Route Line & Fit bounds CHỈ KHI tuyến đường (segmentCoords) thực sự thay đổi
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const coordsKey = segmentCoords.length > 0
      ? `${segmentCoords[0][0]},${segmentCoords[0][1]}-${segmentCoords.length}`
      : ''
    const isSegmentChanged = coordsKey !== prevSegmentCoordsKeyRef.current
    if (!isSegmentChanged) return
    prevSegmentCoordsKeyRef.current = coordsKey

    // Tự động snap cột về tuyến mới nếu nằm ngoài hoặc cách xa tuyến (> 50m)
    if (segmentCoords.length >= 2 && Number.isFinite(lng) && Number.isFinite(lat)) {
      const snapped = snapPointToPolyline([lng, lat], segmentCoords)
      if (snapped.distMeters > 50) {
        const targetPoint = segmentCoords[0]
        onChangeCoordsRef.current({
          lng: Number(targetPoint[0].toFixed(6)),
          lat: Number(targetPoint[1].toFixed(6)),
        })
        if (currentPoleMarkerRef.current) {
          currentPoleMarkerRef.current.setLngLat(targetPoint)
        }
      }
    }

    const updateRouteLayer = () => {
      const routeSource = map.getSource('edit-segment-route') as maplibregl.GeoJSONSource | undefined
      if (routeSource) {
        routeSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: segmentCoords,
          },
        })
      }

      if (segmentCoords.length >= 2) {
        const bounds = new maplibregl.LngLatBounds()
        segmentCoords.forEach((coord) => bounds.extend(coord))
        map.fitBounds(bounds, { padding: 40, maxZoom: 18, duration: 600 })
      }
    }

    if (map.isStyleLoaded()) {
      updateRouteLayer()
    } else {
      map.once('load', updateRouteLayer)
    }
  }, [segmentCoords, lat, lng])

  // 2. Cập nhật Other Poles layer khi danh sách cột khác thay đổi (tuyệt đối KHÔNG gọi fitBounds)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const updatePolesLayer = () => {
      const polesSource = map.getSource('other-segment-poles') as maplibregl.GeoJSONSource | undefined
      if (polesSource) {
        polesSource.setData(otherPolesGeoJSON)
      }
    }

    if (map.isStyleLoaded()) {
      updatePolesLayer()
    } else {
      map.once('load', updatePolesLayer)
    }
  }, [otherPolesGeoJSON])

  // Render Marker tủ điện quản lý khi có currentCabinet
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (cabinetMarkerRef.current) {
      cabinetMarkerRef.current.remove()
      cabinetMarkerRef.current = null
    }

    if (
      currentCabinet &&
      currentCabinet.location &&
      Number.isFinite(currentCabinet.location.lng) &&
      Number.isFinite(currentCabinet.location.lat)
    ) {
      const cabEl = document.createElement('div')
      cabEl.className = 'cabinet-marker select-none pointer-events-none'
      cabEl.style.width = '0px'
      cabEl.style.height = '0px'
      cabEl.style.position = 'relative'
      cabEl.innerHTML = `
        <div style="position: absolute; top: -14px; left: -14px; width: 28px; height: 28px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border: 2.5px solid #ffffff; border-radius: 9px; display: flex; align-items: center; justify-content: center; color: #fbbf24; font-size: 13px; font-weight: 800; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.6), 0 2px 6px rgba(0,0,0,0.4); z-index: 2;">
          ⚡
        </div>
        <div style="position: absolute; top: 17px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.92); color: #ffffff; padding: 1.5px 6px; border-radius: 5px; font-size: 9.5px; font-weight: 700; white-space: nowrap; border: 1px solid rgba(255,255,255,0.25); box-shadow: 0 2px 4px rgba(0,0,0,0.5); z-index: 1;">
          ${currentCabinet.cabinet_name || currentCabinet.external_ref || 'Tủ'}
        </div>
      `
      const cabMarker = new maplibregl.Marker({
        element: cabEl,
        anchor: 'center',
      })
        .setLngLat([currentCabinet.location.lng, currentCabinet.location.lat])
        .addTo(map)

      cabinetMarkerRef.current = cabMarker
    }
  }, [currentCabinet])

  return (
    <div className="md:col-span-7 flex flex-col h-80 md:h-auto min-h-[360px] relative bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map overlay legend */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 shadow-lg text-[11px] text-white space-y-1.5 pointer-events-none">
        <div className="font-bold flex items-center gap-1.5 text-xs text-amber-400">
          <Layers className="w-3.5 h-3.5" />
          <span>Bản Đồ Ngữ Cảnh Tuyến</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white"></span>
          <span>Cột đang sửa (Kéo để dời vị trí)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-300 ring-1 ring-slate-900"></span>
          <span>Các cột khác trên tuyến</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 bg-sky-400 rounded-full"></span>
          <span>Tim đường chiếu sáng</span>
        </div>
        {currentCabinet && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 flex items-center justify-center text-[8px]">⚡</span>
            <span>Tủ điện: {currentCabinet.cabinet_name || currentCabinet.cabinet_id}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default EditPoleMap
