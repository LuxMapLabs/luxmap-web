import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, Loader2, X } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useElectricalSeries, ELECTRICAL_POLL_MS } from '../../../hooks/iot/useElectricalSeries'
import {
  ELECTRICAL_METRICS,
  ELECTRICAL_METRIC_KEYS,
  bucketElectricalPoints,
  formatMetric,
  type ElectricalMetric,
} from '../../../utils/iot/electricalSeries'

/** Lần tải đầu của biểu đồ: số mẫu mới nhất (tối đa `page_size` của API). */
export const INITIAL_SAMPLES = 200

type ElectricalView = 'minute' | 'hour'

/** Thời gian hiệu ứng co giãn ngang của biểu đồ khi đổi chế độ xem (khớp `.electrical-chart-swap` ở index.css). */
const CHART_ANIMATION_MS = 600

/**
 * Chế độ xem biểu đồ: trung bình các mẫu (10 s / mẫu) trong mỗi phút / giờ, trên khoảng gần nhất;
 * tải ngược thêm trang cho đủ khoảng (tối đa ELECTRICAL_MAX_PAGES trang).
 */
const ELECTRICAL_VIEWS: Record<
  ElectricalView,
  { label: string; bucketMs: number; windowMs: number; maxPoints: number; hint: string }
> = {
  minute: { label: 'Theo phút', bucketMs: 60_000, windowMs: 3 * 3_600_000, maxPoints: 2_000, hint: 'Trung bình mỗi phút · 3 giờ gần nhất' },
  hour: { label: 'Theo giờ', bucketMs: 3_600_000, windowMs: 24 * 3_600_000, maxPoints: 10_000, hint: 'Trung bình mỗi giờ · 24 giờ gần nhất' },
}
const VIEW_KEYS = Object.keys(ELECTRICAL_VIEWS) as ElectricalView[]

export interface MonitorFeeder {
  feeder_id: string
  /** Mã / tên mạch để hiện trên tab */
  label: string
  node_id: string | null
}

export interface ElectricalMonitorTarget {
  /** Ví dụ "Tủ A - Tỉnh Lộ 8" */
  title: string
  feeders: MonitorFeeder[]
  activeFeederId: string
}

