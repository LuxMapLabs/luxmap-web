import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2, X, Zap } from 'lucide-react'
import iotAPI from '../../../../../feature/iot/iotAPI'
import type {
  IotDiagnosticResult,
  IotElectricalResult,
} from '../../../../../types/iot/nodes'
import {
  IOT_DIAGNOSTIC_STATUS,
  IOT_NODE_STATUS,
  IOT_SENSOR_HEALTH_STATUS,
  IOT_TONE_CLASS,
  iotAnomalyLabel,
  iotStatusBadge,
} from '../../../../../constants/iot'
import { apiErrorMessage } from '../../../../../utils/iot/apiError'
import type { FeederPowerState } from '../../../../../types/common/enums'

const POWER_STATE_LABEL: Record<FeederPowerState, string> = { on: 'Mạch đang có tải', off: 'Mạch đã ngắt tải', unknown: 'Chưa rõ' }

const formatTime = (value?: string | null) => {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN')
}

const num = (value?: number | null, digits = 2) => (typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—')

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <section className="space-y-2">
    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
      {icon}
      {title}
    </h4>
    {children}
  </section>
)

const ErrorLine: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">{text}</p>
)

/**
 * Chi tiết CHỈ ĐỌC của một node IoT bridge (docs LUXMAP-IOT-FE.md mục 5): mẫu điện mới nhất và chẩn đoán.
 * Lịch sử điện (biểu đồ) và lịch sử lệnh xem ở drawer bản đồ GIS, không lặp lại ở đây.
 */
export const IotNodeDetailModal: React.FC<{ nodeId: string; onClose: () => void }> = ({ nodeId, onClose }) => {
  const [electrical, setElectrical] = useState<IotElectricalResult | null>(null)
  const [electricalError, setElectricalError] = useState<string | null>(null)
  const [diagnostics, setDiagnostics] = useState<IotDiagnosticResult | null>(null)
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null)

  useEffect(() => {
    iotAPI
      .getElectrical(nodeId)
      .then(setElectrical)
      .catch((err) => setElectricalError(apiErrorMessage(err, 'Không đọc được mẫu điện.')))
    iotAPI
      .getDiagnostics(nodeId)
      .then(setDiagnostics)
      .catch((err) => setDiagnosticsError(apiErrorMessage(err, 'Không đọc được kết quả chẩn đoán.')))
  }, [nodeId])

  const badge = iotStatusBadge(IOT_NODE_STATUS, electrical?.status)
  const m = electrical?.measurement
  const anomalies = diagnostics?.anomalies || []
  const lamp = diagnostics?.lamp_count

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-label={`Chi tiết node ${nodeId}`}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Chi tiết node {nodeId}</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{electrical?.server_id || ''}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Đóng"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-700 dark:text-slate-200">
          <Section title="Mẫu điện mới nhất" icon={<Zap className="w-3.5 h-3.5 text-amber-500" />}>
            {electricalError ? (
              <ErrorLine text={electricalError} />
            ) : !electrical ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${IOT_TONE_CLASS[badge.tone]}`}>{badge.label}</span>
                  {electrical.power_state && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{POWER_STATE_LABEL[electrical.power_state] || electrical.power_state}</span>
                  )}
                </div>
                {m ? (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div><span className="block text-[10px] text-slate-400">Nhận lúc</span>{formatTime(m.received_at)}</div>
                    <div><span className="block text-[10px] text-slate-400">Lệnh đèn</span>{m.lamp_command || '—'}</div>
                    <div><span className="block text-[10px] text-slate-400">Điện áp</span>{num(m.voltage, 3)} V</div>
                    <div><span className="block text-[10px] text-slate-400">Dòng</span>{num(m.current_ma)} mA</div>
                    <div><span className="block text-[10px] text-slate-400">Công suất</span>{num(m.power_mw)} mW</div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Chưa có mẫu đo.</p>
                )}
              </div>
            )}
          </Section>

          <Section title="Chẩn đoán" icon={<AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}>
            {diagnosticsError ? (
              <ErrorLine text={diagnosticsError} />
            ) : !diagnostics ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {diagnostics.status && (() => {
                    const diagBadge = iotStatusBadge(IOT_DIAGNOSTIC_STATUS, diagnostics.status)
                    return (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${IOT_TONE_CLASS[diagBadge.tone]}`}>
                        {diagBadge.label}
                      </span>
                    )
                  })()}
                  {diagnostics.sensor_health && (() => {
                    const shBadge = iotStatusBadge(IOT_SENSOR_HEALTH_STATUS, diagnostics.sensor_health.status)
                    return (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${IOT_TONE_CLASS[shBadge.tone]}`}>
                        {shBadge.label}
                        {diagnostics.sensor_health.received_at ? ` · ${formatTime(diagnostics.sensor_health.received_at)}` : ''}
                      </span>
                    )
                  })()}
                </div>
                {anomalies.length === 0 ? (
                  <p className="text-emerald-700 dark:text-emerald-300 font-semibold">Không có cảnh báo.</p>
                ) : (
                  <ul className="space-y-1">
                    {anomalies.map((a, i) => (
                      <li key={`${a.code}-${i}`} className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200">
                        <strong>{iotAnomalyLabel(a.code)}</strong>
                        {a.observed != null && <> · đo {num(a.observed)}</>}
                        {a.reference != null && <> · danh định {num(a.reference)}</>}
                        {a.deviation_percent != null && <> · lệch {num(a.deviation_percent, 1)}%</>}
                        {a.limit != null && <> · giới hạn {num(a.limit)}</>}
                      </li>
                    ))}
                  </ul>
                )}
                {lamp && (
                  <p>
                    Ước lượng số bóng:{' '}
                    {lamp.status === 'estimated' || lamp.estimated_lit != null || lamp.estimated_missing != null ? (
                      <strong>
                        {lamp.estimated_lit ?? '-'} sáng, {lamp.estimated_missing ?? '-'} thiếu
                      </strong>
                    ) : lamp.status === 'undetermined' ? (
                      <span className="text-amber-600 dark:text-amber-300">
                        chưa xác định được nhóm hiệu chuẩn ({lamp.samples ?? 0}/{lamp.required_samples ?? '-'})
                      </span>
                    ) : (
                      <span className="text-slate-500">chưa đủ mẫu ({lamp.samples ?? 0}/{lamp.required_samples ?? '-'})</span>
                    )}
                  </p>
                )}
              </div>
            )}
          </Section>

        </div>
      </div>
    </div>,
    document.body
  )
}

export default IotNodeDetailModal
