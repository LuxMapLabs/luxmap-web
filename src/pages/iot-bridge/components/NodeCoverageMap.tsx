import React, { useEffect, useMemo, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { AlertTriangle, CheckCircle2, Info, MousePointerClick, RadioTower } from 'lucide-react'
import { GOOGLE_HYBRID_STYLE, DEFAULT_MAP_CENTER, MAP_MAX_ZOOM, toBoundaryGeoJSON } from '../../../utils/gis-map/mapUtils'
import { circleRing } from '../../../utils/gis-map/circleGeoJson'
import { geometryToPolygons, polygonsToBbox } from '../../../utils/communeBoundary'
import { distanceKm, serverCoverage } from '../../../utils/iot/serverCoverage'
import type { CabinetListItem } from '../../../types/assets/cabinets'
import type { CommuneBbox } from '../../../types/admin/communes'
import type { Geometry } from '../../../types/common/base'
import type { IotServerStatus } from '../../../types/iot/servers'

const BOUNDARY_SRC = 'cov-boundary-src'
const CIRCLE_SRC = 'cov-circle-src'
const NODE_CIRCLE_SRC = 'cov-node-circle-src'

type MarkerKind = 'server' | 'in' | 'out' | 'unknown'

// Màu thân tủ theo trạng thái: cùng cách vẽ icon tủ điện của chú giải trang GIS.
const CABINET_TONE: Record<Exclude<MarkerKind, 'server'>, { hi: string; body: string; deep: string; shadow: string }> = {
  in: { hi: '#818cf8', body: '#4f46e5', deep: '#4338ca', shadow: '#312e81' },
  unknown: { hi: '#cbd5e1', body: '#64748b', deep: '#475569', shadow: '#1e293b' },
  out: { hi: '#94a3b8', body: '#334155', deep: '#1e293b', shadow: '#0f172a' },
}

/**
 * Icon marker dùng chung cho bản đồ và chú giải để hai bên luôn giống nhau.
 * Khác nhau bằng hình, không chỉ bằng màu: tủ ngoài vùng tối + huy hiệu "!", tủ đang chọn to hơn có vòng vàng.
 */
const MarkerView: React.FC<{ kind: MarkerKind; selected?: boolean; size?: number; label?: string }> = ({
  kind,
  selected = false,
  size = 26,
  label,
}) => {
  if (kind === 'server') {
    const d = Math.round(size * 1.15)
    return (
      <span
        aria-hidden
        className="relative flex items-center justify-center rounded-full bg-amber-500 border-[3px] border-white shadow-[0_0_0_2px_#b45309,0_3px_8px_rgba(0,0,0,0.5)]"
        style={{ width: d, height: d }}
      >
        <RadioTower className="text-white" style={{ width: d * 0.5, height: d * 0.5 }} strokeWidth={2.4} />
      </span>
    )
  }
  const tone = CABINET_TONE[kind]
  const id = `cov-${kind}`
  const px = selected ? Math.round(size * 1.3) : size
  return (
    <span aria-hidden className="relative flex flex-col items-center" style={{ opacity: kind === 'out' ? 0.88 : 1 }}>
      <span
        className="relative flex items-center justify-center rounded-lg"
        style={{
          width: px + 4,
          height: px + 4,
          boxShadow: selected ? '0 0 0 3px #fbbf24, 0 0 0 7px rgba(251,191,36,0.35)' : '0 1px 4px rgba(0,0,0,0.55)',
          background: selected ? 'rgba(255,255,255,0.12)' : undefined,
        }}
      >
        <svg width={px} height={px} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.4))' }}>
          <defs>
            <linearGradient id={`${id}-body`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={tone.hi} />
              <stop offset="28%" stopColor={tone.body} />
              <stop offset="72%" stopColor={tone.deep} />
              <stop offset="100%" stopColor={tone.shadow} />
            </linearGradient>
          </defs>
          <rect x="3" y="2.5" width="18" height="19" rx="4" fill={`url(#${id}-body)`} stroke="#ffffff" strokeWidth="1.4" strokeDasharray={kind === 'out' ? '2.4 1.6' : undefined} />
          <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.9" />
          <path d="M12.5 11L8.5 15.5H11.8L10.5 20L15.5 14.5H12.2L13 11Z" fill="#ffffff" />
        </svg>
        {kind === 'out' && (
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-400 border border-white text-[9px] leading-none font-extrabold text-slate-900 flex items-center justify-center">
            !
          </span>
        )}
      </span>
      {selected && label && (
        <span className="absolute top-full mt-2 whitespace-nowrap rounded-md bg-slate-900/90 px-2 py-0.5 text-[11px] font-semibold text-white shadow-md border border-white/20">
          {label}
        </span>
      )}
    </span>
  )
}

