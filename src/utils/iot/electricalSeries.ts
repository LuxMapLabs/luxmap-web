import type { IotFeederArchivedSample } from '../../types/iot/feeders'

export type ElectricalMetric = 'power' | 'current' | 'voltage'

/** Thứ tự hiển thị: công suất trước vì bóng tắt làm công suất cả mạch tụt rõ nhất. */
export const ELECTRICAL_METRICS: Record<ElectricalMetric, { label: string; unit: string; color: string; digits: number }> = {
  power: { label: 'Công suất', unit: 'mW', color: '#059669', digits: 1 },
  current: { label: 'Dòng', unit: 'mA', color: '#2563eb', digits: 1 },
  voltage: { label: 'Điện áp', unit: 'V', color: '#d97706', digits: 3 },
}

export const ELECTRICAL_METRIC_KEYS = Object.keys(ELECTRICAL_METRICS) as ElectricalMetric[]

export type ElectricalRange = '1h' | '6h' | '24h'
export const ELECTRICAL_RANGES: Record<ElectricalRange, { label: string; windowMs: number; bucketMs: number; hint: string }> = {
  '1h':  { label: '1 giờ',  windowMs: 3_600_000,      bucketMs: 0,       hint: 'Từng mẫu (10 giây / mẫu)' },
  '6h':  { label: '6 giờ',  windowMs: 6 * 3_600_000,  bucketMs: 60_000,  hint: 'Trung bình mỗi phút' },
  '24h': { label: '24 giờ', windowMs: 24 * 3_600_000, bucketMs: 300_000, hint: 'Trung bình mỗi 5 phút' },
}
export const ELECTRICAL_RANGE_KEYS = Object.keys(ELECTRICAL_RANGES) as ElectricalRange[]
/** Cửa sổ lớn nhất cần tải (24 giờ). */
export const ELECTRICAL_HISTORY_MS = ELECTRICAL_RANGES['24h'].windowMs

export interface ElectricalPoint {
  key: string
  cursor: number
  time: number
  current: number | null
  voltage: number | null
  power: number | null
  lamp: string | null
  node: string | null
}

const finite = (v?: number | null) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export function toElectricalPoint(sample: IotFeederArchivedSample): ElectricalPoint | null {
  const time = sample.reading?.received_at ? Date.parse(sample.reading.received_at) : NaN
  if (typeof sample.cursor !== 'number' || !Number.isFinite(time)) return null
  const d = sample.reading?.data
  return {
    key: `${sample.server_id ?? ''}:${sample.cursor}`,
    cursor: sample.cursor,
    time,
    current: finite(d?.current),
    voltage: finite(d?.voltage),
    power: finite(d?.power),
    lamp: d?.lamp_command ?? null,
    node: sample.node_id ?? null,
  }
}

/** Gộp mẫu mới vào chuỗi theo key (không trùng), sắp theo thời gian nhận, giữ `maxPoints` điểm mới nhất. */
export function mergeElectricalPoints(prev: ElectricalPoint[], samples: IotFeederArchivedSample[], maxPoints: number): ElectricalPoint[] {
  const byKey = new Map(prev.map((p) => [p.key, p]))
  for (const s of samples) {
    const p = toElectricalPoint(s)
    if (p) byKey.set(p.key, p)
  }
  return [...byKey.values()].sort((a, b) => a.time - b.time || a.cursor - b.cursor).slice(-maxPoints)
}

/** Một điểm sau khi gộp: `count` = số mẫu thô trong khoảng. */
export interface ElectricalBucketPoint extends ElectricalPoint {
  count: number
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

/**
 * Gộp mẫu thô thành trung bình theo khoảng `bucketMs` (phút / giờ), mốc là đầu khoảng.
 * Giá trị null không tính vào trung bình; khoảng toàn null thì null. `bucketMs <= 0` trả nguyên mẫu (count = 1).
 */
export function bucketElectricalPoints(points: ElectricalPoint[], bucketMs: number): ElectricalBucketPoint[] {
  if (bucketMs <= 0) {
    return points.map((p) => ({
      ...p,
      count: 1,
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
        count: group.length,
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

export const formatMetric = (value: number | null, metric: ElectricalMetric) =>
  value !== null ? `${value.toFixed(ELECTRICAL_METRICS[metric].digits)} ${ELECTRICAL_METRICS[metric].unit}` : '—'
