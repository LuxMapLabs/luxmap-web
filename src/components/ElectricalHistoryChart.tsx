/** Biểu đồ lịch sử điện từng mẫu dùng chung: hỗ trợ chế độ Gần nhất và Theo ngày (tải theo khúc 6 giờ). */
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Activity } from 'lucide-react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useElectricalChunks } from '../hooks/iot/useElectricalChunks'
import { ELECTRICAL_POLL_MS, type ElectricalTimeBasis } from '../feature/iot/iotMonitorSlice'
import {
  ELECTRICAL_METRICS,
  ELECTRICAL_METRIC_KEYS,
  ELECTRICAL_HISTORY_MS,
  ELECTRICAL_WINDOW_PRESETS,
  bucketElectricalPoints,
  buildAxisTicks,
  clampWindowEnd,
  electricalBucketForWindow,
  electricalTickStepForWindow,
  electricalYAxisScale,
  findBackfillRanges,
  formatReceiveDelay,
  formatRecentAxisTick,
  formatWindowDuration,
  insertElectricalGaps,
  isLoneBackfill,
  parseWindowInput,
  summarizeMetric,
  formatMetric,
  type ElectricalChunkDirection,
  type ElectricalMetric,
  type ElectricalBucketPoint,
} from '../utils/iot/electricalSeries'
import { ElectricalWindowSlider } from './ElectricalWindowSlider'
import { FEEDER_HEALTH_UI } from '../utils/gis-map/poleLampState'

const METRIC_TONE: Record<ElectricalMetric, { active: string }> = {
  power: {
    active: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 shadow-xs',
  },
  current: {
    active: 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 shadow-xs',
  },
  voltage: {
    active: 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-100 shadow-xs',
  },
}

/** Màu mẫu gửi bù (tím) tách khỏi ba màu chỉ số xanh lá, xanh dương, vàng. */
const BACKFILL_COLOR = '#7c3aed'
const BACKFILL_LABEL = 'Gửi bù từ thẻ nhớ'

/** Dải "Đang sửa" cùng màu mạch đang sửa trên GIS. */
const REPAIR_COLOR = FEEDER_HEALTH_UI.repairing.color
const REPAIR_TEXT_COLOR = FEEDER_HEALTH_UI.repairing.glow
const REPAIR_NOTE = 'Trong lúc sửa · không dùng để chẩn đoán'

/** Khoảng sửa theo phiếu (ms); khoảng đang mở kéo tới hiện tại. */
interface RepairRange {
  start: number
  end: number
  workOrderId: string
}

const pad2 = (n: number) => String(n).padStart(2, '0')

