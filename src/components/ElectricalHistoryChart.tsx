/** Biểu đồ lịch sử điện trung bình 30 giây dùng chung: mặc định theo giờ đo, có thể xem theo giờ nhận. */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, Loader2 } from 'lucide-react'
import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useElectricalSeries, ELECTRICAL_POLL_MS } from '../hooks/iot/useElectricalSeries'
import type { ElectricalTimeBasis } from '../feature/iot/iotMonitorSlice'
import {
  ELECTRICAL_METRICS,
  ELECTRICAL_METRIC_KEYS,
  ELECTRICAL_RANGES,
  ELECTRICAL_RANGE_KEYS,
  ELECTRICAL_HISTORY_MS,
  sliceWindow,
  bucketElectricalPoints,
  summarizeMetric,
  formatMetric,
  type ElectricalMetric,
  type ElectricalRange,
  type ElectricalBucketPoint,
} from '../utils/iot/electricalSeries'

export const HISTORY_PAGE_SAMPLES = 200

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

const RANGE_ORDER: Record<ElectricalRange, number> = { '1h': 1, '6h': 2, '24h': 3 }

const pad2 = (n: number) => String(n).padStart(2, '0')

const formatXAxisTime = (time: number) => {
  if (!Number.isFinite(time)) return ''
  const d = new Date(time)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

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

interface ChartDataPoint extends ElectricalBucketPoint {
  band: [number, number] | null
}

const CustomTooltip: React.FC<{
  active?: boolean
  payload?: Array<{ payload: ChartDataPoint }>
  range: ElectricalRange
  metric: ElectricalMetric
  bucketMs: number
  isDateRange: boolean
}> = ({ active, payload, range, metric, bucketMs, isDateRange }) => {
  if (!active || !payload || !payload.length) return null
  const point = payload[0].payload
  if (!point) return null

  const d = new Date(point.time)
  const dateStr = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`
  const timeStr = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`

  let timeDisplay = ''
  if (!isDateRange && range === '1h') {
    timeDisplay = `${dateStr} ${timeStr}:${pad2(d.getSeconds())}`
  } else {
    const endD = new Date(point.time + bucketMs)
    const endTimeStr = `${pad2(endD.getHours())}:${pad2(endD.getMinutes())}`
    timeDisplay = `${dateStr} ${timeStr} – ${endTimeStr}`
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
        {point.count <= 1 ? 'Giá trị' : 'Trung bình'}: <span className="font-mono">{valStr}</span>
      </p>
      {point.count > 1 && (
        <p className="text-slate-600 dark:text-slate-300">
          {minMaxStr && <>Dao động: <span className="font-mono">{minMaxStr}</span> · </>}
          <span>{point.count} mẫu</span>
        </p>
      )}
    </div>
  )
}

export const ElectricalRangeToggle: React.FC<{
  value: ElectricalRange
  onChange: (r: ElectricalRange) => void
}> = ({ value, onChange }) => (
  <div
    role="group"
    aria-label="Khoảng thời gian"
    className="inline-flex shrink-0 items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800"
  >
    {ELECTRICAL_RANGE_KEYS.map((k) => (
      <button
        key={k}
        type="button"
        aria-pressed={value === k}
        onClick={() => onChange(k)}
        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
          value === k
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        {ELECTRICAL_RANGES[k].label}
      </button>
    ))}
  </div>
)

/** Khung biểu đồ và thẻ chỉ số của mạch đang chọn */
export const ElectricalHistoryChart: React.FC<{
  feederId: string
  live: boolean
  range: ElectricalRange
  timeBasis?: ElectricalTimeBasis
  dateRange?: { from: Date; to: Date } | null
}> = ({ feederId, live, range, timeBasis = 'measured_at', dateRange = null }) => {
  const isDateRange = Boolean(dateRange)
  const fromIso = dateRange ? dateRange.from.toISOString() : undefined
  const toIso = dateRange ? dateRange.to.toISOString() : undefined

  const { points, latest, loading, backfilling, error } = useElectricalSeries(feederId, {
    initial: HISTORY_PAGE_SAMPLES,
    maxPoints: isDateRange ? 40_000 : 9_000,
    windowMs: isDateRange ? undefined : ELECTRICAL_HISTORY_MS,
    live: isDateRange ? false : live,
    timeBasis,
    fromTo: fromIso && toIso ? { from: fromIso, to: toIso } : undefined,
  })

  const [metric, setMetric] = useState<ElectricalMetric>('power')
  const [brushRange, setBrushRange] = useState<{ from: number; to: number } | null>(null)

  const rangePoints = useMemo(
    () => (isDateRange ? points : sliceWindow(points, ELECTRICAL_RANGES[range].windowMs)),
    [isDateRange, points, range]
  )
  const bucketMs = useMemo(() => {
    if (!dateRange) return ELECTRICAL_RANGES[range].bucketMs
    const spanMs = dateRange.to.getTime() - dateRange.from.getTime()
    if (spanMs <= 6 * 3_600_000) return 60_000
    if (spanMs <= 24 * 3_600_000) return 300_000
    if (spanMs <= 3 * 86_400_000) return 900_000
    if (spanMs <= 7 * 86_400_000) return 1_800_000
    return 3_600_000
  }, [dateRange, range])
  const series = useMemo(
    () => bucketElectricalPoints(rangePoints, bucketMs),
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
      })),
    [series, metric]
  )

  useEffect(() => {
    setBrushRange(null)
  }, [range, metric, fromIso, toIso])

  const prevRangeRef = useRef<ElectricalRange | null>(null)
  const isInitialMount = prevRangeRef.current === null
  const swapFrom =
    !isDateRange && !isInitialMount && prevRangeRef.current !== range
      ? RANGE_ORDER[range] < RANGE_ORDER[prevRangeRef.current!]
        ? 0.6
        : 1.4
      : undefined
  const swapClass = swapFrom ? 'electrical-chart-swap' : ''
  const swapStyle = swapFrom ? ({ ['--swap-from' as string]: swapFrom } as React.CSSProperties) : undefined

  useEffect(() => {
    prevRangeRef.current = range
  }, [range])

  const brushIndices = useMemo(() => {
    if (!brushRange || chartData.length === 0) {
      return { startIndex: 0, endIndex: Math.max(0, chartData.length - 1) }
    }
    let startIndex = chartData.findIndex((p) => p.time >= brushRange.from)
    if (startIndex === -1) startIndex = 0
    let endIndex = chartData.findIndex((p) => p.time > brushRange.to)
    if (endIndex === -1) endIndex = chartData.length - 1
    else endIndex = Math.max(0, endIndex - 1)
    if (startIndex > endIndex) startIndex = endIndex
    return { startIndex, endIndex }
  }, [brushRange, chartData])

  const handleBrushChange = (event: { startIndex?: number; endIndex?: number }) => {
    if (
      typeof event.startIndex === 'number' &&
      typeof event.endIndex === 'number' &&
      chartData[event.startIndex] &&
      chartData[event.endIndex]
    ) {
      if (event.startIndex === 0 && event.endIndex === chartData.length - 1) {
        setBrushRange(null)
      } else {
        setBrushRange({
          from: chartData[event.startIndex].time,
          to: chartData[event.endIndex].time,
        })
      }
    }
  }

  const hasIncompleteCoverage =
    !isDateRange &&
    !backfilling &&
    !loading &&
    points.length > 0 &&
    latest &&
    (latest.time - points[0].time) / ELECTRICAL_RANGES[range].windowMs < 0.95

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
                error ? 'bg-rose-500' : latest ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
            {latest ? <>Mẫu gần nhất {fullDateTime(latest.time)}</> : 'Chưa có mẫu'}
          </p>
          <p>
            {isDateRange
              ? `${rangePoints.length} khoảng trong khoảng đã chọn`
              : `${rangePoints.length} mẫu trong ${ELECTRICAL_RANGES[range].label}`}
          </p>
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
      <div className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col p-3 sm:p-4">
        {/* Đầu khung */}
        <div className="flex items-start justify-between gap-3 pb-2 shrink-0 flex-wrap">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {ELECTRICAL_METRICS[metric].label} ({ELECTRICAL_METRICS[metric].unit})
              </p>
              {backfilling && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                  <span>Đang tải thêm lịch sử…</span>
                </span>
              )}
              {error && points.length > 0 && (
                <span
                  className={`text-[10.5px] ${
                    isDateRange
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400 truncate max-w-xs'
                  }`}
                  title={error}
                >
                  {error}
                </span>
              )}
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              {dateRange ? (
                <>
                  Từ {fullTime(dateRange.from.getTime())} đến {fullTime(dateRange.to.getTime())} · trung bình mỗi{' '}
                  {Math.round(bucketMs / 60_000) >= 60 ? '1 giờ' : `${Math.round(bucketMs / 60_000)} phút`}
                </>
              ) : (
                <>
                  {ELECTRICAL_RANGES[range].hint}
                  {hasIncompleteCoverage && (
                    <span className="ml-2 italic text-slate-400">
                      · Dữ liệu chỉ có từ {fullTime(points[0].time)}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          {/* Chú giải + nút reset Brush */}
          <div className="flex items-center gap-3 text-[10.5px] text-slate-500 dark:text-slate-400 shrink-0">
            {brushRange && (
              <button
                type="button"
                onClick={() => setBrushRange(null)}
                className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
              >
                Xem toàn bộ
              </button>
            )}
            <span className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-xs"
                style={{ backgroundColor: ELECTRICAL_METRICS[metric].color }}
              />
              <span>Trung bình</span>
            </span>
            {bucketMs > 0 && (
              <span
                className="flex items-center gap-1"
                title="Thấp nhất và cao nhất của các số trung bình 30 giây trong mỗi ô gom"
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

        {/* Nội dung biểu đồ hoặc trạng thái */}
        {loading && points.length === 0 ? (
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
        ) : error && points.length === 0 ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-rose-500 mb-2" />
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>
            <p className="text-xs text-slate-400 mt-1">Chưa có mẫu điện nào.</p>
            {!isDateRange && live && <p className="text-[11px] text-slate-400 mt-0.5">Tự thử lại sau 10 giây</p>}
          </div>
        ) : !loading && !backfilling && points.length === 0 ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 text-center">
            <Activity className="w-8 h-8 text-slate-400 mb-2" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {isDateRange ? 'Không có số đo nào trong khoảng này.' : 'Mạch chưa có mẫu điện nào.'}
            </p>
            {!isDateRange && live && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Biểu đồ tự hiện khi node gửi mẫu (mỗi 10 giây).
              </p>
            )}
          </div>
        ) : (
          <div
            className={`flex-1 min-h-0 ${swapClass}`}
            style={swapStyle}
            key={isDateRange ? `${fromIso}-${toIso}` : range}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 36, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="time"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={formatXAxisTime}
                  minTickGap={40}
                  stroke="#94a3b8"
                  fontSize={10}
                />
                <YAxis
                  width={56}
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => {
                    if (!Number.isFinite(val)) return ''
                    const digits = metric === 'voltage' ? 2 : 0
                    return Number(val).toFixed(digits)
                  }}
                  stroke="#94a3b8"
                  fontSize={10}
                />
                {bucketMs > 0 && (
                  <Area
                    type="monotone"
                    dataKey="band"
                    fill={ELECTRICAL_METRICS[metric].color}
                    fillOpacity={0.15}
                    stroke="none"
                    isAnimationActive={false}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke={ELECTRICAL_METRICS[metric].color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Tooltip
                  content={
                    <CustomTooltip
                      range={range}
                      metric={metric}
                      bucketMs={bucketMs}
                      isDateRange={isDateRange}
                    />
                  }
                />
                {chartData.length > 1 && (
                  <Brush
                    dataKey="time"
                    height={26}
                    tickFormatter={formatXAxisTime}
                    stroke={ELECTRICAL_METRICS[metric].color}
                    startIndex={brushIndices.startIndex}
                    endIndex={brushIndices.endIndex}
                    onChange={handleBrushChange}
                    ariaLabel="Chọn đoạn thời gian để phóng to"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
