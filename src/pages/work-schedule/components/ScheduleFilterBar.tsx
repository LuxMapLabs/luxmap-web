import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  RotateCcw,
  Plus,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Zap,
} from 'lucide-react'
import { WorkScheduleState, ScheduleCase } from '../../../feature/work-schedule/workScheduleSlice'
import { OpsSelect } from '../../../components/ops/OpsSelect'

interface ScheduleFilterBarProps {
  currentMonth: number
  currentYear: number
  filterPhase: WorkScheduleState['filterPhase']
  cases?: ScheduleCase[]
  onSelectMonthYear: (month: number, year: number) => void
  onResetToday: () => void
  onFilterChange: (phase: WorkScheduleState['filterPhase']) => void
  onOpenCreateModal: () => void
  onOpenAutoDispatchModal?: () => void
  onOpenRecurringSurveyModal?: () => void
  unassignedFaultsCount?: number
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

export const ScheduleFilterBar: React.FC<ScheduleFilterBarProps> = ({
  currentMonth,
  currentYear,
  filterPhase,
  cases,
  onSelectMonthYear,
  onResetToday,
  onFilterChange,
  onOpenCreateModal,
  onOpenAutoDispatchModal,
  onOpenRecurringSurveyModal,
  unassignedFaultsCount,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [viewingYear, setViewingYear] = useState(currentYear)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Tính toán nhanh số lượng ca cần chú ý trong tháng
  const metrics = useMemo(() => {
    let pendingCancel = 0
    let pendingReport = 0
    let inProgress = 0
    let ended = 0
    let survey = 0
    let inspection = 0
    let repair = 0
    let poleGpsUpdate = 0

    ;(cases || []).forEach((c) => {
      ;(c?.phases || []).forEach((p) => {
        if (!p || !p.date || p.rawStatus === 'cancelled') return
        const isEnded = p.status === 'ended' || c.isTerminated
        if (isEnded) {
          ended++
        } else {
          if (p.phaseType === 'survey') survey++
          else if (p.phaseType === 'inspection') inspection++
          else if (p.phaseType === 'repair') repair++
          else if (p.phaseType === 'pole_gps_update') poleGpsUpdate++

          if (p.cancellationRequest?.status === 'pending') {
            pendingCancel++
          } else if (p.status === 'reported') {
            pendingReport++
          } else {
            inProgress++
          }
        }
      })
    })

    return {
      pendingCancel,
      pendingReport,
      inProgress,
      ended,
      survey,
      inspection,
      repair,
      poleGpsUpdate,
      total: pendingCancel + pendingReport + inProgress + ended,
    }
  }, [cases])

  // Đồng bộ viewingYear khi currentYear bên ngoài thay đổi
  useEffect(() => {
    setViewingYear(currentYear)
  }, [currentYear])

  // Tự động đóng popup khi click ra ngoài
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

  const hasPendingActions = metrics.pendingCancel > 0 || metrics.pendingReport > 0

  return (
    <div className="ops-rise relative z-20 bg-white rounded-[20px] shadow-ops p-3.5 sm:p-4 mb-5 flex flex-col gap-3">
      {/* Hàng chính: Điều hướng thời gian + Bộ lọc & Nút hành động (luôn cố định vị trí, không bị đẩy dòng) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Cụm chọn Tháng & Năm bằng Popover */}
        <div className="flex items-center gap-2 shrink-0">
        <div className="relative" ref={dropdownRef}>
          {/* Nút bấm hiển thị Tháng / Năm và kích hoạt Popover */}
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
              {/* Header Popover: Chuyển năm */}
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

              {/* Body: Lưới 12 Tháng */}
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

      {/* Cụm bộ lọc & Nút hành động */}
      <div className="flex items-center gap-2 flex-wrap">
        <OpsSelect
          value={filterPhase === 'has_report' || filterPhase === 'has_cancel' ? 'all' : filterPhase}
          onChange={(val) => onFilterChange(val as WorkScheduleState['filterPhase'])}
          icon={<Filter className="w-3.5 h-3.5" />}
          headerLabel="Giai đoạn ca công tác"
          headerBadge={`${metrics.total} ca`}
          align="right"
          triggerClassName="min-w-[180px]"
          popoverClassName="w-68"
          options={[
            {
              value: 'all',
              label: 'Tất cả giai đoạn',
              nativeLabel: `Tất cả (${metrics.total})`,
              subLabel: 'Hiển thị toàn bộ lịch trong tháng',
              badge: `${metrics.total} ca`,
            },
            {
              value: 'survey',
              label: '1. Khảo sát',
              nativeLabel: '🟡 1. Khảo sát',
              subLabel: 'Ca quét camera AI & thu thập dữ liệu',
              dotColor: 'bg-amber-400',
              badge: metrics.survey,
            },
            {
              value: 'inspection',
              label: '2. Kiểm tra',
              nativeLabel: '🔵 2. Kiểm tra',
              subLabel: 'Ca kiểm tra xác minh sự cố hiện trường',
              dotColor: 'bg-blue-500',
              badge: metrics.inspection,
            },
            {
              value: 'repair',
              label: '3. Sửa chữa',
              nativeLabel: '🟢 3. Sửa chữa',
              subLabel: 'Ca khắc phục & thay thế thiết bị',
              dotColor: 'bg-emerald-500',
              badge: metrics.repair,
            },
            {
              value: 'pole_gps_update',
              label: 'Cập nhật vị trí cột',
              nativeLabel: '🟣 Cập nhật vị trí cột',
              subLabel: 'Giai đoạn độc lập: Gắn QR & cập nhật GPS cột',
              dotColor: 'bg-violet-500',
              badge: metrics.poleGpsUpdate,
            },
            {
              value: 'ended',
              label: 'Đã kết thúc',
              nativeLabel: `⚪ Đã kết thúc (${metrics.ended})`,
              subLabel: 'Ca đã hoàn thành hoặc đóng hồ sơ',
              dotColor: 'bg-slate-400',
              badge: metrics.ended,
            },
          ]}
        />

        {/* Nút 1: Khảo sát định kỳ tuần */}
        {onOpenRecurringSurveyModal && (
          <button
            type="button"
            onClick={onOpenRecurringSurveyModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-700 border border-slate-200/90 text-xs font-bold rounded-xl shadow-2xs hover:shadow-sm hover:-translate-y-0.5 transition cursor-pointer active:scale-95"
            title="Quản lý và thiết lập lịch khảo sát camera AI định kỳ theo tuần"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Khảo sát định kỳ</span>
          </button>
        )}

        {/* Nút 2: Phân lịch kiểm tra tự động */}
        {onOpenAutoDispatchModal && (
          <button
            type="button"
            onClick={onOpenAutoDispatchModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition cursor-pointer active:scale-95"
            title="Tự động gom sự cố theo tuyến và đề xuất phân ca kiểm tra thông minh"
          >
            <Zap className="w-3.5 h-3.5 fill-white/20" />
            <span>Phân lịch tự động</span>
            {unassignedFaultsCount != null && unassignedFaultsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-amber-700 font-extrabold font-mono ml-0.5">
                {unassignedFaultsCount}
              </span>
            )}
          </button>
        )}

        {/* Nút 3: Tạo sự vụ mới thủ công */}
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo sự vụ</span>
        </button>
      </div>
      </div>

      {/* Hàng phụ (chỉ hiện khi có ca cần quản lý xử lý): Tách riêng để không đẩy các nút chính */}
      {hasPendingActions && (
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Cần xử lý:
            </span>
            {metrics.pendingCancel > 0 && (
              <button
                type="button"
                onClick={() => onFilterChange(filterPhase === 'has_cancel' ? 'all' : 'has_cancel')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                  filterPhase === 'has_cancel'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
                title="Bấm để lọc các ca kỹ sư xin hủy"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    filterPhase === 'has_cancel' ? 'bg-white' : 'bg-rose-500'
                  }`}
                />
                <span>{metrics.pendingCancel} Xin hủy</span>
              </button>
            )}

            {metrics.pendingReport > 0 && (
              <button
                type="button"
                onClick={() => onFilterChange(filterPhase === 'has_report' ? 'all' : 'has_report')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                  filterPhase === 'has_report'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
                title="Bấm để lọc các ca có báo cáo chờ duyệt"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    filterPhase === 'has_report' ? 'bg-white' : 'bg-blue-500'
                  }`}
                />
                <span>{metrics.pendingReport} Chờ duyệt báo cáo</span>
              </button>
            )}
          </div>

          {(filterPhase === 'has_cancel' || filterPhase === 'has_report') && (
            <button
              type="button"
              onClick={() => onFilterChange('all')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              Bỏ lọc nhanh
            </button>
          )}
        </div>
      )}
    </div>
  )
}
