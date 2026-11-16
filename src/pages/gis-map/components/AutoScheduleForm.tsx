import React, { useState } from 'react'
import { Loader2, Moon, Sun } from 'lucide-react'
import { DEFAULT_AUTO_SCHEDULE, isClock } from '../../../utils/iot/iotCommand'
import type { IotAutoSchedule } from '../../../types/iot/nodes'

const timeInput =
  'mt-1.5 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40'

/**
 * Lịch của lệnh AUTO (POST /iot/nodes/{id}/command, `auto_schedule`): AUTO luôn gửi kèm lịch.
 * Điền sẵn lịch đang có trên node, chưa có thì 06:00 / 18:00. Hai giờ phải là HH:mm và khác nhau (cùng luật backend).
 */
export const AutoScheduleForm: React.FC<{
  initial?: IotAutoSchedule | null
  sending: boolean
  onSubmit: (schedule: { day_start: string; night_start: string }) => void
  onCancel?: () => void
}> = ({ initial, sending, onSubmit, onCancel }) => {
  const [dayStart, setDayStart] = useState(initial?.day_start || DEFAULT_AUTO_SCHEDULE.day_start)
  const [nightStart, setNightStart] = useState(initial?.night_start || DEFAULT_AUTO_SCHEDULE.night_start)
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    if (!isClock(dayStart) || !isClock(nightStart) || dayStart === nightStart) {
      setError('Lịch AUTO cần hai giờ khác nhau theo định dạng HH:mm.')
      return
    }
    setError(null)
    onSubmit({ day_start: dayStart, night_start: nightStart })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
            <Sun className="w-3.5 h-3.5" /> Ban ngày từ
          </span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="HH:mm"
            maxLength={5}
            aria-label="Bắt đầu ban ngày"
            value={dayStart}
            onChange={(e) => setDayStart(e.target.value)}
            className={timeInput}
          />
          <p className="mt-1 text-[10.5px] text-slate-500 dark:text-slate-400">Bật / tắt theo cảm biến ánh sáng</p>
        </div>
        <div className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/20">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-800 dark:text-indigo-300">
            <Moon className="w-3.5 h-3.5" /> Ban đêm từ
          </span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="HH:mm"
            maxLength={5}
            aria-label="Bắt đầu ban đêm"
            value={nightStart}
            onChange={(e) => setNightStart(e.target.value)}
            className={timeInput}
          />
          <p className="mt-1 text-[10.5px] text-slate-500 dark:text-slate-400">Đèn luôn bật</p>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">Giờ địa phương của node, định dạng 24 giờ.</p>
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
