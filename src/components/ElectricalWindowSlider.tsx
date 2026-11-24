/** Thanh trượt khung thời gian kèm đường mini hiển thị vùng có/mất dữ liệu (hỗ trợ cả dải 24 giờ và khoảng nhiều ngày). */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ELECTRICAL_METRICS,
  bucketElectricalPoints,
  clampWindowEnd,
  insertElectricalGaps,
  localDayStarts,
  type ElectricalMetric,
  type ElectricalPoint,
} from '../utils/iot/electricalSeries'

/** Bước gom tối thiểu (5 phút) cho đường mini. */
const MINI_BUCKET_MS = 300_000
const SVG_WIDTH = 1000
const SVG_HEIGHT = 36
const SVG_PAD_Y = 5
/** Độ vượt mép track (px) để đạt tốc độ cuộn tối đa (4% độ dài dải mỗi frame). */
const PAN_MAX_OVERSHOOT_PX = 120
const PAN_MAX_FRACTION_PER_FRAME = 0.04
/** Độ rộng hiển thị tối thiểu của thanh trượt để luôn nhìn thấy và kéo được cả khi khoảng dài (30 ngày). */
const MIN_THUMB_PX = 24
/** Bề rộng mặc định dùng khi môi trường test (jsdom) không đo được kích thước DOM. */
const DEFAULT_TRACK_WIDTH_PX = 600
/** Ngưỡng chuyển từ 5 nhãn giờ sang nhãn + vạch ngày (25 giờ). */
const MULTI_DAY_LABEL_THRESHOLD_MS = 25 * 3_600_000

const SLIDER_TONE: Record<ElectricalMetric, { thumb: string; grip: string }> = {
  power: {
    thumb:
      'bg-emerald-500/20 dark:bg-emerald-400/25 border-emerald-600 dark:border-emerald-400 focus-visible:ring-emerald-500',
    grip: 'bg-emerald-600/80 dark:bg-emerald-300/80',
  },
  current: {
    thumb:
      'bg-blue-500/20 dark:bg-blue-400/25 border-blue-600 dark:border-blue-400 focus-visible:ring-blue-500',
    grip: 'bg-blue-600/80 dark:bg-blue-300/80',
  },
  voltage: {
    thumb:
      'bg-amber-500/20 dark:bg-amber-400/25 border-amber-600 dark:border-amber-400 focus-visible:ring-amber-500',
    grip: 'bg-amber-600/80 dark:bg-amber-300/80',
  },
}

const pad2 = (n: number) => String(n).padStart(2, '0')

const formatDateOnly = (time: number) => {
  if (!Number.isFinite(time)) return ''
  const d = new Date(time)
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`
}

const formatDateClockParts = (time: number) => {
  if (!Number.isFinite(time)) return { date: '', clock: '' }
  const d = new Date(time)
  return {
    date: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`,
    clock: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  }
}

const formatDateClock = (time: number) => {
  const { date, clock } = formatDateClockParts(time)
  return date && clock ? `${date} ${clock}` : ''
}

export interface SliderMappingParams {
  minEnd: number
  maxEnd: number
  trackWidthPx: number
  thumbPx: number
}

