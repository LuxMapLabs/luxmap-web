import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/rootReducer'
import {
  GOOGLE_HYBRID_STYLE,
  DEFAULT_MAP_CENTER,
  MAP_MAX_ZOOM,
  toLngLatBounds,
  getCommuneBboxInfo,
  toBboxPolygonGeoJSON,
  toBboxMaskGeoJSON,
} from '../utils/gis-map/mapUtils'
import { isBend, polesOf, type OrderedPole } from '../utils/gis-map/segmentPoleOrder'
import { MIN_ROAD_ZOOM } from '../utils/gis-map/segmentReshape'
import { edgeMidpoints, insertVertex, moveVertex, removeVertex } from '../utils/gis-map/lineEdit'
import { hideRoadHint, queryBaseMapRoadLines, showRoadHint } from '../hooks/gis-map/useSegmentReshapeMode'

export interface PickablePole extends OrderedPole {
  code?: string
}

interface SegmentPolePickerMapProps {
  /** Các cột có thể chọn (đã lọc: có GPS, chưa thuộc tuyến khác). */
  poles: PickablePole[]
  /** Các cột đã chọn (xen điểm uốn nếu có), đã sắp theo thứ tự dọc tuyến. */
  selected: OrderedPole[]
  /** Hình thật của tuyến (theo con đường): có thì vẽ đường này thay cho đường nối các cột đã chọn. */
  fixedLine?: [number, number][]
  onTogglePole: (poleId: string) => void
  /** Có truyền thì hiện nút "Thêm điểm uốn": bật lên rồi click chỗ trống trên bản đồ để đặt điểm uốn. */
  onAddBend?: (coord: [number, number]) => void
  /** Kéo điểm uốn tới vị trí mới. */
  onMoveBend?: (bendId: string, coord: [number, number]) => void
  /** Cột đang được làm nổi (rê chuột từ bản đồ hoặc từ danh sách). */
  highlightId?: string | null
  /** Báo cột đang rê chuột trên bản đồ (null khi rời khỏi). */
  onHoverPole?: (poleId: string | null) => void
  /** Yêu cầu bay tới một cột; `tick` đổi mỗi lần yêu cầu để bay lại được cùng một cột. */
  focusRequest?: { id: string; tick: number } | null
  communeId?: string | null
  height?: string
  /**
   * Đang lấy hình theo đường: cú bấm trên bản đồ thành một điểm (`onPickRoadPoint`, kèm nét đường của bản đồ nền
   * và mức phóng), không chọn / bỏ cột (cột nằm ngay trên đường).
   */
  pickMode?: boolean
  onPickRoadPoint?: (
    click: [number, number],
    roadLines: [number, number][][],
    zoom: number,
    communeFrame: [[number, number], [number, number]] | null
  ) => void
  /** Các điểm đã bấm khi lấy hình (điểm đầu xanh lá). */
  pickedPoints?: [number, number][]
  /** Cột gợi ý (nằm sát hình tuyến, chưa chọn): viền cam. */
  suggestedIds?: ReadonlySet<string>
  /**
   * Có truyền thì `fixedLine` uốn được bằng kéo thả: kéo chấm trắng (đỉnh) để uốn, kéo chấm mờ giữa hai đỉnh để thêm
   * chỗ uốn, nhấp đúp chấm trắng để xoá. Trả về cả hình mới.
   */
  onEditLine?: (line: [number, number][]) => void
  /** Hình nháp nối cột: kéo chấm mờ giữa hai cột để thêm điểm uốn tại chỗ thả. */
  onInsertBend?: (coord: [number, number], edgeIndex: number) => void
  /** Nhấp đúp tay nắm điểm uốn để xoá. */
  onRemoveBend?: (bendId: string) => void
}

