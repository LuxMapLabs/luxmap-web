import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '../../../../../redux/store'
import { createPortal } from 'react-dom'
import { Activity, AlertTriangle, Cable, Cpu, Gauge, Loader2, X, Zap } from 'lucide-react'
import {
  clearNodeSource,
  fetchDiagnosticsRequest,
  fetchNodeElectricalRequest,
  fetchNodeSourceRequest,
  selectNodeDiagnostics,
  selectNodeElectrical,
  selectNodeSource,
  type IotMonitorState,
} from '../../../../../feature/iot/iotMonitorSlice'
import {
  IOT_DIAGNOSTIC_STATUS,
  IOT_NODE_STATUS,
  IOT_SENSOR_HEALTH_STATUS,
  IOT_TONE_CLASS,
  iotAnomalyLabel,
  iotStatusBadge,
  type IotStatusBadge,
} from '../../../../../constants/iot'
import type { FeederPowerState } from '../../../../../types/common/enums'
import type { IotNodeStatus } from '../../../../../types/iot/nodes'
import {
  FeederHistoryModal,
  type FeederHistoryTab,
} from '../../../../../components/FeederHistoryModal'

export type NodeDetailTab = 'overview'

const POWER_STATE_LABEL: Record<FeederPowerState, string> = {
  on: 'Mạch đang có tải',
  off: 'Mạch đã ngắt tải',
  unknown: 'Chưa rõ',
}

const ELECTRICAL_FRESHNESS_STATUS: Record<string, IotStatusBadge> = {
  fresh: { label: 'Số đo mới', tone: 'ok' },
  stale: { label: 'Số đo đã cũ', tone: 'warn' },
  no_data: { label: 'Chưa có số đo', tone: 'muted' },
  unconfigured: { label: 'Chưa gán nguồn đo', tone: 'muted' },
  source_unavailable: { label: 'Không đọc được nguồn', tone: 'warn' },
  repairing: { label: 'Đang sửa · tạm ngưng đọc', tone: 'muted' },
}

const formatTime = (value?: string | null) => {
  if (!value) return '-'
  const d = new Date(value)
  return isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN')
}

const num = (value?: number | null, digits = 2) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '-'

const formatNominal = (value: number | null | undefined, unit: string): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return `${Number(value.toFixed(2))} ${unit}`
}

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({
  title,
  icon,
  children,
}) => (
  <section className="space-y-2">
    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
      {icon}
      {title}
    </h4>
    {children}
  </section>
)

/**
 * Chi tiết CHỈ ĐỌC của một node IoT bridge:
 * Tổng quan (thông tin node, số đo mới nhất, trung bình 2 mẫu, chẩn đoán).
 * Lịch sử thông số, sự cố và lệnh của mạch được mở qua FeederHistoryModal.
 */
