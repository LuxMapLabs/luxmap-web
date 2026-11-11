import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Route,
  CalendarRange,
  RefreshCw,
  ChevronDown,
  Maximize2,
  Minimize2,
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
  onExportCsv: (types: SuperiorCsvExportType[]) => Promise<void>
  onRefresh: () => void
  isRefreshing?: boolean
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

export const SuperiorToolbar: React.FC<SuperiorToolbarProps> = ({
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
  // Icon làm mới luôn xoay trọn vòng: bắt đầu khi tải, chỉ dừng khi hết một vòng sau lúc tải xong
  const [spinning, setSpinning] = useState(false)
  const [topbarSlot, setTopbarSlot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (isRefreshing) setSpinning(true)
  }, [isRefreshing])

  useEffect(() => {
    setTopbarSlot(document.getElementById('ops-topbar-slot'))
  }, [])

  const periodSelect = (
    <label
      className="relative flex h-10 items-center gap-2 rounded-2xl bg-white pl-3.5 pr-9 shadow-ops text-[13px] transition-all duration-200 hover:shadow-ops-hover hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-[#8FB8DA]/50"
      title="Khoảng thời gian tính tiến độ sửa chữa, phản ánh và lệnh công tác"
    >
      <CalendarRange className="w-4 h-4 text-[#4A7AA3] shrink-0" />
      <span className="sr-only">Khoảng thời gian</span>
      <select
        value={selectedPeriodDays}
        onChange={(e) => onChangePeriod(Number(e.target.value) as 7 | 30 | 90)}
        className="appearance-none bg-transparent font-bold text-slate-800 outline-hidden cursor-pointer"
      >
        <option value={7}>7 đêm qua</option>
        <option value={30}>30 đêm qua</option>
        <option value={90}>90 đêm (Quý)</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400" />
    </label>
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

      {/* 1. Header Portal Slot: Ô chọn tuyến đường đưa lên header của ManagerLayout */}
      {topbarSlot &&
        createPortal(
          <div className="flex items-center gap-2">
            <label className="relative flex h-10 items-center gap-2 rounded-2xl bg-white pl-3.5 pr-9 shadow-ops text-[13px] transition-all duration-200 hover:shadow-ops-hover hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-teal-500/30">
              <Route className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="sr-only">Tuyến đường</span>
              <select
                value={selectedSegmentId}
                onChange={(e) => onSelectSegment(e.target.value)}
                className="appearance-none bg-transparent font-bold text-slate-800 outline-hidden cursor-pointer max-w-[48vw] sm:max-w-64 truncate"
              >
                <option value="all">Tất cả các tuyến ({segments.length})</option>
                {segments.map((seg) => (
                  <option key={seg.segment_id || ''} value={seg.segment_id || ''}>
                    {seg.segment_name || seg.segment_id} {seg.pole_count != null ? `(${seg.pole_count} cột)` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400" />
            </label>
            {periodSelect}
            {actions}
          </div>,
          topbarSlot
        )}

      {/* 2. Executive Sub-Toolbar trên trang: Thông tin địa bàn & Bộ điều khiển phân tích vĩ mô */}
      {!topbarSlot && (
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {/* Bộ lọc dự phòng khi không có header (không có slot, hoặc đang trình chiếu toàn màn hình) */}
          {(
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs transition-colors hover:border-slate-300">
              <Route className="w-4 h-4 text-slate-500 shrink-0" />
              <label htmlFor="superiorSegmentSelect" className="text-slate-500 font-semibold whitespace-nowrap">
                Tuyến:
              </label>
              <select
                id="superiorSegmentSelect"
                value={selectedSegmentId}
                onChange={(e) => onSelectSegment(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1"
              >
                <option value="all">Tất cả ({segments.length} tuyến)</option>
                {segments.map((seg) => (
                  <option key={seg.segment_id} value={seg.segment_id || ''}>
                    {seg.segment_name || seg.segment_id} ({seg.pole_count || 0} cột)
                  </option>
                ))}
              </select>
            </div>
          )}
          {periodSelect}
        </div>

        {actions}
      </section>
      )}
    </>
  )
}
