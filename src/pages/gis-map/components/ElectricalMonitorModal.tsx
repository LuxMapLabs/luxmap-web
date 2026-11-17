import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Activity, AlertTriangle, Loader2, X } from 'lucide-react'
import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useElectricalSeries, ELECTRICAL_POLL_MS } from '../../../hooks/iot/useElectricalSeries'
import { useCabinetIotStatus } from '../../../hooks/iot/useCabinetIotStatus'
import iotAPI from '../../../feature/iot/iotAPI'
import type { IotFeederElectricalResult } from '../../../types/iot/feeders'
import { IOT_NODE_STATUS, IOT_TONE_CLASS, iotStatusBadge } from '../../../constants/iot'
import { FeederPicker } from './FeederPicker'
import {
  ELECTRICAL_METRICS,
  ELECTRICAL_METRIC_KEYS,
  ELECTRICAL_RANGES,
  ELECTRICAL_RANGE_KEYS,
  ELECTRICAL_HISTORY_MS,
  sliceWindow,
  bucketElectricalPoints,
  findNodeChanges,
  findLampOnRanges,
  summarizeMetric,
  formatMetric,
  type ElectricalMetric,
  type ElectricalRange,
  type ElectricalBucketPoint,
} from '../../../utils/iot/electricalSeries'

export const HISTORY_PAGE_SAMPLES = 200

export interface MonitorFeeder {
  feeder_id: string
  /** Mã / tên mạch để hiện trên tab / picker */
  label: string
  name: string
  node_id: string | null
}

