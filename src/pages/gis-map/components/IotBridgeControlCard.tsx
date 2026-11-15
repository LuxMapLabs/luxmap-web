import React, { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Power, PowerOff, Sun, Clock, Loader2, Radio } from 'lucide-react'
import type { RootState } from '../../../redux/store'
import iotAPI from '../../../feature/iot/iotAPI'
import type { IotPoleControl } from '../../../types/iot/poles'
import type { IotCommandStatus } from '../../../types/iot/nodes'
import { isManager } from '../../../utils/roleUtils'
import {
  commandBody,
  commandProgress,
  currentChoice,
  isClock,
  type IotCommandChoice,
  type IotCommandProgress,
} from '../../../utils/iot/iotCommand'
import { apiErrorMessage } from '../../../utils/iot/apiError'

const POLL_MS = 3_000

const CHOICE_LABEL: Record<IotCommandChoice, string> = { on: 'Bật', off: 'Tắt', auto: 'AUTO' }

const PROGRESS_TEXT: Record<IotCommandProgress, { text: string; className: string }> = {
  pending: { text: 'Đang chờ node xác nhận…', className: 'text-amber-700 dark:text-amber-300' },
  acknowledged: { text: 'Node đã xác nhận lệnh.', className: 'text-emerald-700 dark:text-emerald-300' },
  superseded: { text: 'Lệnh mới hơn đã thay lệnh đang theo dõi.', className: 'text-slate-600 dark:text-slate-300' },
  expired: { text: 'Hết hạn chờ xác nhận (5 phút).', className: 'text-rose-700 dark:text-rose-300' },
}

/**
 * Điều khiển mạch của trụ qua IoT bridge (docs/LUXMAP-IOT-FE.md mục 3–4). Chỉ hiện khi trụ thuộc mạch có node IoT.
 * Nút chỉ dành cho Quản lý (`ControlLighting`) và chỉ khi backend báo `can_control_feeder` qua kênh `iot_bridge`.
 * Lệnh tác động lên CẢ mạch, không riêng trụ đang chọn.
 */
