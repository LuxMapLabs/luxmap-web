import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  PlusCircle,
  X,
  MapPin,
  CheckCircle2,
  Trash2,
  Route,
  Layers,
  AlertCircle,
  Zap,
} from 'lucide-react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { GOOGLE_HYBRID_STYLE, DEFAULT_MAP_CENTER } from '../../../../utils/gis-map/mapUtils'
import {
  snapPointToPolyline,
  parseLineStringWkt,
  calculateDistanceMeters,
  calculateRouteLengthMeters,
} from '../../../../utils/gis-map/routeUtils'
import { fetchMapLayersRequest } from '../../../../feature/map/mapSlice'
import type { RootState } from '../../../../redux/rootReducer'
import type { PoleListItem } from '../../../../types/assets/poles'
import type { SegmentListItem } from '../../../../types/assets/segments'
import type { CabinetListItem } from '../../../../types/assets/cabinets'

interface AddPoleModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPole?: (data: PoleListItem) => void
  onAddPoles: (poles: PoleListItem[]) => void
  existingPoleCount: number
  availableSegments?: SegmentListItem[]
  availableCabinets?: CabinetListItem[]
}

interface PoleRowDraft {
  rowId: string
  pole_id: string
  lat: string
  lng: string
  note: string
  near_sensitive_poi: boolean
}

const DEFAULT_SEGMENTS: SegmentListItem[] = [
  {
    segment_id: 'SEG-001',
    external_ref: 'SEG-001',
    segment_name: 'Tuyến A - Tỉnh Lộ 8',
    road_class: 'inter_commune',
    length_m: 1200,
    commune_id: 'COM-001',
    data_source: 'field',
    pole_count: 46,
    updated_at: null,
  },
  {
    segment_id: 'SEG-002',
    external_ref: 'SEG-002',
    segment_name: 'Tuyến B - Nguyễn Văn Ni',
    road_class: 'inter_commune',
    length_m: 850,
    commune_id: 'COM-001',
    data_source: 'field',
    pole_count: 31,
    updated_at: null,
  },
  {
    segment_id: 'SEG-003',
    external_ref: 'SEG-003',
    segment_name: 'Tuyến C - Huỳnh Văn Cọ',
    road_class: 'inter_village',
    length_m: 720,
    commune_id: 'COM-001',
    data_source: 'field',
    pole_count: 26,
    updated_at: null,
  },
]