type Props = {
  /** Server đang chọn: có vị trí và bán kính thì vẽ vòng phủ sóng quanh nó. */
  server: IotServerStatus | null
  /** Tủ của xã đang chọn, chấm trên bản đồ. */
  cabinets: CabinetListItem[]
  selectedCabinetId: string
  onSelectCabinet: (cabinetId: string) => void
  boundaryGeometry?: Geometry | null
  bbox?: CommuneBbox | null
  height?: string
  /** Bán kính node (km): vẽ vòng quanh tủ đang chọn vì node cố định theo tủ. 0 thì không vẽ. */
  nodeRadiusKm?: number
}

const emptyCollection = (): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features: [] })

const formatKm = (km: number) => `${km.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} km`

const cabinetLabel = (c: Pick<CabinetListItem, 'cabinet_id' | 'cabinet_name'>) =>
  c.cabinet_name ? `${c.cabinet_name} (${c.cabinet_id})` : String(c.cabinet_id ?? '')

/** Mẫu trong chú giải: chính là icon marker trên bản đồ. */
const Swatch: React.FC<{ kind: MarkerKind | 'pick' | 'ring' }> = ({ kind }) => {
  if (kind === 'ring') {
    return <span aria-hidden className="inline-block shrink-0 w-4 h-3 rounded-sm border-2 border-dashed border-amber-500 bg-amber-100" />
  }
  if (kind === 'pick') return <MarkerView kind="in" selected size={14} />
  return <MarkerView kind={kind} size={kind === 'server' ? 14 : 16} />
}

/**
 * Bản đồ vệ tinh chỉ để xem khi gắn node: vòng bán kính của server IoT, viền xã và các tủ điện cùng xã.
 * Bấm vào chấm tủ để chọn tủ đó (ô chọn tủ bên cạnh vẫn dùng được bằng bàn phím). Tủ ngoài vòng vẫn chọn được.
 */
