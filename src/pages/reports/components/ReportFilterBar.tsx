import React, { useState, useRef, useEffect } from 'react'
import {
  RotateCcw,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  MapPin,
} from 'lucide-react'

interface ReportFilterBarProps {
  currentMonth: number
  currentYear: number
  filterPhase: string
  filterCommune: string
  searchQuery: string
  onSelectMonthYear: (month: number, year: number) => void
  onResetToday: () => void
  onFilterPhaseChange: (phase: string) => void
  onFilterCommuneChange: (commune: string) => void
  onSearchChange: (query: string) => void
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

const YEAR_OPTIONS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030]

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  currentMonth,
  currentYear,
  filterPhase,
  filterCommune,
  searchQuery,
  onSelectMonthYear,
  onResetToday,
  onFilterPhaseChange,
  onFilterCommuneChange,
  onSearchChange,
}) => {
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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 mb-5 flex flex-wrap items-center justify-between gap-4">
      {/* CỤM 1: CHỌN THÁNG & NĂM ĐỒNG BỘ 100% VỚI WORK-SCHEDULE CỦA QUẢN LÝ */}
      <div className="flex items-center gap-2.5">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              setViewingYear(currentYear)
              setIsPickerOpen(!isPickerOpen)
            }}
            className={`flex items-center gap-2 px-3.5 py-2 bg-slate-50 border rounded-xl font-extrabold text-xs sm:text-sm text-slate-800 hover:bg-slate-100 hover:border-blue-400 transition-all cursor-pointer shadow-2xs ${
              isPickerOpen
                ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white text-blue-700'
                : 'border-slate-200'
            }`}
            title="Bấm để chọn tháng và năm"
          >
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              {MONTH_NAMES[currentMonth]} / {currentYear}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isPickerOpen ? 'rotate-180 text-blue-600' : ''
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
                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer active:scale-90"
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
                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer active:scale-90"
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
                          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                          : 'text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200/60'
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
                  className="text-blue-600 hover:text-blue-700 font-bold px-2.5 py-1 rounded-lg hover:bg-blue-50 transition cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Hôm nay</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onResetToday}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer active:scale-95"
          title="Về tháng hiện tại"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Hôm nay</span>
        </button>
      </div>

      {/* CỤM 2: Ô TÌM KIẾM THEO MÃ LỆNH & CÁC BỘ LỌC ĐỒNG BỘ */}
      <div className="flex items-center gap-3 flex-wrap flex-1 justify-end">
        {/* Tìm kiếm theo mã lệnh công tác, tuyến đường, người phụ trách */}
        <div className="relative min-w-[240px] max-w-[320px] flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm mã lệnh, tuyến đường, quản lý..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>

        {/* BỘ LỌC LOẠI CÔNG TÁC ĐỒNG BỘ 100% VỚI SCHEDULE CỦA QUẢN LÝ */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 hover:border-slate-300 transition-colors">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={filterPhase}
            onChange={(e) => onFilterPhaseChange(e.target.value)}
            className="text-xs font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
          >
            <option value="all">Tất cả các giai đoạn</option>
            <option value="survey">🟡 1. Khảo sát</option>
            <option value="inspection">🔵 2. Kiểm tra</option>
            <option value="repair">🟢 3. Sửa chữa</option>
          </select>
        </div>

        {/* LỌC THEO ĐỊA BÀN XÃ */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 hover:border-slate-300 transition-colors">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={filterCommune}
            onChange={(e) => onFilterCommuneChange(e.target.value)}
            className="text-xs font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
          >
            <option value="all">Tất cả xã / địa bàn</option>
            <option value="COM-001">Xã Phước Hậu</option>
            <option value="COM-002">Xã An Hải</option>
            <option value="COM-003">Xã Phước Dinh</option>
          </select>
        </div>
      </div>
    </div>
  )
}
