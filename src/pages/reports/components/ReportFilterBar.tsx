import React, { useState, useRef, useEffect } from 'react'
import {
  RotateCcw,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
} from 'lucide-react'

interface ReportFilterBarProps {
  currentMonth: number
  currentYear: number
  filterPhase: string
  searchQuery: string
  onSelectMonthYear: (month: number, year: number) => void
  onResetToday: () => void
  onFilterPhaseChange: (phase: string) => void
  onSearchChange: (query: string) => void
  onRefresh: () => void
  isLoading: boolean
}

const MONTH_NAMES = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
]

const PHASE_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'survey', label: 'Khảo sát' },
  { value: 'inspection', label: 'Kiểm tra' },
  { value: 'repair', label: 'Sửa chữa' },
]

const YEAR_OPTIONS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030]

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  currentMonth,
  currentYear,
  filterPhase,
  searchQuery,
  onSelectMonthYear,
  onResetToday,
  onFilterPhaseChange,
  onSearchChange,
  onRefresh,
  isLoading,
}) => {
  // Icon làm mới luôn xoay trọn vòng, chỉ dừng khi hết một vòng sau lúc tải xong
  const [spinning, setSpinning] = useState(false)
  useEffect(() => {
    if (isLoading) setSpinning(true)
  }, [isLoading])

  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [viewingYear, setViewingYear] = useState(currentYear)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setViewingYear(currentYear)
  }, [currentYear])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false)
      }
    }
    if (isPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isPickerOpen])

  const availableYears = Array.from(new Set([...YEAR_OPTIONS, viewingYear, currentYear])).sort(
    (a, b) => a - b
  )

  return (
    <div className="rounded-[20px] border border-[#DCE8F3] bg-white p-3 sm:p-4 shadow-[0_8px_24px_-14px_rgba(59,99,133,0.25)] flex flex-wrap items-center gap-3">
      {/* CỤM 1: CHỌN THÁNG & NĂM ĐỒNG BỘ 100% VỚI WORK-SCHEDULE CỦA QUẢN LÝ */}
      <div className="order-2 flex items-center gap-2.5">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              setViewingYear(currentYear)
              setIsPickerOpen(!isPickerOpen)
            }}
            className={`flex items-center gap-2 px-3.5 py-2 bg-slate-50 border rounded-xl font-extrabold text-xs sm:text-sm text-slate-800 hover:bg-slate-100 hover:border-[#8FB8DA] transition-all cursor-pointer shadow-2xs ${
              isPickerOpen
                ? 'border-[#8FB8DA] ring-2 ring-[#8FB8DA]/30 bg-white text-[#3B6385]'
                : 'border-slate-200'
            }`}
            title="Bấm để chọn tháng và năm"
          >
            <Calendar className="w-4 h-4 text-[#4A7AA3] shrink-0" />
            <span>
              {MONTH_NAMES[currentMonth]} / {currentYear}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isPickerOpen ? 'rotate-180 text-[#4A7AA3]' : ''
              }`}
            />
          </button>

          {/* Bảng Popover chọn Tháng & Năm */}
          {isPickerOpen && (
            <div className="absolute top-full mt-2 left-0 z-50 w-[290px] sm:w-[310px] bg-white rounded-2xl border border-slate-200 shadow-xl p-3.5 animate-in fade-in zoom-in-95 duration-150 select-none">
              <div className="flex items-center justify-between px-1 pb-2.5 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewingYear((y) => y - 1)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#4A7AA3] hover:bg-slate-100 transition cursor-pointer active:scale-90"
                  title="Năm trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  <select
                    value={viewingYear}
                    onChange={(e) => setViewingYear(Number(e.target.value))}
                    className="text-xs sm:text-sm font-extrabold text-slate-800 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 outline-none cursor-pointer"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        Năm {y}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingYear((y) => y + 1)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#4A7AA3] hover:bg-slate-100 transition cursor-pointer active:scale-90"
                  title="Năm tiếp theo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Lưới 12 Tháng */}
              <div className="grid grid-cols-3 gap-2 py-3">
                {MONTH_NAMES.map((name, idx) => {
                  const isSelected = viewingYear === currentYear && idx === currentMonth
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onSelectMonthYear(idx, viewingYear)
                        setIsPickerOpen(false)
                      }}
                      className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-[#4A7AA3] text-white shadow-sm ring-2 ring-[#8FB8DA]/30'
                          : 'text-slate-700 bg-slate-50 hover:bg-[#F3F8FC] hover:text-[#4A7AA3] border border-slate-200/60'
                      }`}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>

              {/* Footer: Đóng & Hôm nay */}
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-semibold px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetToday()
                    setIsPickerOpen(false)
                  }}
                  className="text-[#4A7AA3] hover:text-[#3B6385] font-bold px-2.5 py-1 rounded-lg hover:bg-[#F3F8FC] transition cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Tháng này</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* CỤM 2: Ô TÌM KIẾM THEO MÃ LỆNH & CÁC BỘ LỌC ĐỒNG BỘ */}
      <div className="contents">
        {/* Tìm kiếm theo mã lệnh công tác, tuyến đường, người phụ trách */}
        <div className="relative order-1 min-w-[220px] flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm mã lệnh, tuyến đường, quản lý..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#8FB8DA] focus:ring-2 focus:ring-[#8FB8DA]/30 transition-all"
          />
        </div>

        {/* Lọc theo loại công tác */}
        <div className="order-3 flex items-center gap-1 rounded-xl bg-[#EEF4FA] p-1" role="group" aria-label="Loại công tác">
          {PHASE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onFilterPhaseChange(opt.value)}
              aria-pressed={filterPhase === opt.value}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                filterPhase === opt.value
                  ? 'bg-white text-[#3B6385] shadow-[0_2px_8px_-3px_rgba(59,99,133,0.4)]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>


        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          title="Làm mới danh sách"
          aria-label="Làm mới danh sách"
          className="group order-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DCE8F3] bg-white text-[#3B6385] hover:bg-[#F3F8FC] active:scale-95 transition cursor-pointer disabled:opacity-60"
        >
          <RefreshCw
            onAnimationIteration={() => {
              if (!isLoading) setSpinning(false)
            }}
            className={`h-[18px] w-[18px] ${
              spinning ? 'animate-spin' : 'transition-transform duration-500 group-hover:rotate-180 motion-reduce:transition-none'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
