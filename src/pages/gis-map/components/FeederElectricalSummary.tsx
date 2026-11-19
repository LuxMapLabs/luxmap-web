import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '../../../redux/store'
import { AlertTriangle, Radio } from 'lucide-react'
import { useElectricalSeries } from '../../../hooks/iot/useElectricalSeries'
import { formatMetric } from '../../../utils/iot/electricalSeries'
import {
  fetchDiagnosticsRequest,
  selectNodeDiagnostics,
  type IotMonitorState,
} from '../../../feature/iot/iotMonitorSlice'
import { iotAnomalyLabel } from '../../../constants/iot'

/** Số mẫu gần nhất tải để lấy số đo mới nhất. */
export const SPARKLINE_SAMPLES = 30

/**
 * Khối tóm tắt số đo điện của mạch trong drawer GIS: node IoT, số điện mới nhất (W / mA / V)
 * và cảnh báo chẩn đoán (chỉ hiển thị số đo/trạng thái).
 */
export const FeederElectricalSummary: React.FC<{
  feederId: string
  nodeId: string | null
}> = ({ feederId, nodeId }) => {
  const { latest, loading, error } = useElectricalSeries(feederId, {
    initial: SPARKLINE_SAMPLES,
    maxPoints: SPARKLINE_SAMPLES,
    live: Boolean(nodeId),
  })
  const dispatch = useDispatch<AppDispatch>()
  const entry = useSelector((s: { iotMonitor: IotMonitorState }) => selectNodeDiagnostics(s, nodeId))
  const diagnostics = entry && !entry.loading ? entry.data : null

  useEffect(() => {
    if (!nodeId) return
    dispatch(fetchDiagnosticsRequest(nodeId))
  }, [nodeId, dispatch])

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
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
          <Radio className="w-3 h-3 text-indigo-500 shrink-0" />
          {nodeId ? (
            <>
              <span className="font-mono whitespace-nowrap shrink-0">{nodeId}</span>
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
