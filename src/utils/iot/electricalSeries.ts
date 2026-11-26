import type { IotFeederHistoryResult, IotFeederHistorySample } from '../../types/iot/feeders'

/** Mốc giờ dùng để xếp mẫu trên trục thời gian (khớp `sort_by` của BE). */
export type ElectricalSampleBasis = NonNullable<IotFeederHistoryResult['sort_by']>

/** Cách mẫu tới hệ thống: `live` gửi ngay khi đo, `backfill` lấy lại từ thẻ nhớ gửi bù sau khi mất kết nối. */
export type ElectricalReception = NonNullable<IotFeederHistorySample['reception_type']>

export type ElectricalMetric = 'power' | 'current' | 'voltage'

/** Thứ tự hiển thị: công suất trước vì bóng tắt làm công suất cả mạch tụt rõ nhất. */
export const ELECTRICAL_METRICS: Record<ElectricalMetric, { label: string; unit: string; color: string; digits: number }> = {
  power: { label: 'Công suất', unit: 'mW', color: '#059669', digits: 1 },
  current: { label: 'Dòng', unit: 'mA', color: '#2563eb', digits: 1 },
  voltage: { label: 'Điện áp', unit: 'V', color: '#d97706', digits: 3 },
}

export const ELECTRICAL_METRIC_KEYS = Object.keys(ELECTRICAL_METRICS) as ElectricalMetric[]

/** Cửa sổ lớn nhất cần tải (24 giờ). */
export const ELECTRICAL_HISTORY_MS = 24 * 3_600_000

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000

/** Khung xem ngắn nhất (5 phút). */
export const ELECTRICAL_MIN_WINDOW_MS = 5 * MINUTE_MS
/** Khung xem dài nhất (24 giờ), cũng là trần ở chế độ Theo ngày để không tải quá nhiều mẫu. */
export const ELECTRICAL_MAX_WINDOW_MS = ELECTRICAL_HISTORY_MS
export const ELECTRICAL_DEFAULT_WINDOW_MS = 6 * HOUR_MS
/** Nút chọn nhanh độ dài khung xem. */
export const ELECTRICAL_WINDOW_PRESETS: { label: string; ms: number }[] = [
  { label: '1 giờ', ms: HOUR_MS },
  { label: '6 giờ', ms: 6 * HOUR_MS },
  { label: '12 giờ', ms: 12 * HOUR_MS },
]

/** Cách vẽ theo độ dài khung: ≤ 1 giờ vẽ từng mẫu, ≤ 6 giờ trung bình mỗi phút, dài hơn trung bình mỗi 5 phút. */
export function electricalBucketForWindow(windowMs: number): { bucketMs: number; hint: string } {
  if (windowMs <= HOUR_MS) return { bucketMs: 0, hint: 'Từng mẫu (mỗi giây một mẫu)' }
  if (windowMs <= 6 * HOUR_MS) return { bucketMs: MINUTE_MS, hint: 'Trung bình mỗi phút' }
  return { bucketMs: 5 * MINUTE_MS, hint: 'Trung bình mỗi 5 phút' }
}

const TICK_STEPS_MS = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360].map((m) => m * MINUTE_MS)

/** Bước nhãn trục X nhỏ nhất sao cho khung có tối đa 8 khoảng. */
export function electricalTickStepForWindow(windowMs: number): number {
  return TICK_STEPS_MS.find((step) => windowMs / step <= 8) ?? TICK_STEPS_MS[TICK_STEPS_MS.length - 1]
}

