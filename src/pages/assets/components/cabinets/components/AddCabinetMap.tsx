import React, { useEffect, useRef, useMemo } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Layers } from 'lucide-react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../../../redux/rootReducer'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import {
  GOOGLE_HYBRID_STYLE,
  DEFAULT_MAP_CENTER,
  applyMapBoundsLimits,
  MAP_MAX_ZOOM,
  FIT_BOUNDS_ASSET_ADD_INSTANT,
} from '../../../../../utils/gis-map/mapUtils'

export interface CabinetRowDraft {
  rowId: string
  cabinet_id: string
  cabinet_name: string
  lat: string
  lng: string
}

export interface AddCabinetMapProps {
  segmentCoords?: [number, number][]
  existingCabinets?: CabinetListItem[]
  rows: CabinetRowDraft[]
  selectedRowId: string | null
  onSelectRow: (rowId: string) => void
  onUpdateCoords: (rowId: string, coords: { lat: number; lng: number }) => void
  onMapClickAdd?: (coords: { lat: number; lng: number }) => void
}

export const AddCabinetMap: React.FC<AddCabinetMapProps> = ({
  segmentCoords = [],
  existingCabinets = [],
  rows,
  selectedRowId,
  onSelectRow,
  onUpdateCoords,
  onMapClickAdd,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map())

  const mapBounds = useSelector((state: RootState) => state?.auth?.user?.mapBounds)
  const mapSegments = useSelector((state: RootState) => state.map.segments)

  // GeoJSON toàn bộ các tuyến đường trên GIS
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
    return {
      type: 'FeatureCollection',
      features,
    }
  }, [mapSegments])

  const rowsRef = useRef(rows)
  rowsRef.current = rows

  const segmentCoordsRef = useRef(segmentCoords)
  segmentCoordsRef.current = segmentCoords

  const existingCabinetsRef = useRef(existingCabinets)
  existingCabinetsRef.current = existingCabinets

  const allRoutesGeoJsonRef = useRef(allRoutesGeoJson)
  allRoutesGeoJsonRef.current = allRoutesGeoJson

  const existingCabinetMarkersRef = useRef<maplibregl.Marker[]>([])

  const selectedRowIdRef = useRef(selectedRowId)
  selectedRowIdRef.current = selectedRowId

  const onUpdateCoordsRef = useRef(onUpdateCoords)
  onUpdateCoordsRef.current = onUpdateCoords

  const onMapClickAddRef = useRef(onMapClickAdd)
  onMapClickAddRef.current = onMapClickAdd

  // Khởi tạo bản đồ
  useEffect(() => {
    if (!mapContainerRef.current) return

    let isMounted = true

    let initialCenter: [number, number] =
      typeof mapBounds?.center?.lng === 'number' &&
      typeof mapBounds?.center?.lat === 'number' &&
      Number.isFinite(mapBounds.center.lng) &&
      Number.isFinite(mapBounds.center.lat)
        ? [mapBounds.center.lng, mapBounds.center.lat]
        : DEFAULT_MAP_CENTER

    if (segmentCoordsRef.current.length >= 2) {
      initialCenter = segmentCoordsRef.current[0]
    } else if (existingCabinetsRef.current.length > 0 && existingCabinetsRef.current[0].location) {
      initialCenter = [existingCabinetsRef.current[0].location.lng, existingCabinetsRef.current[0].location.lat]
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: GOOGLE_HYBRID_STYLE,
      center: initialCenter,
      zoom: 16,
      maxZoom: MAP_MAX_ZOOM,
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

    map.on('click', (e: maplibregl.MapMouseEvent) => {
      const clickedLng = Number(e.lngLat.lng.toFixed(6))
      const clickedLat = Number(e.lngLat.lat.toFixed(6))

      const currentSelectedId = selectedRowIdRef.current
      const currentRows = rowsRef.current

      if (currentSelectedId) {
        onUpdateCoordsRef.current(currentSelectedId, { lat: clickedLat, lng: clickedLng })
      } else if (currentRows.length > 0) {
        // Cập nhật hàng cuối cùng
        const lastRow = currentRows[currentRows.length - 1]
        onUpdateCoordsRef.current(lastRow.rowId, { lat: clickedLat, lng: clickedLng })
      } else if (onMapClickAddRef.current) {
        onMapClickAddRef.current({ lat: clickedLat, lng: clickedLng })
      }
    })

    map.on('load', () => {
      if (!isMounted) return

      applyMapBoundsLimits(map, mapBounds)

      setTimeout(() => {
        map.resize()
      }, 150)

      // 0. Toàn bộ các tuyến đường trên GIS (Đường nền)
      if (!map.getSource('add-cabinet-all-routes')) {
        map.addSource('add-cabinet-all-routes', {
          type: 'geojson',
          data: allRoutesGeoJsonRef.current,
        })

        map.addLayer({
          id: 'add-cabinet-all-routes-glow',
          type: 'line',
          source: 'add-cabinet-all-routes',
          paint: {
            'line-color': '#475569',
            'line-width': 4.5,
            'line-opacity': 0.4,
          },
        })

        map.addLayer({
          id: 'add-cabinet-all-routes-core',
          type: 'line',
          source: 'add-cabinet-all-routes',
          paint: {
            'line-color': '#94a3b8',
            'line-width': 2.5,
            'line-opacity': 0.75,
          },
        })
      }

      // 1. Tuyến đường được chọn (Highlight)
      if (!map.getSource('add-cabinet-route')) {
        map.addSource('add-cabinet-route', {
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
          id: 'add-cabinet-route-glow',
          type: 'line',
          source: 'add-cabinet-route',
          paint: {
            'line-color': '#0284c7',
            'line-width': 7,
            'line-opacity': 0.6,
          },
        })

        map.addLayer({
          id: 'add-cabinet-route-core',
          type: 'line',
          source: 'add-cabinet-route',
          paint: {
            'line-color': '#38bdf8',
            'line-width': 3.5,
            'line-opacity': 0.95,
          },
        })

        if (segmentCoordsRef.current.length >= 2) {
          const bounds = new maplibregl.LngLatBounds()
          segmentCoordsRef.current.forEach((pt) => bounds.extend(pt))
          map.fitBounds(bounds, FIT_BOUNDS_ASSET_ADD_INSTANT)
        }
      }

      // 2. Tủ điện hiện hữu làm ngữ cảnh
      existingCabinetsRef.current.forEach((c) => {
        if (c.location && Number.isFinite(c.location.lng) && Number.isFinite(c.location.lat)) {
          const el = document.createElement('div')
          el.style.cssText = `
            width: 20px;
            height: 20px;
            background: #475569;
            border: 1.5px solid #ffffff;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #cbd5e1;
            font-size: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.4);
            opacity: 0.7;
          `
          el.innerHTML = '⚡'

          const marker = new maplibregl.Marker({
            element: el,
            anchor: 'center',
          })
            .setLngLat([c.location.lng, c.location.lat])
            .addTo(map)

          existingCabinetMarkersRef.current.push(marker)
        }
      })
    })

    return () => {
      isMounted = false
      resizeObserver?.disconnect()
      markersRef.current.forEach((m) => m.remove())
      markersRef.current.clear()
      existingCabinetMarkersRef.current.forEach((m) => m.remove())
      existingCabinetMarkersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [mapBounds])

  // Cập nhật Bbox và minZoom khi mapBounds từ Redux thay đổi
  useEffect(() => {
    if (mapRef.current) {
      applyMapBoundsLimits(mapRef.current, mapBounds)
    }
  }, [mapBounds])

  // Cập nhật Markers cho các hàng tủ trong rows
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const existingIds = new Set<string>()

    rows.forEach((row, idx) => {
      existingIds.add(row.rowId)
      const latNum = parseFloat(row.lat)
      const lngNum = parseFloat(row.lng)

      if (isNaN(latNum) || isNaN(lngNum) || latNum === 0 || lngNum === 0) return

      const isSelected = row.rowId === selectedRowId
      const letter = String.fromCharCode(65 + (idx % 26))

      let marker = markersRef.current.get(row.rowId)

      if (!marker) {
        const el = document.createElement('div')
        el.className = 'add-cabinet-marker cursor-grab active:cursor-grabbing select-none'
        el.innerHTML = `
          <div style="
            width: 30px;
            height: 30px;
            background: ${isSelected ? '#9333ea' : '#7c3aed'};
            border: 2.5px solid #ffffff;
            border-radius: 9px;
            box-shadow: ${isSelected ? '0 0 0 3px #c084fc, 0 0 16px rgba(168, 85, 247, 0.9)' : '0 0 0 2px #6d28d9, 0 0 10px rgba(124, 58, 237, 0.7)'};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fde047;
            font-size: 13px;
            font-weight: 900;
            transition: all 0.15s ease;
          ">⚡${letter}</div>
        `

        el.addEventListener('click', (e) => {
          e.stopPropagation()
          onSelectRow(row.rowId)
        })

        marker = new maplibregl.Marker({
          element: el,
          draggable: true,
          anchor: 'center',
        })
          .setLngLat([lngNum, latNum])
          .addTo(map)

        marker.on('dragend', () => {
          const pos = marker!.getLngLat()
          onUpdateCoordsRef.current(row.rowId, {
            lat: Number(pos.lat.toFixed(6)),
            lng: Number(pos.lng.toFixed(6)),
          })
        })

        markersRef.current.set(row.rowId, marker)
      } else {
        // Cập nhật vị trí & style
        marker.setLngLat([lngNum, latNum])
        const inner = marker.getElement().querySelector('div')
        if (inner) {
          inner.style.background = isSelected ? '#9333ea' : '#7c3aed'
          inner.style.boxShadow = isSelected
            ? '0 0 0 3px #c084fc, 0 0 16px rgba(168, 85, 247, 0.9)'
            : '0 0 0 2px #6d28d9, 0 0 10px rgba(124, 58, 237, 0.7)'
          inner.innerHTML = `⚡${letter}`
        }
      }
    })

    // Xóa các marker của row đã bị xóa
    markersRef.current.forEach((marker, id) => {
      if (!existingIds.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
      }
    })
  }, [rows, selectedRowId, onSelectRow])

  // Cập nhật GeoJSON toàn bộ các tuyến đường khi mapSegments thay đổi
  useEffect(() => {
    if (!mapRef.current) return
    const src = mapRef.current.getSource('add-cabinet-all-routes') as maplibregl.GeoJSONSource
    if (src) {
      src.setData(allRoutesGeoJson)
    }
  }, [allRoutesGeoJson])

  // Cập nhật GeoJSON tuyến đường active khi segmentCoords thay đổi
  useEffect(() => {
    if (!mapRef.current) return
    const src = mapRef.current.getSource('add-cabinet-route') as maplibregl.GeoJSONSource
    if (src) {
      src.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: segmentCoords.length >= 2 ? segmentCoords : [],
        },
      })
      if (segmentCoords.length >= 2) {
        const bounds = new maplibregl.LngLatBounds()
        segmentCoords.forEach((pt) => bounds.extend(pt))
        mapRef.current.fitBounds(bounds, FIT_BOUNDS_ASSET_ADD_INSTANT)
      }
    }
  }, [segmentCoords])

  return (
    <div className="relative w-full h-full min-h-[380px] md:min-h-[500px] bg-slate-900 overflow-hidden rounded-2xl md:rounded-r-3xl md:rounded-l-none border border-slate-700/60 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Legend & Chú thích */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-lg text-[11px] text-white max-w-[270px] space-y-1.5 select-none pointer-events-none">
        <div className="flex items-center gap-1.5 font-bold text-amber-300 pb-1 border-b border-slate-700/60">
          <Layers className="w-3.5 h-3.5" />
          <span>Bản Đồ Định Vị Tủ Điện GIS</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-purple-600 border border-white flex items-center justify-center text-[10px] text-yellow-300 font-bold shrink-0">
            ⚡A
          </div>
          <span className="text-slate-200 font-medium">Tủ điện mới khai báo (Kéo để chỉnh)</span>
        </div>
        <p className="text-[10px] text-purple-200/80 pt-1 italic border-t border-slate-800">
          💡 Click trên ảnh vệ tinh để tự động gán tọa độ cho tủ đang chọn.
        </p>
      </div>
    </div>
  )
}