export const IotBridgeControlCard: React.FC<{ poleId: string }> = ({ poleId }) => {
  const role = useSelector((state: RootState) => state.auth.user?.role)
  const [control, setControl] = useState<IotPoleControl | null>(null)
  const [current, setCurrent] = useState<IotCommandStatus | null>(null)
  const [tracked, setTracked] = useState<IotCommandStatus | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [dayStart, setDayStart] = useState('')
  const [nightStart, setNightStart] = useState('')

  const nodeId = control?.node_id || null
  const viaBridge = Boolean(control?.can_control_feeder && control.control_channel === 'iot_bridge')

  const refreshCommand = useCallback(async (id: string) => {
    try {
      const status = await iotAPI.getCommand(id)
      setCurrent(status)
      setNow(Date.now())
    } catch {
      // 503 khi bridge chưa có trạng thái lệnh: giữ giá trị cũ, không chặn nút.
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setControl(null)
    setCurrent(null)
    setTracked(null)
    setError(null)
    setScheduleOpen(false)
    iotAPI
      .getPoleControl(poleId)
      .then((result) => !cancelled && setControl(result))
      .catch(() => !cancelled && setControl(null))
    return () => {
      cancelled = true
    }
  }, [poleId])

  useEffect(() => {
    if (nodeId && viaBridge) refreshCommand(nodeId)
  }, [nodeId, viaBridge, refreshCommand])

  const progress = tracked ? commandProgress(tracked, current, now) : null

  // Theo dõi ACK: đọc lại GET command tới khi xác nhận, bị thay, hoặc hết hạn.
  useEffect(() => {
    if (!nodeId || progress !== 'pending') return
    const timer = window.setInterval(() => refreshCommand(nodeId), POLL_MS)
    return () => window.clearInterval(timer)
  }, [nodeId, progress, refreshCommand])

  if (!control?.node_id) return null

  const feederLabel = control.feeder_id || 'mạch'
  const canPress = isManager(role) && viaBridge
  const active = currentChoice(current)

  const send = async (choice: IotCommandChoice, withSchedule = false) => {
    if (!nodeId) return
    setError(null)
    if (withSchedule && (!isClock(dayStart) || !isClock(nightStart) || dayStart === nightStart)) {
      setError('Lịch AUTO cần hai giờ khác nhau theo định dạng HH:mm.')
      return
    }
    setSending(true)
    try {
      const body = withSchedule
        ? { ...commandBody('auto'), auto_schedule: { day_start: dayStart, night_start: nightStart } }
        : commandBody(choice)
      const accepted = await iotAPI.sendCommand(nodeId, body)
      setTracked(accepted)
      setCurrent(accepted)
      setNow(Date.now())
      if (withSchedule) setScheduleOpen(false)
    } catch (err) {
      setError(apiErrorMessage(err, 'Không gửi được lệnh tới IoT bridge.'))
    } finally {
      setSending(false)
    }
  }

  const openSchedule = () => {
    setDayStart(current?.auto_schedule?.day_start || '')
    setNightStart(current?.auto_schedule?.night_start || '')
    setScheduleOpen((open) => !open)
  }

  const buttonClass = (choice: IotCommandChoice) =>
    `flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold border transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
      active === choice
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
    }`

  return (
    <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-200/70 dark:border-indigo-800/50 space-y-2 text-xs">
      <div className="flex items-center justify-between border-b border-indigo-200/50 dark:border-indigo-800/40 pb-1.5">
        <span className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5" />
          <span>Điều khiển mạch {feederLabel} qua IoT</span>
        </span>
        <span className="font-mono text-[10.5px] text-indigo-700 dark:text-indigo-300">{control.node_id}</span>
      </div>

      {!viaBridge ? (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Mạch {feederLabel} chưa điều khiển được qua IoT bridge (node chưa gán nguồn đo hoặc tắt điều khiển từ xa).
        </p>
      ) : (
        <>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            Lệnh hiện tại:{' '}
            <strong className="text-slate-900 dark:text-white">{active ? CHOICE_LABEL[active] : '—'}</strong>
            {active === 'auto' && current?.auto_schedule?.day_start && current.auto_schedule.night_start && (
              <span className="text-slate-500 dark:text-slate-400">
                {' '}(ban ngày từ {current.auto_schedule.day_start}, luôn bật từ {current.auto_schedule.night_start})
              </span>
            )}
          </p>

          {canPress && (
            <>
              <div className="flex gap-1.5">
                <button type="button" disabled={sending} onClick={() => send('on')} className={buttonClass('on')}>
                  <Power className="w-3.5 h-3.5" /> Bật mạch
                </button>
                <button type="button" disabled={sending} onClick={() => send('off')} className={buttonClass('off')}>
                  <PowerOff className="w-3.5 h-3.5" /> Tắt mạch
                </button>
                <button type="button" disabled={sending} onClick={() => send('auto')} className={buttonClass('auto')}>
                  <Sun className="w-3.5 h-3.5" /> AUTO
                </button>
              </div>

              <button
                type="button"
                onClick={openSchedule}
                className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" /> Đặt lịch AUTO
              </button>

              {scheduleOpen && (
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      Bắt đầu ban ngày
                      <input
                        type="time"
                        value={dayStart}
                        onChange={(e) => setDayStart(e.target.value)}
                        className="mt-0.5 w-full px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-mono"
                      />
                    </label>
                    <label className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      Bắt đầu ban đêm
                      <input
                        type="time"
                        value={nightStart}
                        onChange={(e) => setNightStart(e.target.value)}
                        className="mt-0.5 w-full px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-mono"
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Ban ngày: AUTO theo cảm biến ánh sáng. Ban đêm: AUTO luôn bật. Giờ địa phương của node.
                  </p>
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => send('auto', true)}
                    className="w-full px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Gửi AUTO với lịch mới
                  </button>
                </div>
              )}
            </>
          )}

          {sending && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang gửi lệnh…
            </p>
          )}
          {progress && !sending && <p className={`text-[11px] font-semibold ${PROGRESS_TEXT[progress].className}`}>{PROGRESS_TEXT[progress].text}</p>}
          {error && <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">{error}</p>}
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Lệnh tác động lên cả mạch {feederLabel}, không riêng trụ này.</p>
        </>
      )}
    </div>
  )
}

export default IotBridgeControlCard