/**
 * Ánh xạ tuyến tính mốc cuối khung `windowEnd` sang vị trí mép trái thanh (px) trong `[0, trackWidthPx - thumbPx]`.
 * Khi thanh không bị nới rộng (`thumbPx = effectiveWindowMs / spanMs * W`), kết quả trùng công thức tỉ lệ cũ.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function windowEndToLeftPx(
  windowEnd: number,
  { minEnd, maxEnd, trackWidthPx, thumbPx }: SliderMappingParams
): number {
  const movablePx = Math.max(0, trackWidthPx - thumbPx)
  const rangeMs = maxEnd - minEnd
  if (movablePx <= 0 || rangeMs <= 0) return 0
  const p = Math.max(0, Math.min(1, (windowEnd - minEnd) / rangeMs))
  return p * movablePx
}

/**
 * Nghịch đảo của `windowEndToLeftPx`: ánh xạ vị trí mép trái thanh (px) sang `windowEnd` (kẹp trong `[minEnd, maxEnd]`).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function leftPxToWindowEnd(
  leftPx: number,
  { minEnd, maxEnd, trackWidthPx, thumbPx }: SliderMappingParams
): number {
  const movablePx = Math.max(0, trackWidthPx - thumbPx)
  const rangeMs = maxEnd - minEnd
  if (movablePx <= 0 || rangeMs <= 0) return maxEnd
  const p = Math.max(0, Math.min(1, leftPx / movablePx))
  return clampWindowEnd(Math.round(minEnd + p * rangeMs), minEnd, maxEnd)
}

export interface ElectricalWindowSliderProps {
  /** Toàn bộ điểm đã tải để vẽ đường mini. */
  points: ElectricalPoint[]
  /** Chỉ số đang chọn (màu thanh trượt và đường mini). */
  metric: ElectricalMetric
  /** Mốc bắt đầu dải (ms). */
  trackStart: number
  /** Mốc kết thúc dải (ms). */
  trackEnd: number
  /** Độ rộng khung thời gian đang chọn (ms: 1h / 6h / 12h). */
  windowMs: number
  /** Mốc kết thúc khung hiện tại (ms). */
  windowEnd: number
  /** Gọi khi người dùng kéo hoặc bấm phím thay đổi mốc kết thúc khung. */
  onChangeWindowEnd: (nextEnd: number) => void
  /** Mốc bắt đầu phạm vi cho phép (tùy chọn). */
  limitFrom?: number
  /** Mốc kết thúc phạm vi cho phép (tùy chọn). */
  limitTo?: number
  /** Gọi theo từng frame rAF khi đang kéo thanh vượt ra ngoài mép trái/phải của track. */
  onPanTrack?: (deltaMs: number) => void
}

