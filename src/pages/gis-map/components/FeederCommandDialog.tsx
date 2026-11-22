import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Clock, Loader2, Moon, Sun, X } from 'lucide-react'
import type { FeederControlMode } from '../../../types/common/enums'
import type { IotAutoSchedule } from '../../../types/iot/nodes'
import type { IotAutoType } from '../../../utils/iot/iotCommand'
import { AutoScheduleForm } from './AutoScheduleForm'

export interface FeederCommandTarget {
  feederId: string
  nodeId: string
  mode: FeederControlMode
  initial: IotAutoSchedule | null
  initialType?: IotAutoType
  /** Tên mạch, mã hiển thị và số cột đúng như dòng mạch vừa bấm. */
  feederName?: string
  feederCode?: string
  poleCount?: number
}

const MODE_UI: Record<FeederControlMode, { title: string; icon: typeof Sun; tile: string; confirm: string; verb: string }> = {
  on: {
    title: 'Bật cả mạch?',
    icon: Sun,
    tile: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    confirm: 'bg-emerald-600 hover:bg-emerald-700',
    verb: 'Bật',
  },
  off: {
    title: 'Tắt cả mạch?',
    icon: Moon,
    tile: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    confirm: 'bg-rose-600 hover:bg-rose-700',
    verb: 'Tắt',
  },
  auto: {
    title: 'Chạy AUTO',
    icon: Clock,
    tile: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    confirm: 'bg-indigo-600 hover:bg-indigo-700',
    verb: 'AUTO',
  },
}

/**
 * Hộp lệnh của một mạch (POST /iot/nodes/{nodeId}/command): Bật / Tắt hỏi lại, AUTO nhập lịch.
 * Esc, nút X hoặc bấm ra ngoài để đóng (trừ khi đang gửi).
 */
export const FeederCommandDialog: React.FC<{
  target: FeederCommandTarget
  sending: boolean
  onSend: (auto?: { type: IotAutoType; schedule?: { day_start: string; night_start: string } }) => void
  onClose: () => void
}> = ({ target, sending, onSend, onClose }) => {
  const ui = MODE_UI[target.mode]
  const Icon = ui.icon
  const close = () => !sending && onClose()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !sending && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sending, onClose])

  const facts = [
    { label: 'Mạch', value: target.feederCode || target.feederId },
    { label: 'Node IoT', value: target.nodeId },
    { label: 'Ảnh hưởng', value: target.poleCount ? `${target.poleCount} cột đèn` : 'Cả mạch' },
  ]

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          target.mode === 'auto'
            ? `Lịch AUTO mạch ${target.feederId}`
            : `Xác nhận ${target.mode === 'on' ? 'bật' : 'tắt'} mạch ${target.feederId}`
        }
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-start gap-3 p-4 pb-3">
          <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${ui.tile}`}>
            <Icon className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{ui.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{target.feederName || `Mạch ${target.feederId}`}</p>
          </div>
          <button
            type="button"
            aria-label="Đóng hộp lệnh"
            onClick={close}
            disabled={sending}
            className="p-1.5 -m-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <dl className="mx-4 grid grid-cols-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 divide-x divide-slate-200 dark:divide-slate-700/60">
          {facts.map((fact) => (
            <div key={fact.label} className="px-3 py-2 min-w-0">
              <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">{fact.label}</dt>
              <dd className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-100 truncate" title={fact.value}>
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="p-4 space-y-3">
          {target.mode === 'auto' ? (
            <AutoScheduleForm
              initial={target.initial}
              initialType={target.initialType}
              sending={sending}
              onSubmit={(auto) => onSend(auto)}
              onCancel={close}
            />
          ) : (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Lệnh {ui.verb.toLowerCase()} tác động <strong className="text-slate-800 dark:text-slate-100">mọi đèn trên mạch</strong>, không riêng
                một cột. Node xác nhận trong vài giây, kết quả ghi ở nhật ký lệnh.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={close}
                  disabled={sending}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => onSend()}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-bold cursor-pointer disabled:opacity-60 ${ui.confirm}`}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                  {sending ? 'Đang gửi…' : `Xác nhận ${ui.verb}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default FeederCommandDialog