/** Độ dài khung dạng `45 phút`, `1 giờ`, `1 giờ 30 phút` (làm tròn phút). */
export function formatWindowDuration(ms: number): string {
  const totalMinutes = Math.round(ms / MINUTE_MS)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} phút`
  return minutes === 0 ? `${hours} giờ` : `${hours} giờ ${minutes} phút`
}

/** Đổi số người dùng nhập (phút hoặc giờ, nhận cả dấu phẩy thập phân) sang ms làm tròn phút; ngoài [5 phút, maxMs] trả null. */
export function parseWindowInput(raw: string, unit: 'minute' | 'hour', maxMs: number): number | null {
  const text = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(text)) return null
  const minutes = Math.round(Number(text) * (unit === 'hour' ? 60 : 1))
  const ms = minutes * MINUTE_MS
  return ms >= ELECTRICAL_MIN_WINDOW_MS && ms <= maxMs ? ms : null
}
/** Ngưỡng khoảng trống mặc định (30 giây) khi không gom ô (chế độ 1 giờ, bucketMs = 0). */
export const RAW_GAP_THRESHOLD_MS = 30_000
/** Độ dài một khúc tải lịch sử điện (6 giờ), căn theo bội số của epoch ms. */
export const ELECTRICAL_CHUNK_MS = 6 * 3_600_000
/** Ngưỡng độ dài track tối đa (48 giờ) để tải trước toàn bộ track; dài hơn chỉ tải quanh khung xem ±12 giờ. */
export const ELECTRICAL_PREFETCH_FULL_TRACK_MAX_MS = 48 * 3_600_000
const LONG_TRACK_PREFETCH_RADIUS_MS = 12 * 3_600_000

export type ElectricalChunkState = 'loading' | 'loaded' | 'error'
export type ElectricalChunkDirection = -1 | 0 | 1

export interface ElectricalTimeSpan {
  from: number
  to: number
}

export interface ElectricalPoint {
  key: string
  cursor: number
  time: number
  current: number | null
  voltage: number | null
  power: number | null
  lamp: string | null
  node: string | null
  /** Giờ đo trên node (`measured_at`), null khi node không có RTC hợp lệ. */
  measuredAt: number | null
  /** Giờ Bridge nhận mẫu lần đầu (`received_at`). */
  receivedAt: number | null
  /** Cách mẫu tới hệ thống; null khi firmware cũ chưa đánh dấu. */
  reception: ElectricalReception | null
}

const parseTime = (iso?: string | null) => {
  const t = iso ? Date.parse(iso) : NaN
  return Number.isFinite(t) ? t : null
}

const finite = (v?: number | null) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export function toElectricalPoint(
  sample: IotFeederHistorySample,
  timeBasis: ElectricalSampleBasis = 'measured_at'
): ElectricalPoint | null {
  const measuredAt = parseTime(sample.measured_at)
  const receivedAt = parseTime(sample.received_at)
  const time = timeBasis === 'received_at' ? receivedAt : measuredAt
  if (time === null) return null
  return {
    key: `${sample.node_id ?? ''}|${sample.measured_at ?? ''}|${sample.received_at ?? ''}`,
    cursor: time,
    time,
    current: finite(sample.current_ma),
    voltage: finite(sample.voltage),
    power: finite(sample.power_mw),
    lamp: null,
    node: null,
    measuredAt,
    receivedAt,
    reception: sample.reception_type ?? null,
  }
}

/** Gộp mẫu mới vào chuỗi theo key (không trùng), sắp theo thời gian nhận, giữ `maxPoints` điểm mới nhất. */
export function mergeElectricalPoints(
  prev: ElectricalPoint[],
  samples: IotFeederHistorySample[],
  maxPoints: number,
  timeBasis: ElectricalSampleBasis = 'measured_at'
): ElectricalPoint[] {
  const byKey = new Map(prev.map((p) => [p.key, p]))
  for (const s of samples) {
    const p = toElectricalPoint(s, timeBasis)
    if (p) byKey.set(p.key, p)
  }
  return [...byKey.values()].sort((a, b) => a.time - b.time || a.cursor - b.cursor).slice(-maxPoints)
}

/** Một điểm sau khi gộp: `count` = số mẫu thô trong khoảng, `backfillCount` = số mẫu gửi bù trong đó. */
export interface ElectricalBucketPoint extends ElectricalPoint {
  count: number
  backfillCount: number
  /** Khoảng giờ đo / giờ nhận của các mẫu trong điểm (bằng nhau khi chỉ có một mẫu). */
  measuredFrom: number | null
  measuredTo: number | null
  receivedFrom: number | null
  receivedTo: number | null
  min: Record<ElectricalMetric, number | null>
  max: Record<ElectricalMetric, number | null>
}

const average = (values: (number | null)[]) => {
  const nums = values.filter((v): v is number => v !== null)
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
}

const minOf = (values: (number | null)[]) => {
  const nums = values.filter((v): v is number => v !== null)
  return nums.length ? Math.min(...nums) : null
}

const maxOf = (values: (number | null)[]) => {
  const nums = values.filter((v): v is number => v !== null)
  return nums.length ? Math.max(...nums) : null
}

const EMPTY_SPAN = { backfillCount: 0, measuredFrom: null, measuredTo: null, receivedFrom: null, receivedTo: null }

/**
 * Gộp mẫu thô thành trung bình theo khoảng `bucketMs` (phút / giờ), mốc là đầu khoảng.
 * Giá trị null không tính vào trung bình; khoảng toàn null thì null. `bucketMs <= 0` trả nguyên mẫu (count = 1).
 */
export function bucketElectricalPoints(points: ElectricalPoint[], bucketMs: number): ElectricalBucketPoint[] {
  if (bucketMs <= 0) {
    return points.map((p) => ({
      ...p,
      count: 1,
      backfillCount: p.reception === 'backfill' ? 1 : 0,
      measuredFrom: p.measuredAt,
      measuredTo: p.measuredAt,
      receivedFrom: p.receivedAt,
      receivedTo: p.receivedAt,
      min: { power: p.power, current: p.current, voltage: p.voltage },
      max: { power: p.power, current: p.current, voltage: p.voltage },
    }))
  }

  const groups = new Map<number, ElectricalPoint[]>()
  for (const p of points) {
    const start = Math.floor(p.time / bucketMs) * bucketMs
    const group = groups.get(start)
    if (group) group.push(p)
    else groups.set(start, [p])
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([start, group]) => {
      const last = group[group.length - 1]
      return {
        key: last.key,
        cursor: Math.max(...group.map((p) => p.cursor)),
        time: start,
        current: average(group.map((p) => p.current)),
        voltage: average(group.map((p) => p.voltage)),
        power: average(group.map((p) => p.power)),
        lamp: last.lamp,
        node: last.node,
        measuredAt: last.measuredAt,
        receivedAt: last.receivedAt,
        reception: last.reception,
        count: group.length,
        backfillCount: group.filter((p) => p.reception === 'backfill').length,
        measuredFrom: minOf(group.map((p) => p.measuredAt)),
        measuredTo: maxOf(group.map((p) => p.measuredAt)),
        receivedFrom: minOf(group.map((p) => p.receivedAt)),
        receivedTo: maxOf(group.map((p) => p.receivedAt)),
        min: {
          power: minOf(group.map((p) => p.power)),
          current: minOf(group.map((p) => p.current)),
          voltage: minOf(group.map((p) => p.voltage)),
        },
        max: {
          power: maxOf(group.map((p) => p.power)),
          current: maxOf(group.map((p) => p.current)),
          voltage: maxOf(group.map((p) => p.voltage)),
        },
      }
    })
}

/** Trả các điểm có `time >= (time điểm mới nhất) - windowMs` (mảng rỗng → rỗng). Không đổi thứ tự. */
export function sliceWindow(points: ElectricalPoint[], windowMs: number): ElectricalPoint[] {
  if (points.length === 0) return []
  let newest = points[0].time
  for (let i = 1; i < points.length; i++) {
    if (points[i].time > newest) newest = points[i].time
  }
  const cutoff = newest - windowMs
  return points.filter((p) => p.time >= cutoff)
}

/**
 * Duyệt theo thời gian tăng dần; mỗi khi `node` khác node khác-null gần nhất trước đó (cả hai khác null) thì thêm một mốc
 * tại `time` của điểm đầu tiên mang node mới. Điểm `node` null thì bỏ qua (không tạo mốc, không làm mất node trước).
 */
export function findNodeChanges(points: ElectricalPoint[]): { time: number; from: string; to: string }[] {
  const sorted = [...points].sort((a, b) => a.time - b.time)
  const changes: { time: number; from: string; to: string }[] = []
  let lastNode: string | null = null

  for (const p of sorted) {
    if (p.node === null) continue
    if (lastNode !== null && p.node !== lastNode) {
      changes.push({
        time: p.time,
        from: lastNode,
        to: p.node,
      })
    }
    lastNode = p.node
  }

  return changes
}

const isLampOn = (lamp: string | null | undefined) =>
  typeof lamp === 'string' && lamp.toUpperCase() === 'ON'

/**
 * Gom các điểm liên tiếp có `lamp === 'ON'` (không phân biệt hoa thường) thành một khoảng; `start` = time điểm ON đầu,
 * `end` = time điểm ngay sau điểm ON cuối (nếu có), không có thì time điểm ON cuối. Điểm lamp khác/null cắt khoảng.
 */
export function findLampOnRanges(points: ElectricalPoint[]): { start: number; end: number }[] {
  const sorted = [...points].sort((a, b) => a.time - b.time)
  const ranges: { start: number; end: number }[] = []
  const n = sorted.length
  let i = 0

  while (i < n) {
    if (isLampOn(sorted[i].lamp)) {
      const startIndex = i
      while (i < n && isLampOn(sorted[i].lamp)) {
        i++
      }
      const lastOnIndex = i - 1
      const start = sorted[startIndex].time
      const end = i < n ? sorted[i].time : sorted[lastOnIndex].time
      ranges.push({ start, end })
    } else {
      i++
    }
  }

  return ranges
}

/** Tóm tắt min, max, avg của chỉ số; bỏ null; không còn giá trị nào → null. */
export function summarizeMetric(
  points: ElectricalPoint[],
  metric: ElectricalMetric
): { avg: number; min: number; max: number } | null {
  const nums = points
    .map((p) => p[metric])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

  if (nums.length === 0) return null

  const sum = nums.reduce((acc, v) => acc + v, 0)
  const avg = sum / nums.length
  let min = nums[0]
  let max = nums[0]
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] < min) min = nums[i]
    if (nums[i] > max) max = nums[i]
  }

  return { avg, min, max }
}

/**
 * Chèn điểm ngắt (mọi chỉ số và min/max đều null, count = 0) giữa hai điểm liền kề cách nhau
 * lớn hơn ngưỡng (2 lần `bucketMs`; nếu `bucketMs <= 0` thì dùng 30 giây) để biểu đồ không nối qua khoảng mất dữ liệu.
 */
export function insertElectricalGaps(
  points: ElectricalBucketPoint[],
  bucketMs: number
): ElectricalBucketPoint[] {
  if (points.length <= 1) return points.slice()
  const thresholdMs = bucketMs > 0 ? bucketMs * 2 : RAW_GAP_THRESHOLD_MS
  const result: ElectricalBucketPoint[] = [points[0]]

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    if (curr.time - prev.time > thresholdMs) {
      const midTime = Math.floor((prev.time + curr.time) / 2)
      result.push({
        key: `gap-${prev.time}-${curr.time}`,
        cursor: midTime,
        time: midTime,
        current: null,
        voltage: null,
        power: null,
        lamp: null,
        node: null,
        measuredAt: null,
        receivedAt: null,
        reception: null,
        count: 0,
        ...EMPTY_SPAN,
        min: { power: null, current: null, voltage: null },
        max: { power: null, current: null, voltage: null },
      })
    }
    result.push(curr)
  }

  return result
}

/**
 * Gom các điểm liền kề có mẫu gửi bù (`backfillCount > 0`) thành khoảng thời gian để tô nền biểu đồ.
 * Điểm ngắt (count = 0) hoặc điểm không có mẫu gửi bù cắt khoảng; `end` = đầu điểm cuối + độ rộng ô (tối thiểu 1 giây).
 */
export function findBackfillRanges(
  points: ElectricalBucketPoint[],
  bucketMs: number
): { start: number; end: number }[] {
  const width = bucketMs > 0 ? bucketMs : 1000
  const ranges: { start: number; end: number }[] = []
  let start: number | null = null
  let last = 0
  for (const p of points) {
    if (p.backfillCount > 0) {
      if (start === null) start = p.time
      last = p.time
    } else if (start !== null) {
      ranges.push({ start, end: last + width })
      start = null
    }
  }
  if (start !== null) ranges.push({ start, end: last + width })
  return ranges
}

/** Kẹp mốc kết thúc khung trong phạm vi hợp lệ của dải 24 giờ. */
/** Điểm có mẫu gửi bù mà hai điểm kề đều không có: nét đứt không vẽ được nên cần chấm riêng để vẫn thấy. */
export function isLoneBackfill(points: ElectricalBucketPoint[], index: number): boolean {
  const p = points[index]
  if (!p || p.backfillCount === 0) return false
  const prev = points[index - 1]
  const next = points[index + 1]
  return (!prev || prev.backfillCount === 0) && (!next || next.backfillCount === 0)
}

export const clampWindowEnd = (value: number, minEnd: number, maxEnd: number): number => {
  if (minEnd >= maxEnd) return maxEnd
  return Math.min(maxEnd, Math.max(minEnd, value))
}

/** Mốc 00:00:00.000 giờ địa phương của ngày chứa `ms`. */
export function startOfLocalDay(ms: number): number {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * Mốc 00:00 giờ địa phương của mọi ngày giao với `[from, to)`, tăng dần (`to <= from` → `[]`).
 * Bước từng ngày bằng `setDate(getDate() + 1)` để đúng khi qua cuối tháng, cuối năm hoặc DST.
 */
export function localDayStarts(from: number, to: number): number[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return []
  const starts: number[] = []
  const cursor = new Date(startOfLocalDay(from))
  while (cursor.getTime() < to) {
    starts.push(cursor.getTime())
    cursor.setDate(cursor.getDate() + 1)
  }
  return starts
}

export interface ClampTrackStartOptions {
  trackStart: number
  spanMs: number
  limitFrom: number
  limitTo: number
}

/**
 * Kẹp `trackStart` sao cho `[trackStart, trackStart + spanMs]` nằm trong `[limitFrom, limitTo]`.
 * Nếu phạm vi hẹp hơn `spanMs` (`limitTo - limitFrom < spanMs`) thì trả `limitFrom`.
 */
export function clampTrackStart({
  trackStart,
  spanMs,
  limitFrom,
  limitTo,
}: ClampTrackStartOptions): number {
  if (limitTo - limitFrom < spanMs) return limitFrom
  const maxStart = limitTo - spanMs
  return Math.min(maxStart, Math.max(limitFrom, trackStart))
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Tính các mốc trục X tròn theo giờ địa phương trong đoạn `[startMs, endMs]`. */
export function buildAxisTicks(startMs: number, endMs: number, stepMs: number): number[] {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || stepMs <= 0 || endMs <= startMs) {
    return []
  }
  const offsetMs = new Date(startMs).getTimezoneOffset() * 60_000
  const first = Math.ceil((startMs - offsetMs) / stepMs) * stepMs + offsetMs
  const ticks: number[] = []
  for (let t = first; t <= endMs; t += stepMs) {
    ticks.push(t)
  }
  return ticks
}

/**
 * Định dạng nhãn trục X cho chế độ Gần nhất (2 dòng: dòng trên `HH:mm`, dòng dưới `dd/MM`).
 * Dòng ngày chỉ xuất hiện ở nhãn đầu khung (`isFirst`) và mốc đúng `00:00`.
 */
export function formatRecentAxisTick(
  time: number,
  isFirst: boolean
): { clock: string; date: string | null } {
  if (!Number.isFinite(time)) return { clock: '', date: null }
  const d = new Date(time)
  const clock = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  const isMidnight = d.getHours() === 0 && d.getMinutes() === 0
  const date = isFirst || isMidnight ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}` : null
  return { clock, date }
}

