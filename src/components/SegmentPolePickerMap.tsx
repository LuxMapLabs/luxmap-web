import React, { useEffect, useMemo, useRef } from 'react'
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
} from '../utils/gis-map/mapUtils'
import type { OrderedPole } from '../utils/gis-map/segmentPoleOrder'

export interface PickablePole extends OrderedPole {
  code?: string
}

interface SegmentPolePickerMapProps {
  /** Các cột có thể chọn (đã lọc: có GPS, chưa thuộc tuyến khác). */
  poles: PickablePole[]
  /** Các cột đã chọn, đã sắp theo thứ tự dọc tuyến. */
  selected: OrderedPole[]
  onTogglePole: (poleId: string) => void
  /** Cột đang được làm nổi (rê chuột từ bản đồ hoặc từ danh sách). */
  highlightId?: string | null
  /** Báo cột đang rê chuột trên bản đồ (null khi rời khỏi). */
  onHoverPole?: (poleId: string | null) => void
  /** Yêu cầu bay tới một cột; `tick` đổi mỗi lần yêu cầu để bay lại được cùng một cột. */
  focusRequest?: { id: string; tick: number } | null
  communeId?: string | null
  height?: string
}

const POLES_SRC = 'pick-poles'
const LINE_SRC = 'pick-line'
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
  onTogglePole,
  highlightId = null,
  onHoverPole,
  focusRequest = null,
  communeId,
  height = '480px',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const loadedRef = useRef(false)
  const popupRef = useRef<maplibregl.Marker | null>(null)
  const endBadgesRef = useRef<maplibregl.Marker[]>([])

  const onToggleRef = useRef(onTogglePole)
  onToggleRef.current = onTogglePole
  const onHoverRef = useRef(onHoverPole)
  onHoverRef.current = onHoverPole

  const currentUser = useSelector((state: RootState) => state?.auth?.user)
  const adminCommunes = useSelector((state: RootState) => state?.adminCommunes?.communes)
  const mapBounds = currentUser?.map_bounds
  const communeInfo = useMemo(
    () => getCommuneBboxInfo(communeId, currentUser?.communes, adminCommunes, mapBounds),
    [communeId, currentUser?.communes, adminCommunes, mapBounds]
  )

  // Dữ liệu mới nhất, để lần vẽ đầu (sau sự kiện 'load') và các lần cập nhật dùng chung
  const dataRef = useRef({ poles, selected, highlightId })
  dataRef.current = { poles, selected, highlightId }

  const pushData = () => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    const { poles: allPoles, selected: chosen } = dataRef.current
    const chosenIds = new Set(chosen.map((p) => p.id))

    ;(map.getSource(POLES_SRC) as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: allPoles.map((p) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: p.coord },
        properties: { id: p.id, code: p.code || p.id, selected: chosenIds.has(p.id) },
      })),
    })
    ;(map.getSource(LINE_SRC) as maplibregl.GeoJSONSource | undefined)?.setData(
      chosen.length >= 2
        ? {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: chosen.map((p) => p.coord) },
            properties: {},
          }
        : emptyFc
    )

    // Nhãn ĐẦU / CUỐI
    endBadgesRef.current.forEach((m) => m.remove())
    endBadgesRef.current =
      chosen.length >= 2
        ? [chosen[0], chosen[chosen.length - 1]].map((pole, i) =>
            new maplibregl.Marker({ element: createEndBadge(i === 0), anchor: 'bottom', offset: [0, -9] })
              .setLngLat(pole.coord)
              .addTo(map)
          )
        : []
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
      const order = dataRef.current.selected.findIndex((p) => p.id === id)
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

      map.on('click', 'pick-poles-circle', (e) => {
        const id = e.features?.[0]?.properties?.id
        if (typeof id === 'string') onToggleRef.current(id)
      })
      map.on('mousemove', 'pick-poles-circle', (e) => {
        map.getCanvas().style.cursor = 'pointer'
        const id = e.features?.[0]?.properties?.id
        if (typeof id === 'string') onHoverRef.current?.(id)
      })
      map.on('mouseleave', 'pick-poles-circle', () => {
        map.getCanvas().style.cursor = ''
        onHoverRef.current?.(null)
      })

      loadedRef.current = true
      pushData()
      pushHighlight()

      const pts = [...dataRef.current.poles.map((p) => p.coord), ...dataRef.current.selected.map((p) => p.coord)]
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
      map.remove()
      mapRef.current = null
    }
    // Bản đồ chỉ khởi tạo một lần; dữ liệu cột cập nhật qua các effect bên dưới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    pushData()
  }, [poles, selected])

  useEffect(() => {
    pushHighlight()
  }, [highlightId, poles, selected])

  // Bay tới cột được yêu cầu (click dòng trong danh sách)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !focusRequest) return
    const pole = dataRef.current.poles.find((p) => p.id === focusRequest.id)
    if (!pole) return
    map.easeTo({ center: pole.coord, zoom: Math.max(map.getZoom?.() ?? 0, 17), duration: 500 })
  }, [focusRequest])

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
      <div ref={containerRef} style={{ height, width: '100%' }} className="w-full h-full bg-slate-900" />
    </div>
  )
}

export default SegmentPolePickerMap
