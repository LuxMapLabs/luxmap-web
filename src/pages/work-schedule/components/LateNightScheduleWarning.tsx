import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { getLocalTomorrowYmd, isLateNightSameDayWarning } from '../../../utils/work-schedule/scheduleRules'

interface LateNightScheduleWarningProps {
  selectedDate: string
  onSwitchToTomorrow: (tomorrowYmd: string) => void
}

/**
 * Hiển thị cảnh báo nhẹ khi Quản lý tạo phiếu cho ngày hôm nay sau 22:00
 * kèm nút chuyển nhanh sang ngày mai.
 */
export const LateNightScheduleWarning: React.FC<LateNightScheduleWarningProps> = ({
  selectedDate,
  onSwitchToTomorrow,
}) => {
  if (!isLateNightSameDayWarning(selectedDate)) return null

  const tomorrowYmd = getLocalTomorrowYmd()

  return (
    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11.5px] text-amber-900 flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-start gap-2 flex-1 min-w-[200px]">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          Hiện tại đã sau <strong>22:00</strong>. Lịch giao cho <strong>hôm nay</strong> có thể không kịp thực hiện trong ngày.
        </span>
      </div>
      <button
        type="button"
        onClick={() => onSwitchToTomorrow(tomorrowYmd)}
        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition cursor-pointer shrink-0 active:scale-95"
      >
        Đổi sang ngày mai
      </button>
    </div>
  )
}