/** Mốc đầu khúc 6 giờ chứa thời điểm `time` (căn theo epoch ms). */
export const chunkStartOf = (time: number): number =>
  Math.floor(time / ELECTRICAL_CHUNK_MS) * ELECTRICAL_CHUNK_MS

/**
 * Trả về danh sách mốc đầu khúc 6 giờ (tăng dần) phủ khoảng `[from, to]`.
 * Nếu `to > from` và `to` nằm đúng biên khúc (vd `06:00:00.000`), không kéo thêm khúc kế sau.
 */
export function chunkStartsCovering(from: number, to: number): number[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return []
  const first = chunkStartOf(from)
  const last = to > from ? chunkStartOf(to - 1) : first
  const starts: number[] = []
  for (let s = first; s <= last; s += ELECTRICAL_CHUNK_MS) {
    starts.push(s)
  }
  return starts
}

const chunkOverlapsSpan = (start: number, span: ElectricalTimeSpan): boolean => {
  if (!Number.isFinite(span.from) || !Number.isFinite(span.to) || span.to < span.from) {
    return false
  }
  const end = start + ELECTRICAL_CHUNK_MS
  return span.to > span.from ? start < span.to && end > span.from : start <= span.from && span.from < end
}

export interface PlanElectricalChunksOptions {
  /** Khung đang xem (ưu tiên tải trước). */
  view: ElectricalTimeSpan
  /** Khung nhìn 24 giờ trên thanh trượt. */
  track: ElectricalTimeSpan
  /** Hướng kéo gần nhất: `-1` quá khứ, `1` tương lai, `0` đứng yên (ưu tiên cả 2 bên). */
  direction: ElectricalChunkDirection
  /** Trạng thái tải hiện có theo mốc đầu khúc. */
  states: Record<number, ElectricalChunkState>
  /** Giới hạn khoảng ngày (chế độ Theo ngày); nếu có thì không lập khúc nằm hoàn toàn ngoài `bounds`. */
  bounds?: ElectricalTimeSpan | null
  /** `true` cho phép đưa lại khúc đang ở trạng thái `'error'` vào kế hoạch tải. */
  force?: boolean
}

