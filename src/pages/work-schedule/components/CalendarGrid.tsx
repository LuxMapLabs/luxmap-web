import React from 'react'
import { Plus, User, FileText, AlertTriangle } from 'lucide-react'
import { ScheduleCase } from '../../../types/workSchedule'
import { WorkScheduleState } from '../../../feature/work-schedule/workScheduleSlice'

interface CalendarGridProps {
  currentMonth: number
  currentYear: number
  cases: ScheduleCase[]
  filterPhase: WorkScheduleState['filterPhase']
  onSelectCase: (code: string, phaseIndex: number) => void
  onAddOnDate: (dateStr: string) => void
}

const WEEKDAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentMonth,
  currentYear,
  cases,
  filterPhase,
  onSelectCase,
  onAddOnDate,
}) => {
  // Tính toán số ngày và padding của tháng
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  // Chuyển Chủ Nhật (0) thành 6, Thứ Hai (1) thành 0
  const startDayIndex = (firstDayOfMonth + 6) % 7
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate()
  const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate()

  // Thu thập các sự kiện theo ngày (YYYY-MM-DD)
  const eventsByDate: Record<
    string,
    Array<{
      caseItem: ScheduleCase
      phaseIndex: number
      phase: ScheduleCase['phases'][0]
    }>
  > = {}

    ; (cases || []).forEach((sc) => {
      ; (sc?.phases || []).forEach((p, pIndex) => {
        if (!p || !p.date || p.rawStatus === 'cancelled') return

        // Áp dụng bộ lọc
        if (filterPhase !== 'all') {
          if (filterPhase === 'ended' && p.status !== 'ended' && !sc.isTerminated) return
          if (
            filterPhase === 'has_report' &&
            (p.status !== 'reported' ||
              p.cancellationRequest?.status === 'pending' ||
              sc.isTerminated)
          )
            return
          if (
            filterPhase === 'has_cancel' &&
            (p.cancellationRequest?.status !== 'pending' ||
              p.status === 'ended' ||
              sc.isTerminated)
          )
            return
          if (
            filterPhase !== 'ended' &&
            filterPhase !== 'has_report' &&
            filterPhase !== 'has_cancel' &&
            p.phaseType !== filterPhase
          )
            return
        }

        if (!eventsByDate[p.date]) {
          eventsByDate[p.date] = []
        }
        eventsByDate[p.date].push({
          caseItem: sc,
          phaseIndex: pIndex,
          phase: p,
        })
      })
    })

  // Các ngày đệm tháng trước
  const prevDays = []
  for (let i = startDayIndex - 1; i >= 0; i--) {
    prevDays.push(prevMonthTotalDays - i)
  }

  // Các ngày trong tháng
  const daysInMonth = Array.from({ length: totalDays }, (_, i) => i + 1)

  // Các ngày đệm tháng sau để tròn tuần (bội số của 7 cột)
  const totalSlotsSoFar = prevDays.length + daysInMonth.length
  const remainingSlots = (7 - (totalSlotsSoFar % 7)) % 7
  const nextDays = Array.from({ length: remainingSlots }, (_, i) => i + 1)

  // Lấy thông tin ngày thực tế hiện tại
  const today = new Date()
  const todayDate = today.getDate()
  const todayMonth = today.getMonth()
  const todayYear = today.getFullYear()

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Header thứ trong tuần */}
      <div className="grid grid-cols-7 bg-slate-50/90 border-b border-slate-200 text-center select-none shrink-0">
        {WEEKDAYS.map((w, idx) => (
          <div
            key={w}
            className={`py-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider ${idx >= 5 ? 'text-blue-600' : 'text-slate-600'
              }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Lưới các ô ngày: Tự động co giãn chiều cao theo số lượng thẻ lịch (giống bản Prototype) */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100 auto-rows-[minmax(130px,auto)]">
        {/* Render ngày đệm tháng trước */}
        {prevDays.map((d) => (
          <div key={`prev-${d}`} className="bg-slate-50/40 p-2.5 min-h-[130px] flex flex-col opacity-40">
            <span className="text-xs font-semibold text-slate-400">{d}</span>
          </div>
        ))}

        {/* Render ngày trong tháng */}
        {daysInMonth.map((day) => {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
            day
          ).padStart(2, '0')}`
          const isToday =
            day === todayDate &&
            currentMonth === todayMonth &&
            currentYear === todayYear
          const dayEvents = eventsByDate[dateStr] || []

          return (
            <div
              key={dateStr}
              className={`p-2.5 min-h-[130px] flex flex-col gap-1.5 transition-all duration-200 relative group/cell ${isToday
                ? 'bg-gradient-to-b from-blue-50/40 via-white to-white ring-2 ring-inset ring-blue-500/40 hover:bg-blue-50/60 hover:shadow-md hover:ring-blue-500/60 hover:z-10'
                : 'bg-white hover:bg-sky-50/40 hover:shadow-md hover:ring-2 hover:ring-blue-400/50 hover:z-10'
                }`}
            >
              {/* Header của ô ngày */}
              <div className="flex items-center justify-between shrink-0 mb-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-black rounded-full w-6 h-6 flex items-center justify-center transition-all ${isToday
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-200 scale-105'
                      : 'text-slate-700 group-hover/cell:text-blue-600 group-hover/cell:font-black'
                      }`}
                  >
                    {day}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100/90 px-1.5 py-0.2 rounded-full border border-blue-200/60 select-none shadow-2xs">
                      Hôm nay
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onAddOnDate(dateStr)}
                  className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                  title={`Tạo lịch mới cho ngày ${dateStr}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Danh sách thẻ lịch trong ngày: Tự do giãn nở hiển thị trọn vẹn, không che giấu */}
              <div className="flex flex-col gap-1.5 flex-1">
                {dayEvents.map(({ caseItem, phaseIndex, phase }) => {
                  const isEnded = phase.status === 'ended' || caseItem.isTerminated

                  // Styling theo từng phase
                  let badgeBg = 'bg-amber-50 text-amber-800 border-amber-200'
                  let phaseTitle = '🟡 1. Khảo sát'
                  if (phase.phaseType === 'inspection') {
                    badgeBg = 'bg-blue-50 text-blue-800 border-blue-200'
                    phaseTitle = '🔵 2. Kiểm tra'
                  } else if (phase.phaseType === 'repair') {
                    badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    phaseTitle = '🟢 3. Sửa chữa'
                  }

                  if (isEnded) {
                    badgeBg = 'bg-slate-100 text-slate-500 border-slate-200 opacity-80'
                    phaseTitle += ' • Đã chốt'
                  }

                  const hasPendingCancel = phase.cancellationRequest?.status === 'pending' && !isEnded
                  const hasReport = phase.status === 'reported' && !isEnded && !hasPendingCancel

                  let cardStyle = badgeBg
                  if (hasPendingCancel) {
                    cardStyle = 'border-rose-400 ring-2 ring-rose-300/80 bg-rose-50/70 shadow-xs'
                  } else if (hasReport) {
                    cardStyle =
                      'border-blue-500 ring-2 ring-blue-300/80 bg-gradient-to-br from-blue-50/95 via-sky-50/50 to-white shadow-xs'
                  }

                  return (
                    <div
                      key={`${caseItem.code}-${phaseIndex}`}
                      onClick={() => onSelectCase(caseItem.code, phaseIndex)}
                      className={`p-2 rounded-xl border text-xs cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] ${cardStyle}`}
                    >
                      {/* Dòng trên: Mã & Nhãn Phase */}
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono font-extrabold text-[11px] tracking-tight">
                          {caseItem.code}
                        </span>
                        <span className="text-[10px] font-bold">{phaseTitle}</span>
                      </div>

                      {/* Tiêu đề vụ việc */}
                      <div className="font-bold text-slate-900 line-clamp-1 leading-snug">
                        {caseItem.title}
                      </div>

                      {/* Thông tin phụ: Tuyến đường / Cột */}
                      {caseItem.segment && (
                        <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                          📍 {caseItem.segment.split('-')[0]?.trim() || caseItem.segment}
                          {phase.poleIds && phase.poleIds.length > 0
                            ? ` • ${phase.poleIds.length} cột`
                            : ''}
                        </div>
                      )}

                      {/* Dòng dưới: Kỹ sư & Badge Báo cáo / Xin Hủy */}
                      <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-600 gap-1">
                        <span className="flex items-center gap-1 truncate max-w-24 sm:max-w-28">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{phase.assigneeName}</span>
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          {hasPendingCancel && (
                            <span
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[9px] shadow-xs animate-pulse hover:bg-rose-700 transition"
                              title={`Kỹ sư yêu cầu hủy lịch: ${phase.cancellationRequest?.reason}`}
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>XIN HỦY</span>
                            </span>
                          )}

                          {hasReport && (
                            <span
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-black text-[9px] shadow-xs animate-pulse hover:bg-blue-700 transition"
                              title="Kỹ sư đã nộp báo cáo hiện trường kèm ảnh & video - Nhấp để duyệt"
                            >
                              <FileText className="w-2.5 h-2.5" />
                              <span>CHỜ DUYỆT BÁO CÁO</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Render ngày đệm tháng sau để tròn tuần cuối */}
        {nextDays.map((d) => (
          <div key={`next-${d}`} className="bg-slate-50/40 p-2.5 min-h-[130px] flex flex-col opacity-40">
            <span className="text-xs font-semibold text-slate-400">{d}</span>
          </div>
        ))}
      </div>

      {/* Legend Chú Giải Trạng Thái Thẻ Lịch */}
      <div className="bg-slate-50/90 border-t border-slate-200/80 px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-600 flex-wrap gap-2 select-none">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <span className="font-extrabold text-slate-700">Chú giải:</span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-300" />
            <span>Khảo sát</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-300" />
            <span>Kiểm tra</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-300" />
            <span>Sửa chữa</span>
          </span>
          <span className="flex items-center gap-1.5 font-bold text-rose-700">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-100 border border-rose-400 ring-1 ring-rose-400" />
            <span>Yêu cầu xin hủy</span>
          </span>
          <span className="flex items-center gap-1.5 font-bold text-blue-700">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-400 ring-1 ring-blue-400" />
            <span>Chờ duyệt báo cáo</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 border border-slate-300" />
            <span>Đã kết thúc</span>
          </span>
        </div>
      </div>
    </div>
  )
}