export const NodeCoverageMap: React.FC<Props> = ({
  server,
  cabinets,
  selectedCabinetId,
  onSelectCabinet,
  boundaryGeometry,
  bbox,
  height = '360px',
  nodeRadiusKm = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const selectRef = useRef(onSelectCabinet)
  selectRef.current = onSelectCabinet

  // Giữ cùng một đối tượng khi server không đổi để các useMemo / effect bên dưới không chạy lại mỗi lần render.
  const rawCoverage = serverCoverage(server)
  const covLat = rawCoverage?.center.lat
  const covLng = rawCoverage?.center.lng
  const covRadius = rawCoverage?.radiusKm
  const coverage = useMemo(
    () =>
      covLat === undefined || covLng === undefined || covRadius === undefined
        ? null
        : { center: { lat: covLat, lng: covLng }, radiusKm: covRadius },
    [covLat, covLng, covRadius]
  )

  const boundaryFeature = useMemo(() => toBoundaryGeoJSON(boundaryGeometry, bbox), [boundaryGeometry, bbox])

  // Mỗi tủ: khoảng cách tới server và trạng thái trong / ngoài vùng.
  const cabinetInfo = useMemo(
    () =>
      cabinets.flatMap((c) => {
        const loc = c.location
        if (!c.cabinet_id || !loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return []
        const km = coverage ? distanceKm(coverage.center, loc) : null
        const range: 'in' | 'out' | 'unknown' = coverage && km !== null ? (km <= coverage.radiusKm ? 'in' : 'out') : 'unknown'
        return [{ cabinet: c, loc, km, range }]
      }),
    [cabinets, coverage]
  )
  const inCount = cabinetInfo.filter((c) => c.range === 'in').length

  const circleFeature = useMemo<GeoJSON.Feature | null>(
    () =>
      coverage
        ? {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: [circleRing(coverage.center.lng, coverage.center.lat, coverage.radiusKm)] },
          }
        : null,
    [coverage]
  )

  // Vòng bán kính của node: tâm là tủ đang chọn (node đặt cố định ở tủ).
  const pickedLoc = cabinetInfo.find((c) => c.cabinet.cabinet_id === selectedCabinetId)?.loc
  const nodeLat = pickedLoc?.lat
  const nodeLng = pickedLoc?.lng
  const nodeCircleFeature = useMemo<GeoJSON.Feature | null>(
    () =>
      nodeLat === undefined || nodeLng === undefined || !(nodeRadiusKm > 0)
        ? null
        : { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [circleRing(nodeLng, nodeLat, nodeRadiusKm)] } },
    [nodeLat, nodeLng, nodeRadiusKm]
  )

  // Tạo bản đồ một lần; nguồn dữ liệu và lớp vẽ được dựng ở effect bên dưới khi style sẵn sàng.
  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: GOOGLE_HYBRID_STYLE,
      center: DEFAULT_MAP_CENTER,
      zoom: 13,
      maxZoom: MAP_MAX_ZOOM,
      attributionControl: false,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14, className: 'cov-popup' })
    popupRef.current = popup

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => map.resize())
      observer.observe(containerRef.current)
    }
    return () => {
      observer?.disconnect()
      popup.remove()
      popupRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Vẽ lớp dữ liệu; chạy lại mỗi khi dữ liệu đổi.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const draw = () => {
      const upsert = (id: string, data: GeoJSON.GeoJSON) => {
        const source = map.getSource(id) as maplibregl.GeoJSONSource | undefined
        if (source) source.setData(data)
        else map.addSource(id, { type: 'geojson', data })
      }
      upsert(BOUNDARY_SRC, boundaryFeature ?? emptyCollection())
      upsert(CIRCLE_SRC, circleFeature ?? emptyCollection())
      upsert(NODE_CIRCLE_SRC, nodeCircleFeature ?? emptyCollection())

      if (map.getLayer('cov-boundary-line')) return
      map.addLayer({
        id: 'cov-boundary-fill',
        type: 'fill',
        source: BOUNDARY_SRC,
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.07 },
      })
      map.addLayer({
        id: 'cov-boundary-line',
        type: 'line',
        source: BOUNDARY_SRC,
        paint: { 'line-color': '#60a5fa', 'line-width': 2, 'line-dasharray': [3, 2] },
      })
      // Vòng phủ sóng: viền trắng mảnh phía dưới để nét đứt vàng vẫn đọc được trên ảnh vệ tinh sáng.
      map.addLayer({
        id: 'cov-circle-fill',
        type: 'fill',
        source: CIRCLE_SRC,
        paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.14 },
      })
      map.addLayer({
        id: 'cov-circle-casing',
        type: 'line',
        source: CIRCLE_SRC,
        paint: { 'line-color': '#0f172a', 'line-width': 4.5, 'line-opacity': 0.55 },
      })
      map.addLayer({
        id: 'cov-circle-line',
        type: 'line',
        source: CIRCLE_SRC,
        paint: { 'line-color': '#fcd34d', 'line-width': 2.5, 'line-dasharray': [2, 1.5] },
      })
      // Vòng của node: màu chàm để không lẫn với vòng vàng của server.
      map.addLayer({
        id: 'cov-node-fill',
        type: 'fill',
        source: NODE_CIRCLE_SRC,
        paint: { 'fill-color': '#6366f1', 'fill-opacity': 0.16 },
      })
      map.addLayer({
        id: 'cov-node-casing',
        type: 'line',
        source: NODE_CIRCLE_SRC,
        paint: { 'line-color': '#0f172a', 'line-width': 4.5, 'line-opacity': 0.55 },
      })
      map.addLayer({
        id: 'cov-node-line',
        type: 'line',
        source: NODE_CIRCLE_SRC,
        paint: { 'line-color': '#a5b4fc', 'line-width': 2.5, 'line-dasharray': [2, 1.5] },
      })
    }
    if (map.getStyle()) draw()
    else map.once('load', draw)
    return () => {
      map.off('load', draw)
    }
  }, [boundaryFeature, circleFeature, nodeCircleFeature])

  // Marker HTML (nút bấm có nhãn đọc được): server và từng tủ. Dựng lại khi dữ liệu hoặc tủ đang chọn đổi.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers: maplibregl.Marker[] = []
    const roots: Root[] = []
    const popup = popupRef.current

    const mount = (el: HTMLElement, node: React.ReactNode) => {
      const root = createRoot(el)
      root.render(node)
      roots.push(root)
    }

    if (server?.location && Number.isFinite(server.location.lat) && Number.isFinite(server.location.lng)) {
      const el = document.createElement('div')
      el.title = `Server ${server.server_id ?? ''}`
      el.style.zIndex = '3'
      mount(el, <MarkerView kind="server" size={28} />)
      markers.push(new maplibregl.Marker({ element: el }).setLngLat([server.location.lng, server.location.lat]).addTo(map))
    }

    cabinetInfo.forEach(({ cabinet, loc, km, range }) => {
      const id = cabinet.cabinet_id!
      const isSelected = id === selectedCabinetId
      const label = cabinetLabel(cabinet)
      const where =
        range === 'in' ? `trong vùng, cách server ${formatKm(km!)}` : range === 'out' ? `ngoài vùng, cách server ${formatKm(km!)}` : ''
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white'
      el.style.zIndex = isSelected ? '2' : '1'
      el.setAttribute('aria-label', `Chọn tủ ${label}${where ? `, ${where}` : ''}`)
      el.setAttribute('aria-pressed', String(isSelected))
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        selectRef.current(id)
      })
      const show = () => {
        // Dựng bằng textContent: tên tủ là dữ liệu người dùng nhập, không chèn thành HTML.
        const box = document.createElement('div')
        box.style.cssText = 'font:600 12px/1.35 Inter,system-ui,sans-serif;color:#0f172a'
        const title = document.createElement('div')
        title.textContent = label
        box.appendChild(title)
        const sub = document.createElement('div')
        sub.style.cssText = 'font-weight:500;color:#475569'
        sub.textContent = where ? where.charAt(0).toUpperCase() + where.slice(1) : 'Bấm để chọn tủ này'
        box.appendChild(sub)
        popup?.setLngLat([loc.lng, loc.lat]).setDOMContent(box).addTo(map)
      }
      el.addEventListener('mouseenter', show)
      el.addEventListener('focus', show)
      el.addEventListener('mouseleave', () => popup?.remove())
      el.addEventListener('blur', () => popup?.remove())
      mount(el, <MarkerView kind={range} selected={isSelected} label={isSelected ? label : undefined} />)
      markers.push(new maplibregl.Marker({ element: el }).setLngLat([loc.lng, loc.lat]).addTo(map))
    })

    return () => {
      popup?.remove()
      markers.forEach((m) => m.remove())
      // Gỡ React root sau khi render hiện tại xong để tránh cảnh báo unmount đồng bộ.
      setTimeout(() => roots.forEach((r) => r.unmount()), 0)
    }
  }, [server, cabinetInfo, selectedCabinetId])

  // Căn bản đồ khi đổi server hoặc xã (không căn lại khi chỉ đổi tủ đang chọn).
  const fitKey = `${server?.server_id ?? ''}|${coverage?.radiusKm ?? 0}|${cabinetInfo.length}|${selectedCabinetId}|${nodeRadiusKm}|${boundaryFeature ? JSON.stringify(boundaryFeature.geometry).length : 0}`
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const points: [number, number][] = []
    if (coverage) {
      circleRing(coverage.center.lng, coverage.center.lat, coverage.radiusKm).forEach((p) => points.push(p))
    } else if (cabinetInfo.length > 0) {
      // Chưa có vùng phủ sóng: căn theo chính các tủ để thấy rõ từng tủ, không căn theo cả khung xã.
      cabinetInfo.forEach(({ loc }) => points.push([loc.lng, loc.lat]))
    } else if (boundaryFeature) {
      const box = polygonsToBbox(geometryToPolygons(boundaryFeature.geometry))
      if (box && [box.min_lng, box.min_lat, box.max_lng, box.max_lat].every((v) => Number.isFinite(v))) {
        points.push([box.min_lng!, box.min_lat!], [box.max_lng!, box.max_lat!])
      }
    }
    // Vòng của node nằm trọn trong khung nhìn để không bị cắt mép.
    if (nodeLat !== undefined && nodeLng !== undefined && nodeRadiusKm > 0) {
      circleRing(nodeLng, nodeLat, nodeRadiusKm).forEach((p) => points.push(p))
    }
    if (points.length === 0) return
    const lngs = points.map((p) => p[0])
    const lats = points.map((p) => p[1])
    const fit = () =>
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 40, duration: 300, maxZoom: 16 }
      )
    if (map.getStyle()) fit()
    else map.once('load', fit)
    // fitKey đại diện cho dữ liệu cần căn; không phụ thuộc trực tiếp vào đối tượng để khỏi căn lại mỗi lần render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey])

  // Dòng trạng thái dưới bản đồ: nói rõ bằng chữ + biểu tượng, không chỉ bằng màu.
  const selected = cabinetInfo.find((c) => c.cabinet.cabinet_id === selectedCabinetId)
  let status: { tone: 'info' | 'warn' | 'ok'; text: React.ReactNode }
  if (!server) {
    status = { tone: 'info', text: 'Chọn server IoT để xem vùng phủ sóng của nó trên bản đồ.' }
  } else if (!coverage) {
    status = {
      tone: 'warn',
      text: `Server ${server.server_id} chưa có vị trí hoặc bán kính nên chưa vẽ được vùng phủ sóng. Đặt ở "Sửa vị trí server".`,
    }
  } else if (selected && selected.km !== null) {
    status =
      selected.range === 'in'
        ? {
            tone: 'ok',
            text: (
              <>
                <strong>{cabinetLabel(selected.cabinet)}</strong> cách server {formatKm(selected.km)}, nằm trong vùng phủ sóng ({formatKm(coverage.radiusKm)}).
              </>
            ),
          }
        : {
            tone: 'warn',
            text: (
              <>
                <strong>{cabinetLabel(selected.cabinet)}</strong> cách server {formatKm(selected.km)}, ngoài vùng phủ sóng ({formatKm(coverage.radiusKm)}). Kiểm tra lại trước khi lưu.
              </>
            ),
          }
  } else {
    status = {
      tone: 'info',
      text: `Vùng phủ sóng ${formatKm(coverage.radiusKm)} quanh server ${server.server_id}: ${inCount}/${cabinetInfo.length} tủ nằm trong vùng. Bấm chấm tủ để chọn.`,
    }
  }

  const toneClass = {
    info: 'bg-slate-50 border-slate-200 text-slate-700',
    warn: 'bg-amber-50 border-amber-300 text-amber-900',
    ok: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  }[status.tone]
  const StatusIcon = status.tone === 'warn' ? AlertTriangle : status.tone === 'ok' ? CheckCircle2 : cabinetInfo.length > 0 && coverage ? MousePointerClick : Info

  return (
    <div className="space-y-2" role="group" aria-label="Bản đồ vùng phủ sóng của server IoT">
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div ref={containerRef} style={{ height, width: '100%' }} className="w-full bg-slate-200" />
      </div>

      <ul className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 px-1 text-[11px] font-medium text-slate-600" aria-label="Chú giải">
        <li className="inline-flex items-center gap-1.5">
          <Swatch kind="server" /> Server
        </li>
        {coverage ? (
          <>
            <li className="inline-flex items-center gap-1.5">
              <Swatch kind="ring" /> Vùng phủ sóng
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Swatch kind="in" /> Tủ trong vùng
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Swatch kind="out" /> Tủ ngoài vùng
            </li>
          </>
        ) : (
          <li className="inline-flex items-center gap-1.5">
            <Swatch kind="unknown" /> Tủ điện
          </li>
        )}
        {nodeCircleFeature && (
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block shrink-0 w-4 h-3 rounded-sm border-2 border-dashed border-indigo-400 bg-indigo-100" />
            Vùng của node
          </li>
        )}
        {selectedCabinetId && (
          <li className="inline-flex items-center gap-1.5">
            <Swatch kind="pick" /> Tủ đang chọn
          </li>
        )}
      </ul>

      <div
        role="status"
        aria-live="polite"
        className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-[11.5px] leading-relaxed ${toneClass}`}
      >
        <StatusIcon className="w-4 h-4 mt-px shrink-0" aria-hidden />
        <span>{status.text}</span>
      </div>
    </div>
  )
}

export default NodeCoverageMap
