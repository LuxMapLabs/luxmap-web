import React from 'react'
import { Plus, User, FileText } from 'lucide-react'
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

  ;(cases || []).forEach((sc) => {
    ;(sc?.phases || []).forEach((p, pIndex) => {
      if (!p || !p.date) return

      // Áp dụng bộ lọc
      if (filterPhase !== 'all') {
        if (filterPhase === 'ended' && p.status !== 'ended' && !sc.isTerminated) return
        if (filterPhase !== 'ended' && p.phaseType !== filterPhase) return
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Header thứ trong tuần */}
      <div className="grid grid-cols-7 bg-slate-50/90 border-b border-slate-200 text-center select-none shrink-0">
        {WEEKDAYS.map((w, idx) => (
          <div
            key={w}
            className={`py-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider ${
              idx >= 5 ? 'text-blue-600' : 'text-slate-600'
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
          const isToday = day === 5 && currentMonth === 9 // Demo: 05/10/2026
          const dayEvents = eventsByDate[dateStr] || []

          return (
            <div
              key={dateStr}
              className={`p-2.5 min-h-[130px] flex flex-col gap-1.5 transition-all duration-200 relative group/cell ${
                isToday
                  ? 'bg-gradient-to-b from-blue-50/40 via-white to-white ring-2 ring-inset ring-blue-500/40 hover:bg-blue-50/60 hover:shadow-md hover:ring-blue-500/60 hover:z-10'
                  : 'bg-white hover:bg-sky-50/40 hover:shadow-md hover:ring-2 hover:ring-blue-400/50 hover:z-10'
              }`}
            >
              {/* Header của ô ngày */}
              <div className="flex items-center justify-between shrink-0 mb-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-black rounded-full w-6 h-6 flex items-center justify-center transition-all ${
                      isToday
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

                  return (
                    <div
                      key={`${caseItem.code}-${phaseIndex}`}
                      onClick={() => onSelectCase(caseItem.code, phaseIndex)}
                      className={`p-2 rounded-xl border text-xs cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] ${badgeBg}`}
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

                      {/* Dòng dưới: Kỹ sư & Badge Báo cáo */}
                      <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-600">
                        <span className="flex items-center gap-1 truncate max-w-28">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{phase.assigneeName}</span>
                        </span>

                        {phase.status === 'reported' && !isEnded && (
                          <span
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-black text-[9px] shadow-xs animate-pulse shrink-0 hover:bg-blue-700 transition"
                            title="Có báo cáo hiện trường kèm ảnh & video"
                          >
                            <FileText className="w-2.5 h-2.5" />
                            <span>BÁO CÁO 📸</span>
                          </span>
                        )}
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
    </div>
  )
}
