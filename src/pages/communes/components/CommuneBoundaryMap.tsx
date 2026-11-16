import React, { useCallback, useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Check, Eraser, MapPin, PenLine, Search, X } from 'lucide-react'
import type { Geometry } from '../../../types/common/base'
import {
  GOOGLE_HYBRID_STYLE,
  DEFAULT_MAP_CENTER,
  MAP_MAX_ZOOM,
  MAP_DEFAULT_MIN_ZOOM,
} from '../../../utils/gis-map/mapUtils'
import {
  countVertices,
  geometryToPolygons,
  polygonsToBbox,
  polygonsToGeometry,
  simplifyPolygons,
  type BoundaryPoint,
  type BoundaryPolygon,
} from '../../../utils/communeBoundary'
import { searchCommuneSuggestions, type CommuneSuggestion } from '../../../utils/communeSearch'

export interface CommuneBoundaryMapProps {
  boundary: Geometry | null
  /** Bắt buộc khi sửa được; chế độ chỉ xem (readOnly) không cần */
  onChange?: (boundary: Geometry | null) => void
  /** Chỉ xem: không tìm kiếm, không vẽ, không kéo đỉnh */
  readOnly?: boolean
  height?: string
  /** Gọi khi người dùng chọn một gợi ý xã/phường (để form tự điền tên) */
  onPickName?: (name: string) => void
}

// ~4 m: đủ mịn để giữ hình dạng ranh giới nhưng polygon OSM hàng nghìn đỉnh vẫn kéo chỉnh được
const SIMPLIFY_TOLERANCE = 0.00004
const BOUNDARY_COLOR = '#ef4444'
const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

interface VertexRef {
  p: number
  r: number
  i: number
}

const closed = (ring: BoundaryPoint[]): BoundaryPoint[] => [...ring, ring[0]]