const fullTime = (time: number) => {
  if (!Number.isFinite(time)) return ''
  const d = new Date(time)
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

const fullDateTime = (time: number) => {
  if (!Number.isFinite(time)) return ''
  const d = new Date(time)
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

interface AxisTickProps {
  x?: number | string
  y?: number | string
  index?: number
  payload?: { value?: number }
  firstTick?: number
}

/** Nhãn trục X 2 dòng (giờ trên, ngày dưới cho mốc đầu khung và 00:00); mốc đầu canh trái tránh đè trục Y. */
const ElectricalXAxisTick: React.FC<AxisTickProps> = ({ x, y, index, payload, firstTick }) => {
  const value = payload?.value
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const nx = Number(x ?? 0)
  const ny = Number(y ?? 0)
  const isFirst = index === 0 || (firstTick !== undefined && value === firstTick)
  const { clock, date } = formatRecentAxisTick(value, isFirst)
  const anchor = isFirst ? 'start' : 'middle'

  return (
    <g transform={`translate(${nx},${ny})`}>
      <text
        x={0}
        y={0}
        dy={11}
        textAnchor={anchor}
        fontSize={10}
        className="fill-slate-600 dark:fill-slate-300"
      >
        {clock}
      </text>
      {date && (
        <text
          x={0}
          y={0}
          dy={22}
          textAnchor={anchor}
          fontSize={9}
          className="fill-slate-500 dark:fill-slate-400"
        >
          {date}
        </text>
      )}
    </g>
  )
}

interface ChartDataPoint extends ElectricalBucketPoint {
  band: [number, number] | null
  /** Giá trị chỉ số ở điểm có mẫu gửi bù (vẽ nét đứt tím chồng lên đường chính); null ở điểm khác. */
  backfill: number | null
}

/** Một mốc giờ hoặc khoảng giờ `dd/MM HH:mm:ss`; null → '-'. */
const formatSpan = (from: number | null, to: number | null) => {
  if (from === null || to === null) return '-'
  if (from === to) return fullDateTime(from)
  const end = new Date(to)
  return `${fullDateTime(from)} – ${pad2(end.getHours())}:${pad2(end.getMinutes())}:${pad2(end.getSeconds())}`
}

/** Khoảng giờ của một ô gom: `từ 15:10:11 đến 15:14:37` (ngày đã có ở đầu tooltip); thiếu → '-'. */
const formatClockRange = (from: number | null, to: number | null) => {
  if (from === null || to === null) return '-'
  const clock = (t: number) => {
    const d = new Date(t)
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  }
  return from === to ? `lúc ${clock(from)}` : `từ ${clock(from)} đến ${clock(to)}`
}

const CustomTooltip: React.FC<{
  active?: boolean
  payload?: Array<{ payload: ChartDataPoint }>
  metric: ElectricalMetric
  bucketMs: number
  repairRanges: RepairRange[]
}> = ({ active, payload, metric, bucketMs, repairRanges }) => {
  if (!active || !payload || !payload.length) return null
  const point = payload[0].payload
  if (!point || point.count === 0) return null
  const pointEnd = point.time + Math.max(bucketMs, 0)
  const inRepair = repairRanges.some((r) => point.time <= r.end && pointEnd >= r.start)

  const d = new Date(point.time)
  const dateStr = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`
  const timeStr = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`

  let timeDisplay = ''
  if (bucketMs <= 0) {
    timeDisplay = `${dateStr} ${timeStr}:${pad2(d.getSeconds())}`
  } else {
    const endD = new Date(point.time + bucketMs)
    const endTimeStr = `${pad2(endD.getHours())}:${pad2(endD.getMinutes())}`
    timeDisplay = `${dateStr} ${timeStr} – ${endTimeStr} · gom ${formatWindowDuration(bucketMs)}`
  }

  const val = point[metric]
  const valStr = formatMetric(val, metric)
  const minVal = point.min?.[metric]
  const maxVal = point.max?.[metric]
  const minMaxStr =
    minVal !== null && maxVal !== null && minVal !== undefined && maxVal !== undefined
      ? `${minVal.toFixed(ELECTRICAL_METRICS[metric].digits)} – ${maxVal.toFixed(ELECTRICAL_METRICS[metric].digits)} ${ELECTRICAL_METRICS[metric].unit}`
      : null

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs p-2.5 shadow-lg text-xs space-y-1 z-50">
      <p className="font-mono text-slate-500 dark:text-slate-400 font-semibold">{timeDisplay}</p>
      <p className="font-semibold text-slate-800 dark:text-slate-100">
        {point.count <= 1 ? 'Giá trị' : `Trung bình ${point.count} mẫu`}: <span className="font-mono">{valStr}</span>
      </p>
      {point.count > 1 && minMaxStr && (
        <p className="text-slate-600 dark:text-slate-300">
          Thấp – cao: <span className="font-mono">{minMaxStr}</span>
        </p>
      )}
      {point.count <= 1 ? (
        <>
          <p className="text-slate-600 dark:text-slate-300">
            Giờ đo: <span className="font-mono">{formatSpan(point.measuredFrom, point.measuredTo)}</span>
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            Giờ nhận: <span className="font-mono">{formatSpan(point.receivedFrom, point.receivedTo)}</span>
          </p>
        </>
      ) : (
        <>
          <p className="text-slate-600 dark:text-slate-300">
            Giờ đo: {formatClockRange(point.measuredFrom, point.measuredTo)}
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            Giờ nhận: {formatClockRange(point.receivedFrom, point.receivedTo)}
          </p>
        </>
      )}
      {point.backfillCount > 0 && (
        <p className="font-semibold" style={{ color: BACKFILL_COLOR }}>
          {point.count <= 1
            ? point.measuredFrom !== null && point.receivedFrom !== null
              ? `${BACKFILL_LABEL} · đã nhận, trễ ${formatReceiveDelay(point.receivedFrom - point.measuredFrom)}`
              : `${BACKFILL_LABEL} · đã nhận`
            : `${point.backfillCount}/${point.count} mẫu là ${BACKFILL_LABEL.toLowerCase()}, đã nhận`}
        </p>
      )}
      {inRepair && (
        <p className="font-semibold" style={{ color: REPAIR_TEXT_COLOR }}>
          {REPAIR_NOTE}
        </p>
      )}
    </div>
  )
}

type WindowUnit = 'minute' | 'hour'

/** Số hiện trong ô nhập: chia hết cho 1 giờ thì hiện theo giờ, còn lại theo phút. */
const toWindowDraft = (ms: number): { text: string; unit: WindowUnit } =>
  ms % 3_600_000 === 0
    ? { text: String(ms / 3_600_000), unit: 'hour' }
    : { text: String(Math.round(ms / 60_000)), unit: 'minute' }

/** Chọn độ dài khung xem: nút chọn nhanh và ô nhập số phút/giờ. */
export const ElectricalRangeToggle: React.FC<{
  value: number
  onChange: (ms: number) => void
  maxMs: number
}> = ({ value, onChange, maxMs }) => {
  const inputId = useId()
  const errorId = useId()
  const [draft, setDraft] = useState(() => toWindowDraft(value))
  const [invalid, setInvalid] = useState(false)
  const [syncedValue, setSyncedValue] = useState(value)
  if (syncedValue !== value) {
    setSyncedValue(value)
    setDraft(toWindowDraft(value))
    setInvalid(false)
  }

  const commit = (text: string, unit: WindowUnit) => {
    const ms = parseWindowInput(text, unit, maxMs)
    if (ms === null) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    if (ms !== value) onChange(ms)
    else setDraft(toWindowDraft(ms))
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <div
        role="group"
        aria-label="Khoảng thời gian"
        className="inline-flex shrink-0 items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800"
      >
        {ELECTRICAL_WINDOW_PRESETS.filter((p) => p.ms <= maxMs).map((p) => (
          <button
            key={p.ms}
            type="button"
            aria-pressed={value === p.ms}
            onClick={() => onChange(p.ms)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
              value === p.ms
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="relative inline-flex shrink-0 items-center gap-1.5">
        <label htmlFor={inputId} className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Tùy chọn
        </label>
        <div
          className={`inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 ring-1 ${
            invalid ? 'ring-red-500' : 'ring-transparent'
          }`}
        >
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            value={draft.text}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            onChange={(e) => {
              setDraft({ ...draft, text: e.target.value })
              setInvalid(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit(draft.text, draft.unit)
            }}
            onBlur={() => commit(draft.text, draft.unit)}
            className="w-11 px-1.5 py-1 rounded-md bg-white dark:bg-slate-900 text-[11px] font-semibold text-right text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500"
          />
          <select
            aria-label="Đơn vị"
            value={draft.unit}
            onChange={(e) => {
              const unit = e.target.value as WindowUnit
              setDraft({ ...draft, unit })
              commit(draft.text, unit)
            }}
            className="pl-1 pr-0.5 py-1 bg-transparent text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500 rounded-md"
          >
            <option value="minute">phút</option>
            <option value="hour">giờ</option>
          </select>
        </div>
        {invalid && (
          <p
            id={errorId}
            role="alert"
            className="absolute right-0 top-full mt-1 z-10 whitespace-nowrap text-[10.5px] font-medium text-red-600 dark:text-red-400"
          >
            Nhập từ 5 phút đến {formatWindowDuration(maxMs)}
          </p>
        )}
      </div>
    </div>
  )
}

/** Khung biểu đồ và thẻ chỉ số của mạch đang chọn */
export const ElectricalHistoryChart: React.FC<{
  feederId: string
  live: boolean
  windowMs: number
  timeBasis?: ElectricalTimeBasis
  dateRange?: { from: Date; to: Date } | null
}> = ({ feederId, live, windowMs, timeBasis = 'measured_at', dateRange = null }) => {
  const boundsFrom = dateRange ? dateRange.from.getTime() : null
  const boundsTo = dateRange ? dateRange.to.getTime() : null
  const bounds = useMemo(
    () => (boundsFrom !== null && boundsTo !== null ? { from: boundsFrom, to: boundsTo } : null),
    [boundsFrom, boundsTo]
  )
  const isDateRange = bounds !== null

  const [metric, setMetric] = useState<ElectricalMetric>('power')
  // Cập nhật mốc hiện tại định kỳ mỗi ELECTRICAL_POLL_MS ở chế độ Gần nhất.
  const [nowMs, setNowMs] = useState(() => Date.now())
  // Mốc cuối đang ghim khi kéo sang trái ở chế độ Gần nhất; null = đang bám sát mép phải (hiện tại).
  const [pinnedEnd, setPinnedEnd] = useState<number | null>(null)
  // Mốc cuối khung đang xem ở chế độ Theo ngày (mặc định bằng bounds.to).
  const [windowEndMs, setWindowEndMs] = useState<number>(() =>
    boundsTo !== null ? boundsTo : Date.now()
  )
  // Hướng kéo gần nhất của người dùng (-1 quá khứ, 1 tương lai, 0 lúc đầu); không đổi khi khung tự trượt theo giờ.
  const [direction, setDirection] = useState<ElectricalChunkDirection>(0)

  useEffect(() => {
    if (isDateRange) return
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
    }, ELECTRICAL_POLL_MS)
    return () => window.clearInterval(timer)
  }, [isDateRange])

  useEffect(() => {
    setPinnedEnd(null)
    setDirection(0)
    if (boundsTo !== null) {
      setWindowEndMs(boundsTo)
    }
  }, [feederId, timeBasis, boundsFrom, boundsTo])

  // Chế độ Theo ngày: track phủ toàn bộ [bounds.from, bounds.to]; chế độ Gần nhất: 24 giờ gần nhất.
  const trackStart = bounds ? bounds.from : nowMs - ELECTRICAL_HISTORY_MS
  const trackEnd = bounds ? bounds.to : nowMs
  const trackSpanMs = Math.max(0, trackEnd - trackStart)
  const effectiveWindowMs = bounds ? Math.min(windowMs, Math.max(1, trackSpanMs)) : windowMs

  const minWindowEnd = trackStart + effectiveWindowMs
  const maxWindowEnd = trackEnd

  const windowEnd = bounds
    ? clampWindowEnd(windowEndMs, minWindowEnd, maxWindowEnd)
    : pinnedEnd === null
      ? trackEnd
      : clampWindowEnd(pinnedEnd, minWindowEnd, maxWindowEnd)
  const windowStart = windowEnd - effectiveWindowMs

  // Khi đổi độ dài khung: giữ mốc cuối đang xem và kẹp lại trong phạm vi track.
  useEffect(() => {
    if (bounds) {
      setWindowEndMs((prev) => clampWindowEnd(prev, minWindowEnd, maxWindowEnd))
    } else {
      setPinnedEnd((prev) =>
        prev === null ? null : clampWindowEnd(prev, minWindowEnd, maxWindowEnd)
      )
    }
  }, [windowMs, bounds, minWindowEnd, maxWindowEnd])

  // Hợp nhất cả hai chế độ vào useElectricalChunks (chế độ Theo ngày truyền live = false, track = bounds, bounds).
  const { points, latest, repairPeriods, viewLoading } = useElectricalChunks(feederId, {
    timeBasis,
    live: isDateRange ? false : live,
    view: { from: windowStart, to: windowEnd },
    track: { from: trackStart, to: trackEnd },
    direction,
    bounds,
  })

  // Thanh tiến trình mảnh 2px ở mép trên khung biểu đồ chỉ hiện khi viewLoading kéo dài quá 300ms.
  const [showProgressBar, setShowProgressBar] = useState(false)

  useEffect(() => {
    if (!viewLoading) {
      setShowProgressBar(false)
      return
    }
    const timer = window.setTimeout(() => {
      setShowProgressBar(true)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [viewLoading])

  // Ngưỡng dính mép phải ở chế độ Gần nhất (nhỏ hơn 1/2 bước mũi tên).
  const snapRightThresholdMs = Math.min(Math.floor(windowMs / 24), 5 * 60_000)

  const handleWindowEndChange = useCallback(
    (nextEnd: number) => {
      const clamped = clampWindowEnd(nextEnd, minWindowEnd, maxWindowEnd)
      if (clamped < windowEnd) {
        setDirection(-1)
      } else if (clamped > windowEnd) {
        setDirection(1)
      }
      if (bounds) {
        setWindowEndMs(clamped)
        return
      }
      if (trackEnd - clamped <= snapRightThresholdMs) {
        setPinnedEnd(null)
      } else {
        setPinnedEnd(clamped)
      }
    },
    [bounds, minWindowEnd, maxWindowEnd, trackEnd, windowEnd, snapRightThresholdMs]
  )

  const rangePoints = useMemo(
    () => points.filter((p) => p.time >= windowStart && p.time <= windowEnd),
    [points, windowStart, windowEnd]
  )

  // Trục Y theo thấp nhất/cao nhất của các mẫu trong khung đang xem.
  const yScale = useMemo(() => electricalYAxisScale(rangePoints, metric), [rangePoints, metric])

  const { bucketMs, hint } = electricalBucketForWindow(effectiveWindowMs)

  const series = useMemo(
    () => insertElectricalGaps(bucketElectricalPoints(rangePoints, bucketMs), bucketMs),
    [rangePoints, bucketMs]
  )

  const chartData: ChartDataPoint[] = useMemo(
    () =>
      series.map((p) => ({
        ...p,
        band:
          p.min[metric] !== null && p.max[metric] !== null
            ? [p.min[metric]!, p.max[metric]!]
            : null,
        backfill: p.backfillCount > 0 ? p[metric] : null,
      })),
    [series, metric]
  )

  const backfillRanges = useMemo(() => findBackfillRanges(series, bucketMs), [series, bucketMs])
  // Nền tím rộng tối thiểu 1/200 khung (~3px) để mẫu gửi bù lẻ vẫn thấy vị trí.
  const minBackfillMs = effectiveWindowMs / 200

  // Khoảng sửa giao với khung đang xem; `ended_at = null` (đang sửa) kéo tới hiện tại
  const repairRanges: RepairRange[] = useMemo(
    () =>
      repairPeriods.flatMap((r) => {
        const start = Date.parse(r.started_at ?? '')
        const end = r.ended_at ? Date.parse(r.ended_at) : nowMs
        if (!Number.isFinite(start) || !Number.isFinite(end) || end < windowStart || start > windowEnd) return []
        return [{ start, end, workOrderId: r.work_order_id ?? '-' }]
      }),
    [repairPeriods, nowMs, windowStart, windowEnd]
  )

  const xTicks = useMemo(
    () => buildAxisTicks(windowStart, windowEnd, electricalTickStepForWindow(effectiveWindowMs)),
    [windowStart, windowEnd, effectiveWindowMs]
  )

  const prevWindowMsRef = useRef<number | null>(null)
  const prevWindowMs = prevWindowMsRef.current
  const swapFrom =
    prevWindowMs !== null && prevWindowMs !== windowMs
      ? windowMs < prevWindowMs
        ? 0.6
        : 1.4
      : undefined
  const swapClass = swapFrom ? 'electrical-chart-swap' : ''
  const swapStyle = swapFrom ? ({ ['--swap-from' as string]: swapFrom } as React.CSSProperties) : undefined

  useEffect(() => {
    prevWindowMsRef.current = windowMs
  }, [windowMs])

  return (
    <div className="flex-1 min-h-0 p-4 sm:p-5 flex flex-col md:flex-row gap-4">
      {/* Cột trái: 3 thẻ chỉ số + trạng thái cuối cột */}
      <div className="md:w-56 shrink-0 flex flex-col gap-2">
        <div data-testid="iot-latest-sample" className="grid grid-cols-3 md:grid-cols-1 gap-2">
          {ELECTRICAL_METRIC_KEYS.map((key) => {
            const m = ELECTRICAL_METRICS[key]
            const sum = summarizeMetric(rangePoints, key)
            const summaryText = sum
              ? `TB ${sum.avg.toFixed(m.digits)} · thấp ${sum.min.toFixed(m.digits)}`
              : '-'
            const isSelected = metric === key

            return (
              <button
                key={key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setMetric(key)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? METRIC_TONE[key].active
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {m.label}
                </span>
                <span className="text-lg font-mono font-bold mt-1 text-slate-900 dark:text-slate-100">
                  {formatMetric(latest ? latest[key] : null, key)}
                </span>
                <span className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                  {summaryText}
                </span>
              </button>
            )
          })}
        </div>

        <div className="hidden md:flex flex-col mt-auto text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug space-y-0.5 pt-2">
          <p className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                latest ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
            {latest ? <>Mẫu gần nhất {fullDateTime(latest.time)}</> : 'Chưa có mẫu'}
          </p>
          <p>{`${rangePoints.length} mẫu trong ${formatWindowDuration(effectiveWindowMs)}`}</p>
          {isDateRange ? (
            <p>Xem theo khoảng ngày, không tự cập nhật</p>
          ) : live ? (
            <p>Cập nhật mỗi {ELECTRICAL_POLL_MS / 1000} giây</p>
          ) : (
            <p>Không gắn node · chỉ xem lịch sử</p>
          )}
        </div>
      </div>

      {/* Khung biểu đồ */}
      <div className="relative overflow-hidden flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col p-3 sm:p-4">
        {showProgressBar && (
          <div
            aria-hidden="true"
            data-testid="electrical-loading-bar"
            className="absolute inset-x-0 top-0 h-0.5 animate-pulse motion-reduce:animate-none"
            style={{ backgroundColor: ELECTRICAL_METRICS[metric].color }}
          />
        )}
        {/* Đầu khung */}
        <div className="flex items-start justify-between gap-3 pb-2 shrink-0 flex-wrap">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {ELECTRICAL_METRICS[metric].label} ({ELECTRICAL_METRICS[metric].unit})
              </p>
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              {bounds ? (
                <>
                  Khoảng đã chọn {fullTime(bounds.from)} – {fullTime(bounds.to)} · {hint}
                </>
              ) : (
                hint
              )}
            </p>
          </div>

          {/* Chú giải + nút về hiện tại */}
          <div className="flex items-center gap-3 text-[10.5px] text-slate-500 dark:text-slate-400 shrink-0">
            {!isDateRange && pinnedEnd !== null && (
              <button
                type="button"
                onClick={() => {
                  setDirection(1)
                  setPinnedEnd(null)
                }}
                className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500 cursor-pointer"
              >
                Về hiện tại
              </button>
            )}
            <span
              className="flex items-center gap-1"
              title="Mẫu node gửi ngay khi đo"
            >
              <span
                className="w-2.5 h-2.5 rounded-xs"
                style={{ backgroundColor: ELECTRICAL_METRICS[metric].color }}
              />
              <span>{bucketMs > 0 ? 'Trực tiếp (trung bình)' : 'Trực tiếp'}</span>
            </span>
            <span
              className="flex items-center gap-1"
              title="Node mất kết nối nên lưu mẫu vào thẻ nhớ, khi nối lại thì lấy ra gửi bù (hoặc sau khi node khởi động lại). Mẫu giữ giờ đo gốc nên nằm đúng đoạn mất kết nối."
            >
              <span
                className="w-2.5 h-2.5 rounded-xs border"
                style={{ backgroundColor: `${BACKFILL_COLOR}33`, borderColor: BACKFILL_COLOR }}
              />
              <span>{BACKFILL_LABEL}</span>
            </span>
            {repairRanges.length > 0 && (
              <span
                className="flex items-center gap-1"
                title="Kỹ sư đang sửa mạch theo phiếu sửa chữa. Mẫu điện trong khoảng này (nếu có) vẫn hiện nhưng không dùng để chẩn đoán lỗi."
              >
                <span
                  className="w-2.5 h-2.5 rounded-xs border"
                  style={{ backgroundColor: `${REPAIR_COLOR}33`, borderColor: REPAIR_COLOR }}
                />
                <span>{FEEDER_HEALTH_UI.repairing.label}</span>
              </span>
            )}
            {bucketMs > 0 && (
              <span
                className="flex items-center gap-1"
                title="Thấp nhất và cao nhất của các mẫu trong mỗi ô gom"
              >
                <span
                  className="w-2.5 h-2.5 rounded-xs opacity-40"
                  style={{ backgroundColor: ELECTRICAL_METRICS[metric].color }}
                />
                <span>Dao động trong ô</span>
              </span>
            )}
          </div>
        </div>

        {/* Nội dung biểu đồ hoặc trạng thái (chế độ Theo ngày luôn hiện trục + thanh trượt, không che bằng skeleton/chữ rỗng) */}
        {!isDateRange && viewLoading && points.length === 0 ? (
          <div className="flex-1 min-h-0 flex flex-col justify-between p-4 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
            <div className="space-y-4 my-auto">
              <div className="h-0.5 bg-slate-100 dark:bg-slate-800 w-full" />
              <div className="h-0.5 bg-slate-100 dark:bg-slate-800 w-full" />
              <div className="h-0.5 bg-slate-100 dark:bg-slate-800 w-full" />
              <div className="h-0.5 bg-slate-100 dark:bg-slate-800 w-full" />
            </div>
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full" />
          </div>
        ) : !isDateRange && !viewLoading && points.length === 0 && repairRanges.length === 0 ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 text-center">
            <Activity className="w-8 h-8 text-slate-400 mb-2" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Mạch chưa có mẫu điện nào.
            </p>
            {live && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Biểu đồ tự hiện khi node gửi mẫu.
              </p>
            )}
          </div>
        ) : (
          <>
            <div
              className={`flex-1 min-h-0 ${swapClass}`}
              style={swapStyle}
              key={bounds ? `${bounds.from}-${bounds.to}-${windowMs}` : windowMs}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 36, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="time"
                    type="number"
                    scale="time"
                    domain={[windowStart, windowEnd]}
                    ticks={xTicks}
                    allowDataOverflow
                    height={34}
                    tick={<ElectricalXAxisTick firstTick={xTicks[0]} />}
                    // Cho Recharts đo độ rộng nhãn theo chữ giờ "HH:mm" thay vì số ms thô, để không bỏ bớt nhãn.
                    tickFormatter={(v: number) => formatRecentAxisTick(v, false).clock}
                    minTickGap={24}
                    stroke="#94a3b8"
                    fontSize={10}
                  />
                  <YAxis
                    width={56}
                    // Khung không có mẫu (vd. cắt điện lúc sửa): miền tạm [0, 1] để dải "Đang sửa" vẫn vẽ được, ẩn số trục
                    domain={yScale ? yScale.domain : rangePoints.length === 0 ? [0, 1] : ['auto', 'auto']}
                    ticks={yScale ? yScale.ticks : undefined}
                    tick={rangePoints.length > 0}
                    allowDataOverflow={rangePoints.length === 0}
                    tickFormatter={(val) => {
                      if (!Number.isFinite(val)) return ''
                      const digits = yScale ? yScale.digits : metric === 'voltage' ? 2 : 0
                      return Number(val).toFixed(digits)
                    }}
                    stroke="#94a3b8"
                    fontSize={10}
                  />
                  {repairRanges.map((r) => {
                    const x1 = Math.max(r.start, windowStart)
                    const x2 = Math.min(Math.max(r.end, r.start + minBackfillMs), windowEnd)
                    return (
                      <ReferenceArea
                        key={`repair-${r.workOrderId}-${r.start}`}
                        x1={x1}
                        x2={x2}
                        fill={REPAIR_COLOR}
                        fillOpacity={0.14}
                        stroke={REPAIR_COLOR}
                        strokeOpacity={0.5}
                        strokeDasharray="3 3"
                        ifOverflow="hidden"
                        // Chữ chỉ hiện khi dải đủ rộng (≥ 8% khung) để không đè lên nhau
                        label={
                          (x2 - x1) / effectiveWindowMs >= 0.08
                            ? { value: FEEDER_HEALTH_UI.repairing.label, position: 'insideTop', fill: REPAIR_TEXT_COLOR, fontSize: 10, fontWeight: 600 }
                            : undefined
                        }
                      />
                    )
                  })}
                  {backfillRanges.map((r) => {
                    const pad = Math.max(0, (minBackfillMs - (r.end - r.start)) / 2)
                    return (
                      <ReferenceArea
                        key={`backfill-${r.start}`}
                        x1={Math.max(r.start - pad, windowStart)}
                        x2={Math.min(r.end + pad, windowEnd)}
                        fill={BACKFILL_COLOR}
                        fillOpacity={0.12}
                        stroke="none"
                        ifOverflow="hidden"
                      />
                    )
                  })}
                  {bucketMs > 0 && (
                    <Area
                      type="monotone"
                      dataKey="band"
                      fill={ELECTRICAL_METRICS[metric].color}
                      fillOpacity={0.15}
                      stroke="none"
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey={metric}
                    stroke={ELECTRICAL_METRICS[metric].color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="backfill"
                    stroke={BACKFILL_COLOR}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    // Mẫu gửi bù đứng lẻ: chấm tím đè lên đường trực tiếp.
                    dot={({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) =>
                      typeof cx === 'number' && typeof cy === 'number' && index !== undefined && isLoneBackfill(series, index) ? (
                        <circle key={`lone-backfill-${index}`} cx={cx} cy={cy} r={3} fill={BACKFILL_COLOR} stroke="#fff" strokeWidth={1} />
                      ) : (
                        <g key={`lone-backfill-${index}`} />
                      )
                    }
                    activeDot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        metric={metric}
                        bucketMs={bucketMs}
                        repairRanges={repairRanges}
                      />
                    }
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <ElectricalWindowSlider
              points={points}
              metric={metric}
              trackStart={trackStart}
              trackEnd={trackEnd}
              windowMs={effectiveWindowMs}
              windowEnd={windowEnd}
              onChangeWindowEnd={handleWindowEndChange}
            />
          </>
        )}
      </div>
    </div>
  )
}
