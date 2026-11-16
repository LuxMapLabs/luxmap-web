import React, { useState } from 'react'
import { DEFAULT_AUTO_SCHEDULE, isClock } from '../../../utils/iot/iotCommand'
import type { IotAutoSchedule } from '../../../types/iot/nodes'

const timeInput =
  'mt-0.5 w-full px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-mono'

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
    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10.5px] text-slate-500 dark:text-slate-400">
          Bắt đầu ban ngày
          <input type="time" value={dayStart} onChange={(e) => setDayStart(e.target.value)} className={timeInput} />
        </label>
        <label className="text-[10.5px] text-slate-500 dark:text-slate-400">
          Bắt đầu ban đêm
          <input type="time" value={nightStart} onChange={(e) => setNightStart(e.target.value)} className={timeInput} />
        </label>
      </div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500">
        Ban ngày: AUTO theo cảm biến ánh sáng. Ban đêm: AUTO luôn bật. Giờ địa phương của node.
      </p>
      {error && <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">{error}</p>}
      <div className="flex gap-1.5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold cursor-pointer"
          >
            Huỷ
          </button>
        )}
        <button
          type="button"
          disabled={sending}
          onClick={submit}
          className="flex-1 px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer"
        >
          Gửi AUTO
        </button>
      </div>
    </div>
  )
}

export default AutoScheduleForm