export const IotNodeDetailModal: React.FC<{
  nodeId: string
  onClose: () => void
  initialTab?: NodeDetailTab
  /** Admin: cho chọn xem lịch sử điện theo giờ Bridge nhận. */
  allowReceivedTime?: boolean
  feederId?: string | null
  feederLabel?: string | null
  node?: IotNodeStatus | null
  cabinet?: { name?: string | null; code?: string | null } | null
}> = ({
  nodeId,
  onClose,
  allowReceivedTime = false,
  feederId: feederIdProp = null,
  feederLabel = null,
  node = null,
  cabinet = null,
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const [feederHistory, setFeederHistory] = useState<FeederHistoryTab | null>(null)

  const elEntry = useSelector((s: { iotMonitor: IotMonitorState }) => selectNodeElectrical(s, nodeId))
  const diagEntry = useSelector((s: { iotMonitor: IotMonitorState }) => selectNodeDiagnostics(s, nodeId))
  const sourceEntry = useSelector((s: { iotMonitor: IotMonitorState }) => selectNodeSource(s, nodeId))

  const electrical = elEntry?.data ?? null
  const electricalError = elEntry?.error ?? null
  const diagnosticsLoading = !diagEntry || diagEntry.loading
  const diagnostics = diagEntry && !diagEntry.loading ? diagEntry.data : null
  const diagnosticsError = diagEntry?.error ?? null
  const sourceLoading = !sourceEntry || sourceEntry.loading
  const sourceData = sourceEntry && !sourceEntry.loading ? sourceEntry.data : null
  const sourceError = sourceEntry?.error ?? null

  useEffect(() => {
    dispatch(fetchNodeElectricalRequest(nodeId))
    dispatch(fetchDiagnosticsRequest(nodeId))
    dispatch(fetchNodeSourceRequest(nodeId))
    return () => {
      dispatch(clearNodeSource(nodeId))
    }
  }, [nodeId, dispatch])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !feederHistory) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, feederHistory])

  const feederId = diagnostics?.feeder_id ?? feederIdProp ?? null
  const connectionBadge = iotStatusBadge(
    IOT_NODE_STATUS,
    diagnostics?.connection_status ?? electrical?.status ?? node?.status
  )
  const electricalStatusKey =
    diagnostics?.electrical_status ?? electrical?.electrical_status ?? node?.electrical_status
  const freshnessBadge = electricalStatusKey
    ? ELECTRICAL_FRESHNESS_STATUS[electricalStatusKey] ?? null
    : null
  const anomalies = diagnostics?.anomalies || []
  const m = electrical?.measurement
  const win = diagnostics?.electrical_window ?? null
  const bothErrored = Boolean(electricalError && diagnosticsError)

  const cabinetPrimary = cabinet?.name || cabinet?.code || node?.cabinet_id || null
  const cabinetCode = cabinet?.code || node?.cabinet_id || null
  const displayFeeder = feederLabel || feederId
  const lastReceivedAt = node?.last_received_at ?? m?.received_at ?? null

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết node ${nodeId}`}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl h-[min(46rem,90vh)] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 p-4 px-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Chi tiết node {nodeId}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${IOT_TONE_CLASS[connectionBadge.tone]}`}
              >
                {connectionBadge.label}
              </span>
              {freshnessBadge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${IOT_TONE_CLASS[freshnessBadge.tone]}`}
                >
                  {freshnessBadge.label}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Mạch <span className="font-mono">{displayFeeder || '-'}</span> · Server{' '}
              <span className="font-mono">{electrical?.server_id || node?.server_id || '-'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Đóng"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 p-6 space-y-5 overflow-y-auto text-xs text-slate-700 dark:text-slate-200">
            <Section title="Thông tin node" icon={<Cpu className="w-3.5 h-3.5 text-purple-600" />}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="block text-[10px] text-slate-400">Tủ điện cấp nguồn</span>
                  {cabinetPrimary ? (
                    <>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {cabinetPrimary}
                      </span>
                      {cabinetCode && (
                        <span className="block font-mono text-[10px] text-slate-400">
                          {cabinetCode}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400 italic">Chưa gán tủ</span>
                  )}
                </div>

                <div>
                  <span className="block text-[10px] text-slate-400">Mạch (rơ-le #1)</span>
                  {displayFeeder ? (
                    <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                      <Cable className="w-2.5 h-2.5" />
                      {displayFeeder}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Chưa đấu nối</span>
                  )}
                </div>

                <div>
                  <span className="block text-[10px] text-slate-400">Server IoT</span>
                  <span className="font-mono">
                    {node?.server_id || electrical?.server_id || '-'}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] text-slate-400">Trạng thái bridge</span>
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${IOT_TONE_CLASS[connectionBadge.tone]}`}
                  >
                    {connectionBadge.label}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] text-slate-400">Nhận gần nhất</span>
                  {lastReceivedAt ? (
                    <span>{formatTime(lastReceivedAt)}</span>
                  ) : (
                    <span className="text-slate-400 italic">Chưa có mẫu đo</span>
                  )}
                </div>

                <div>
                  <span className="block text-[10px] text-slate-400">Thấy node lần cuối</span>
                  <span>
                    {formatTime(
                      diagnostics?.last_seen_at ?? electrical?.last_seen_at ?? node?.last_seen_at
                    )}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] text-slate-400">
                    Node xác nhận lệnh gần nhất
                  </span>
                  <span>
                    {formatTime(
                      diagnostics?.last_command_ack_at ??
                        electrical?.last_command_ack_at ??
                        node?.last_command_ack_at
                    )}
                  </span>
                </div>
              </div>
            </Section>

            <Section title="Hiệu chuẩn" icon={<Gauge className="w-3.5 h-3.5 text-teal-600" />}>
              {sourceLoading ? (
                <p className="text-[11px] text-slate-400">Đang tải…</p>
              ) : sourceError || !sourceData ? (
                <p className="text-[11px] text-slate-400 italic">
                  Chưa có thông số danh định (node chưa gán nguồn đo).
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="block text-[10px] text-slate-400">Điện áp danh định</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {formatNominal(sourceData.nominal_voltage, 'V')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Dòng danh định</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {formatNominal(sourceData.nominal_current_ma, 'mA')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Công suất danh định</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {formatNominal(sourceData.nominal_power_mw, 'mW')}
                    </span>
                  </div>
                </div>
              )}
            </Section>

            {!electrical && !electricalError ? (
              <Section title="Số đo mới nhất" icon={<Zap className="w-3.5 h-3.5 text-amber-500" />}>
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </Section>
            ) : m ? (
              <Section title="Số đo mới nhất" icon={<Zap className="w-3.5 h-3.5 text-amber-500" />}>
                <div className="space-y-2">
                  {electrical?.power_state && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {POWER_STATE_LABEL[electrical.power_state] || electrical.power_state}
                    </span>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div>
                      <span className="block text-[10px] text-slate-400">Nhận lúc</span>
                      {formatTime(m.received_at)}
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Lệnh đèn</span>
                      {m.lamp_command || '-'}
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Điện áp</span>
                      {num(m.voltage, 3)} V
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Dòng</span>
                      {num(m.current_ma)} mA
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Công suất</span>
                      {num(m.power_mw)} mW
                    </div>
                  </div>
                </div>
              </Section>
            ) : null}

            {win && (
              <Section
                title="Trung bình 2 mẫu gần nhất"
                icon={<Activity className="w-3.5 h-3.5 text-indigo-500" />}
              >
                {win.status === 'insufficient_samples' ? (
                  <p className="text-amber-600 dark:text-amber-400 font-medium">
                    Chưa đủ mẫu để đánh giá ({win.samples ?? 0}/{win.required_samples ?? 2}).
                  </p>
                ) : win.status === 'evaluated' ? (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="block text-[10px] text-slate-400">Điện áp TB</span>
                        {num(win.voltage_avg, 3)} V
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400">Dòng TB</span>
                        {num(win.current_ma_avg, 2)} mA
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400">Công suất TB</span>
                        {num(win.power_mw_avg, 2)} mW
                      </div>
                    </div>
                    {win.current_evaluation_available === false && (
                      <p className="text-amber-600 dark:text-amber-400 font-medium">
                        Điện áp ngoài dung sai nên chưa xét dòng điện.
                      </p>
                    )}
                  </div>
                ) : null}
              </Section>
            )}

            <Section
              title="Chẩn đoán"
              icon={<AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
            >
              {bothErrored || (!diagnostics && diagnosticsError) ? (
                <p
                  role="alert"
                  className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 font-medium"
                >
                  Chưa đọc được số đo: {diagnosticsError || electricalError}
                </p>
              ) : diagnosticsLoading || !diagnostics ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {diagnostics.status &&
                      (() => {
                        const diagBadge = iotStatusBadge(IOT_DIAGNOSTIC_STATUS, diagnostics.status)
                        return (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${IOT_TONE_CLASS[diagBadge.tone]}`}
                          >
                            {diagBadge.label}
                          </span>
                        )
                      })()}
                    {diagnostics.sensor_health &&
                      (() => {
                        const shBadge = iotStatusBadge(
                          IOT_SENSOR_HEALTH_STATUS,
                          diagnostics.sensor_health.status
                        )
                        return (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${IOT_TONE_CLASS[shBadge.tone]}`}
                          >
                            {shBadge.label}
                            {diagnostics.sensor_health.received_at
                              ? ` · ${formatTime(diagnostics.sensor_health.received_at)}`
                              : ''}
                          </span>
                        )
                      })()}
                  </div>
                  {anomalies.length === 0 ? (
                    <p className="text-emerald-700 dark:text-emerald-300 font-semibold">
                      Không có cảnh báo.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {anomalies.map((a, i) => (
                        <li
                          key={`${a.code}-${i}`}
                          className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200"
                        >
                          <strong>{iotAnomalyLabel(a.code)}</strong>
                          {a.observed != null && <> · đo {num(a.observed)}</>}
                          {a.reference != null && <> · danh định {num(a.reference)}</>}
                          {a.deviation_percent != null && <> · lệch {num(a.deviation_percent, 1)}%</>}
                          {a.limit != null && <> · giới hạn {num(a.limit)}</>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {feederId && (
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      <button
                        type="button"
                        onClick={() => setFeederHistory('electrical')}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Lịch sử thông số của mạch →
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeederHistory('faults')}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Lịch sử sự cố của mạch →
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeederHistory('commands')}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Lịch sử lệnh của mạch →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Section>
        </div>
      </div>
      {feederHistory && feederId && (
        <FeederHistoryModal
          feederId={feederId}
          feederLabel={feederLabel ?? feederId}
          nodeId={nodeId}
          initialTab={feederHistory}
          allowReceivedTime={allowReceivedTime}
          onClose={() => setFeederHistory(null)}
        />
      )}
    </div>,
    document.body
  )
}

export default IotNodeDetailModal
