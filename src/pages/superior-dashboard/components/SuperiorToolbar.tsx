import React, { useState, useRef, useEffect } from 'react'
import {
  MapPin,
  Route,
  FileSpreadsheet,
  RefreshCw,
  ChevronDown,
  Clock,
  Download,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import type { SegmentListItem } from '../../../types/assets/segments'

interface SuperiorToolbarProps {
  communeName: string
  communeCode?: string
  totalPolesCount: number
  segments: SegmentListItem[]
  selectedSegmentId: string
  onSelectSegment: (segmentId: string) => void
  selectedPeriodDays: 7 | 30 | 90
  onChangePeriod: (days: 7 | 30 | 90) => void
  onExportCsv: (type: 'fixture-status' | 'repair-timeliness' | 'warranty') => void
  onRefresh: () => void
  isRefreshing?: boolean
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

export const SuperiorToolbar: React.FC<SuperiorToolbarProps> = ({
  communeName,
  communeCode = 'COM-001',
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
  const dropdownRef = useRef<HTMLDivElement>(null)

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
    <section className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      {/* Cụm bộ lọc bên trái */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
        {/* Thẻ hiển thị địa bàn Xã cố định của Superior */}
        <div
          className="inline-flex items-center gap-2 bg-blue-50/80 border border-blue-200/90 text-blue-800 px-3 py-1.5 rounded-xl text-xs font-bold"
          title={`Địa bàn xã được phân quyền cố định theo JWT: ${communeCode}`}
        >
          <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            {communeName} ({segments.length} tuyến • {totalPolesCount} cột)
          </span>
        </div>

        {/* Lọc Tuyến đường thuộc Xã */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs transition-colors hover:border-slate-300">
          <Route className="w-4 h-4 text-slate-500 shrink-0" />
          <label htmlFor="superiorSegmentSelect" className="text-slate-500 font-semibold whitespace-nowrap">
            Tuyến đường:
          </label>
          <select
            id="superiorSegmentSelect"
            value={selectedSegmentId}
            onChange={(e) => onSelectSegment(e.target.value)}
            className="bg-transparent border-none text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1"
          >
            <option value="all">Tất cả các tuyến trong xã ({segments.length} tuyến)</option>
            {segments.map((seg) => (
              <option key={seg.segment_id} value={seg.segment_id || ''}>
                {seg.segment_name || seg.segment_id} ({seg.pole_count || 0} cột)
              </option>
            ))}
          </select>
        </div>

        {/* Bộ chuyển chu kỳ đánh giá tiến độ sửa chữa đêm */}
        <div
          className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200"
          title="Khoảng thời gian đánh giá tiến độ sửa chữa đêm (from..to)"
        >
          <button
            type="button"
            onClick={() => onChangePeriod(7)}
            className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition-all cursor-pointer ${
              selectedPeriodDays === 7
                ? 'bg-white text-blue-600 font-bold shadow-xs'
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
                ? 'bg-white text-blue-600 font-bold shadow-xs'
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
                ? 'bg-white text-blue-600 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            90 đêm (Quý)
          </button>
        </div>
      </div>

      {/* Cụm thao tác xuất CSV & Refresh bên phải */}
      <div className="flex items-center gap-2.5">
        {/* Dropdown Xuất báo cáo CSV */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100/80 active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất báo cáo CSV</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`} />
          </button>

          {isExportOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-68 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  setIsExportOpen(false)
                  onExportCsv('fixture-status')
                }}
                className="w-full text-left p-2 rounded-xl hover:bg-slate-50 transition-colors flex flex-col gap-0.5 cursor-pointer"
              >
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  1. Hiện trạng Chiếu sáng
                </span>
                <span className="text-[11px] text-slate-500 pl-5">
                  Dữ liệu phân loại cột & bóng đèn (.csv)
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsExportOpen(false)
                  onExportCsv('repair-timeliness')
                }}
                className="w-full text-left p-2 rounded-xl hover:bg-slate-50 transition-colors flex flex-col gap-0.5 cursor-pointer border-t border-slate-100"
              >
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  2. Tiến độ & SLA Sửa chữa
                </span>
                <span className="text-[11px] text-slate-500 pl-5">
                  Đánh giá theo chu kỳ ngày đã chọn (.csv)
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsExportOpen(false)
                  onExportCsv('warranty')
                }}
                className="w-full text-left p-2 rounded-xl hover:bg-slate-50 transition-colors flex flex-col gap-0.5 cursor-pointer border-t border-slate-100"
              >
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                  3. Danh mục Bảo hành Thiết bị
                </span>
                <span className="text-[11px] text-slate-500 pl-5">
                  Thời hạn bảo hành và dự toán thay thế (.csv)
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          <span>Làm mới</span>
        </button>

        {/* Nút Chế độ Trình chiếu / Toàn màn hình */}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]"
            title={isFullscreen ? 'Thu nhỏ cửa sổ bình thường (Esc)' : 'Bật chế độ trình chiếu toàn màn hình (TV / Presentation)'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Thu nhỏ</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Trình chiếu</span>
              </>
            )}
          </button>
        )}
      </div>
    </section>
  )
}

