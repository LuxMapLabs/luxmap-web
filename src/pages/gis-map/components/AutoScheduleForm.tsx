import React, { useState } from 'react'
import { Clock, Loader2, Moon, Sun, SunMoon } from 'lucide-react'
import { DEFAULT_AUTO_SCHEDULE, isClock, type IotAutoType } from '../../../utils/iot/iotCommand'
import type { IotAutoSchedule } from '../../../types/iot/nodes'

/**
 * Form cấu hình lệnh AUTO (POST /iot/nodes/{id}/command): chọn kiểu `scheduled` (Theo lịch) hoặc `full_time` (Cả ngày).
 */
export const AutoScheduleForm: React.FC<{
  initial?: IotAutoSchedule | null
  initialType?: IotAutoType
  sending: boolean
  onSubmit: (auto: { type: IotAutoType; schedule?: { day_start: string; night_start: string } }) => void
  onCancel?: () => void
}> = ({ initial, initialType = 'scheduled', sending, onSubmit, onCancel }) => {
  const [autoType, setAutoType] = useState<IotAutoType>(initialType)
  const [dayStart, setDayStart] = useState(initial?.day_start || DEFAULT_AUTO_SCHEDULE.day_start)
  const [nightStart, setNightStart] = useState(initial?.night_start || DEFAULT_AUTO_SCHEDULE.night_start)
  const [error, setError] = useState<string | null>(null)

  const handleSelectType = (nextType: IotAutoType) => {
    setAutoType(nextType)
    setError(null)
  }

  const submit = () => {
    if (autoType === 'full_time') {
      setError(null)
      onSubmit({ type: 'full_time' })
      return
    }
    if (!isClock(dayStart) || !isClock(nightStart) || dayStart === nightStart) {
      setError('Lịch AUTO cần hai giờ khác nhau theo định dạng HH:mm.')
      return
    }
    setError(null)
    onSubmit({ type: 'scheduled', schedule: { day_start: dayStart, night_start: nightStart } })
  }

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label="Kiểu AUTO"
        className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800"
      >
        <button
          type="button"
          aria-pressed={autoType === 'scheduled'}
          onClick={() => handleSelectType('scheduled')}
          className={`min-h-10 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500/40 outline-none ${
            autoType === 'scheduled'
              ? 'bg-white dark:bg-slate-950 text-indigo-700 dark:text-indigo-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>Theo lịch</span>
        </button>
        <button
          type="button"
          aria-pressed={autoType === 'full_time'}
          onClick={() => handleSelectType('full_time')}
          className={`min-h-10 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500/40 outline-none ${
            autoType === 'full_time'
              ? 'bg-white dark:bg-slate-950 text-indigo-700 dark:text-indigo-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <SunMoon className="w-4 h-4 shrink-0" />
          <span>Cả ngày</span>
        </button>
      </div>

      {autoType === 'scheduled' ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 px-2.5 py-1.5">
            <Sun className="w-3.5 h-3.5 shrink-0 text-amber-800 dark:text-amber-300" />
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 shrink-0">Ngày từ</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="HH:mm"
              maxLength={5}
              aria-label="Bắt đầu ban ngày"
              value={dayStart}
              onChange={(e) => setDayStart(e.target.value)}
              className="w-full min-w-0 bg-transparent text-slate-800 dark:text-slate-100 text-sm font-mono outline-none text-right"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/20 px-2.5 py-1.5">
            <Moon className="w-3.5 h-3.5 shrink-0 text-indigo-800 dark:text-indigo-300" />
            <span className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300 shrink-0">Đêm từ</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="HH:mm"
              maxLength={5}
              aria-label="Bắt đầu ban đêm"
              value={nightStart}
              onChange={(e) => setNightStart(e.target.value)}
              className="w-full min-w-0 bg-transparent text-slate-800 dark:text-slate-100 text-sm font-mono outline-none text-right"
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">Theo cảm biến ánh sáng, không theo giờ</p>
      )}

      {error && <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
          >
            Huỷ
          </button>
        )}
        <button
          type="button"
          disabled={sending}
          onClick={submit}
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold cursor-pointer ${
            onCancel ? '' : 'col-span-2'
          }`}
        >
          {sending && <Loader2 className="w-4 h-4 animate-spin" />}
          {sending ? 'Đang gửi…' : 'Gửi AUTO'}
        </button>
      </div>
    </div>
  )
}

export default AutoScheduleForm
