import React, { useMemo, useState } from 'react'
import { Activity, Loader2, X } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useElectricalSeries, ELECTRICAL_POLL_MS } from '../../../hooks/iot/useElectricalSeries'
import {
  ELECTRICAL_METRICS,
  ELECTRICAL_METRIC_KEYS,
  formatMetric,
  type ElectricalMetric,
} from '../../../utils/iot/electricalSeries'

/** Lần tải đầu của biểu đồ: số mẫu mới nhất (tối đa `page_size` của API). */
export const INITIAL_SAMPLES = 200
const MAX_POINTS = 500

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

/** Biểu đồ điện của một node: số mới nhất + đường theo thời gian, đổi chỉ số W / mA / V. */
const ElectricalChartPane: React.FC<{ nodeId: string }> = ({ nodeId }) => {
  const { points, latest, loading, error } = useElectricalSeries(nodeId, { initial: INITIAL_SAMPLES, maxPoints: MAX_POINTS })
  const [metric, setMetric] = useState<ElectricalMetric>('power')
  const m = ELECTRICAL_METRICS[metric]
  const hasValues = useMemo(() => points.some((p) => p[metric] !== null), [points, metric])

  return (
    <div className="flex-1 min-h-0 flex gap-3">
      <div className="w-44 shrink-0 space-y-1.5" data-testid="iot-latest-sample">
        {ELECTRICAL_METRIC_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={metric === key}
            onClick={() => setMetric(key)}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg border cursor-pointer ${
              metric === key
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <span className="block text-[10px] opacity-75">{ELECTRICAL_METRICS[key].label}</span>
            <strong className="font-mono text-[13px]">{formatMetric(latest ? latest[key] : null, key)}</strong>
          </button>
        ))}
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
          {latest ? <>Mẫu gần nhất: {fullTime(latest.time)}</> : 'Chưa có mẫu.'}
          <br />
          {points.length} mẫu · cập nhật mỗi {ELECTRICAL_POLL_MS / 1000} giây
        </p>
      </div>

      <div className="flex-1 min-w-0 rounded-xl border border-slate-100 dark:border-slate-800 p-1.5 flex flex-col">
        {error && <p className="px-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300">{error}</p>}
        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : !hasValues ? (
            <div className="h-full flex items-center justify-center text-slate-400 italic text-xs">Chưa có mẫu điện nào.</div>
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
                  width={52}
                  label={{ value: m.unit, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip
                  labelFormatter={(t) => fullTime(Number(t))}
                  formatter={(value) => [`${Number(value).toFixed(m.digits)} ${m.unit}`, m.label]}
                />
                <Line type="monotone" dataKey={metric} stroke={m.color} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
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
      className="absolute left-3 right-14 bottom-8 z-30 h-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col p-3 gap-2 text-xs"
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