/**
 * Lập danh sách mốc đầu khúc CẦN TẢI theo thứ tự ưu tiên:
 * 1) Các khúc phủ `view`;
 * 2) Khúc kế bên theo `direction`, rồi thêm 1 khúc nữa cùng hướng;
 * 3) Phần còn lại của `track`, ưu tiên khúc gần `view` trước.
 * Bỏ qua khúc đang `'loaded'`/`'loading'`; khúc `'error'` chỉ vào khi `force = true`.
 */
export function planElectricalChunks({
  view,
  track,
  direction,
  states,
  bounds = null,
  force = false,
}: PlanElectricalChunksOptions): number[] {
  const limit = bounds ?? track
  const result: number[] = []
  const seen = new Set<number>()

  const tryAdd = (start: number) => {
    if (seen.has(start)) return
    if (!chunkOverlapsSpan(start, limit)) return
    seen.add(start)
    const state = states[start]
    if (state === 'loaded' || state === 'loading') return
    if (state === 'error' && !force) return
    result.push(start)
  }

  // Nhóm (1): các khúc phủ khung đang xem (view)
  const viewStarts = chunkStartsCovering(view.from, view.to)
  for (const s of viewStarts) {
    tryAdd(s)
  }

  // Nhóm (2): khúc kế bên theo hướng kéo, rồi thêm 1 khúc nữa cùng hướng
  if (viewStarts.length > 0) {
    const firstView = viewStarts[0]
    const lastView = viewStarts[viewStarts.length - 1]
    if (direction === -1) {
      tryAdd(firstView - ELECTRICAL_CHUNK_MS)
      tryAdd(firstView - 2 * ELECTRICAL_CHUNK_MS)
    } else if (direction === 1) {
      tryAdd(lastView + ELECTRICAL_CHUNK_MS)
      tryAdd(lastView + 2 * ELECTRICAL_CHUNK_MS)
    } else {
      tryAdd(firstView - ELECTRICAL_CHUNK_MS)
      tryAdd(lastView + ELECTRICAL_CHUNK_MS)
      tryAdd(firstView - 2 * ELECTRICAL_CHUNK_MS)
      tryAdd(lastView + 2 * ELECTRICAL_CHUNK_MS)
    }
  }

  // Nhóm (3): phần còn lại của track (nếu track dài > 48h thì chỉ lấy quanh view ±12h), ưu tiên khúc gần tâm view hơn trước
  const viewCenter = (view.from + view.to) / 2
  const trackSpanMs = track.to - track.from
  const group3From =
    trackSpanMs > ELECTRICAL_PREFETCH_FULL_TRACK_MAX_MS
      ? Math.max(track.from, view.from - LONG_TRACK_PREFETCH_RADIUS_MS)
      : track.from
  const group3To =
    trackSpanMs > ELECTRICAL_PREFETCH_FULL_TRACK_MAX_MS
      ? Math.min(track.to, view.to + LONG_TRACK_PREFETCH_RADIUS_MS)
      : track.to
  const trackStarts = chunkStartsCovering(group3From, group3To).sort((a, b) => {
    const distA = Math.abs(a + ELECTRICAL_CHUNK_MS / 2 - viewCenter)
    const distB = Math.abs(b + ELECTRICAL_CHUNK_MS / 2 - viewCenter)
    return distA - distB || a - b
  })
  for (const s of trackStarts) {
    tryAdd(s)
  }

  return result
}

