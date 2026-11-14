import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Route,
  CalendarRange,
  RefreshCw,
  ChevronDown,
  Maximize2,
  Minimize2,
  Check,
} from 'lucide-react'
import type { SegmentListItem } from '../../../types/assets/segments'
import { ReportDownloadIcon } from '../../../components/ops/ReportDownloadIcon'
import { SuperiorExportModal } from './SuperiorExportModal'

export type SuperiorCsvExportType =
  | 'fixture-status'
  | 'repair-timeliness'
  | 'warranty'
  | 'citizen-feedback'
  | 'work-orders'

interface SuperiorToolbarProps {
  communeName?: string
  communeCode?: string
  totalPolesCount?: number
  segments: SegmentListItem[]
  selectedSegmentId: string
  onSelectSegment: (segmentId: string) => void
  selectedPeriodDays: 7 | 30 | 90
  onChangePeriod: (days: 7 | 30 | 90) => void
  onExportCsv: (types: SuperiorCsvExportType[]) => void
  onRefresh: () => void
  isRefreshing?: boolean
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

const PERIOD_OPTIONS: { value: 7 | 30 | 90; label: string; subLabel: string; badge: string }[] = [
  { value: 7, label: '7 đêm qua', subLabel: 'Ngắn hạn · 1 tuần', badge: '7N' },
  { value: 30, label: '30 đêm qua', subLabel: 'Tiêu chuẩn · 1 tháng', badge: '30N' },
  { value: 90, label: '90 đêm (Quý)', subLabel: 'Dài hạn · 1 quý', badge: '90N' },
]

export const SuperiorToolbar: React.FC<SuperiorToolbarProps> = ({
  totalPolesCount,
  segments,
  selectedSegmentId,
  onSelectSegment,
  selectedPeriodDays,
  onChangePeriod,
  onExportCsv,
  onRefresh,
  isRefreshing = false,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isSegmentOpen, setIsSegmentOpen] = useState(false)
  const [isPeriodOpen, setIsPeriodOpen] = useState(false)
  // Icon làm mới luôn xoay trọn vòng: bắt đầu khi tải, chỉ dừng khi hết một vòng sau lúc tải xong
  const [spinning, setSpinning] = useState(false)
  const [topbarSlot, setTopbarSlot] = useState<HTMLElement | null>(null)

  const segmentDropdownRef = useRef<HTMLDivElement>(null)
  const periodDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isRefreshing) setSpinning(true)
  }, [isRefreshing])

  useEffect(() => {
    setTopbarSlot(document.getElementById('ops-topbar-slot'))
  }, [])

  // Đóng dropdown khi click ra ngoài hoặc nhấn phím Escape
  useEffect(() => {
    if (!isSegmentOpen && !isPeriodOpen) return

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (isSegmentOpen && segmentDropdownRef.current && !segmentDropdownRef.current.contains(target)) {
        setIsSegmentOpen(false)
      }
      if (isPeriodOpen && periodDropdownRef.current && !periodDropdownRef.current.contains(target)) {
        setIsPeriodOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSegmentOpen(false)
        setIsPeriodOpen(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSegmentOpen, isPeriodOpen])

  const selectedSegmentObj =
    selectedSegmentId === 'all'
      ? null
      : segments.find((s) => s.segment_id === selectedSegmentId) || null

  const computedTotalPoles =
    totalPolesCount ?? segments.reduce((sum, s) => sum + (s.pole_count || 0), 0)

  const activePeriodOption =
    PERIOD_OPTIONS.find((p) => p.value === selectedPeriodDays) || PERIOD_OPTIONS[1]

  const segmentSelect = (
    <div ref={segmentDropdownRef} className="relative select-none">
      {/* Hidden native select for accessibility & form compatibility */}
      <select
        tabIndex={-1}
        aria-hidden="true"
        value={selectedSegmentId}
        onChange={(e) => onSelectSegment(e.target.value)}
        className="sr-only absolute pointer-events-none opacity-0 w-0 h-0 -z-50"
      >
        <option value="all">Tất cả các tuyến ({segments.length})</option>
        {segments.map((seg) => (
          <option key={seg.segment_id || ''} value={seg.segment_id || ''}>
            {seg.segment_name || seg.segment_id}{' '}
            {seg.pole_count != null ? `(${seg.pole_count} cột)` : ''}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => {
          setIsSegmentOpen((prev) => !prev)
          setIsPeriodOpen(false)
        }}
        aria-haspopup="listbox"
        aria-expanded={isSegmentOpen}
        title="Chọn tuyến đường giám sát"
        className={`group flex h-10 items-center gap-2 rounded-2xl bg-white pl-2.5 pr-3 shadow-ops text-[13px] border transition-all duration-200 hover:shadow-ops-hover hover:-translate-y-0.5 cursor-pointer ${
          isSegmentOpen
            ? 'border-[#8FB8DA] ring-2 ring-[#8FB8DA]/35 shadow-ops-hover'
            : 'border-transparent hover:border-[#DCE8F3]'
        }`}
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
            isSegmentOpen || selectedSegmentId !== 'all'
              ? 'bg-[#4A7AA3] text-white'
              : 'bg-[#E4EFF8] text-[#4A7AA3] group-hover:bg-[#D6E6F4]'
          }`}
        >
          <Route className="w-3.5 h-3.5" />
        </span>

        <span className="font-bold text-slate-800 max-w-[40vw] sm:max-w-52 truncate">
          {selectedSegmentObj
            ? selectedSegmentObj.segment_name || selectedSegmentObj.segment_id
            : 'Tất cả các tuyến'}
        </span>

        <span
          className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold font-mono shrink-0 transition-colors ${
            selectedSegmentObj
              ? 'bg-[#E4EFF8] text-[#3B6385]'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {selectedSegmentObj
            ? `${selectedSegmentObj.pole_count ?? 0} cột`
            : segments.length}
        </span>

        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isSegmentOpen ? 'rotate-180 text-[#4A7AA3]' : 'group-hover:text-slate-600'
          }`}
        />
      </button>

      {isSegmentOpen && (
        <div
          role="listbox"
          aria-label="Danh sách tuyến đường"
          className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-76 sm:w-84 rounded-2xl border border-[#DCE8F3] bg-white/98 backdrop-blur-xl p-1.5 shadow-[0_18px_40px_-12px_rgba(59,99,133,0.32)] z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#E8F1F9] mb-1">
            <span className="text-[11px] font-bold text-slate-400">Phạm vi giám sát tuyến</span>
            <span className="text-[11px] font-semibold text-[#3B6385] bg-[#F3F8FC] px-2 py-0.5 rounded-full border border-[#DCE8F3]">
              {segments.length} tuyến · {computedTotalPoles} cột
            </span>
          </div>

          <div className="max-h-68 overflow-y-auto custom-scrollbar space-y-1 p-0.5">
            {/* Option: Tất cả các tuyến */}
            <button
              type="button"
              role="option"
              aria-selected={selectedSegmentId === 'all'}
              onClick={() => {
                onSelectSegment('all')
                setIsSegmentOpen(false)
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer border ${
                selectedSegmentId === 'all'
                  ? 'bg-[#F3F8FC] text-[#3B6385] border-[#B8D4EA] shadow-2xs'
                  : 'bg-transparent text-slate-700 border-transparent hover:bg-[#F8FBFD] hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    selectedSegmentId === 'all'
                      ? 'bg-[#4A7AA3] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Route className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold truncate">
                    Tất cả các tuyến ({segments.length})
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Tổng hợp toàn bộ {computedTotalPoles} cột chiếu sáng
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {selectedSegmentId === 'all' && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E4EFF8] text-[#4A7AA3]">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </span>
                )}
              </div>
            </button>

            {/* Danh sách từng tuyến */}
            {segments.map((seg) => {
              const segId = seg.segment_id || ''
              const isSelected = selectedSegmentId === segId
              const name = seg.segment_name || segId
              return (
                <button
                  key={segId}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelectSegment(segId)
                    setIsSegmentOpen(false)
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#F3F8FC] text-[#3B6385] border-[#B8D4EA] shadow-2xs'
                      : 'bg-transparent text-slate-700 border-transparent hover:bg-[#F8FBFD] hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold transition-colors ${
                        isSelected
                          ? 'bg-[#4A7AA3] text-white shadow-2xs'
                          : 'bg-[#EEF5FB] text-[#4A7AA3]'
                      }`}
                    >
                      <Route className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold truncate">{name}</div>
                      {seg.external_ref && seg.external_ref !== name && (
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          Mã tuyến: {seg.external_ref}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {seg.pole_count != null && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                          isSelected
                            ? 'bg-[#E4EFF8] text-[#3B6385]'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {seg.pole_count} cột
                      </span>
                    )}
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E4EFF8] text-[#4A7AA3]">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  const periodSelect = (
    <div
      ref={periodDropdownRef}
      className="relative select-none"
      title="Khoảng thời gian tính tiến độ sửa chữa, phản ánh và lệnh công tác"
    >
      {/* Hidden native select for accessibility & test compatibility */}
      <select
        tabIndex={-1}
        aria-hidden="true"
        value={selectedPeriodDays}
        onChange={(e) => onChangePeriod(Number(e.target.value) as 7 | 30 | 90)}
        className="sr-only absolute pointer-events-none opacity-0 w-0 h-0 -z-50"
      >
        <option value={7}>7 đêm qua</option>
        <option value={30}>30 đêm qua</option>
        <option value={90}>90 đêm (Quý)</option>
      </select>

      <button
        type="button"
        onClick={() => {
          setIsPeriodOpen((prev) => !prev)
          setIsSegmentOpen(false)
        }}
        aria-haspopup="listbox"
        aria-expanded={isPeriodOpen}
        className={`group flex h-10 items-center gap-2 rounded-2xl bg-white pl-2.5 pr-3 shadow-ops text-[13px] border transition-all duration-200 hover:shadow-ops-hover hover:-translate-y-0.5 cursor-pointer ${
          isPeriodOpen
            ? 'border-[#8FB8DA] ring-2 ring-[#8FB8DA]/35 shadow-ops-hover'
            : 'border-transparent hover:border-[#DCE8F3]'
        }`}
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
            isPeriodOpen
              ? 'bg-[#4A7AA3] text-white'
              : 'bg-[#E4EFF8] text-[#4A7AA3] group-hover:bg-[#D6E6F4]'
          }`}
        >
          <CalendarRange className="w-3.5 h-3.5" />
        </span>

        <span className="font-bold text-slate-800 whitespace-nowrap">
          {activePeriodOption.label}
        </span>

        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isPeriodOpen ? 'rotate-180 text-[#4A7AA3]' : 'group-hover:text-slate-600'
          }`}
        />
      </button>

      {isPeriodOpen && (
        <div
          role="listbox"
          aria-label="Khoảng thời gian thống kê"
          className="absolute right-0 top-full mt-2 w-62 rounded-2xl border border-[#DCE8F3] bg-white/98 backdrop-blur-xl p-1.5 shadow-[0_18px_40px_-12px_rgba(59,99,133,0.32)] z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#E8F1F9] mb-1">
            <span className="text-[11px] font-bold text-slate-400">Chu kỳ phân tích SLA</span>
            <span className="text-[11px] font-mono font-semibold text-[#4A7AA3]">
              {selectedPeriodDays} đêm
            </span>
          </div>

          <div className="space-y-1 p-0.5">
            {PERIOD_OPTIONS.map((opt) => {
              const isSelected = selectedPeriodDays === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChangePeriod(opt.value)
                    setIsPeriodOpen(false)
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer border ${
                    isSelected
                      ? 'bg-[#F3F8FC] text-[#3B6385] border-[#B8D4EA] shadow-2xs'
                      : 'bg-transparent text-slate-700 border-transparent hover:bg-[#F8FBFD] hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold font-mono transition-colors ${
                        isSelected
                          ? 'bg-[#4A7AA3] text-white shadow-2xs'
                          : 'bg-[#EEF5FB] text-[#4A7AA3]'
                      }`}
                    >
                      {opt.badge}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold truncate">{opt.label}</div>
                      <div className="text-[11px] text-slate-500 truncate">{opt.subLabel}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E4EFF8] text-[#4A7AA3]">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  const actions = (
        <div className="flex items-center gap-2">
          {/* Nút mở hộp thoại chọn báo cáo CSV: ẩn khi trình chiếu */}
          {!isFullscreen && (
            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              title="Xuất báo cáo CSV"
              aria-label="Xuất báo cáo CSV"
              className="report-trigger flex h-10 w-10 items-center justify-center rounded-2xl bg-[#4A7AA3] text-white shadow-ops hover:bg-[#3B6385] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <ReportDownloadIcon className="w-[22px] h-[22px]" />
            </button>
          )}

          {/* Nút Làm mới số liệu: ẩn khi trình chiếu */}
          {!isFullscreen && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Làm mới số liệu"
            aria-label="Làm mới số liệu"
            className="group flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#3B6385] shadow-ops hover:shadow-ops-hover hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              onAnimationIteration={() => {
                if (!isRefreshing) setSpinning(false)
              }}
              className={`w-5 h-5 ${
                spinning
                  ? 'animate-spin'
                  : 'transition-transform duration-500 group-hover:rotate-180 motion-reduce:transition-none'
              }`}
            />
          </button>
          )}

          {/* Nút Chế độ Trình chiếu / Toàn màn hình */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label="Chế độ trình chiếu"
              className="group flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#3B6385] shadow-ops hover:shadow-ops-hover hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50"
              title={
                isFullscreen
                  ? 'Thu nhỏ cửa sổ bình thường (Esc)'
                  : 'Bật chế độ trình chiếu toàn màn hình (TV / Presentation)'
              }
            >
              {isFullscreen ? (
<Minimize2 className="w-5 h-5 transition-transform duration-300 group-hover:scale-75 motion-reduce:transition-none" />
              ) : (
<Maximize2 className="w-5 h-5 transition-transform duration-300 group-hover:scale-125 motion-reduce:transition-none" />
              )}
            </button>
          )}
        </div>
  )

  const segmentLabel =
    selectedSegmentId === 'all'
      ? 'tất cả các tuyến'
      : (() => {
          const seg = segments.find((x) => x.segment_id === selectedSegmentId)
          return seg?.segment_name || seg?.segment_id || selectedSegmentId
        })()
  const periodLabel = selectedPeriodDays === 90 ? '90 đêm gần nhất (quý)' : `${selectedPeriodDays} đêm gần nhất`

  return (
    <>
      <SuperiorExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExport={onExportCsv}
        segmentLabel={segmentLabel}
        periodLabel={periodLabel}
      />

      {/* 1. Header Portal Slot: Ô chọn tuyến đường đưa lên header của SuperiorLayout / ManagerLayout */}
      {topbarSlot &&
        createPortal(
          <div className="flex items-center gap-2">
            {segmentSelect}
            {periodSelect}
            {actions}
          </div>,
          topbarSlot
        )}

      {/* 2. Executive Sub-Toolbar dự phòng khi không có slot */}
      {!topbarSlot && (
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {segmentSelect}
            {periodSelect}
          </div>

          {actions}
        </section>
      )}
    </>
  )
}

