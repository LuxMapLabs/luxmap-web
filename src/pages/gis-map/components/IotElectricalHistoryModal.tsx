import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Activity, Loader2, X } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import iotAPI from '../../../feature/iot/iotAPI'
import type { IotArchivedSample } from '../../../types/iot/nodes'
import { apiErrorMessage } from '../../../utils/iot/apiError'

/** Lần tải đầu: số mẫu mới nhất (tối đa `page_size` của API). */
export const INITIAL_SAMPLES = 200
/** Chu kỳ lấy mẫu mới bằng `after = cursor lớn nhất` (spec mục 5). */
export const POLL_MS = 15_000
/** Giữ tối đa chừng này điểm trên biểu đồ; mẫu cũ hơn bị bỏ khỏi khung nhìn. */
const MAX_POINTS = 500

type Metric = 'current' | 'voltage' | 'power'

const METRICS: Record<Metric, { label: string; unit: string; color: string; digits: number }> = {
  current: { label: 'Dòng', unit: 'mA', color: '#2563eb', digits: 1 },
  voltage: { label: 'Điện áp', unit: 'V', color: '#d97706', digits: 3 },
  power: { label: 'Công suất', unit: 'mW', color: '#059669', digits: 1 },
}

interface Point {
  cursor: number
  time: number
  current: number | null
  voltage: number | null
  power: number | null
  lamp: string | null
}

const finite = (v?: number | null) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function toPoint(sample: IotArchivedSample): Point | null {
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

/** Gộp mẫu mới vào chuỗi theo cursor (không trùng), sắp theo thời gian nhận, cắt còn `MAX_POINTS` điểm mới nhất. */
function merge(prev: Point[], samples: IotArchivedSample[]): Point[] {
  const byCursor = new Map(prev.map((p) => [p.cursor, p]))
  for (const s of samples) {
    const p = toPoint(s)
    if (p) byCursor.set(p.cursor, p)
  }
  return [...byCursor.values()].sort((a, b) => a.time - b.time || a.cursor - b.cursor).slice(-MAX_POINTS)
}

const clock = (t: number) => new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const fullTime = (t: number) => new Date(t).toLocaleString('vi-VN')

/**
 * Lịch sử điện của node IoT bridge dạng biểu đồ đường (Quản lý xem từ drawer bản đồ GIS).
 * Tải `INITIAL_SAMPLES` mẫu mới nhất, rồi cứ `POLL_MS` lấy mẫu mới bằng `after` = cursor lớn nhất đang có.
 */
export const IotElectricalHistoryModal: React.FC<{ nodeId: string; feederId?: string | null; onClose: () => void }> = ({
  nodeId,
  feederId,
  onClose,
}) => {
  const [points, setPoints] = useState<Point[]>([])
  const [metric, setMetric] = useState<Metric>('current')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const maxCursor = useRef(0)

  const absorb = useCallback((samples: IotArchivedSample[]) => {
    for (const s of samples) if (typeof s.cursor === 'number' && s.cursor > maxCursor.current) maxCursor.current = s.cursor
    setPoints((prev) => merge(prev, samples))
  }, [])

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    maxCursor.current = 0
    setPoints([])
    setLoading(true)
    setError(null)

    const poll = async () => {
      try {
        const page = await iotAPI.getElectricalHistory(nodeId, maxCursor.current, 100)
        if (cancelled) return
        absorb(page.items || [])
        setError(null)
      } catch (err) {
        if (!cancelled) setError(apiErrorMessage(err, 'Không lấy được mẫu điện mới.'))
      }
    }

    iotAPI
      .getElectricalHistoryPage(nodeId, { page: 1, page_size: INITIAL_SAMPLES })
      .then((result) => {
        if (cancelled) return
        absorb(result.items || [])
        timer = window.setInterval(poll, POLL_MS)
      })
      .catch((err) => !cancelled && setError(apiErrorMessage(err, 'Không đọc được lịch sử điện.')))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
    }
  }, [nodeId, absorb])

  const m = METRICS[metric]
  const latest = points[points.length - 1]
  const hasValues = useMemo(() => points.some((p) => p[metric] !== null), [points, metric])

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-label={`Lịch sử điện ${nodeId}`}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Lịch sử điện</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Node <span className="font-mono">{nodeId}</span>
                {feederId && (
                  <>
                    {' '}· mạch <span className="font-mono">{feederId}</span>
                  </>
                )}{' '}
                · tự cập nhật mỗi {POLL_MS / 1000} giây
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto text-xs">
          {latest && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="iot-latest-sample">
              {(Object.keys(METRICS) as Metric[]).map((key) => (
                <div key={key} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="block text-[10.5px] text-slate-500 dark:text-slate-400">{METRICS[key].label}</span>
                  <strong className="font-mono text-sm text-slate-900 dark:text-white">
                    {latest[key] !== null ? latest[key]!.toFixed(METRICS[key].digits) : '—'} {METRICS[key].unit}
                  </strong>
                </div>
              ))}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="block text-[10.5px] text-slate-500 dark:text-slate-400">Mẫu gần nhất</span>
                <strong className="text-slate-900 dark:text-white">{fullTime(latest.time)}</strong>
                {latest.lamp && <span className="block text-[10.5px] text-slate-500">Lệnh đèn: {latest.lamp}</span>}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5" role="group" aria-label="Chỉ số">
            {(Object.keys(METRICS) as Metric[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={metric === key}
                onClick={() => setMetric(key)}
                className={`px-3 py-1.5 rounded-lg font-semibold border cursor-pointer ${
                  metric === key
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {METRICS[key].label} ({METRICS[key].unit})
              </button>
            ))}
            <span className="ml-auto text-slate-400">{points.length} mẫu</span>
          </div>

          {error && <p className="font-semibold text-rose-700 dark:text-rose-300">{error}</p>}

          <div className="h-72 rounded-2xl border border-slate-100 dark:border-slate-800 p-2">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : !hasValues ? (
              <div className="h-full flex items-center justify-center text-slate-400 italic">Chưa có mẫu điện nào.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={48}
                    label={{ value: m.unit, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip
                    labelFormatter={(t) => fullTime(Number(t))}
                    formatter={(value) => [`${Number(value).toFixed(m.digits)} ${m.unit}`, m.label]}
                  />
                  <Line
                    type="monotone"
                    dataKey={metric}
                    stroke={m.color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default IotElectricalHistoryModal