export const ElectricalWindowSlider: React.FC<ElectricalWindowSliderProps> = ({
  points,
  metric,
  trackStart,
  trackEnd,
  windowMs,
  windowEnd,
  onChangeWindowEnd,
  limitFrom,
  limitTo,
  onPanTrack,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; startEnd: number } | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const panOvershootRef = useRef<number>(0)
  const onPanTrackRef = useRef(onPanTrack)
  const [dragging, setDragging] = useState(false)
  const [trackWidthPx, setTrackWidthPx] = useState<number>(DEFAULT_TRACK_WIDTH_PX)

  const spanMs = Math.max(1, trackEnd - trackStart)
  const spanMsRef = useRef(spanMs)
  onPanTrackRef.current = onPanTrack
  spanMsRef.current = spanMs

  // Đo bề rộng thực của track bằng ResizeObserver (giữ mặc định 600px trong jsdom nếu không đo được).
  useEffect(() => {
    const el = trackRef.current
    if (!el) return

    const updateWidth = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setTrackWidthPx(w)
    }
    updateWidth()

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const entryWidth = entries[0]?.contentRect.width ?? el.getBoundingClientRect().width
      if (entryWidth > 0) setTrackWidthPx(entryWidth)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Phạm vi hợp lệ trong dải hiện tại (khi không truyền limitFrom/limitTo thì bằng toàn bộ track).
  const allowedStart = limitFrom !== undefined ? Math.max(trackStart, limitFrom) : trackStart
  const allowedEnd = limitTo !== undefined ? Math.min(trackEnd, limitTo) : trackEnd
  const allowedSpanMs = Math.max(0, allowedEnd - allowedStart)
  const effectiveWindowMs = Math.min(windowMs, allowedSpanMs > 0 ? allowedSpanMs : spanMs)
  const minEnd = allowedStart + effectiveWindowMs
  const maxEnd = Math.max(minEnd, allowedEnd)
  const clampedEnd = clampWindowEnd(windowEnd, minEnd, maxEnd)
  const windowStart = clampedEnd - effectiveWindowMs

  // Tính bề rộng và vị trí thanh theo px (nới tối thiểu 24px khi khoảng dài).
  const computeLayout = useCallback(
    (widthPx: number) => {
      const safeW = widthPx > 0 ? widthPx : DEFAULT_TRACK_WIDTH_PX
      const allowedLeftPx = ((allowedStart - trackStart) / spanMs) * safeW
      const allowedWidthPx =
        allowedSpanMs > 0 ? (allowedSpanMs / spanMs) * safeW : safeW
      const rawThumbPx = (effectiveWindowMs / spanMs) * safeW
      const thumbPx = Math.min(allowedWidthPx, Math.max(MIN_THUMB_PX, rawThumbPx))
      return { safeW, allowedLeftPx, allowedWidthPx, thumbPx }
    },
    [allowedStart, allowedSpanMs, trackStart, spanMs, effectiveWindowMs]
  )

  const layout = computeLayout(trackWidthPx)
  const leftPx =
    layout.allowedLeftPx +
    windowEndToLeftPx(clampedEnd, {
      minEnd,
      maxEnd,
      trackWidthPx: layout.allowedWidthPx,
      thumbPx: layout.thumbPx,
    })
  const rightDimLeftPx = leftPx + layout.thumbPx

  // Vùng nằm ngoài phạm vi cho phép (trước limitFrom / sau limitTo).
  const disabledLeftPct =
    limitFrom !== undefined && limitFrom > trackStart
      ? Math.min(100, Math.max(0, ((limitFrom - trackStart) / spanMs) * 100))
      : 0
  const disabledRightPct =
    limitTo !== undefined && limitTo < trackEnd
      ? Math.min(100, Math.max(0, ((trackEnd - limitTo) / spanMs) * 100))
      : 0

  const stopPanLoop = useCallback(() => {
    panOvershootRef.current = 0
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [])

  const startPanLoop = useCallback(() => {
    if (rafIdRef.current !== null) return
    const step = () => {
      const overshootPx = panOvershootRef.current
      const pan = onPanTrackRef.current
      if (!dragRef.current || overshootPx === 0 || !pan) {
        rafIdRef.current = null
        return
      }
      const intensity = Math.min(1, Math.abs(overshootPx) / PAN_MAX_OVERSHOOT_PX)
      const sign = overshootPx < 0 ? -1 : 1
      const deltaMs = Math.round(sign * intensity * spanMsRef.current * PAN_MAX_FRACTION_PER_FRAME)
      if (deltaMs !== 0) {
        pan(deltaMs)
      }
      rafIdRef.current = window.requestAnimationFrame(step)
    }
    rafIdRef.current = window.requestAnimationFrame(step)
  }, [])

  // Dọn vòng lặp rAF khi component unmount.
  useEffect(() => stopPanLoop, [stopPanLoop])

  // Đường SVG mini mờ từ dữ liệu đã tải trong track; bước gom tự giãn theo spanMs để không nặng khi khoảng dài.
  const miniBucketMs = Math.max(MINI_BUCKET_MS, Math.ceil(spanMs / 600))
  const miniPath = useMemo(() => {
    const inTrack = points.filter((p) => p.time >= trackStart && p.time <= trackEnd)
    if (inTrack.length === 0) return ''

    const bucketed = bucketElectricalPoints(inTrack, miniBucketMs)
    const withGaps = insertElectricalGaps(bucketed, miniBucketMs)

    let minVal = Infinity
    let maxVal = -Infinity
    for (const p of withGaps) {
      const v = p[metric]
      if (typeof v === 'number' && Number.isFinite(v)) {
        if (v < minVal) minVal = v
        if (v > maxVal) maxVal = v
      }
    }
    if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) return ''

    const plotHeight = SVG_HEIGHT - SVG_PAD_Y * 2
    const valSpan = maxVal - minVal
    const cmds: string[] = []
    let inSegment = false

    for (let i = 0; i < withGaps.length; i++) {
      const p = withGaps[i]
      const v = p[metric]
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        inSegment = false
        continue
      }

      const x = Math.max(0, Math.min(SVG_WIDTH, ((p.time - trackStart) / spanMs) * SVG_WIDTH))
      const y =
        valSpan === 0
          ? SVG_HEIGHT / 2
          : SVG_PAD_Y + plotHeight - ((v - minVal) / valSpan) * plotHeight

      if (!inSegment) {
        cmds.push(`M${x.toFixed(1)},${y.toFixed(1)}`)
        const nextVal = i + 1 < withGaps.length ? withGaps[i + 1][metric] : null
        if (typeof nextVal !== 'number' || !Number.isFinite(nextVal)) {
          cmds.push(`L${Math.min(SVG_WIDTH, x + 0.8).toFixed(1)},${y.toFixed(1)}`)
        }
        inSegment = true
      } else {
        cmds.push(`L${x.toFixed(1)},${y.toFixed(1)}`)
      }
    }

    return cmds.join(' ')
  }, [points, metric, trackStart, trackEnd, spanMs, miniBucketMs])

  const isMultiDayTrack = spanMs > MULTI_DAY_LABEL_THRESHOLD_MS

  // Các mốc 00:00 địa phương nằm trong [trackStart, trackEnd] (chỉ dùng khi khoảng > 25 giờ).
  const dayMidnights = useMemo(() => {
    if (!isMultiDayTrack) return []
    return localDayStarts(trackStart, trackEnd + 1).filter(
      (t) => t >= trackStart && t <= trackEnd
    )
  }, [isMultiDayTrack, trackStart, trackEnd])

  // Nhãn ngày thưa theo stride = ceil(sốNgày / 8) để tối đa ~8 nhãn dd/MM, không đè nhau.
  const dayLabels = useMemo(() => {
    if (!isMultiDayTrack || dayMidnights.length === 0) return []
    const stride = Math.max(1, Math.ceil(dayMidnights.length / 8))
    return dayMidnights
      .filter((_, idx) => idx % stride === 0)
      .map((t) => ({
        time: t,
        label: formatDateOnly(t),
        pct: ((t - trackStart) / spanMs) * 100,
      }))
  }, [isMultiDayTrack, dayMidnights, trackStart, spanMs])

  // 5 mốc ngày giờ (dd/MM HH:mm) đều nhau khi khoảng <= 25 giờ.
  const fiveTickLabels = useMemo(
    () =>
      isMultiDayTrack
        ? []
        : [0, 0.25, 0.5, 0.75, 1].map((ratio) => formatDateClockParts(trackStart + spanMs * ratio)),
    [isMultiDayTrack, trackStart, spanMs]
  )

  const handleThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.focus()
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // Bỏ qua nếu môi trường test không hỗ trợ pointer capture.
      }
    }
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startEnd: clampedEnd,
    }
    setDragging(true)
  }

  const handleThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const trackEl = trackRef.current
    if (!trackEl) return
    const rect = trackEl.getBoundingClientRect()
    if (rect.width <= 0) return

    // Khi có onPanTrack và con trỏ vượt mép trái/phải của track: chạy rAF cuộn track, không tự đổi windowEnd.
    if (onPanTrackRef.current) {
      if (e.clientX < rect.left) {
        panOvershootRef.current = e.clientX - rect.left
        drag.startX = e.clientX
        drag.startEnd = clampedEnd
        startPanLoop()
        return
      }
      if (e.clientX > rect.right) {
        panOvershootRef.current = e.clientX - rect.right
        drag.startX = e.clientX
        drag.startEnd = clampedEnd
        startPanLoop()
        return
      }
      if (panOvershootRef.current !== 0) {
        stopPanLoop()
        drag.startX = e.clientX
        drag.startEnd = clampedEnd
      }
    }

    const activeLayout = computeLayout(rect.width)
    const movablePx = Math.max(0, activeLayout.allowedWidthPx - activeLayout.thumbPx)
    if (movablePx <= 0) {
      onChangeWindowEnd(maxEnd)
      return
    }
    const deltaX = e.clientX - drag.startX
    const deltaMs = (deltaX / movablePx) * (maxEnd - minEnd)
    const nextEnd = clampWindowEnd(Math.round(drag.startEnd + deltaMs), minEnd, maxEnd)
    onChangeWindowEnd(nextEnd)
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    stopPanLoop()
    setDragging(false)
    if (typeof e.currentTarget.releasePointerCapture === 'function') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // Bỏ qua nếu capture đã được nhả.
      }
    }
  }

  // Nhấp vào vùng hợp lệ trên dải sẽ đưa tâm thanh trượt tới điểm bấm theo cùng ánh xạ tuyến tính.
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const trackEl = trackRef.current
    if (!trackEl) return
    const rect = trackEl.getBoundingClientRect()
    if (rect.width <= 0) return
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const ratio = clickX / rect.width
    const targetTime = trackStart + ratio * spanMs
    if (
      (limitFrom !== undefined && targetTime < limitFrom) ||
      (limitTo !== undefined && targetTime > limitTo)
    ) {
      return
    }
    const activeLayout = computeLayout(rect.width)
    const targetLeftRelPx = clickX - activeLayout.allowedLeftPx - activeLayout.thumbPx / 2
    const nextEnd = leftPxToWindowEnd(targetLeftRelPx, {
      minEnd,
      maxEnd,
      trackWidthPx: activeLayout.allowedWidthPx,
      thumbPx: activeLayout.thumbPx,
    })
    onChangeWindowEnd(nextEnd)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const stepMs = Math.max(1, Math.round(effectiveWindowMs / 12))
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      onChangeWindowEnd(clampWindowEnd(clampedEnd - stepMs, minEnd, maxEnd))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      onChangeWindowEnd(clampWindowEnd(clampedEnd + stepMs, minEnd, maxEnd))
    } else if (e.key === 'Home') {
      e.preventDefault()
      onChangeWindowEnd(minEnd)
    } else if (e.key === 'End') {
      e.preventDefault()
      onChangeWindowEnd(maxEnd)
    }
  }

  const tone = SLIDER_TONE[metric]
  const strokeColor = ELECTRICAL_METRICS[metric].color

  return (
    <div className="shrink-0 pt-2 pl-14 pr-9">
      <div
        ref={trackRef}
        data-testid="electrical-window-track"
        onPointerDown={handleTrackPointerDown}
        className="relative h-9 min-h-[32px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 overflow-hidden select-none touch-none"
      >
        {/* Vạch dọc 1px mảnh tại mỗi mốc 00:00 địa phương khi khoảng dài hơn 25 giờ */}
        {isMultiDayTrack &&
          dayMidnights.map((t) => {
            if (t <= trackStart || t >= trackEnd) return null
            const pct = ((t - trackStart) / spanMs) * 100
            return (
              <div
                key={t}
                aria-hidden="true"
                data-testid="electrical-slider-day-tick"
                className="absolute inset-y-0 w-px bg-slate-300/60 dark:bg-slate-600/50 pointer-events-none"
                style={{ left: `${pct}%` }}
              />
            )
          })}

        {/* Đường mini dữ liệu đã tải */}
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {miniPath && (
            <path
              d={miniPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1.5}
              strokeOpacity={0.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* Lớp làm mờ hai vùng ngoài thanh trượt tính theo px thực */}
        {leftPx > 0 && (
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 bg-slate-900/5 dark:bg-slate-950/35 pointer-events-none"
            style={{ width: `${leftPx}px` }}
          />
        )}
        {rightDimLeftPx < layout.safeW && (
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 bg-slate-900/5 dark:bg-slate-950/35 pointer-events-none"
            style={{ left: `${rightDimLeftPx}px` }}
          />
        )}

        {/* Vùng ngoài phạm vi cho phép (trước limitFrom / sau limitTo) */}
        {disabledLeftPct > 0 && (
          <div
            aria-hidden="true"
            data-testid="electrical-slider-limit-left"
            className="absolute inset-y-0 left-0 bg-slate-300/60 dark:bg-slate-950/75 border-r border-slate-300 dark:border-slate-600 pointer-events-none"
            style={{ width: `${disabledLeftPct}%` }}
          />
        )}
        {disabledRightPct > 0 && (
          <div
            aria-hidden="true"
            data-testid="electrical-slider-limit-right"
            className="absolute inset-y-0 right-0 bg-slate-300/60 dark:bg-slate-950/75 border-l border-slate-300 dark:border-slate-600 pointer-events-none"
            style={{ width: `${disabledRightPct}%` }}
          />
        )}

        {/* Thanh khung thời gian (độ rộng tối thiểu 24px, chỉ kéo di chuyển) */}
        <div
          role="slider"
          aria-label="Di chuyển khung thời gian"
          aria-valuemin={minEnd}
          aria-valuemax={maxEnd}
          aria-valuenow={clampedEnd}
          aria-valuetext={`${formatDateClock(windowStart)} – ${formatDateClock(clampedEnd)}`}
          tabIndex={0}
          onPointerDown={handleThumbPointerDown}
          onPointerMove={handleThumbPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={handleKeyDown}
          style={{ left: `${leftPx}px`, width: `${layout.thumbPx}px` }}
          className={`absolute inset-y-0 min-h-[32px] rounded-md border-2 flex items-center justify-center gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset transition-colors ${
            dragging ? 'cursor-grabbing' : 'cursor-grab'
          } ${tone.thumb}`}
        >
          <span aria-hidden="true" className={`w-0.5 h-3 rounded-full pointer-events-none ${tone.grip}`} />
          <span aria-hidden="true" className={`w-0.5 h-3 rounded-full pointer-events-none ${tone.grip}`} />
        </div>
      </div>

      {/* Nhãn thời gian dưới dải: nhãn ngày dd/MM khi > 25 giờ, hoặc 5 nhãn dd/MM HH:mm khi <= 25 giờ */}
      {isMultiDayTrack ? (
        <div
          data-testid="electrical-window-labels"
          className="relative h-4 mt-1 text-[10px] font-mono text-slate-600 dark:text-slate-300 select-none"
        >
          {dayLabels.map((item) => {
            const nearLeft = item.pct <= 5
            const nearRight = item.pct >= 95
            return (
              <span
                key={item.time}
                className={`absolute top-0 whitespace-nowrap leading-tight ${
                  nearLeft || nearRight ? '' : '-translate-x-1/2'
                }`}
                style={nearRight ? { right: `${Math.max(0, 100 - item.pct)}%` } : { left: `${Math.max(0, item.pct)}%` }}
              >
                {item.label}
              </span>
            )
          })}
        </div>
      ) : (
        <div
          data-testid="electrical-window-labels"
          className="flex items-start justify-between gap-2 mt-1 text-[10px] font-mono text-slate-600 dark:text-slate-300 select-none"
        >
          {fiveTickLabels.map((label, idx) => (
            <span
              key={idx}
              className={`leading-tight ${
                idx === 0
                  ? 'text-left'
                  : idx === fiveTickLabels.length - 1
                    ? 'text-right'
                    : 'text-center'
              }`}
            >
              <span className="whitespace-nowrap">{label.date}</span>{' '}
              <span className="whitespace-nowrap">{label.clock}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