export interface ActiveElectricalChunk {
  start: number
  isView: boolean
}

export interface PickPreemptibleChunkOptions {
  /** Các khúc đang tải song song hiện tại (theo thứ tự bắt đầu sớm → muộn). */
  active: ActiveElectricalChunk[]
  /** Khung đang xem để ưu tiên hủy khúc tải trước ở xa nhất. */
  view: ElectricalTimeSpan
  /** Số khúc phủ `view` đang chờ slot. */
  needed: number
  /** Số slot tải đồng thời tối đa (mặc định 2). */
  maxConcurrent?: number
}

/**
 * Quyết định các khúc tải trước (`isView = false`) cần hủy để nhường slot cho khúc phủ `view`.
 * Không hủy khi còn slot trống; tuyệt đối không hủy khúc `isView = true`; ưu tiên hủy khúc xa `view` nhất
 * (hòa khoảng cách thì hủy khúc bắt đầu sớm nhất).
 */
export function pickPreemptibleChunk({
  active,
  view,
  needed,
  maxConcurrent = 2,
}: PickPreemptibleChunkOptions): number[] {
  if (needed <= 0 || maxConcurrent <= 0) return []
  const freeSlots = Math.max(0, maxConcurrent - active.length)
  const toCancelCount = Math.min(needed, maxConcurrent) - freeSlots
  if (toCancelCount <= 0) return []

  const viewCenter = (view.from + view.to) / 2
  const candidates = active
    .filter((item) => !item.isView)
    .sort((a, b) => {
      const distA = Math.abs(a.start + ELECTRICAL_CHUNK_MS / 2 - viewCenter)
      const distB = Math.abs(b.start + ELECTRICAL_CHUNK_MS / 2 - viewCenter)
      return distB - distA
    })

  return candidates.slice(0, toCancelCount).map((item) => item.start)
}