const POLES_SRC = 'pick-poles'
const LINE_SRC = 'pick-line'
const PICKED_SRC = 'pick-road-points'
const COMMUNE_SRC = 'pick-commune-outline'
/** Viền khung xã (web chỉ có bbox của xã, chưa có ranh giới thật); không có khung thì không vẽ gì. */
const communeOutline = (bbox: unknown) => toBboxPolygonGeoJSON(bbox) ?? emptyFc
const COMMUNE_MASK_SRC = 'pick-commune-mask'
/** Phần ngoài khung xã tô tối như Bản đồ GIS; không có khung thì không phủ gì. */
const communeMask = (bbox: unknown) => toBboxMaskGeoJSON(bbox) ?? emptyFc
const emptyFc = { type: 'FeatureCollection' as const, features: [] }

// Nhãn nhỏ ĐẦU / CUỐI trên cột đầu và cột cuối của tuyến
// Nhãn mã cột nhỏ gọn khi rê chuột, cùng kiểu với nhãn ĐẦU / CUỐI, không che các cột lân cận
const createCodeLabel = (code: string) => {
  const el = document.createElement('div')
  el.style.pointerEvents = 'none'
  el.style.padding = '1px 6px'
  el.style.borderRadius = '4px'
  el.style.fontSize = '10px'
  el.style.fontWeight = '700'
  el.style.color = '#ffffff'
  el.style.background = '#0f172a'
  el.style.border = '1px solid #f59e0b'
  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.5)'
  el.style.whiteSpace = 'nowrap'
  el.textContent = code
  return el
}

// Tay nắm của điểm uốn: vòng tròn trắng viền xanh, kéo được
const createBendHandle = () => {
  const el = document.createElement('div')
  el.title = 'Điểm uốn: kéo để chỉnh đường'
  el.style.width = '14px'
  el.style.height = '14px'
  el.style.borderRadius = '50%'
  el.style.background = '#ffffff'
  el.style.border = '3px solid #0284c7'
  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.55)'
  el.style.cursor = 'grab'
  return el
}

// Tay nắm đỉnh của hình tuyến (uốn được): chấm trắng viền xanh
const createVertexHandle = () => {
  const el = createBendHandle()
  el.title = 'Kéo để uốn · nhấp đúp để xoá chỗ uốn này'
  el.style.width = '12px'
  el.style.height = '12px'
  el.dataset.handle = 'vertex'
  return el
}

// Chấm mờ giữa hai đỉnh: kéo ra để thêm chỗ uốn
const createMidHandle = () => {
  const el = document.createElement('div')
  el.title = 'Kéo để thêm chỗ uốn'
  el.style.width = '10px'
  el.style.height = '10px'
  el.style.borderRadius = '50%'
  el.style.background = 'rgba(255,255,255,0.55)'
  el.style.border = '2px solid #0284c7'
  el.style.opacity = '0.75'
  el.style.cursor = 'grab'
  el.dataset.handle = 'mid'
  return el
}

const createEndBadge = (isStart: boolean) => {
  const el = document.createElement('div')
  el.style.pointerEvents = 'none'
  el.style.padding = '1px 5px'
  el.style.borderRadius = '4px'
  el.style.fontSize = '9px'
  el.style.fontWeight = '700'
  el.style.color = '#ffffff'
  el.style.background = isStart ? '#10b981' : '#f43f5e'
  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.5)'
  el.style.whiteSpace = 'nowrap'
  el.textContent = isStart ? 'ĐẦU' : 'CUỐI'
  return el
}

