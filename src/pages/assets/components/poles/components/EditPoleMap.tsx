import React, { useEffect, useRef, useMemo } from 'react'
import { useCommuneBoundary } from '../../../../../hooks/gis-map/useCommuneBoundary'
import { CollapsibleMapLegend } from '../../../../../components/CollapsibleMapLegend'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Layers } from 'lucide-react'
import { MapRecenterControl, CROSSHAIR_SVG } from '../../../../../utils/gis-map/MapRecenterControl'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import type { FeatureCollection } from 'geojson'
import type { RootState } from '../../../../../redux/rootReducer'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import {
  GOOGLE_HYBRID_STYLE,
  DEFAULT_MAP_CENTER,
  MAP_MAX_ZOOM,
  toLngLatBounds,
  toBoundaryGeoJSON,
  getCommuneBboxInfo,
  isPointInBounds,
  OUTSIDE_MANAGED_AREA_MESSAGE,
} from '../../../../../utils/gis-map/mapUtils'
import {
  calculateDistanceMeters,
  snapPointToPolyline,
} from '../../../../../utils/gis-map/routeUtils'

export interface ClampToCorridorResult {
  point: [number, number]
  clamped: boolean
  distMeters: number
}

/**
 * Kẹp một điểm [lng, lat] vào trong hành lang `meters` mét quanh đường `line`.
 * Nếu `line` có < 2 điểm hoặc `meters` không hợp lệ thì không giới hạn.
 */
export function clampToCorridor(
  point: [number, number],
  line: [number, number][] | undefined,
  meters: number
): ClampToCorridorResult {
  if (!line || line.length < 2 || !Number.isFinite(meters) || meters <= 0) {
    return { point, clamped: false, distMeters: 0 }
  }
  const { snappedPoint, distMeters } = snapPointToPolyline(point, line)
  if (distMeters <= meters) {
    return { point, clamped: false, distMeters }
  }

  const round6 = (v: number) => Number(v.toFixed(6))
  const projectAt = (targetMeters: number): [number, number] => {
    const ratio = Math.max(0, targetMeters) / distMeters
    return [
      round6(snappedPoint[0] + (point[0] - snappedPoint[0]) * ratio),
      round6(snappedPoint[1] + (point[1] - snappedPoint[1]) * ratio),
    ]
  }

  let clampedPoint = projectAt(meters)
  // Làm tròn 6 chữ số thập phân có thể nhích thêm ~0.05 m; lùi nhẹ nếu vừa vượt mép
  if (snapPointToPolyline(clampedPoint, line).distMeters > meters) {
    clampedPoint = projectAt(meters - 0.1)
  }

  return {
    point: clampedPoint,
    clamped: true,
    distMeters,
  }
}

export type LngLat = [number, number]

export interface RouteLineDiff {
  removed: LngLat[][]
  added: LngLat[][]
}

const SAME_VERTEX_TOLERANCE_M = 0.5
const EDGE_MATCH_TOLERANCE_M = 1
const REMOVED_COLOR = '#dc2626'
const ADDED_COLOR = '#16a34a'

function collectUncoveredEdges(source: LngLat[], target: LngLat[]): LngLat[][] {
  const result: LngLat[][] = []
  let current: LngLat[] = []

  const isEdgeCovered = (a: LngLat, b: LngLat): boolean => {
    const mid: LngLat = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    return (
      snapPointToPolyline(a, target).distMeters <= EDGE_MATCH_TOLERANCE_M &&
      snapPointToPolyline(b, target).distMeters <= EDGE_MATCH_TOLERANCE_M &&
      snapPointToPolyline(mid, target).distMeters <= EDGE_MATCH_TOLERANCE_M
    )
  }

  for (let i = 0; i < source.length - 1; i++) {
    const a = source[i]
    const b = source[i + 1]
    if (!isEdgeCovered(a, b)) {
      if (current.length === 0) {
        current = [a, b]
      } else {
        current.push(b)
      }
    } else if (current.length > 0) {
      result.push(current)
      current = []
    }
  }

  if (current.length > 0) {
    result.push(current)
  }
  return result
}

