import React, { useEffect, useState } from 'react'
import { AlertTriangle, LineChart as LineChartIcon, Radio } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'
import { useElectricalSeries } from '../../../hooks/iot/useElectricalSeries'
import { formatMetric } from '../../../utils/iot/electricalSeries'
import iotAPI from '../../../feature/iot/iotAPI'
import type { IotDiagnosticResult } from '../../../types/iot/nodes'
import { iotAnomalyLabel } from '../../../constants/iot'

/** Số mẫu gần nhất vẽ sparkline trong khung tủ. */
export const SPARKLINE_SAMPLES = 30

/**
 * Một dòng trong mạch của khung tủ GIS: node IoT, số điện mới nhất (W / mA / V), sparkline công suất,
 * và nút mở bảng giám sát. Mạch chưa gắn IoT và không có mẫu thì chỉ báo vậy, không hiện nút Biểu đồ.
 */
export const FeederElectricalSummary: React.FC<{
  feederId: string
  nodeId: string | null
  onOpenChart?: () => void
}> = ({ feederId, nodeId, onOpenChart }) => {
  const { points, latest, loading, error } = useElectricalSeries(feederId, {
    initial: SPARKLINE_SAMPLES,
    maxPoints: SPARKLINE_SAMPLES,
    live: Boolean(nodeId),
  })
  const [diagnostics, setDiagnostics] = useState<IotDiagnosticResult | null>(null)

  useEffect(() => {
    if (!nodeId || typeof iotAPI.getDiagnostics !== 'function') {
      setDiagnostics(null)
      return
    }
    let cancelled = false
    iotAPI
      .getDiagnostics(nodeId)
      .then((res) => {
        if (!cancelled) setDiagnostics(res)
      })
      .catch(() => {
        if (!cancelled) setDiagnostics(null)
      })
    return () => {
      cancelled = true
    }
  }, [nodeId])

  const anomalies = diagnostics?.anomalies || []

  if (!nodeId && !latest) {
    if (loading) {
      return <p className="mt-1.5 text-[10.5px] text-slate-400">Đang tải số đo…</p>
    }
    if (error) {
      return <p className="mt-1.5 text-[10.5px] text-rose-600 dark:text-rose-300 truncate" title={error}>{error}</p>
    }
    return <p className="mt-1.5 text-[10.5px] text-slate-400 dark:text-slate-500 italic">Mạch chưa gắn IoT, không có số đo điện.</p>
  }

  return (
    <div className="mt-1.5 pt-1.5 border-t border-slate-200/70 dark:border-slate-700/60 space-y-1.5" data-testid="feeder-electrical-summary">
      <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
          <Radio className="w-3 h-3 text-indigo-500 shrink-0" />
          {nodeId ? (
            <>
              <span className="font-mono truncate">{nodeId}</span>
              {latest && <span className="shrink-0">· {new Date(latest.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>}
            </>
          ) : (
            <span>Không gắn node · mẫu cuối {new Date(latest!.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>
        {error && !latest ? (
          <p className="text-[10.5px] text-rose-600 dark:text-rose-300 truncate" title={error}>{error}</p>
        ) : loading ? (
          <p className="text-[10.5px] text-slate-400">Đang tải số đo…</p>
        ) : latest ? (
          <p className="text-[11px] font-mono text-slate-800 dark:text-slate-100">
            <strong>{formatMetric(latest.power, 'power')}</strong>
            <span className="text-slate-500 dark:text-slate-400"> · {formatMetric(latest.current, 'current')} · {formatMetric(latest.voltage, 'voltage')}</span>
          </p>
        ) : (
          <p className="text-[10.5px] text-slate-400 italic">Chưa có mẫu điện.</p>
        )}
      </div>
      {points.length > 1 && (
        <div className="w-20 h-8 shrink-0" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Line type="monotone" dataKey="power" stroke="#059669" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {onOpenChart && (
        <button
          type="button"
          onClick={onOpenChart}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-bold border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 cursor-pointer"
        >
          <LineChartIcon className="w-3 h-3" /> Biểu đồ
        </button>
      )}
      </div>
      {anomalies.length > 0 && (
        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-[10.5px] text-rose-800 dark:text-rose-200 space-y-0.5">
          <div className="font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>Cảnh báo chẩn đoán ({anomalies.length})</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5">
            {anomalies.map((a, idx) => (
              <li key={`${a.code}-${idx}`} className="truncate" title={iotAnomalyLabel(a.code)}>
                {iotAnomalyLabel(a.code)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default FeederElectricalSummary