export const AddPoleModal: React.FC<AddPoleModalProps> = ({
  isOpen,
  onClose,
  onAddPole,
  onAddPoles,
  existingPoleCount,
  availableSegments,
  availableCabinets,
}) => {
  const segmentList = availableSegments && availableSegments.length > 0 ? availableSegments : DEFAULT_SEGMENTS

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersMapRef = useRef<Map<string, maplibregl.Marker>>(new Map())
  const cabinetMarkerRef = useRef<maplibregl.Marker | null>(null)
  const existingPolePopupRef = useRef<maplibregl.Popup | null>(null)

  // Redux Store Data & Actions
  const dispatch = useDispatch()
  const mapSegments = useSelector((state: RootState) => state.map.segments)
  const mapPoles = useSelector((state: RootState) => state.map.poles)
  const allPoles = useSelector((state: RootState) => state.assets.poles)

  useEffect(() => {
    if (isOpen && mapSegments.length === 0) {
      dispatch(fetchMapLayersRequest())
    }
  }, [isOpen, mapSegments.length, dispatch])

  // Top Section States
  const [selectedSegmentId, setSelectedSegmentId] = useState('')
  const [selectedCabinetId, setSelectedCabinetId] = useState('')

  // Bottom Section: Pole Rows State
  const [rows, setRows] = useState<PoleRowDraft[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Current active metadata
  const currentSegment = segmentList.find((s) => s.segment_id === selectedSegmentId)

  // Merged existing poles belonging to the currently selected segment (allPoles + mapPoles)
  const existingPolesOnSegment = useMemo(() => {
    if (!selectedSegmentId) return []

    const polesMap = new Map<
      string,
      {
        pole_id: string
        code: string
        segment_id: string
        lat: number
        lng: number
        cabinet_id?: string | null
      }
    >()

    // 1. From allPoles (state.assets.poles)
    allPoles.forEach((p) => {
      if (
        p.segment_id === selectedSegmentId &&
        p.location &&
        Number.isFinite(p.location.lat) &&
        Number.isFinite(p.location.lng)
      ) {
        const id = p.pole_id || p.external_ref || `${p.location.lng.toFixed(6)}-${p.location.lat.toFixed(6)}`
        polesMap.set(id, {
          pole_id: p.pole_id || id,
          code: p.external_ref || p.pole_id || id,
          segment_id: p.segment_id,
          lat: p.location.lat,
          lng: p.location.lng,
          cabinet_id: p.cabinet_id || p.feeder_id || null,
        })
      }
    })

    // 2. From mapPoles (state.map.poles PostGIS GIS)
    mapPoles.forEach((mp) => {
      if (
        mp.properties?.segment_id === selectedSegmentId &&
        mp.geometry?.type === 'Point' &&
        Array.isArray(mp.geometry.coordinates) &&
        mp.geometry.coordinates.length >= 2 &&
        Number.isFinite(mp.geometry.coordinates[0]) &&
        Number.isFinite(mp.geometry.coordinates[1])
      ) {
        const lng = mp.geometry.coordinates[0]
        const lat = mp.geometry.coordinates[1]
        const id = mp.properties.pole_id || `${lng.toFixed(6)}-${lat.toFixed(6)}`
        if (!polesMap.has(id)) {
          polesMap.set(id, {
            pole_id: id,
            code: id,
            segment_id: mp.properties.segment_id,
            lat,
            lng,
            cabinet_id: null,
          })
        }
      }
    })

    return Array.from(polesMap.values())
  }, [allPoles, mapPoles, selectedSegmentId])

  const existingPolesGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: existingPolesOnSegment.map((p) => ({
        type: 'Feature' as const,
        properties: {
          id: p.pole_id,
          code: p.code,
          segment_id: p.segment_id,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lng, p.lat] as [number, number],
        },
      })),
    }
  }, [existingPolesOnSegment])

  const existingPolesGeoJSONRef = useRef(existingPolesGeoJSON)
  existingPolesGeoJSONRef.current = existingPolesGeoJSON

  // Filter cabinets belonging to or connected with the selected segment
  const availableCabinetsOnSegment = useMemo(() => {
    if (!selectedSegmentId || !availableCabinets) return []

    // 1. Lấy ID các tủ mà các cột trong tuyến này đang cấp nguồn
    const connectedCabinetIds = new Set<string>()
    allPoles
      .filter((p) => p.segment_id === selectedSegmentId)
      .forEach((p) => {
        if (p.cabinet_id) connectedCabinetIds.add(p.cabinet_id)
        if (p.feeder_id) connectedCabinetIds.add(p.feeder_id)
      })

    existingPolesOnSegment.forEach((p) => {
      if (p.cabinet_id) connectedCabinetIds.add(p.cabinet_id)
    })

    // 2. Lọc theo ID kết nối hoặc theo từ khóa tên tuyến
    const segKeyword = currentSegment?.segment_name?.split(' - ')[1]?.toLowerCase() || ''
    return availableCabinets.filter((cab) => {
      if (
        (cab.cabinet_id && connectedCabinetIds.has(cab.cabinet_id)) ||
        (cab.external_ref && connectedCabinetIds.has(cab.external_ref))
      ) {
        return true
      }
      if (segKeyword && cab.cabinet_name?.toLowerCase().includes(segKeyword)) return true
      return false
    })
  }, [availableCabinets, selectedSegmentId, allPoles, existingPolesOnSegment, currentSegment])

  const currentCabinet = availableCabinetsOnSegment.find(
    (c) => c.cabinet_id === selectedCabinetId || c.external_ref === selectedCabinetId
  )

  // Extract real coordinates of current route
  const segmentCoords = useMemo<[number, number][]>(() => {
    if (!selectedSegmentId) return []

    // 1. Ưu tiên lấy LineString thật từ mapSegments (dữ liệu PostGIS Backend)
    const mapSeg = mapSegments.find(
      (s) => s.properties?.segment_id === selectedSegmentId || (s as any).id === selectedSegmentId
    )
    if (mapSeg && mapSeg.geometry?.type === 'LineString' && Array.isArray(mapSeg.geometry.coordinates)) {
      const valid = mapSeg.geometry.coordinates.filter(
        (c) => Array.isArray(c) && c.length === 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])
      ) as [number, number][]
      if (valid.length >= 2) return valid
    }

    // 2. Nếu currentSegment có geom_wkt
    if (currentSegment && (currentSegment as any).geom_wkt) {
      const parsed = parseLineStringWkt((currentSegment as any).geom_wkt)
      if (parsed.length >= 2) return parsed
    }

    // 3. Nếu tuyến đã có cột đèn thực tế trong DB, lấy lộ trình nối qua các cột đèn
    const segPoles = allPoles
      .filter(
        (p) =>
          p.segment_id === selectedSegmentId &&
          p.location &&
          Number.isFinite(p.location.lat) &&
          Number.isFinite(p.location.lng)
      )
      .sort((a, b) =>
        (a.external_ref || '').localeCompare(b.external_ref || '', undefined, { numeric: true })
      )
      .map((p) => [p.location.lng, p.location.lat] as [number, number])
    if (segPoles.length >= 2) return segPoles

    return []
  }, [selectedSegmentId, mapSegments, currentSegment, allPoles])

  // Keep refs synchronized for event callbacks
  const selectedSegmentIdRef = useRef(selectedSegmentId)
  selectedSegmentIdRef.current = selectedSegmentId
  const segmentCoordsRef = useRef<[number, number][]>([])
  segmentCoordsRef.current = segmentCoords
  const rowsRef = useRef<PoleRowDraft[]>([])
  rowsRef.current = rows
  const existingPolesOnSegmentRef = useRef(existingPolesOnSegment)
  existingPolesOnSegmentRef.current = existingPolesOnSegment

  // Handle segment change: reset cabinet selection
  const handleSegmentChange = (newSegmentId: string) => {
    setSelectedSegmentId(newSegmentId)
    setSelectedCabinetId('')
    setErrorMsg(null)
  }

  // Reset all fields to empty/null when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null)
      setSelectedSegmentId('')
      setSelectedCabinetId('')
      setRows([])
    }
  }, [isOpen])

  // Helper: Interpolate coordinates along polyline given target distance in meters
  const getPointAtDistanceAlongPolyline = (
    coords: [number, number][],
    distMeters: number
  ): [number, number] => {
    if (!coords || coords.length === 0) return [0, 0]
    if (coords.length === 1 || distMeters <= 0) return coords[0]

    let accum = 0
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i]
      const p2 = coords[i + 1]
      const segLen = calculateDistanceMeters(p1, p2)
      if (accum + segLen >= distMeters) {
        const remain = distMeters - accum
        const t = segLen === 0 ? 0 : remain / segLen
        return [
          Math.round((p1[0] + t * (p2[0] - p1[0])) * 1000000) / 1000000,
          Math.round((p1[1] + t * (p2[1] - p1[1])) * 1000000) / 1000000,
        ]
      }
      accum += segLen
    }
    return coords[coords.length - 1]
  }

  // Helper: Anti-Collision Leapfrog to avoid overlapping existing or draft poles
  const resolveNonOverlappingRoutePoint = useCallback(
    (rawLng: number, rawLat: number, excludeRowId?: string): [number, number] => {
      const coords = segmentCoordsRef.current
      if (!coords || coords.length < 2) return [rawLng, rawLat]

      const snap = snapPointToPolyline([rawLng, rawLat], coords)
      const mouseDist = snap.accumulatedDist
      let targetDist = mouseDist

      // Gather obstacle points
      const obstaclePoints: [number, number][] = []

      // 1. Existing poles on segment
      existingPolesOnSegmentRef.current.forEach((p) => {
        if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
          obstaclePoints.push([p.lng, p.lat])
        }
      })

      // 2. Draft pole rows (excluding current row being dragged)
      rowsRef.current.forEach((r) => {
        if (r.rowId !== excludeRowId) {
          const lat = parseFloat(r.lat)
          const lng = parseFloat(r.lng)
          if (!isNaN(lat) && !isNaN(lng)) {
            obstaclePoints.push([lng, lat])
          }
        }
      })

      if (obstaclePoints.length === 0) {
        return snap.snappedPoint
      }

      // Convert obstacles to distance along polyline
      const obstacleDists = obstaclePoints
        .map((pt) => snapPointToPolyline(pt, coords).accumulatedDist)
        .sort((a, b) => a - b)

      const MIN_CLEARANCE = 15 // meters: khoảng cách an toàn tối thiểu tránh đè cột

      // Build & merge overlapping forbidden intervals [d - MIN_CLEARANCE, d + MIN_CLEARANCE]
      const rawIntervals = obstacleDists.map((d) => [
        Math.max(0, d - MIN_CLEARANCE),
        d + MIN_CLEARANCE,
      ] as [number, number])

      const mergedIntervals: [number, number][] = []
      for (const cur of rawIntervals) {
        if (mergedIntervals.length === 0) {
          mergedIntervals.push([...cur])
        } else {
          const prev = mergedIntervals[mergedIntervals.length - 1]
          if (cur[0] <= prev[1]) {
            prev[1] = Math.max(prev[1], cur[1])
          } else {
            mergedIntervals.push([...cur])
          }
        }
      }

      const totalLen = calculateRouteLengthMeters(coords)

      // Push targetDist outside forbidden intervals
      let iterations = 0
      while (iterations < 10) {
        iterations++
        const inside = mergedIntervals.find(
          ([start, end]) => targetDist >= start - 0.0001 && targetDist <= end + 0.0001
        )
        if (!inside) break

        const [start, end] = inside
        const mid = (start + end) / 2

        if (start <= 0.1 && end >= totalLen - 0.1) {
          break
        }

        if (start <= 0.1) {
          targetDist = end + 0.05
        } else if (end >= totalLen - 0.1) {
          targetDist = Math.max(0, start - 0.05)
        } else if (mouseDist >= mid) {
          targetDist = end + 0.05
        } else {
          targetDist = Math.max(0, start - 0.05)
        }
      }

      return getPointAtDistanceAlongPolyline(coords, targetDist)
    },
    []
  )

  // Helper: Snap coordinate onto route with anti-collision leapfrog and add a new pole row
  const addPoleAtPoint = useCallback(
    (rawLng: number, rawLat: number) => {
      setErrorMsg(null)
      if (!selectedSegmentIdRef.current || segmentCoordsRef.current.length < 2) {
        setErrorMsg('Vui lòng chọn Tuyến đường áp dụng ở mục 1 trước khi cắm cột đèn!')
        return
      }

      const [snappedLng, snappedLat] = resolveNonOverlappingRoutePoint(rawLng, rawLat)

      const newRow: PoleRowDraft = {
        rowId: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        pole_id: '',
        lat: snappedLat.toFixed(6),
        lng: snappedLng.toFixed(6),
        note: '',
        near_sensitive_poi: false,
      }

      setRows((prev) => [...prev, newRow])
    },
    [resolveNonOverlappingRoutePoint]
  )

  // Handler: Add New Pole Row via button
  const handleAddRow = () => {
    setErrorMsg(null)

    if (!selectedSegmentId) {
      setErrorMsg('Vui lòng chọn Tuyến đường áp dụng ở mục 1 trước khi thêm cột đèn!')
      return
    }

    if (!selectedCabinetId) {
      setErrorMsg('Vui lòng chọn Tủ điện điều khiển trực tiếp quản lý các cột đèn này!')
      return
    }

    if (segmentCoords.length < 2) {
      setErrorMsg('Tuyến đường được chọn chưa có dữ liệu tọa độ tim đường!')
      return
    }

    const totalLength = calculateRouteLengthMeters(segmentCoords)

    // If rows already exist, place the new pole 35m ahead along the centerline
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1]
      const lastLat = parseFloat(lastRow.lat)
      const lastLng = parseFloat(lastRow.lng)
      if (!isNaN(lastLat) && !isNaN(lastLng)) {
        const snap = snapPointToPolyline([lastLng, lastLat], segmentCoords)
        const lastDist = snap.accumulatedDist
        let targetDist = lastDist + 35
        if (targetDist > totalLength) {
          // If exceeded route length, step back or find available spot
          targetDist = Math.max(0, lastDist - 35)
          if (targetDist === 0) {
            targetDist = totalLength * 0.5
          }
        }
        const candidatePt = getPointAtDistanceAlongPolyline(segmentCoords, targetDist)
        addPoleAtPoint(candidatePt[0], candidatePt[1])
        return
      }
    }

    // Default: start at the first point of the route
    addPoleAtPoint(segmentCoords[0][0], segmentCoords[0][1])
  }

  // Handler: Delete row
  const handleDeleteRow = (rowId: string) => {
    const marker = markersMapRef.current.get(rowId)
    if (marker) {
      marker.remove()
      markersMapRef.current.delete(rowId)
    }
    setRows((prev) => prev.filter((r) => r.rowId !== rowId))
  }

  // Handler: Update specific field in row
  const handleUpdateRow = (rowId: string, field: keyof PoleRowDraft, value: any) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r))
    )
  }

  // Initialize MapLibre satellite map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: GOOGLE_HYBRID_STYLE,
      center: DEFAULT_MAP_CENTER,
      zoom: 14.5,
      attributionControl: false,
    })

    mapRef.current = map

    map.on('load', () => {
      setTimeout(() => {
        map.resize()
      }, 100)
      // Add route line source
      if (!map.getSource('segment-route')) {
        map.addSource('segment-route', {
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

        // Outer glow/casing
        map.addLayer({
          id: 'segment-route-casing',
          type: 'line',
          source: 'segment-route',
          paint: {
            'line-color': '#0284c7',
            'line-width': 7,
            'line-opacity': 0.6,
          },
        })

        // Inner bright route line
        map.addLayer({
          id: 'segment-route-line',
          type: 'line',
          source: 'segment-route',
          paint: {
            'line-color': '#38bdf8',
            'line-width': 4.5,
            'line-opacity': 0.95,
          },
        })
      }

      // Add existing poles on segment source & layers
      if (!map.getSource('existing-segment-poles')) {
        map.addSource('existing-segment-poles', {
          type: 'geojson',
          data: existingPolesGeoJSONRef.current,
        })

        // Subtle glow halo
        map.addLayer({
          id: 'existing-poles-glow',
          type: 'circle',
          source: 'existing-segment-poles',
          paint: {
            'circle-color': '#eab308',
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 5, 16, 8],
            'circle-opacity': 0.45,
            'circle-blur': 0.5,
          },
        })

        // Warm LED yellow circle
        map.addLayer({
          id: 'existing-poles-circle',
          type: 'circle',
          source: 'existing-segment-poles',
          paint: {
            'circle-color': '#fde047',
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 16, 5],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff',
          },
        })

        // Hover events for tooltip popup
        map.on('mouseenter', 'existing-poles-circle', (e) => {
          map.getCanvas().style.cursor = 'pointer'
          if (!e.features || !e.features[0]) return

          const feat = e.features[0]
          const coords =
            feat.geometry && 'coordinates' in feat.geometry
              ? ((feat.geometry as any).coordinates as [number, number])
              : [e.lngLat.lng, e.lngLat.lat]
          const code = feat.properties?.code || feat.properties?.id || 'Cột'

          if (!existingPolePopupRef.current) {
            existingPolePopupRef.current = new maplibregl.Popup({
              closeButton: false,
              closeOnClick: false,
              offset: 8,
              className: 'existing-pole-hover-popup',
            })
          }

          existingPolePopupRef.current
            .setLngLat(coords as [number, number])
            .setHTML(
              `<div style="font-family: inherit; font-size: 11px; font-weight: 700; color: #0f172a; padding: 2px 4px; white-space: nowrap;">` +
                `💡 Cột hiện hữu: <span style="color: #2563eb;">${code}</span>` +
                `</div>`
            )
            .addTo(map)
        })

        map.on('mouseleave', 'existing-poles-circle', () => {
          map.getCanvas().style.cursor = ''
          if (existingPolePopupRef.current) {
            existingPolePopupRef.current.remove()
          }
        })
      }

      // Initial fit bounds
      if (segmentCoordsRef.current.length >= 2) {
        const bounds = new maplibregl.LngLatBounds()
        segmentCoordsRef.current.forEach((coord) => bounds.extend(coord))
        map.fitBounds(bounds, { padding: 40, maxZoom: 18, duration: 0 })
      }
    })

    // Click map to snap & add pole
    map.on('click', (e) => {
      if (!selectedSegmentIdRef.current || segmentCoordsRef.current.length < 2) return
      addPoleAtPoint(e.lngLat.lng, e.lngLat.lat)
    })

    return () => {
      if (existingPolePopupRef.current) {
        existingPolePopupRef.current.remove()
        existingPolePopupRef.current = null
      }
      markersMapRef.current.forEach((marker) => marker.remove())
      markersMapRef.current.clear()
      if (cabinetMarkerRef.current) {
        cabinetMarkerRef.current.remove()
        cabinetMarkerRef.current = null
      }
      map.remove()
      mapRef.current = null
    }
  }, [isOpen, addPoleAtPoint])

  // Synchronize existing poles GeoJSON data when selected segment or allPoles changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const updatePolesSource = () => {
      const source = map.getSource('existing-segment-poles') as maplibregl.GeoJSONSource | undefined
      if (source) {
        source.setData(existingPolesGeoJSON)
      }
    }

    const source = map.getSource('existing-segment-poles') as maplibregl.GeoJSONSource | undefined
    if (source) {
      updatePolesSource()
    } else if (map.isStyleLoaded()) {
      updatePolesSource()
    } else {
      map.once('load', updatePolesSource)
    }
  }, [existingPolesGeoJSON])

  // Update route polyline data and fit bounds when segmentCoords changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const updateSourceAndFit = () => {
      const source = map.getSource('segment-route') as maplibregl.GeoJSONSource | undefined
      if (source) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: segmentCoords.length >= 2 ? segmentCoords : [],
          },
        })
      }

      if (segmentCoords.length >= 2) {
        const bounds = new maplibregl.LngLatBounds()
        segmentCoords.forEach((coord) => bounds.extend(coord))
        map.fitBounds(bounds, { padding: 40, maxZoom: 18, duration: 600 })
      }
    }

    const source = map.getSource('segment-route') as maplibregl.GeoJSONSource | undefined
    if (source) {
      updateSourceAndFit()
    } else if (map.isStyleLoaded()) {
      updateSourceAndFit()
    } else {
      map.once('load', updateSourceAndFit)
    }
  }, [segmentCoords])

  // Update Cabinet Marker on route
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
      Number.isFinite(currentCabinet.location.lat) &&
      Number.isFinite(currentCabinet.location.lng)
    ) {
      const el = document.createElement('div')
      el.className = 'cabinet-marker cursor-pointer'
      el.title = `Tủ điện: ${currentCabinet.cabinet_name || currentCabinet.cabinet_id}`
      el.innerHTML = `
        <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fbbf24; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(124,58,237,0.5); border: 2px solid #ffffff; font-weight: bold; font-size: 14px;">
          ⚡
        </div>
      `
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([currentCabinet.location.lng, currentCabinet.location.lat])
        .addTo(map)

      cabinetMarkerRef.current = marker
    }
  }, [currentCabinet])

  // Synchronize Pole Markers & Draggable Snapping
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const currentRowIds = new Set(rows.map((r) => r.rowId))

    // 1. Remove markers no longer in rows
    markersMapRef.current.forEach((marker, rowId) => {
      if (!currentRowIds.has(rowId)) {
        marker.remove()
        markersMapRef.current.delete(rowId)
      }
    })

    // 2. Add or update markers for rows
    rows.forEach((row, index) => {
      const parsedLat = parseFloat(row.lat)
      const parsedLng = parseFloat(row.lng)
      if (isNaN(parsedLat) || isNaN(parsedLng)) return

      let marker = markersMapRef.current.get(row.rowId)

      if (!marker) {
        // Create new marker element
        const el = document.createElement('div')
        el.className = 'pole-marker cursor-grab active:cursor-grabbing select-none'
        el.innerHTML = `
          <div style="width: 20px; height: 20px; background: #059669; border: 2px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 10px; font-weight: 800; box-shadow: 0 2px 8px rgba(0,0,0,0.4); user-select: none;">
            ${index + 1}
          </div>
        `

        marker = new maplibregl.Marker({
          element: el,
          draggable: true,
        })
          .setLngLat([parsedLng, parsedLat])
          .addTo(map)

        // Ensure marker container is positioned on top layer
        marker.getElement().style.zIndex = '50'

        // Drag start: disable map panning to make dragging responsive
        marker.on('dragstart', () => {
          map.dragPan.disable()
        })

        // Realtime drag: snap to route centerline continuously with anti-collision leapfrog
        marker.on('drag', () => {
          const raw = marker!.getLngLat()
          if (segmentCoordsRef.current.length >= 2) {
            const snappedPoint = resolveNonOverlappingRoutePoint(raw.lng, raw.lat, row.rowId)
            marker!.setLngLat(snappedPoint)
          }
        })

        // Drag end: re-enable map panning and update row state with auto-sort
        marker.on('dragend', () => {
          map.dragPan.enable()
          const raw = marker!.getLngLat()
          if (segmentCoordsRef.current.length >= 2) {
            const snappedPoint = resolveNonOverlappingRoutePoint(raw.lng, raw.lat, row.rowId)
            marker!.setLngLat(snappedPoint)
            setRows((prev) => {
              const updated = prev.map((r) =>
                r.rowId === row.rowId
                  ? {
                      ...r,
                      lat: snappedPoint[1].toFixed(6),
                      lng: snappedPoint[0].toFixed(6),
                    }
                  : r
              )
              // Tự động sắp xếp lại thứ tự cột từ đầu tuyến đến cuối tuyến
              return [...updated].sort((a, b) => {
                const distA = snapPointToPolyline(
                  [parseFloat(a.lng), parseFloat(a.lat)],
                  segmentCoordsRef.current
                ).accumulatedDist
                const distB = snapPointToPolyline(
                  [parseFloat(b.lng), parseFloat(b.lat)],
                  segmentCoordsRef.current
                ).accumulatedDist
                return distA - distB
              })
            })
          }
        })

        markersMapRef.current.set(row.rowId, marker)
      } else {
        // Update index number and coordinates
        const el = marker.getElement()
        el.style.zIndex = '50'
        const inner = el.querySelector('div')
        if (inner) {
          inner.innerText = String(index + 1)
        }
        const currentPos = marker.getLngLat()
        if (
          Math.abs(currentPos.lng - parsedLng) > 0.000001 ||
          Math.abs(currentPos.lat - parsedLat) > 0.000001
        ) {
          marker.setLngLat([parsedLng, parsedLat])
        }
      }
    })
  }, [rows, resolveNonOverlappingRoutePoint])

  if (!isOpen) return null

  // Batch Submit Handler
  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!selectedSegmentId) {
      setErrorMsg('Vui lòng chọn Tuyến đường áp dụng!')
      return
    }

    if (!selectedCabinetId) {
      setErrorMsg('Vui lòng chọn Tủ điện điều khiển trực tiếp quản lý các cột!')
      return
    }

    if (rows.length === 0) {
      setErrorMsg('Vui lòng bấm "+ Thêm Cột Mới" hoặc click trên bản đồ để khai báo ít nhất một cột đèn!')
      return
    }

    // Validate each row
    const idSet = new Set<string>()
    const validatedDataList: PoleListItem[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const trimmedExternalRef = row.pole_id.trim()
      const poleId = trimmedExternalRef || `POLE-${String(existingPoleCount + i + 1).padStart(4, '0')}`

      if (trimmedExternalRef) {
        if (idSet.has(trimmedExternalRef.toLowerCase())) {
          setErrorMsg(`Mã quản lý thực địa "${trimmedExternalRef}" bị trùng lặp trong danh sách khai báo!`)
          return
        }
        idSet.add(trimmedExternalRef.toLowerCase())
      }

      const parsedLat = parseFloat(row.lat)
      const parsedLng = parseFloat(row.lng)

      if (isNaN(parsedLat) || isNaN(parsedLng)) {
        setErrorMsg(`Hàng #${i + 1}: Tọa độ GPS không hợp lệ (Vui lòng chọn vị trí trên bản đồ)!`)
        return
      }

      if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
        setErrorMsg(`Hàng #${i + 1}: Tọa độ vượt quá phạm vi địa lý (Lat: -90..90, Lng: -180..180)!`)
        return
      }

      validatedDataList.push({
        pole_id: poleId,
        external_ref: trimmedExternalRef || null,
        segment_id: selectedSegmentId,
        feeder_id: selectedCabinetId,
        commune_id: currentSegment?.commune_id || 'COM-001',
        data_source: 'field',
        near_sensitive_poi: !!row.near_sensitive_poi,
        location: {
          lat: parsedLat,
          lng: parsedLng,
        },
        note: row.note?.trim() ? row.note.trim() : null,
        updated_at: new Date().toISOString(),
      })
    }

    if (onAddPoles) {
      onAddPoles(validatedDataList)
    } else if (onAddPole && validatedDataList.length > 0) {
      onAddPole(validatedDataList[0])
    }

    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        
        {/* Header Modal */}
        <div className="p-5 bg-gradient-to-r from-[#172b4d] via-[#1f3864] to-[#25457a] text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Layers className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Thêm Cột Đèn Mới Vào Hệ Thống GIS
              </h3>
              <p className="text-xs text-slate-300">
                Khai báo theo Tuyến đường và Tủ điện quản lý nguồn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="px-5 py-2.5 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium text-xs flex items-center gap-2 shrink-0 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body - 2 Columns Layout */}
        <form onSubmit={handleBatchSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto md:overflow-hidden">
            
            {/* ================= CỘT TRÁI (~45%): THÔNG SỐ & BẢNG CỘT ĐÈN ================= */}
            <div className="md:col-span-5 p-5 space-y-4 text-xs text-slate-800 dark:text-slate-200 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col">
              
              {/* SECTION 1: TUYẾN ĐƯỜNG & TỦ ĐIỆN */}
              <div className="p-4 bg-slate-50/70 hover:bg-slate-50/90 dark:bg-slate-800/50 dark:hover:bg-slate-800/70 rounded-2xl border border-slate-200/90 hover:border-slate-300 dark:border-slate-700/80 dark:hover:border-slate-600 space-y-3 shadow-2xs hover:shadow-xs transition-all duration-200 shrink-0">
                <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/60 pb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-xs">
                    <Route className="w-4 h-4 text-[#1f3864] dark:text-blue-400 drop-shadow-2xs" />
                    <span>1. Thiết Lập Tuyến Đường & Tủ Điện</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                    (1 Cột - 1 Tủ)
                  </span>
                </div>

                <div className="space-y-3">
                  {/* 1. Select Segment */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                      <span>Tuyến đường áp dụng:</span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">(Bắt buộc)</span>
                    </label>
                    <select
                      value={selectedSegmentId}
                      onChange={(e) => handleSegmentChange(e.target.value)}
                      className={`w-full p-2 bg-white dark:bg-slate-900 border rounded-xl font-bold text-xs cursor-pointer shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#1f3864]/20 focus:border-[#1f3864] ${
                        !selectedSegmentId
                          ? 'text-slate-400 border-slate-300 dark:border-slate-700'
                          : 'text-slate-900 dark:text-slate-100 border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
                      }`}
                    >
                      <option value="" disabled className="text-slate-400 font-normal">
                        -- Chọn tuyến đường áp dụng --
                      </option>
                      {segmentList.map((seg) => (
                        <option key={seg.segment_id || ''} value={seg.segment_id || ''} className="text-slate-900 dark:text-slate-100">
                          {seg.segment_name} ({seg.segment_id} • {seg.pole_count || 0} cột)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Select Cabinet */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                      <span>Tủ điện quản lý nguồn:</span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">(1 Cột - 1 Tủ)</span>
                    </label>
                    <select
                      value={selectedCabinetId}
                      onChange={(e) => {
                        setSelectedCabinetId(e.target.value)
                        setErrorMsg(null)
                      }}
                      disabled={!selectedSegmentId}
                      className={`w-full p-2 bg-white dark:bg-slate-900 border rounded-xl font-bold text-xs cursor-pointer shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800 ${
                        !selectedCabinetId
                          ? 'text-slate-400 border-slate-300 dark:border-slate-700'
                          : 'text-slate-900 dark:text-slate-100 border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
                      }`}
                    >
                      <option value="" disabled className="text-slate-400 font-normal">
                        {selectedSegmentId
                          ? availableCabinetsOnSegment.length > 0
                            ? '-- Chọn tủ điện quản lý --'
                            : '-- Tuyến này chưa có tủ điện --'
                          : '-- Vui lòng chọn Tuyến trước --'}
                      </option>
                      {availableCabinetsOnSegment.map((cab) => (
                        <option key={cab.cabinet_id || cab.external_ref || ''} value={cab.cabinet_id || cab.external_ref || ''} className="text-slate-900 dark:text-slate-100">
                          ⚡️ {cab.cabinet_name || cab.external_ref || cab.cabinet_id} ({cab.external_ref || cab.cabinet_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: DANH SÁCH CỘT ĐÈN */}
              <div className="space-y-2 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>2. Danh Sách Cột Đèn</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {rows.length} cột
                    </span>
                    {currentCabinet && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-indigo-500" />
                        <span>{currentCabinet.cabinet_name || currentCabinet.external_ref || currentCabinet.cabinet_id}</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer shrink-0"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Thêm Cột</span>
                  </button>
                </div>

                {/* Table Container */}
                <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs flex-1 flex flex-col min-h-0">
                  <div className="overflow-x-auto overflow-y-auto max-h-[380px] flex-1">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 shadow-2xs">
                        <tr>
                          <th className="py-2 px-2.5 w-10 text-center">STT</th>
                          <th className="py-2 px-2.5 min-w-28">Mã cột</th>
                          <th className="py-2 px-2 text-center w-14">POI</th>
                          <th className="py-2 px-2.5 min-w-28">Ghi chú</th>
                          <th className="py-2 px-2 w-10 text-center">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-slate-500">
                              Chưa có cột đèn nào. Click trên bản đồ hoặc bấm{' '}
                              <button
                                type="button"
                                onClick={handleAddRow}
                                className="text-emerald-600 dark:text-emerald-400 font-bold underline cursor-pointer"
                              >
                                + Thêm Cột
                              </button>{' '}
                              để cắm mốc.
                            </td>
                          </tr>
                        ) : (
                          rows.map((row, index) => (
                            <tr key={row.rowId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                              <td className="py-1.5 px-2.5 text-center text-slate-400 font-bold text-[11px]">
                                {index + 1}
                              </td>
                              <td className="py-1.5 px-2.5">
                                <input
                                  type="text"
                                  value={row.pole_id}
                                  onChange={(e) => handleUpdateRow(row.rowId, 'pole_id', e.target.value)}
                                  placeholder="C-01, P.12..."
                                  title={`Tọa độ: [${row.lng}, ${row.lat}]`}
                                  className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1f3864]"
                                />
                              </td>
                              <td className="py-1.5 px-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={row.near_sensitive_poi}
                                  onChange={(e) => handleUpdateRow(row.rowId, 'near_sensitive_poi', e.target.checked)}
                                  title="Gần POI nhạy cảm (trường học, bệnh viện, ngã tư...)"
                                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                                />
                              </td>
                              <td className="py-1.5 px-2.5">
                                <input
                                  type="text"
                                  value={row.note}
                                  onChange={(e) => handleUpdateRow(row.rowId, 'note', e.target.value)}
                                  placeholder="Gần ngã 3..."
                                  className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(row.rowId)}
                                  className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= CỘT PHẢI (~55%): BẢN ĐỒ GIS VỆ TINH ================= */}
            <div className="md:col-span-7 flex flex-col h-80 md:h-auto min-h-[520px] relative bg-slate-950 border-t md:border-t-0">
              <div ref={mapContainerRef} className="w-full h-full" />

              {/* Map overlay legend */}
              <div className="absolute top-3 left-3 z-10 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 shadow-lg text-[11px] text-white space-y-1.5 pointer-events-none">
                <div className="font-bold flex items-center gap-1.5 text-xs text-amber-400">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Bản Đồ Cắm Mốc Cột Đèn</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#059669] border border-white inline-block"></span>
                  <span>Cột đang thêm ({rows.length}) - Kéo để trượt dọc tuyến</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fde047] border border-slate-700/40 inline-block"></span>
                  <span>Cột hiện hữu trên tuyến</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-1 bg-sky-400 rounded-full"></span>
                  <span>Tim tuyến đường chiếu sáng</span>
                </div>
                {currentCabinet && (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 flex items-center justify-center text-[8px]">⚡</span>
                    <span>Tủ điện: {currentCabinet.cabinet_name || currentCabinet.cabinet_id}</span>
                  </div>
                )}
              </div>

              {/* Status overlays */}
              {!selectedSegmentId ? (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 text-white z-10">
                  <Route className="w-8 h-8 text-blue-400 mb-2 animate-bounce" />
                  <p className="font-bold text-xs">Chưa chọn tuyến đường</p>
                  <p className="text-[11px] text-slate-300 mt-0.5 max-w-sm">
                    Vui lòng chọn Tuyến đường áp dụng ở cột trái để hiển thị lộ trình tim đường và cắm mốc cột đèn trên bản đồ vệ tinh.
                  </p>
                </div>
              ) : segmentCoords.length < 2 ? (
                <div className="absolute inset-x-3 top-3 bg-amber-500/90 text-slate-950 px-3 py-1.5 rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs font-bold backdrop-blur-xs z-10 pointer-events-none animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-slate-950 shrink-0" />
                  <span>Tuyến này chưa có dữ liệu tim đường GIS hoặc đang tải...</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1f3864] dark:bg-blue-600 hover:bg-[#1f3864]/90 dark:hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Xác Nhận Lưu ({rows.length} Cột)</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
