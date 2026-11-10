import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Route,
  FileSpreadsheet,
  RefreshCw,
  ChevronDown,
  Clock,
  Download,
  Maximize2,
  Minimize2,
  MessageSquareWarning,
  ClipboardList,
  Loader2,
} from 'lucide-react'
import type { SegmentListItem } from '../../../types/assets/segments'

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
  onExportCsv: (type: SuperiorCsvExportType) => void
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
  const [topbarSlot, setTopbarSlot] = useState<HTMLElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTopbarSlot(document.getElementById('ops-topbar-slot'))
  }, [])

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      {/* 1. Header Portal Slot: Ô chọn tuyến đường đưa lên header của ManagerLayout */}
      {topbarSlot &&
        createPortal(
          <div className="flex items-center gap-2">
            {isRefreshing && (
              <div className="flex items-center gap-1.5 text-xs text-teal-700 font-semibold mr-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Đang đồng bộ...</span>
              </div>
            )}
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
          </div>,
          topbarSlot
        )}

      {/* 2. Executive Sub-Toolbar trên trang: Thông tin địa bàn & Bộ điều khiển phân tích vĩ mô */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-ops">
        {/* Cụm bộ lọc thời gian bên trái */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {/* Lọc tuyến đường dự phòng (hiển thị khi không có header portal slot) */}
          {!topbarSlot && (
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

          {/* Bộ chuyển chu kỳ đánh giá tiến độ sửa chữa đêm */}
          <div
            className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/60"
            title="Khoảng thời gian đánh giá tiến độ sửa chữa đêm (from..to)"
          >
            <button
              type="button"
              onClick={() => onChangePeriod(7)}
              className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition-all cursor-pointer ${
                selectedPeriodDays === 7
                  ? 'bg-white text-teal-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 đêm qua
            </button>
            <button
              type="button"
              onClick={() => onChangePeriod(30)}
              className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition-all cursor-pointer ${
                selectedPeriodDays === 30
                  ? 'bg-white text-teal-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 đêm qua
            </button>
            <button
              type="button"
              onClick={() => onChangePeriod(90)}
              className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition-all cursor-pointer ${
                selectedPeriodDays === 90
                  ? 'bg-white text-teal-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              90 đêm (Quý)
            </button>
          </div>
        </div>

        {/* Cụm thao tác xuất CSV & Refresh bên phải */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Dropdown Xuất báo cáo CSV với 5 báo cáo chuyên sâu */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border border-teal-600 bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.98] shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất báo cáo CSV</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setIsExportOpen(false)
                    onExportCsv('fixture-status')
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-teal-50/70 transition-colors flex flex-col gap-0.5 cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                    1. Hiện trạng Chiếu sáng
                  </span>
                  <span className="text-[11px] text-slate-500 pl-5">
                    Số liệu phân loại cột & bóng đạt chuẩn/lỗi (.csv)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsExportOpen(false)
                    onExportCsv('repair-timeliness')
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-teal-50/70 transition-colors flex flex-col gap-0.5 cursor-pointer border-t border-slate-100"
                >
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    2. Tiến độ & SLA Sửa chữa
                  </span>
                  <span className="text-[11px] text-slate-500 pl-5">
                    Tỷ lệ đúng hạn, trễ hạn theo chu kỳ đêm (.csv)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsExportOpen(false)
                    onExportCsv('warranty')
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-teal-50/70 transition-colors flex flex-col gap-0.5 cursor-pointer border-t border-slate-100"
                >
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                    3. Danh mục Bảo hành Thiết bị
                  </span>
                  <span className="text-[11px] text-slate-500 pl-5">
                    Bóng hết hạn & dự toán thay thế định kỳ (.csv)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsExportOpen(false)
                    onExportCsv('citizen-feedback')
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-teal-50/70 transition-colors flex flex-col gap-0.5 cursor-pointer border-t border-slate-100"
                >
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MessageSquareWarning className="w-3.5 h-3.5 text-emerald-600" />
                    4. Phản ánh & Kiến nghị Người dân
                  </span>
                  <span className="text-[11px] text-slate-500 pl-5">
                    Tỷ lệ tiếp nhận, gộp và duyệt phản ánh QR (.csv)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsExportOpen(false)
                    onExportCsv('work-orders')
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-teal-50/70 transition-colors flex flex-col gap-0.5 cursor-pointer border-t border-slate-100"
                >
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
                    5. Thống kê Phiếu Lệnh Công tác
                  </span>
                  <span className="text-[11px] text-slate-500 pl-5">
                    Tiến độ hoàn thành theo từng loại nhiệm vụ (.csv)
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Nút Làm mới số liệu */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          {/* Nút Chế độ Trình chiếu / Toàn màn hình */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] shadow-xs"
              title={
                isFullscreen
                  ? 'Thu nhỏ cửa sổ bình thường (Esc)'
                  : 'Bật chế độ trình chiếu toàn màn hình (TV / Presentation)'
              }
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-teal-600" />
                  <span className="hidden sm:inline">Thu nhỏ</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-teal-600" />
                  <span className="hidden sm:inline">Trình chiếu</span>
                </>
              )}
            </button>
          )}
        </div>
      </section>
    </>
  )
}