export const CommuneBoundaryMap: React.FC<CommuneBoundaryMapProps> = ({
  boundary,
  onChange,
  height = '400px',
  readOnly = false,
  onPickName,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  const polysRef = useRef<BoundaryPolygon[]>([])
  const draftRef = useRef<BoundaryPoint[]>([])
  const dragRef = useRef<VertexRef | null>(null)
  const isDrawingRef = useRef(false)
  const lastEmittedRef = useRef<Geometry | null | undefined>(undefined)
  const firstFitRef = useRef(true)

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const readOnlyRef = useRef(readOnly)
  readOnlyRef.current = readOnly
  const onPickNameRef = useRef(onPickName)
  onPickNameRef.current = onPickName

  const [vertexCount, setVertexCount] = useState(0)
  const [isDrawing, setIsDrawing] = useState(false)
  const [draftCount, setDraftCount] = useState(0)
  const [notice, setNotice] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<CommuneSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchSeqRef = useRef(0)

  // Vẽ lại toàn bộ lớp từ polysRef / draftRef (nguồn dữ liệu duy nhất khi kéo)
  const renderLayers = useCallback(() => {
    const map = mapRef.current
    if (!map || !map.getSource('cb-area')) return
    const polys = polysRef.current

    const areas: GeoJSON.Feature[] = polys.map((polygon) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: polygon.map(closed) },
    }))
    const vertices: GeoJSON.Feature[] = []
    const mids: GeoJSON.Feature[] = []
    polys.forEach((polygon, p) =>
      polygon.forEach((ring, r) =>
        ring.forEach((pt, i) => {
          vertices.push({
            type: 'Feature',
            properties: { p, r, i },
            geometry: { type: 'Point', coordinates: pt },
          })
          const next = ring[(i + 1) % ring.length]
          mids.push({
            type: 'Feature',
            properties: { p, r, i },
            geometry: { type: 'Point', coordinates: [(pt[0] + next[0]) / 2, (pt[1] + next[1]) / 2] },
          })
        })
      )
    )

    const draft = draftRef.current
    const draftFeatures: GeoJSON.Feature[] = draft.map((pt) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: pt },
    }))
    if (draft.length >= 2) {
      draftFeatures.push({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: draft },
      })
    }

    const set = (id: string, features: GeoJSON.Feature[]) =>
      (map.getSource(id) as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features })
    set('cb-area', areas)
    set(
      'cb-mask',
      readOnlyRef.current && polys.length > 0
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]],
                  ...polys.map((polygon) => closed(polygon[0])),
                ],
              },
            },
          ]
        : []
    )
    set('cb-vertices', vertices)
    set('cb-mids', mids)
    set('cb-draft', draftFeatures)
    setVertexCount(countVertices(polys))
  }, [])

  const fitToBoundary = useCallback((instant: boolean) => {
    const map = mapRef.current
    const bbox = polygonsToBbox(polysRef.current)
    if (!map || !bbox) return
    map.fitBounds(
      [
        [bbox.min_lng ?? 0, bbox.min_lat ?? 0],
        [bbox.max_lng ?? 0, bbox.max_lat ?? 0],
      ],
      { padding: 60, maxZoom: 16, duration: instant ? 0 : 700 }
    )
  }, [])

  // Báo ra ngoài ranh giới hiện tại (chỉ gọi khi người dùng chốt thao tác, không gọi khi đang kéo)
  const commit = useCallback(() => {
    const geometry = polygonsToGeometry(polysRef.current)
    lastEmittedRef.current = geometry
    onChangeRef.current?.(geometry)
  }, [])

  const setPolygons = useCallback(
    (polys: BoundaryPolygon[], fit: boolean) => {
      polysRef.current = polys
      draftRef.current = []
      setDraftCount(0)
      renderLayers()
      if (fit) {
        fitToBoundary(firstFitRef.current)
        if (polys.length > 0) firstFitRef.current = false
      }
    },
    [renderLayers, fitToBoundary]
  )

  const setDrawing = useCallback((next: boolean) => {
    isDrawingRef.current = next
    setIsDrawing(next)
    const map = mapRef.current
    if (map) {
      map.getCanvas().style.cursor = next ? 'crosshair' : ''
    }
  }, [])

  // Khởi tạo bản đồ + lớp + thao tác kéo/thêm/xóa đỉnh
  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: GOOGLE_HYBRID_STYLE,
      center: DEFAULT_MAP_CENTER,
      zoom: 13,
      maxZoom: MAP_MAX_ZOOM,
      minZoom: MAP_DEFAULT_MIN_ZOOM,
      attributionControl: false,
    })
    mapRef.current = map
    // Bấm đúp dùng để xóa đỉnh khi chỉnh sửa nên không zoom theo bấm đúp
    if (!readOnlyRef.current) map.doubleClickZoom.disable()
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')

    map.on('load', () => {
      for (const id of ['cb-area', 'cb-mask', 'cb-vertices', 'cb-mids', 'cb-draft']) {
        map.addSource(id, { type: 'geojson', data: EMPTY_FC })
      }
      // Chế độ xem: tối vùng ngoài ranh giới, không tô vùng bên trong
      map.addLayer({
        id: 'cb-mask',
        type: 'fill',
        source: 'cb-mask',
        paint: { 'fill-color': '#020617', 'fill-opacity': 0.6 },
      })
      map.addLayer({
        id: 'cb-fill',
        type: 'fill',
        source: 'cb-area',
        paint: { 'fill-color': BOUNDARY_COLOR, 'fill-opacity': readOnlyRef.current ? 0 : 0.08 },
      })
      map.addLayer({
        id: 'cb-line',
        type: 'line',
        source: 'cb-area',
        paint: { 'line-color': BOUNDARY_COLOR, 'line-width': 2.5, 'line-dasharray': [3, 2] },
      })
      map.addLayer({
        id: 'cb-mids',
        type: 'circle',
        source: 'cb-mids',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, 15, 4.5],
          'circle-color': BOUNDARY_COLOR,
          'circle-opacity': 0.4,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
        },
      })
      map.addLayer({
        id: 'cb-vertices',
        type: 'circle',
        source: 'cb-vertices',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 4.5, 15, 8],
          'circle-color': '#ffffff',
          'circle-stroke-color': BOUNDARY_COLOR,
          'circle-stroke-width': 2,
        },
      })
      map.addLayer({
        id: 'cb-draft-line',
        type: 'line',
        source: 'cb-draft',
        filter: ['==', '$type', 'LineString'],
        paint: { 'line-color': '#f59e0b', 'line-width': 2.5 },
      })
      map.addLayer({
        id: 'cb-draft-pt',
        type: 'circle',
        source: 'cb-draft',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 5,
          'circle-color': '#f59e0b',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      })
      if (readOnlyRef.current) {
        map.setLayoutProperty('cb-vertices', 'visibility', 'none')
        map.setLayoutProperty('cb-mids', 'visibility', 'none')
      }
      setIsMapLoaded(true)
    })

    const endDrag = () => {
      if (!dragRef.current) return
      dragRef.current = null
      map.dragPan.enable()
      map.getCanvas().style.cursor = ''
      commit()
    }

    map.on('mousedown', 'cb-vertices', (e) => {
      if (readOnlyRef.current || isDrawingRef.current || e.originalEvent.button !== 0) return
      const props = e.features?.[0]?.properties
      if (!props) return
      e.preventDefault()
      map.dragPan.disable()
      dragRef.current = { p: Number(props.p), r: Number(props.r), i: Number(props.i) }
      map.getCanvas().style.cursor = 'grabbing'
    })

    // Bấm chấm nhạt giữa cạnh: chèn đỉnh mới ngay tại đó rồi kéo luôn
    map.on('mousedown', 'cb-mids', (e) => {
      if (readOnlyRef.current || isDrawingRef.current || e.originalEvent.button !== 0) return
      const feature = e.features?.[0]
      if (!feature || feature.geometry.type !== 'Point') return
      const { p, r, i } = feature.properties as VertexRef
      const [lng, lat] = feature.geometry.coordinates
      e.preventDefault()
      polysRef.current[p][r].splice(i + 1, 0, [lng, lat])
      map.dragPan.disable()
      dragRef.current = { p, r, i: i + 1 }
      renderLayers()
      map.getCanvas().style.cursor = 'grabbing'
    })

    map.on('mousemove', (e) => {
      const drag = dragRef.current
      if (!drag) return
      polysRef.current[drag.p][drag.r][drag.i] = [
        Number(e.lngLat.lng.toFixed(6)),
        Number(e.lngLat.lat.toFixed(6)),
      ]
      renderLayers()
    })
    map.on('mouseup', endDrag)
    window.addEventListener('mouseup', endDrag)

    // Chuột phải hoặc bấm đúp vào đỉnh: xóa đỉnh, cạnh thẳng lại (giữ tối thiểu 3 đỉnh)
    const removeVertexAt = (point: maplibregl.PointLike): boolean => {
      const props = map.queryRenderedFeatures(point, { layers: ['cb-vertices'] })[0]?.properties
      if (!props) return false
      const ring = polysRef.current[Number(props.p)]?.[Number(props.r)]
      if (!ring || ring.length <= 3) {
        setNotice('Mỗi vòng ranh giới cần tối thiểu 3 đỉnh.')
        return true
      }
      ring.splice(Number(props.i), 1)
      renderLayers()
      commit()
      return true
    }
    map.on('contextmenu', (e) => {
      if (readOnlyRef.current || isDrawingRef.current) return
      if (removeVertexAt(e.point)) e.originalEvent.preventDefault()
    })
    map.on('dblclick', (e) => {
      if (readOnlyRef.current || isDrawingRef.current) return
      // Bấm đúp vào đỉnh thì không để bản đồ zoom
      removeVertexAt(e.point)
    })

    // Chế độ vẽ tay: mỗi lần bấm thêm một đỉnh
    map.on('click', (e) => {
      if (!isDrawingRef.current) return
      draftRef.current = [...draftRef.current, [Number(e.lngLat.lng.toFixed(6)), Number(e.lngLat.lat.toFixed(6))]]
      setDraftCount(draftRef.current.length)
      renderLayers()
    })

    for (const layer of ['cb-vertices', 'cb-mids']) {
      map.on('mouseenter', layer, () => {
        if (!readOnlyRef.current && !dragRef.current && !isDrawingRef.current) map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', layer, () => {
        if (!dragRef.current && !isDrawingRef.current) map.getCanvas().style.cursor = ''
      })
    }

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(containerRef.current)

    return () => {
      window.removeEventListener('mouseup', endDrag)
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [commit, renderLayers])

  // Ranh giới đến từ bên ngoài (mở form sửa, tải xong từ API, bấm "Đặt lại"): nạp lên bản đồ
  useEffect(() => {
    if (!isMapLoaded || boundary === lastEmittedRef.current) return
    lastEmittedRef.current = boundary
    setPolygons(geometryToPolygons(boundary), true)
  }, [boundary, isMapLoaded, setPolygons])

  const handleSearchInput = (value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    const trimmed = value.trim()
    if (trimmed.length < 2) {
      setResults([])
      setIsSearching(false)
      setIsSearchOpen(false)
      return
    }
    setIsSearchOpen(true)
    setIsSearching(true)
    const seq = ++searchSeqRef.current
    searchTimerRef.current = setTimeout(async () => {
      try {
        const found = await searchCommuneSuggestions(trimmed)
        if (seq === searchSeqRef.current) setResults(found)
      } catch {
        if (seq === searchSeqRef.current) setResults([])
      } finally {
        if (seq === searchSeqRef.current) setIsSearching(false)
      }
    }, 350)
  }

  // Chọn gợi ý: vẽ sẵn ranh giới của xã/phường đó để người dùng kéo chỉnh
  const handleSelect = (item: CommuneSuggestion) => {
    setSearchQuery(item.name)
    setIsSearchOpen(false)
    setDrawing(false)
    onPickNameRef.current?.(item.name)

    const polys = simplifyPolygons(geometryToPolygons(item.geometry), SIMPLIFY_TOLERANCE)
    if (polys.length === 0) {
      setNotice(`OpenStreetMap chưa có ranh giới cho "${item.name}". Hãy bấm "Vẽ tay ranh giới" để tự vẽ.`)
      mapRef.current?.flyTo({ center: [item.lng, item.lat], zoom: 14, duration: 650 })
      return
    }
    setNotice('')
    setPolygons(polys, true)
    commit()
  }

  const handleFinishDraw = () => {
    const draft = draftRef.current
    if (draft.length < 3) return
    setDrawing(false)
    setNotice('')
    setPolygons([[draft]], false)
    commit()
  }

  const handleCancelDraw = () => {
    draftRef.current = []
    setDraftCount(0)
    setDrawing(false)
    renderLayers()
  }

  const handleClear = () => {
    setNotice('')
    setPolygons([], false)
    commit()
  }

  const hasBoundary = vertexCount > 0

  return (
    <div
      style={{ height, minHeight: '380px' }}
      className="relative w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm bg-blue-50 select-none flex flex-col"
    >
      {!readOnly && (
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-col gap-2 pointer-events-none">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="relative flex-1 min-w-[210px] max-w-xs pointer-events-auto">
            <div className="flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-md px-3 py-1.5 gap-2">
              <Search className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
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
                    setResults([])
                    setIsSearchOpen(false)
                  }}
                  className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                  aria-label="Xóa từ khóa"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {isSearchOpen && searchQuery.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-xl max-h-56 overflow-y-auto p-1 z-40">
                {isSearching && (
                  <div className="px-2.5 py-1.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                    Đang tìm xã/phường...
                  </div>
                )}
                {!isSearching && results.length === 0 && (
                  <div className="px-2.5 py-2 text-[10.5px] text-slate-500 dark:text-slate-400 text-center">
                    Không tìm thấy xã/phường phù hợp
                  </div>
                )}
                {results.map((item, idx) => (
                  <button
                    key={`${item.fullName}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {item.fullName}
                      </div>
                    </div>
                    {!item.geometry && (
                      <span className="shrink-0 text-[9.5px] font-semibold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
                        Chưa có ranh giới
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {isDrawing ? (
              <>
                <button
                  type="button"
                  onClick={handleFinishDraw}
                  disabled={draftCount < 3}
                  className="px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-lg flex items-center gap-1.5 cursor-pointer transition bg-emerald-600 border-emerald-400 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Hoàn tất ({draftCount} đỉnh)</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelDraw}
                  className="px-3 py-1.5 rounded-xl border text-[11px] font-semibold shadow-md flex items-center gap-1.5 cursor-pointer transition bg-white/95 border-slate-200 text-slate-700 hover:bg-white"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hủy</span>
                </button>
              </>
            ) : hasBoundary ? (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 rounded-xl border text-[11px] font-semibold shadow-md flex items-center gap-1.5 cursor-pointer transition bg-white/95 border-slate-200 text-rose-600 hover:bg-rose-50"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Xóa ranh giới</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNotice('')
                  setDrawing(true)
                }}
                className="px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-lg flex items-center gap-1.5 cursor-pointer transition bg-red-500 border-red-300 text-white hover:bg-red-400"
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>Vẽ tay ranh giới</span>
              </button>
            )}
          </div>
        </div>

        {notice && (
          <div className="self-start max-w-md px-3 py-1.5 rounded-xl bg-amber-50/95 border border-amber-300 text-amber-900 text-[11px] font-medium shadow-md pointer-events-auto">
            {notice}
          </div>
        )}
        {isDrawing && (
          <div className="self-start px-3 py-1.5 rounded-xl bg-white/95 border border-slate-200 text-slate-700 text-[11px] font-medium shadow-md pointer-events-auto">
            Bấm lần lượt các điểm dọc ranh giới (tối thiểu 3 điểm), rồi bấm "Hoàn tất".
          </div>
        )}
      </div>
      )}

      <div ref={containerRef} style={{ height: '100%', minHeight: '380px' }} className="w-full h-full flex-1" />
    </div>
  )
}

export default CommuneBoundaryMap