/**
 * So sánh hình học giữa tuyến đang lưu (`saved`) và tuyến xem trước (`preview`).
 * Mỗi cạnh được coi là giữ nguyên nếu 2 đầu mút và trung điểm đều nằm cách tuyến kia <= 1 m;
 * các cạnh không khớp liên tiếp được gộp thành polyline trong `removed` / `added`.
 */
export function diffRouteLines(saved: LngLat[], preview: LngLat[]): RouteLineDiff {
  if (saved.length < 2 && preview.length < 2) {
    return { removed: [], added: [] }
  }
  if (saved.length < 2) {
    return { removed: [], added: [preview] }
  }
  if (preview.length < 2) {
    return { removed: [saved], added: [] }
  }

  return {
    removed: collectUncoveredEdges(saved, preview),
    added: collectUncoveredEdges(preview, saved),
  }
}

/**
 * Tạo cặp nhánh bỏ (từ điểm gần nhất trên tuyến tới cột cũ) và nhánh thêm (tới chấm đích)
 * cho tuyến hình thật (khi tuyến xanh đứng yên).
 */
export function spurLines(
  origin: LngLat | undefined,
  dot: LngLat,
  line: LngLat[]
): RouteLineDiff {
  if (!origin || line.length < 2) {
    return { removed: [], added: [] }
  }
  const originSnap = snapPointToPolyline(origin, line)
  const dotSnap = snapPointToPolyline(dot, line)

  return {
    removed:
      originSnap.distMeters >= SAME_VERTEX_TOLERANCE_M ? [[originSnap.snappedPoint, origin]] : [],
    added: [[dotSnap.snappedPoint, dot]],
  }
}

export interface EditPoleMapProps {
  lat: number
  lng: number
  /** Hình tuyến xem trước (nét đứt cam) sau khi dời cột. */
  segmentCoords: [number, number][]
  /** Hình tuyến đang lưu (nét liền xanh, đứng yên khi kéo). */
  savedSegmentCoords?: [number, number][]
  /** Loại nét đứt xem trước: 'link' (tuyến hình thật, chỉ nối cột cũ -> đích) hoặc 'route' (tuyến nối cột). */
  previewKind?: 'link' | 'route'
  /** Đường làm mốc đo hành lang tối đa quanh tuyến. */
  corridorLine?: [number, number][]
  /** Bán kính hành lang tối đa (m); bỏ trống nếu không giới hạn. */
  corridorMeters?: number
  /** Vị trí gốc đã lưu của cột [lng, lat]. */
  originCoord?: [number, number]
  otherPolesGeoJSON: FeatureCollection
  currentCabinet?: CabinetListItem | null
  onChangeCoords: (coords: { lat: number; lng: number }) => void
  communeId?: string | null
}

function hasMovedFromOrigin(
  origin: [number, number] | undefined,
  lng: number,
  lat: number
): boolean {
  if (!origin || !Number.isFinite(lng) || !Number.isFinite(lat) || lng === 0 || lat === 0) {
    return false
  }
  return calculateDistanceMeters(origin, [lng, lat]) > 0.5
}

function buildPreviewDiffData(
  kind: 'link' | 'route',
  origin: [number, number] | undefined,
  lng: number,
  lat: number,
  saved: [number, number][],
  preview: [number, number][]
): RouteLineDiff {
  if (!hasMovedFromOrigin(origin, lng, lat)) {
    return { removed: [], added: [] }
  }
  if (kind === 'link') {
    return spurLines(origin, [lng, lat], saved)
  }
  return diffRouteLines(saved, preview)
}

