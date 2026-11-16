import type { IotArchivedSample } from '../../types/iot/nodes'

export type ElectricalMetric = 'power' | 'current' | 'voltage'

/** Thứ tự hiển thị: công suất trước vì bóng tắt làm công suất cả mạch tụt rõ nhất. */
export const ELECTRICAL_METRICS: Record<ElectricalMetric, { label: string; unit: string; color: string; digits: number }> = {
  power: { label: 'Công suất', unit: 'mW', color: '#059669', digits: 1 },
  current: { label: 'Dòng', unit: 'mA', color: '#2563eb', digits: 1 },
  voltage: { label: 'Điện áp', unit: 'V', color: '#d97706', digits: 3 },
}

export const ELECTRICAL_METRIC_KEYS = Object.keys(ELECTRICAL_METRICS) as ElectricalMetric[]

export interface ElectricalPoint {
  cursor: number
  time: number
  current: number | null
  voltage: number | null
  power: number | null
  lamp: string | null
}

const finite = (v?: number | null) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export function toElectricalPoint(sample: IotArchivedSample): ElectricalPoint | null {
  const time = sample.reading?.received_at ? Date.parse(sample.reading.received_at) : NaN
  if (typeof sample.cursor !== 'number' || !Number.isFinite(time)) return null
  const d = sample.reading?.data
  return {
    cursor: sample.cursor,
    time,
    current: finite(d?.current),
    voltage: finite(d?.voltage),
    power: finite(d?.power),
    lamp: d?.lamp_command ?? null,
  }
}

/** Gộp mẫu mới vào chuỗi theo cursor (không trùng), sắp theo thời gian nhận, giữ `maxPoints` điểm mới nhất. */
export function mergeElectricalPoints(prev: ElectricalPoint[], samples: IotArchivedSample[], maxPoints: number): ElectricalPoint[] {
  const byCursor = new Map(prev.map((p) => [p.cursor, p]))
  for (const s of samples) {
    const p = toElectricalPoint(s)
    if (p) byCursor.set(p.cursor, p)
  }
  return [...byCursor.values()].sort((a, b) => a.time - b.time || a.cursor - b.cursor).slice(-maxPoints)
}

export const formatMetric = (value: number | null, metric: ElectricalMetric) =>
  value !== null ? `${value.toFixed(ELECTRICAL_METRICS[metric].digits)} ${ELECTRICAL_METRICS[metric].unit}` : '—'