/** Số vạch chia tối đa trên trục Y. */
const Y_MAX_INTERVALS = 6

/**
 * Thang trục Y theo đúng các mẫu trong khung: thấp nhất/cao nhất của chỉ số, làm tròn ra vạch gần nhất
 * (bước 1, 2, 2.5, 5 × 10ⁿ, tối đa 6 khoảng). Khung không có mẫu thì trả null.
 */
export function electricalYAxisScale(
  points: ElectricalPoint[],
  metric: ElectricalMetric
): { domain: [number, number]; ticks: number[]; digits: number } | null {
  let min = Infinity
  let max = -Infinity
  for (const p of points) {
    const v = p[metric]
    if (typeof v !== 'number' || !Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null
  if (min === max) {
    // Mọi mẫu bằng nhau: nới 5% (hoặc 1 nếu bằng 0) cho đường không dính mép; không xuống dưới 0 nếu số đo không âm.
    const pad = min !== 0 ? Math.abs(min) * 0.05 : 1
    min = min >= 0 ? Math.max(0, min - pad) : min - pad
    max = max + pad
  }

  const magnitude = 10 ** Math.floor(Math.log10((max - min) / Y_MAX_INTERVALS))
  let step = magnitude
  let lo = min
  let hi = max
  for (const factor of [1, 2, 2.5, 5, 10]) {
    step = factor * magnitude
    lo = Math.floor(min / step + 1e-9) * step
    hi = Math.ceil(max / step - 1e-9) * step
    if (Math.round((hi - lo) / step) <= Y_MAX_INTERVALS) break
  }
  const digits = (String(Number(step.toPrecision(3))).split('.')[1] ?? '').length
  const count = Math.round((hi - lo) / step)
  const ticks = Array.from({ length: count + 1 }, (_, i) => Number((lo + i * step).toFixed(digits)))
  return { domain: [ticks[0], ticks[ticks.length - 1]], ticks, digits }
}

/** Độ trễ từ lúc đo tới lúc hệ thống nhận: `14 giây`, `3 phút 5 giây`, `2 giờ 10 phút`. */
export function formatReceiveDelay(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  if (total < 60) return `${total} giây`
  const minutes = Math.floor(total / 60)
  if (minutes < 60) {
    const seconds = total % 60
    return seconds === 0 ? `${minutes} phút` : `${minutes} phút ${seconds} giây`
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} giờ` : `${hours} giờ ${rest} phút`
}

export const formatMetric = (value: number | null, metric: ElectricalMetric) =>
  value !== null ? `${value.toFixed(ELECTRICAL_METRICS[metric].digits)} ${ELECTRICAL_METRICS[metric].unit}` : '—'