export interface ElectricalMonitorTarget {
  /** Ví dụ "Tủ A - Tỉnh Lộ 8" */
  title: string
  cabinetId: string | null
  feeders: MonitorFeeder[]
  activeFeederId: string
}

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
}> = ({ active, payload, range, metric }) => {
  if (!active || !payload || !payload.length) return null
  const point = payload[0].payload
  if (!point) return null

  const d = new Date(point.time)
  const dateStr = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`
  const timeStr = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`

  let timeDisplay = ''
  if (range === '1h') {
    timeDisplay = `${dateStr} ${timeStr}:${pad2(d.getSeconds())}`
  } else {
    const bucketMs = ELECTRICAL_RANGES[range].bucketMs
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

  const isLampOn = typeof point.lamp === 'string' && point.lamp.toUpperCase() === 'ON'

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs p-2.5 shadow-lg text-xs space-y-1 z-50">
      <p className="font-mono text-slate-500 dark:text-slate-400 font-semibold">{timeDisplay}</p>
      <p className="font-semibold text-slate-800 dark:text-slate-100">
        {point.count <= 1 ? 'Giá trị' : 'Trung bình'}: <span className="font-mono">{valStr}</span>
      </p>
      {point.count > 1 && (
        <p className="text-slate-600 dark:text-slate-300">
          {minMaxStr && <>Thấp – cao: <span className="font-mono">{minMaxStr}</span> · </>}
          <span>{point.count} mẫu</span>
        </p>
      )}
      <p className="text-slate-600 dark:text-slate-300">
        Đèn:{' '}
        <span className={isLampOn ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500'}>
          {isLampOn ? 'BẬT' : 'TẮT'}
        </span>
      </p>
    </div>
  )
}

/** Khung biểu đồ và thẻ chỉ số của mạch đang chọn */
const ElectricalChartPane: React.FC<{
  active: MonitorFeeder
  range: ElectricalRange
}> = ({ active, range }) => {
  const feederId = active.feeder_id
  const live = Boolean(active.node_id)

  const { points, latest, loading, backfilling, error } = useElectricalSeries(feederId, {
    initial: HISTORY_PAGE_SAMPLES,
    maxPoints: 9_000,
    windowMs: ELECTRICAL_HISTORY_MS,
    live,
  })

  const [metric, setMetric] = useState<ElectricalMetric>('power')
  const [brushRange, setBrushRange] = useState<{ from: number; to: number } | null>(null)

  const rangePoints = useMemo(
    () => sliceWindow(points, ELECTRICAL_RANGES[range].windowMs),
    [points, range]
  )
  const bucketMs = ELECTRICAL_RANGES[range].bucketMs
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

  const nodeChanges = useMemo(() => findNodeChanges(rangePoints), [rangePoints])
  const lampRanges = useMemo(() => findLampOnRanges(rangePoints), [rangePoints])

  useEffect(() => {
    setBrushRange(null)
  }, [range, metric])

  const prevRangeRef = useRef<ElectricalRange | null>(null)
  const isInitialMount = prevRangeRef.current === null
  const swapFrom =
    !isInitialMount && prevRangeRef.current !== range
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

  const hoursLoaded =
    points.length > 0 && latest
      ? Math.min(24, Math.max(0, Math.floor((latest.time - points[0].time) / 3_600_000)))
      : 0

  const hasIncompleteCoverage =
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
            {rangePoints.length} mẫu trong {ELECTRICAL_RANGES[range].label}
          </p>
          {live ? (
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
                  <span>Đang tải lịch sử · đã có {hoursLoaded}/24 giờ</span>
                </span>
              )}
              {error && points.length > 0 && (
                <span className="text-[10.5px] text-rose-600 dark:text-rose-400 truncate max-w-xs" title={error}>
                  {error}
                </span>
              )}
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              {ELECTRICAL_RANGES[range].hint}
              {hasIncompleteCoverage && (
                <span className="ml-2 italic text-slate-400">
                  · Dữ liệu chỉ có từ {fullTime(points[0].time)}
                </span>
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
            {range !== '1h' && (
              <span className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-xs opacity-40"
                  style={{ backgroundColor: ELECTRICAL_METRICS[metric].color }}
                />
                <span>Thấp–cao</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500/20" />
              <span>Đèn bật</span>
            </span>
            {nodeChanges.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-3 border-t-2 border-dashed border-amber-600" />
                <span>Đổi node</span>
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
            {live && <p className="text-[11px] text-slate-400 mt-0.5">Tự thử lại sau 10 giây</p>}
          </div>
        ) : !loading && !backfilling && points.length === 0 ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 text-center">
            <Activity className="w-8 h-8 text-slate-400 mb-2" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Mạch chưa có mẫu điện nào.</p>
            {live && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Biểu đồ tự hiện khi node gửi mẫu (mỗi 10 giây).
              </p>
            )}
          </div>
        ) : (
          <div className={`flex-1 min-h-0 ${swapClass}`} style={swapStyle} key={range}>
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
                {lampRanges.map((r, i) => (
                  <ReferenceArea
                    key={`lamp-${i}`}
                    x1={r.start}
                    x2={r.end}
                    fill="#f59e0b"
                    fillOpacity={0.08}
                    stroke="none"
                    ifOverflow="hidden"
                  />
                ))}
                {range !== '1h' && (
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
                {nodeChanges.map((c, i) => (
                  <ReferenceLine
                    key={`nc-${i}`}
                    x={c.time}
                    stroke="#d97706"
                    strokeDasharray="4 3"
                    label={{ value: 'Đổi node', position: 'top', fill: '#d97706', fontSize: 10 }}
                  />
                ))}
                <Tooltip content={<CustomTooltip range={range} metric={metric} />} />
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

/**
 * Popup giám sát điện mở theo mạch của tủ điện GIS:
 * Tải một lần 24 giờ qua useElectricalSeries, cho phép chọn khoảng 1h / 6h / 24h tính lại tại chỗ mà không gọi lại API.
 */
export const ElectricalMonitorModal: React.FC<{
  target: ElectricalMonitorTarget
  onSelectFeeder: (feederId: string) => void
  onClose: () => void
}> = ({ target, onSelectFeeder, onClose }) => {
  const active =
    target.feeders.find((f) => f.feeder_id === target.activeFeederId) || target.feeders[0] || null

  const [range, setRange] = useState<ElectricalRange>('6h')
  const [feederElectrical, setFeederElectrical] = useState<IotFeederElectricalResult | null>(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const isPickerOpenRef = useRef(false)
  useEffect(() => {
    isPickerOpenRef.current = isPickerOpen
  }, [isPickerOpen])

  const { nodes: cabinetNodes } = useCabinetIotStatus(target.cabinetId)

  const nodeStatusMap = useMemo(() => {
    const map: Record<string, string | null | undefined> = {}
    for (const n of cabinetNodes) {
      if (n.node_id) {
        map[n.node_id] = n.status
      }
    }
    if (active?.node_id && feederElectrical?.status) {
      map[active.node_id] = feederElectrical.status
    }
    return map
  }, [cabinetNodes, active?.node_id, feederElectrical?.status])

  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    return () => {
      previousActiveElementRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPickerOpenRef.current) {
          return
        }
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return

        const first = focusables[0]
        const last = focusables[focusables.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    setFeederElectrical(null)
    if (!active?.feeder_id) return

    const schedule = () => {
      if (!cancelled && active?.node_id) {
        timer = window.setTimeout(poll, ELECTRICAL_POLL_MS)
      }
    }

    const poll = async () => {
      try {
        const res = await iotAPI.getFeederElectrical(active.feeder_id)
        if (!cancelled) setFeederElectrical(res)
      } catch {
        if (!cancelled) setFeederElectrical(null)
      }
      schedule()
    }

    poll()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [active?.feeder_id, active?.node_id])

  const badge =
    active?.node_id && feederElectrical?.status
      ? iotStatusBadge(IOT_NODE_STATUS, feederElectrical.status)
      : null
  const powerText =
    feederElectrical?.power_state === 'on'
      ? ' · BẬT'
      : feederElectrical?.power_state === 'off'
        ? ' · TẮT'
        : ''

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="electrical-monitor-title"
        className="relative z-10 w-full max-w-6xl h-[min(46rem,90vh)] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-scaleUp overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center gap-3">
          <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <h2
            id="electrical-monitor-title"
            title={`Giám sát điện · ${target.title}`}
            className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm sm:text-base min-w-0 flex-1"
          >
            Giám sát điện · {target.title}
          </h2>

          {/* Nút đóng */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng giám sát điện"
            className="w-9 h-9 shrink-0 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hàng phụ dưới header: FeederPicker + badge trạng thái + nút khoảng thời gian */}
        {active && (
          <div className="px-5 py-2 border-b border-slate-200/70 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3 shrink-0 flex-wrap">
            <div className="flex items-center gap-2 text-[10.5px] text-slate-500 dark:text-slate-400 min-w-0 flex-wrap">
              <FeederPicker
                feeders={target.feeders}
                activeFeederId={active.feeder_id}
                nodeStatus={nodeStatusMap}
                onSelect={onSelectFeeder}
                onOpenChange={setIsPickerOpen}
              />
              <span className="hidden lg:inline">
                {active.node_id
                  ? '· số đo của cả mạch, không riêng cột nào'
                  : '· không gắn node · chỉ xem lịch sử đo trước đây'}
              </span>
              {badge && (
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    IOT_TONE_CLASS[badge.tone]
                  }`}
                >
                  {badge.label}{powerText}
                </span>
              )}
            </div>

            {/* Nhóm nút khoảng thời gian */}
            <div
              role="group"
              aria-label="Khoảng thời gian"
              className="inline-flex shrink-0 items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800"
            >
              {ELECTRICAL_RANGE_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={range === k}
                  onClick={() => setRange(k)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    range === k
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {ELECTRICAL_RANGES[k].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Thân popup: Biểu đồ & các thẻ chỉ số */}
        {active && <ElectricalChartPane key={active.feeder_id} active={active} range={range} />}
      </div>
    </div>,
    document.body
  )
}

export default ElectricalMonitorModal