export const SegmentPolePickerMap: React.FC<SegmentPolePickerMapProps> = ({
  poles,
  selected,
  fixedLine,
  onTogglePole,
  onAddBend,
  onMoveBend,
  highlightId = null,
  onHoverPole,
  focusRequest = null,
  communeId,
  height = '480px',
  pickMode = false,
  onPickRoadPoint,
  pickedPoints,
  suggestedIds,
  onEditLine,
  onInsertBend,
  onRemoveBend,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const loadedRef = useRef(false)
  const popupRef = useRef<maplibregl.Marker | null>(null)
  const endBadgesRef = useRef<maplibregl.Marker[]>([])
  const bendMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map())
  const [bendMode, setBendMode] = useState(false)
  const bendModeRef = useRef(bendMode)
  bendModeRef.current = bendMode

  const onToggleRef = useRef(onTogglePole)
  onToggleRef.current = onTogglePole
  const onAddBendRef = useRef(onAddBend)
  onAddBendRef.current = onAddBend
  const onMoveBendRef = useRef(onMoveBend)
  onMoveBendRef.current = onMoveBend
  const onHoverRef = useRef(onHoverPole)
  onHoverRef.current = onHoverPole
  const pickModeRef = useRef(pickMode)
  pickModeRef.current = pickMode
  const onEditLineRef = useRef(onEditLine)
  onEditLineRef.current = onEditLine
  const onInsertBendRef = useRef(onInsertBend)
  onInsertBendRef.current = onInsertBend
  const onRemoveBendRef = useRef(onRemoveBend)
  onRemoveBendRef.current = onRemoveBend
  const lineHandlesRef = useRef<maplibregl.Marker[]>([])
  const onPickRoadPointRef = useRef(onPickRoadPoint)
  onPickRoadPointRef.current = onPickRoadPoint

  const currentUser = useSelector((state: RootState) => state?.auth?.user)
  const adminCommunes = useSelector((state: RootState) => state?.adminCommunes?.communes)
  const mapBounds = currentUser?.map_bounds
  const communeInfo = useMemo(
    () => getCommuneBboxInfo(communeId, currentUser?.communes, adminCommunes, mapBounds),
    [communeId, currentUser?.communes, adminCommunes, mapBounds]
  )

  // Khung xã (bbox của xã, hoặc khung bản đồ của tài khoản khi không biết xã) để vẽ viền
  const communeBbox = communeInfo.bbox ?? mapBounds?.bbox ?? null
  const communeBboxRef = useRef(communeBbox)
  communeBboxRef.current = communeBbox

  // Dữ liệu mới nhất, để lần vẽ đầu (sau sự kiện 'load') và các lần cập nhật dùng chung
  const dataRef = useRef({ poles, selected, highlightId, fixedLine, pickedPoints, suggestedIds })
  dataRef.current = { poles, selected, highlightId, fixedLine, pickedPoints, suggestedIds }

  const pushData = () => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    const { poles: allPoles, selected: chosen, fixedLine: fixed, pickedPoints: picked, suggestedIds: suggested } =
      dataRef.current
    const chosenIds = new Set(chosen.map((p) => p.id))
    const lineCoords = fixed ?? chosen.map((p) => p.coord)

    ;(map.getSource(POLES_SRC) as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: allPoles.map((p) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: p.coord },
        properties: {
          id: p.id,
          code: p.code || p.id,
          selected: chosenIds.has(p.id),
          suggested: !chosenIds.has(p.id) && !!suggested?.has(p.id),
        },
      })),
    })
    ;(map.getSource(PICKED_SRC) as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: (picked ?? []).map((coord, i) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: coord },
        properties: { first: i === 0 },
      })),
    })
    ;(map.getSource(LINE_SRC) as maplibregl.GeoJSONSource | undefined)?.setData(
      lineCoords.length >= 2
        ? {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: lineCoords },
            properties: {},
          }
        : emptyFc
    )

    // Nhãn ĐẦU / CUỐI trên cột đầu và cột cuối (không tính điểm uốn)
    const chosenPoles = polesOf(chosen)
    endBadgesRef.current.forEach((m) => m.remove())
    endBadgesRef.current =
      chosenPoles.length >= 2
        ? [chosenPoles[0], chosenPoles[chosenPoles.length - 1]].map((pole, i) =>
            new maplibregl.Marker({ element: createEndBadge(i === 0), anchor: 'bottom', offset: [0, -9] })
              .setLngLat(pole.coord)
              .addTo(map)
          )
        : []
  }

  // Tay nắm điểm uốn: thêm, dời, xóa theo `selected`
  const syncBends = () => {
    const map = mapRef.current
    if (!map) return
    const bends = dataRef.current.selected.filter(isBend)
    const ids = new Set(bends.map((b) => b.id))
    bendMarkersRef.current.forEach((marker, id) => {
      if (!ids.has(id)) {
        marker.remove()
        bendMarkersRef.current.delete(id)
      }
    })
    bends.forEach((bend) => {
      const existing = bendMarkersRef.current.get(bend.id)
      if (existing) {
        const at = existing.getLngLat()
        if (at.lng !== bend.coord[0] || at.lat !== bend.coord[1]) existing.setLngLat(bend.coord)
        return
      }
      const el = createBendHandle()
      el.title = 'Điểm uốn: kéo để chỉnh đường · nhấp đúp để xoá'
      // Click vào tay nắm không được tính là click bản đồ (tránh đặt thêm điểm uốn)
      el.addEventListener('click', (ev) => ev.stopPropagation())
      el.addEventListener('dblclick', (ev) => {
        ev.stopPropagation()
        ev.preventDefault()
        onRemoveBendRef.current?.(bend.id)
      })
      const marker = new maplibregl.Marker({ element: el, draggable: true }).setLngLat(bend.coord).addTo(map)
      // Đang kéo: vẽ đường xanh ngay theo con trỏ (không đợi state), thả ra mới cập nhật state
      marker.on('drag', () => {
        const at = marker.getLngLat()
        const coords = dataRef.current.selected.map((p) => (p.id === bend.id ? [at.lng, at.lat] : p.coord))
        ;(map.getSource(LINE_SRC) as maplibregl.GeoJSONSource | undefined)?.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: {},
        })
      })
      marker.on('dragend', () => {
        const at = marker.getLngLat()
        onMoveBendRef.current?.(bend.id, [at.lng, at.lat])
      })
      bendMarkersRef.current.set(bend.id, marker)
    })
  }

  /**
   * Tay nắm để uốn hình bằng kéo thả. Hình uốn được (`onEditLine`): chấm trắng ở mỗi đỉnh + chấm mờ giữa hai đỉnh.
   * Hình nháp nối cột (`onInsertBend`): chỉ chấm mờ giữa hai điểm liền nhau (đỉnh là cột, chọn / bỏ bằng click).
   * Dựng lại toàn bộ mỗi lần dữ liệu đổi; đang kéo thì chỉ vẽ lại đường, thả ra mới báo lên.
   */
  const syncLineHandles = () => {
    const map = mapRef.current
    lineHandlesRef.current.forEach((m) => m.remove())
    lineHandlesRef.current = []
    if (!map || !loadedRef.current || pickModeRef.current) return
    const { fixedLine: fixed, selected: chosen } = dataRef.current
    const editable = !!fixed && fixed.length >= 2 && !!onEditLineRef.current
    const draft = !fixed && !!onInsertBendRef.current && polesOf(chosen).length >= 2
    if (!editable && !draft) return
    const line = editable ? (fixed as [number, number][]) : chosen.map((p) => p.coord)

    const drawLine = (coords: [number, number][]) =>
      (map.getSource(LINE_SRC) as maplibregl.GeoJSONSource | undefined)?.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: {},
      })
    const stop = (el: HTMLElement) => el.addEventListener('click', (ev) => ev.stopPropagation())

    if (editable) {
      line.forEach((coord, index) => {
        const el = createVertexHandle()
        stop(el)
        el.addEventListener('dblclick', (ev) => {
          ev.stopPropagation()
          ev.preventDefault()
          if (line.length > 2) onEditLineRef.current?.(removeVertex(line, index))
        })
        const marker = new maplibregl.Marker({ element: el, draggable: true }).setLngLat(coord).addTo(map)
        marker.on('drag', () => {
          const at = marker.getLngLat()
          drawLine(moveVertex(line, index, [at.lng, at.lat]))
        })
        marker.on('dragend', () => {
          const at = marker.getLngLat()
          onEditLineRef.current?.(moveVertex(line, index, [at.lng, at.lat]))
        })
        lineHandlesRef.current.push(marker)
      })
    }

    edgeMidpoints(line).forEach((mid, i) => {
      const el = createMidHandle()
      stop(el)
      const marker = new maplibregl.Marker({ element: el, draggable: true }).setLngLat(mid).addTo(map)
      marker.on('drag', () => {
        const at = marker.getLngLat()
        drawLine(insertVertex(line, i + 1, [at.lng, at.lat]))
      })
      marker.on('dragend', () => {
        const at = marker.getLngLat()
        const to: [number, number] = [at.lng, at.lat]
        if (editable) onEditLineRef.current?.(insertVertex(line, i + 1, to))
        else onInsertBendRef.current?.(to, i)
      })
      lineHandlesRef.current.push(marker)
    })
  }

  // Vòng sáng + tooltip mã cột quanh cột đang được làm nổi
  const pushHighlight = () => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    const id = dataRef.current.highlightId
    map.setFilter('pick-highlight', ['==', ['get', 'id'], id ?? ''])

    popupRef.current?.remove()
    popupRef.current = null
    const pole = id ? dataRef.current.poles.find((p) => p.id === id) : undefined
    if (pole) {
      // Cột đã chọn thì kèm số thứ tự trong tuyến, để thấy ngay khi đổi chỗ trong danh sách
      const order = polesOf(dataRef.current.selected).findIndex((p) => p.id === id)
      const code = pole.code || pole.id
      popupRef.current = new maplibregl.Marker({
        element: createCodeLabel(order >= 0 ? `#${order + 1} · ${code}` : code),
        anchor: 'bottom',
        offset: [0, -14],
      })
        .setLngLat(pole.coord)
        .addTo(map)
    }
  }

  useEffect(() => {
    if (!containerRef.current) return

    const first = dataRef.current.poles[0]?.coord
    const center: [number, number] = first ?? communeInfo.center ?? DEFAULT_MAP_CENTER

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: GOOGLE_HYBRID_STYLE,
      center,
      zoom: 16,
      minZoom: 6,
      maxZoom: MAP_MAX_ZOOM,
      attributionControl: false,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      // Viền khung xã của tuyến: nằm dưới mọi lớp khác, để biết đâu là địa bàn mình
      map.addSource(COMMUNE_MASK_SRC, { type: 'geojson', data: communeMask(communeBboxRef.current) })
      map.addLayer({
        id: 'pick-commune-mask',
        type: 'fill',
        source: COMMUNE_MASK_SRC,
        paint: { 'fill-color': '#0f172a', 'fill-opacity': 0.35 },
      })
      map.addSource(COMMUNE_SRC, {
        type: 'geojson',
        data: communeOutline(communeBboxRef.current),
      })
      map.addLayer({
        id: 'pick-commune-outline',
        type: 'line',
        source: COMMUNE_SRC,
        paint: { 'line-color': '#facc15', 'line-width': 2.5, 'line-dasharray': [3, 2], 'line-opacity': 0.9 },
      })

      map.addSource(LINE_SRC, { type: 'geojson', data: emptyFc })
      map.addLayer({
        id: 'pick-line-glow',
        type: 'line',
        source: LINE_SRC,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#0284c7', 'line-width': 8, 'line-opacity': 0.4, 'line-blur': 2 },
      })
      map.addLayer({
        id: 'pick-line-core',
        type: 'line',
        source: LINE_SRC,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#38bdf8', 'line-width': 3.5 },
      })

      map.addSource(POLES_SRC, { type: 'geojson', data: emptyFc })
      map.addLayer({
        id: 'pick-poles-circle',
        type: 'circle',
        source: POLES_SRC,
        paint: {
          'circle-radius': ['case', ['get', 'selected'], 8, 6],
          'circle-color': ['case', ['get', 'selected'], '#10b981', '#fde047'],
          'circle-stroke-width': 2,
          'circle-stroke-color': ['case', ['get', 'selected'], '#ffffff', '#0f172a'],
        },
      })
      // Viền cam quanh cột gợi ý (sát hình tuyến, chưa chọn)
      map.addLayer({
        id: 'pick-suggested',
        type: 'circle',
        source: POLES_SRC,
        filter: ['==', ['get', 'suggested'], true],
        paint: {
          'circle-radius': 9,
          'circle-opacity': 0,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#f97316',
        },
      })
      // Vòng sáng quanh cột đang được làm nổi (lọc theo id, rỗng thì không vẽ gì)
      map.addLayer({
        id: 'pick-highlight',
        type: 'circle',
        source: POLES_SRC,
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'circle-radius': 12,
          'circle-opacity': 0,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#f59e0b',
        },
      })

      // Điểm đã bấm khi lấy hình theo đường
      map.addSource(PICKED_SRC, { type: 'geojson', data: emptyFc })
      map.addLayer({
        id: 'pick-road-points',
        type: 'circle',
        source: PICKED_SRC,
        paint: {
          'circle-radius': 6,
          'circle-color': ['case', ['get', 'first'], '#16a34a', '#f97316'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      })

      map.on('click', 'pick-poles-circle', (e) => {
        // Đang lấy hình: cú bấm là một điểm trên đường, không chọn cột
        if (pickModeRef.current) return
        const id = e.features?.[0]?.properties?.id
        if (typeof id === 'string') onToggleRef.current(id)
      })
      map.on('mousemove', 'pick-poles-circle', (e) => {
        map.getCanvas().style.cursor = pickModeRef.current ? 'crosshair' : 'pointer'
        const id = e.features?.[0]?.properties?.id
        if (typeof id === 'string') onHoverRef.current?.(id)
      })
      map.on('mouseleave', 'pick-poles-circle', () => {
        map.getCanvas().style.cursor = bendModeRef.current || pickModeRef.current ? 'crosshair' : ''
        onHoverRef.current?.(null)
      })
      // Chế độ điểm uốn: click chỗ trống (không trúng cột) để đặt điểm uốn
      map.on('click', (e) => {
        if (pickModeRef.current) {
          onPickRoadPointRef.current?.(
            [e.lngLat.lng, e.lngLat.lat],
            queryBaseMapRoadLines(map),
            map.getZoom(),
            toLngLatBounds(communeBboxRef.current)
          )
          return
        }
        if (!bendModeRef.current || !onAddBendRef.current) return
        if (map.queryRenderedFeatures(e.point, { layers: ['pick-poles-circle'] }).length > 0) return
        onAddBendRef.current([e.lngLat.lng, e.lngLat.lat])
      })

      loadedRef.current = true
      if (pickModeRef.current) showRoadHint(map)
      pushData()
      pushHighlight()
      syncBends()
      syncLineHandles()

      const pts = [
        ...dataRef.current.poles.map((p) => p.coord),
        ...dataRef.current.selected.map((p) => p.coord),
        ...(dataRef.current.fixedLine ?? []),
      ]
      if (pts.length > 0) {
        const lngs = pts.map((p) => p[0])
        const lats = pts.map((p) => p[1])
        map.fitBounds(
          [
            [Math.min(...lngs) - 0.0005, Math.min(...lats) - 0.0005],
            [Math.max(...lngs) + 0.0005, Math.max(...lats) + 0.0005],
          ],
          { padding: 50, maxZoom: 17, duration: 0 }
        )
      } else {
        const bounds = communeInfo.bounds || toLngLatBounds(mapBounds?.bbox)
        if (bounds) map.fitBounds(bounds, { padding: 40, duration: 0 })
      }
    })

    const resizeTimer = setTimeout(() => map.resize(), 220)
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => map.resize())
      observer.observe(containerRef.current)
    }

    return () => {
      clearTimeout(resizeTimer)
      observer?.disconnect()
      loadedRef.current = false
      popupRef.current?.remove()
      popupRef.current = null
      endBadgesRef.current.forEach((m) => m.remove())
      endBadgesRef.current = []
      bendMarkersRef.current.forEach((m) => m.remove())
      bendMarkersRef.current.clear()
      lineHandlesRef.current.forEach((m) => m.remove())
      lineHandlesRef.current = []
      map.remove()
      mapRef.current = null
    }
    // Bản đồ chỉ khởi tạo một lần; dữ liệu cột cập nhật qua các effect bên dưới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    pushData()
    syncBends()
    syncLineHandles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poles, selected, fixedLine, pickedPoints, suggestedIds, pickMode, !!onEditLine, !!onInsertBend])

  // Đổi xã (dữ liệu xã tải xong sau khi mở form): vẽ lại viền
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    ;(map.getSource(COMMUNE_SRC) as maplibregl.GeoJSONSource | undefined)?.setData(communeOutline(communeBbox))
    ;(map.getSource(COMMUNE_MASK_SRC) as maplibregl.GeoJSONSource | undefined)?.setData(communeMask(communeBbox))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(communeBbox)])

  useEffect(() => {
    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = bendMode || pickMode ? 'crosshair' : ''
  }, [bendMode, pickMode])

  // Bắt đầu lấy hình: phóng tới mức có đủ đường nhỏ; chấm cột mờ đi để thấy đường bên dưới
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    if (map.getLayer?.('pick-poles-circle')) {
      map.setPaintProperty('pick-poles-circle', 'circle-opacity', pickMode ? 0.2 : 1)
      map.setPaintProperty('pick-poles-circle', 'circle-stroke-opacity', pickMode ? 0.2 : 1)
    }
    // Nét đang lấy: màu cam như các điểm đã bấm, nằm TRÊN lớp cột. Tuyến nhiều cột thì chấm cột dày đặc trên đường,
    // nằm dưới là không thấy nét lấy được đi đâu (vòng vào hẻm, sai nhánh)
    if (map.getLayer?.('pick-line-core') && map.getLayer?.('pick-line-glow')) {
      map.setPaintProperty('pick-line-core', 'line-color', pickMode ? '#f97316' : '#38bdf8')
      map.setPaintProperty('pick-line-glow', 'line-color', pickMode ? '#c2410c' : '#0284c7')
      const above = pickMode ? 'pick-road-points' : 'pick-poles-circle'
      map.moveLayer('pick-line-glow', above)
      map.moveLayer('pick-line-core', above)
    }
    if (pickMode && (map.getZoom?.() ?? MIN_ROAD_ZOOM) < MIN_ROAD_ZOOM) {
      map.easeTo({ zoom: MIN_ROAD_ZOOM, duration: 400 })
    }
    // Tô vàng các đường có trên bản đồ nền: đường không có nét vàng thì phải vẽ tay
    if (pickMode) showRoadHint(map)
    else hideRoadHint(map)
  }, [pickMode])

  useEffect(() => {
    pushHighlight()
  }, [highlightId, poles, selected])

  // Bay tới cột được yêu cầu (click dòng trong danh sách)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !focusRequest) return
    const pole =
      dataRef.current.poles.find((p) => p.id === focusRequest.id) ??
      dataRef.current.selected.find((p) => p.id === focusRequest.id)
    if (!pole) return
    map.easeTo({ center: pole.coord, zoom: Math.max(map.getZoom?.() ?? 0, 17), duration: 500 })
  }, [focusRequest])

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
      <div ref={containerRef} style={{ height, width: '100%' }} className="w-full h-full bg-blue-50" />
      {onAddBend && (
        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1">
          <button
            type="button"
            aria-pressed={bendMode}
            disabled={polesOf(selected).length < 2}
            title={polesOf(selected).length < 2 ? 'Chọn tối thiểu 2 cột trước' : undefined}
            onClick={() => setBendMode((on) => !on)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-md border transition cursor-pointer ${
              bendMode
                ? 'bg-primary text-white border-primary'
                : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {bendMode ? 'Đang thêm điểm uốn' : 'Thêm điểm uốn'}
          </button>
          {bendMode && (
            <span className="px-2 py-1 rounded-lg bg-slate-900/80 text-white text-[10px] font-medium">
              Click chỗ trống giữa hai cột để đặt, bấm nút lần nữa để dừng.
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default SegmentPolePickerMap