const clock = (t: number) => new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const fullTime = (t: number) => new Date(t).toLocaleString('vi-VN')
const pad2 = (n: number) => String(n).padStart(2, '0')
/** "16/11 13:41" (giờ máy người xem) */
const dayClock = (t: number) => {
  const d = new Date(t)
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

// Màu thẻ chỉ số đang chọn, cùng màu đường biểu đồ (ELECTRICAL_METRICS.color)
const METRIC_TONE: Record<ElectricalMetric, { card: string; dot: string; value: string }> = {
  power: {
    card: 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800',
    dot: 'bg-emerald-600',
    value: 'text-emerald-700 dark:text-emerald-300',
  },
  current: {
    card: 'bg-blue-50 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800',
    dot: 'bg-blue-600',
    value: 'text-blue-700 dark:text-blue-300',
  },
  voltage: {
    card: 'bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800',
    dot: 'bg-amber-600',
    value: 'text-amber-700 dark:text-amber-300',
  },
}

/** Biểu đồ điện của một node: số mới nhất + đường theo thời gian, đổi chỉ số W / mA / V và chế độ xem. */
const ElectricalChartPane: React.FC<{ nodeId: string }> = ({ nodeId }) => {
  const [view, setView] = useState<ElectricalView>('minute')
  const v = ELECTRICAL_VIEWS[view]
  const { points, latest, loading: firstPage, backfilling, error } = useElectricalSeries(nodeId, {
    initial: INITIAL_SAMPLES,
    maxPoints: v.maxPoints,
    windowMs: v.windowMs,
  })
  // Chờ tải đủ khoảng đang xem mới vẽ: các trang cũ về dần làm biểu đồ co giãn liên tục nếu vẽ ngay từ trang đầu
  const loading = firstPage || backfilling
  const [metric, setMetric] = useState<ElectricalMetric>('power')
  // Đổi theo phút / giờ: giữ biểu đồ cũ trên màn hình trong lúc tải (không quay vòng, không trắng), rồi biểu đồ mới
  // vào bằng hiệu ứng co giãn ngang: sang "theo phút" (phóng gần) thì rộng ra, sang "theo giờ" (thu xa) thì thu vào.
  // Các lần cập nhật mẫu 10 giây một lần không có hiệu ứng.
  const [animating, setAnimating] = useState(false)
  const changeView = (key: ElectricalView) => {
    if (key === view) return
    setView(key)
    setAnimating(true)
  }
  useEffect(() => {
    if (!animating || loading) return
    const timer = setTimeout(() => setAnimating(false), CHART_ANIMATION_MS + 100)
    return () => clearTimeout(timer)
  }, [animating, loading])
  const m = ELECTRICAL_METRICS[metric]
  const series = useMemo(() => bucketElectricalPoints(points, v.bucketMs), [points, v.bucketMs])
  const hasValues = useMemo(() => series.some((p) => p[metric] !== null), [series, metric])
  // Biểu đồ cuối cùng đã vẽ được, để giữ nguyên trên màn hình lúc đang tải chế độ mới
  const lastDrawn = useRef<{ series: typeof series; view: ElectricalView } | null>(null)
  if (!loading && hasValues) lastDrawn.current = { series, view }
  const frozen = loading ? lastDrawn.current : null
  const shownSeries = frozen ? frozen.series : series
  const shownView = frozen ? frozen.view : view
  // Dữ liệu chưa phủ hết khoảng đang xem (server IoT chỉ còn chừng đó mẫu)
  const shortOfWindow =
    points.length > 1 && !loading ? points[points.length - 1].time - points[0].time < v.windowMs * 0.95 : false
  const bucketLabel = (t: number) => (view === 'hour' ? `${dayClock(t)} – ${clock(t + v.bucketMs)}` : dayClock(t))

  return (
    <div className="flex-1 min-h-0 flex gap-3">
      <div className="w-48 shrink-0 flex flex-col gap-1.5" data-testid="iot-latest-sample">
        {ELECTRICAL_METRIC_KEYS.map((key) => {
          const selected = metric === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              onClick={() => setMetric(key)}
              className={`w-full text-left px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                selected
                  ? METRIC_TONE[key].card
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                <span className={`w-1.5 h-1.5 rounded-full ${METRIC_TONE[key].dot}`} />
                {ELECTRICAL_METRICS[key].label}
              </span>
              <strong
                className={`block font-mono text-sm leading-tight ${
                  selected ? METRIC_TONE[key].value : 'text-slate-800 dark:text-slate-100'
                }`}
              >
                {formatMetric(latest ? latest[key] : null, key)}
              </strong>
            </button>
          )
        })}
        <div className="mt-auto text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug space-y-0.5">
          <p className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                error ? 'bg-rose-500' : latest ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
            {latest ? <>Mẫu gần nhất {fullTime(latest.time)}</> : 'Chưa có mẫu'}
          </p>
          <p>
            {points.length} mẫu · {series.length} điểm
          </p>
          <p>Cập nhật mỗi {ELECTRICAL_POLL_MS / 1000} giây</p>
        </div>
      </div>

      <div className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-900 flex flex-col">
        <div className="flex items-start justify-between gap-3 px-3 pt-2.5 pb-1.5">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {m.label} <span className="font-normal text-slate-400">({m.unit})</span>
            </p>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
              {v.hint}
              {shortOfWindow && <> · dữ liệu chỉ có từ {dayClock(points[0].time)}</>}
            </p>
          </div>
          <div
            role="group"
            aria-label="Chế độ xem"
            className="inline-flex shrink-0 items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800"
          >
            {VIEW_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => changeView(key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  view === key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {ELECTRICAL_VIEWS[key].label}
              </button>
            ))}
          </div>
        </div>
        {error && hasValues && (
          <p className="mx-3 mb-1 flex items-center gap-1.5 text-[11px] font-medium text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{error}</span>
          </p>
        )}
        <div className="flex-1 min-h-0 px-1 pb-1">
          {loading && !frozen ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : !hasValues ? (
            <div className="h-full flex flex-col items-center justify-center gap-1.5 text-center px-6">
              <span
                className={`w-9 h-9 rounded-xl grid place-items-center ${
                  error ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/40' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                }`}
              >
                {error ? <AlertTriangle className="w-4.5 h-4.5" /> : <Activity className="w-4.5 h-4.5" />}
              </span>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Chưa có mẫu điện nào.</p>
              <p className={`text-[11px] ${error ? 'text-rose-700 dark:text-rose-300' : 'text-slate-400'}`}>
                {error || `Biểu đồ tự hiện khi node gửi mẫu (mỗi ${ELECTRICAL_POLL_MS / 1000} giây).`}
              </p>
            </div>
          ) : (
            <div
              key={shownView}
              className={`h-full overflow-hidden ${animating && !loading ? 'electrical-chart-swap' : ''}`}
              style={{ ['--swap-from' as string]: view === 'minute' ? 0.5 : 1.6 }}
            >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={shownSeries} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="time"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={clock}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  minTickGap={32}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={52} />
                <Tooltip
                  labelFormatter={(t) => bucketLabel(Number(t))}
                  formatter={(value, _name, item) => [
                    `${Number(value).toFixed(m.digits)} ${m.unit}`,
                    `${m.label} TB (${(item?.payload as { count?: number })?.count ?? 0} mẫu)`,
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={shownView === 'hour' ? { r: 2.5 } : false}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Bảng giám sát điện nằm dưới bản đồ GIS (bản đồ vẫn thấy phía trên). Số điện thuộc MẠCH: mỗi tab là một mạch
 * của tủ, đọc từ node IoT gán cho mạch đó. Chỉ hỏi API khi bảng đang mở.
 */
export const ElectricalMonitorDock: React.FC<{
  target: ElectricalMonitorTarget
  onSelectFeeder: (feederId: string) => void
  onClose: () => void
}> = ({ target, onSelectFeeder, onClose }) => {
  const active = target.feeders.find((f) => f.feeder_id === target.activeFeederId) ?? target.feeders[0]

  return (
    <section
      role="region"
      aria-label="Giám sát điện"
      className="absolute left-3 right-3 bottom-3 z-[10000] h-[min(30rem,65%)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col p-3 gap-2 text-xs"
    >
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">Giám sát điện · {target.title}</h3>
        <div className="flex items-center gap-1 ml-2 overflow-x-auto" role="tablist" aria-label="Mạch">
          {target.feeders.map((f) => (
            <button
              key={f.feeder_id}
              type="button"
              role="tab"
              aria-selected={f.feeder_id === active?.feeder_id}
              onClick={() => onSelectFeeder(f.feeder_id)}
              title={f.node_id ? `Node ${f.node_id}` : 'Mạch chưa gắn IoT'}
              className={`px-2.5 py-1 rounded-lg font-semibold border whitespace-nowrap cursor-pointer ${
                f.feeder_id === active?.feeder_id
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              } ${f.node_id ? '' : 'opacity-60'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng giám sát điện"
          className="ml-auto w-7 h-7 shrink-0 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {active?.node_id ? (
        <>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
            Mạch <span className="font-mono">{active.label}</span> · node <span className="font-mono">{active.node_id}</span> · số đo của cả mạch, không riêng cột nào
          </p>
          <ElectricalChartPane key={active.node_id} nodeId={active.node_id} />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 italic">
          Mạch {active?.label} chưa gắn thiết bị IoT nên không có số đo điện.
        </div>
      )}
    </section>
  )
}

export default ElectricalMonitorDock