export const EditPoleMap: React.FC<EditPoleMapProps> = ({
  lat,
  lng,
  segmentCoords,
  savedSegmentCoords,
  previewKind = 'route',
  corridorLine,
  corridorMeters,
  originCoord,
  otherPolesGeoJSON,
  currentCabinet,
  onChangeCoords,
  communeId,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const currentPoleMarkerRef = useRef<maplibregl.Marker | null>(null)
  const originMarkerRef = useRef<maplibregl.Marker | null>(null)
  const isUserInteractingRef = useRef<boolean>(false)
  const cabinetMarkerRef = useRef<maplibregl.Marker | null>(null)
  const existingPolePopupRef = useRef<maplibregl.Popup | null>(null)

  const currentUser = useSelector((state: RootState) => state?.auth?.user)
  const mapBounds = currentUser?.map_bounds
  const userCommunes = currentUser?.communes
  const adminCommunes = useSelector((state: RootState) => state?.adminCommunes?.communes)
  const communeBoundsInfo = useMemo(() => {
    return getCommuneBboxInfo(communeId, userCommunes, adminCommunes, mapBounds)
  }, [communeId, userCommunes, adminCommunes, mapBounds])
  const communeBoundary = useCommuneBoundary(communeId)
  const boundaryRef = useRef(communeBoundary)
  boundaryRef.current = communeBoundary
  const activeBounds = useMemo(
    () => communeBoundsInfo.bounds || toLngLatBounds(mapBounds?.bbox),
    [communeBoundsInfo, mapBounds]
  )
  const activeBoundsRef = useRef(activeBounds)
  activeBoundsRef.current = activeBounds
  const mapBoundsRef = useRef(mapBounds)
  mapBoundsRef.current = mapBounds

  const segmentCoordsRef = useRef(segmentCoords)
  segmentCoordsRef.current = segmentCoords

  const resolvedSavedCoords = savedSegmentCoords ?? segmentCoords
  const savedSegmentCoordsRef = useRef(resolvedSavedCoords)
  savedSegmentCoordsRef.current = resolvedSavedCoords

  const previewKindRef = useRef(previewKind)
  previewKindRef.current = previewKind

  const corridorLineRef = useRef(corridorLine)
  corridorLineRef.current = corridorLine

  const corridorMetersRef = useRef(corridorMeters)
  corridorMetersRef.current = corridorMeters

  const originCoordRef = useRef(originCoord)
  originCoordRef.current = originCoord

  const coordsRef = useRef<[number, number]>([lng, lat])
  coordsRef.current = [lng, lat]

  const otherPolesGeoJSONRef = useRef(otherPolesGeoJSON)
  otherPolesGeoJSONRef.current = otherPolesGeoJSON

  const onChangeCoordsRef = useRef(onChangeCoords)
  onChangeCoordsRef.current = onChangeCoords

  // Khởi tạo MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return

    let isMounted = true

    const isCoordValid =
      Number.isFinite(lng) && Number.isFinite(lat) && lng !== 0 && lat !== 0

    const initialCenter: [number, number] = isCoordValid
      ? [lng, lat]
      : typeof mapBoundsRef.current?.center?.lng === 'number' &&
        typeof mapBoundsRef.current?.center?.lat === 'number' &&
        Number.isFinite(mapBoundsRef.current.center.lng) &&
        Number.isFinite(mapBoundsRef.current.center.lat)
      ? [mapBoundsRef.current.center.lng, mapBoundsRef.current.center.lat]
      : DEFAULT_MAP_CENTER

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: GOOGLE_HYBRID_STYLE,
      center: initialCenter,
      zoom: isCoordValid ? 18 : 15,
      maxZoom: MAP_MAX_ZOOM,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    })

    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')
    map.addControl(
      new MapRecenterControl({
        title: 'Về vị trí cột',
        iconSvg: CROSSHAIR_SVG,
        onClick: (m) => {
          const marker = currentPoleMarkerRef.current
          if (!marker) return
          m.easeTo({ center: marker.getLngLat(), zoom: Math.max(m.getZoom(), 17), duration: 600 })
        },
      }),
      'top-right'
    )

    // Tự động resize bản đồ khi kích thước modal / container thay đổi
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.resize()
        }
      })
      resizeObserver.observe(mapContainerRef.current)
    }

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

    let lastValidPos = marker.getLngLat()
    let corridorToastShown = false
    marker.on('dragstart', () => {
      lastValidPos = marker.getLngLat()
      corridorToastShown = false
    })
    const handleMarkerDrag = () => {
      isUserInteractingRef.current = true
      const pos = marker.getLngLat()
      if (!isPointInBounds(activeBoundsRef.current, pos.lng, pos.lat, boundaryRef.current)) return

      let targetLng = Number(pos.lng.toFixed(6))
      let targetLat = Number(pos.lat.toFixed(6))
      const limit = corridorMetersRef.current
      if (limit && limit > 0 && corridorLineRef.current && corridorLineRef.current.length >= 2) {
        const res = clampToCorridor([pos.lng, pos.lat], corridorLineRef.current, limit)
        if (res.clamped) {
          targetLng = res.point[0]
          targetLat = res.point[1]
          marker.setLngLat([targetLng, targetLat])
          if (!corridorToastShown) {
            corridorToastShown = true
            toast.warning(`Cột không thể cách tuyến quá ${limit} m`, { closeButton: true })
          }
        }
      }

      onChangeCoordsRef.current({
        lng: targetLng,
        lat: targetLat,
      })
    }

    marker.on('drag', handleMarkerDrag)
    marker.on('dragend', () => {
      const endPos = marker.getLngLat()
      if (!isPointInBounds(activeBoundsRef.current, endPos.lng, endPos.lat, boundaryRef.current)) {
        marker.setLngLat(lastValidPos)
        onChangeCoordsRef.current({
          lng: Number(lastValidPos.lng.toFixed(6)),
          lat: Number(lastValidPos.lat.toFixed(6)),
        })
        toast.error(OUTSIDE_MANAGED_AREA_MESSAGE)
        return
      }
      handleMarkerDrag()
    })

    // Click bản đồ để dời vị trí ghim (có kẹp hành lang quanh tuyến nếu tuyến có hình)
    map.on('click', (e: maplibregl.MapMouseEvent) => {
      if (!isPointInBounds(activeBoundsRef.current, e.lngLat.lng, e.lngLat.lat, boundaryRef.current)) {
        toast.error(OUTSIDE_MANAGED_AREA_MESSAGE)
        return
      }
      isUserInteractingRef.current = true
      let newPos: [number, number] = [Number(e.lngLat.lng.toFixed(6)), Number(e.lngLat.lat.toFixed(6))]
      const limit = corridorMetersRef.current
      if (limit && limit > 0 && corridorLineRef.current && corridorLineRef.current.length >= 2) {
        const res = clampToCorridor([e.lngLat.lng, e.lngLat.lat], corridorLineRef.current, limit)
        if (res.clamped) {
          newPos = res.point
          toast.warning(`Cột không thể cách tuyến quá ${limit} m`, { closeButton: true })
        }
      }
      marker.setLngLat(newPos)
      onChangeCoordsRef.current({ lng: newPos[0], lat: newPos[1] })
    })

    map.on('load', () => {
      if (!isMounted) return

      setTimeout(() => {
        map.resize()
      }, 150)

      // 1. Source & layer vẽ tuyến đường hiện tại (nét liền xanh, đứng yên)
      if (!map.getSource('edit-segment-route')) {
        map.addSource('edit-segment-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: savedSegmentCoordsRef.current,
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

      // 1b. Source & layer vẽ đoạn bị bỏ (đỏ nét đứt) và đoạn thêm / đoạn dời cột (cam nét đứt)
      const initialDiff = buildPreviewDiffData(
        previewKindRef.current,
        originCoordRef.current,
        coordsRef.current[0],
        coordsRef.current[1],
        savedSegmentCoordsRef.current,
        segmentCoordsRef.current
      )

      if (!map.getSource('edit-segment-route-removed')) {
        const isLink = previewKindRef.current === 'link'
        map.addSource('edit-segment-route-removed', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'MultiLineString',
              coordinates: initialDiff.removed,
            },
          },
        })

        map.addLayer({
          id: 'edit-segment-route-removed',
          type: 'line',
          source: 'edit-segment-route-removed',
          paint: {
            'line-color': REMOVED_COLOR,
            'line-width': isLink ? 3 : 4,
            'line-dasharray': [2, 2],
            'line-opacity': 0.95,
          },
        })
      }

      if (!map.getSource('edit-segment-route-preview')) {
        map.addSource('edit-segment-route-preview', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'MultiLineString',
              coordinates: initialDiff.added,
            },
          },
        })

        map.addLayer({
          id: 'edit-segment-route-preview-casing',
          type: 'line',
          source: 'edit-segment-route-preview',
          paint: {
            'line-color': '#ffffff',
            'line-width': 5.5,
            'line-dasharray': [2, 2],
            'line-opacity': 0.6,
          },
        })

        map.addLayer({
          id: 'edit-segment-route-preview',
          type: 'line',
          source: 'edit-segment-route-preview',
          paint: {
            'line-color': ADDED_COLOR,
            'line-width': 3.5,
            'line-dasharray': [2, 2],
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

      const bboxGeoJson = toBoundaryGeoJSON(boundaryRef.current, communeBoundsInfo.bbox || mapBounds?.bbox)
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

      // Focus trực tiếp 100% vào cột đang sửa ở mức zoom 18 chi tiết (ngay tâm màn hình)
      if (isCoordValid) {
        map.jumpTo({ center: [lng, lat], zoom: 18 })
      } else if (Number.isFinite(initialCenter[0]) && Number.isFinite(initialCenter[1])) {
        map.flyTo({ center: [initialCenter[0], initialCenter[1]], zoom: 15, duration: 400 })
      }
    })

    return () => {
      isMounted = false
      resizeObserver?.disconnect()
      if (existingPolePopupRef.current) {
        existingPolePopupRef.current.remove()
        existingPolePopupRef.current = null
      }
      if (currentPoleMarkerRef.current) {
        currentPoleMarkerRef.current.remove()
        currentPoleMarkerRef.current = null
      }
      if (originMarkerRef.current) {
        originMarkerRef.current.remove()
        originMarkerRef.current = null
      }
      if (cabinetMarkerRef.current) {
        cabinetMarkerRef.current.remove()
        cabinetMarkerRef.current = null
      }
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Cập nhật Bbox, giới hạn và khung viền khi communeBoundsInfo hoặc mapBounds thay đổi
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const source = map.getSource('commune-bbox-boundary') as maplibregl.GeoJSONSource | undefined
    if (source) {
      const bboxGeoJson = toBoundaryGeoJSON(boundaryRef.current, communeBoundsInfo.bbox || mapBounds?.bbox)
      source.setData(bboxGeoJson || ({ type: 'FeatureCollection', features: [] } as any))
    }
  }, [communeBoundsInfo, mapBounds, communeBoundary])

  // Tự động đồng bộ marker và focus camera (giữ nguyên 100% mức zoom của người dùng) khi lat / lng thay đổi
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

    if (currentPoleMarkerRef.current) {
      const currentPos = currentPoleMarkerRef.current.getLngLat()
      if (
        Math.abs(currentPos.lng - lng) > 0.000001 ||
        Math.abs(currentPos.lat - lat) > 0.000001
      ) {
        currentPoleMarkerRef.current.setLngLat([lng, lat])
      }
    }

    // Nếu người dùng vừa trực tiếp kéo ghim hoặc click trên bản đồ thì không can thiệp camera hay zoom
    if (isUserInteractingRef.current) {
      isUserInteractingRef.current = false
      return
    }

    // Nếu thay đổi từ bên ngoài (nhập tay tọa độ ở form): lướt nhẹ nhàng đến tọa độ mới nhưng GIỮ NGUYÊN mức zoom hiện tại
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
  }, [lng, lat])

  // 1. Vẽ lại tuyến hiện tại (nét liền xanh) mỗi khi đổi tuyến / tải hình tuyến
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const updateSavedRouteLayer = () => {
      const routeSource = map.getSource('edit-segment-route') as maplibregl.GeoJSONSource | undefined
      if (routeSource) {
        routeSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: resolvedSavedCoords,
          },
        })
      }
    }

    if (map.getSource('edit-segment-route') || map.isStyleLoaded()) {
      updateSavedRouteLayer()
    } else {
      map.once('load', updateSavedRouteLayer)
    }
  }, [resolvedSavedCoords])

  // 1b. Vẽ đoạn bị bỏ (đỏ nét đứt) và đoạn thêm / đoạn dời cột (cam nét đứt) khi chấm đích rời vị trí gốc > 0.5 m
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const updatePreviewRouteLayers = () => {
      const diff = buildPreviewDiffData(
        previewKind,
        originCoord,
        lng,
        lat,
        resolvedSavedCoords,
        segmentCoords
      )

      const removedSource = map.getSource('edit-segment-route-removed') as
        | maplibregl.GeoJSONSource
        | undefined
      if (removedSource) {
        removedSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'MultiLineString',
            coordinates: diff.removed,
          },
        })
      }

      const previewSource = map.getSource('edit-segment-route-preview') as
        | maplibregl.GeoJSONSource
        | undefined
      if (previewSource) {
        previewSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'MultiLineString',
            coordinates: diff.added,
          },
        })
      }

      if (map.getLayer('edit-segment-route-removed')) {
        map.setPaintProperty(
          'edit-segment-route-removed',
          'line-width',
          previewKind === 'link' ? 3 : 4
        )
      }
    }

    if (map.getSource('edit-segment-route-preview') || map.isStyleLoaded()) {
      updatePreviewRouteLayers()
    } else {
      map.once('load', updatePreviewRouteLayers)
    }
  }, [previewKind, segmentCoords, resolvedSavedCoords, originCoord, lng, lat])

  // 1c. Marker cột cũ cố định tại vị trí gốc (chấm trắng viền cam); ẩn khi chấm đích trùng gốc
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (originMarkerRef.current) {
      originMarkerRef.current.remove()
      originMarkerRef.current = null
    }

    if (originCoord && hasMovedFromOrigin(originCoord, lng, lat)) {
      const originEl = document.createElement('div')
      originEl.className = 'edit-pole-origin-marker select-none pointer-events-none'
      originEl.innerHTML = `
        <div style="
          width: 11px;
          height: 11px;
          background: #ffffff;
          border: 2.5px solid #f97316;
          border-radius: 50%;
          box-shadow: 0 1px 4px rgba(0,0,0,0.45);
        "></div>
      `
      originMarkerRef.current = new maplibregl.Marker({
        element: originEl,
        draggable: false,
        anchor: 'center',
      })
        .setLngLat(originCoord)
        .addTo(map)
    }
  }, [originCoord, lng, lat])

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

    if (map.getSource('other-segment-poles') || map.isStyleLoaded()) {
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
    <div className="md:col-span-7 flex flex-col h-80 md:h-auto min-h-[360px] relative bg-blue-50">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map overlay legend */}
      <CollapsibleMapLegend title="Bản Đồ Ngữ Cảnh Tuyến" icon={<Layers className="w-3.5 h-3.5 text-amber-700" />}>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-white border-2 border-orange-500"></span>
          <span>Cột cũ (vị trí hiện tại)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white"></span>
          <span>Chấm đích (kéo hoặc click)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-300 ring-1 ring-slate-900"></span>
          <span>Các cột khác trên tuyến</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 bg-sky-400 rounded-full"></span>
          <span>Tuyến hiện tại</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 border-t-2 border-dashed" style={{ borderColor: REMOVED_COLOR }}></span>
          <span>Đoạn sẽ bỏ</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 border-t-2 border-dashed" style={{ borderColor: ADDED_COLOR }}></span>
          <span>Đoạn sẽ thêm</span>
        </div>
        {currentCabinet && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 flex items-center justify-center text-[8px]">⚡</span>
            <span>Tủ điện: {currentCabinet.cabinet_name || currentCabinet.cabinet_id}</span>
          </div>
        )}
      </CollapsibleMapLegend>
    </div>
  )
}

export default EditPoleMap
