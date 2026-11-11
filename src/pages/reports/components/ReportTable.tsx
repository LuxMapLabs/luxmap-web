import React from 'react'
import { FileText, Download, Wrench, Search as SearchIcon, Video, MapPin, ChevronRight, Check, Loader2, X } from 'lucide-react'
import type { SuperiorReportItem } from '../../../types/reports/report'

interface ReportTableProps {
  reports: SuperiorReportItem[]
  /** Tổng số lệnh sau khi lọc (không chỉ trang đang xem) */
  totalCount: number
  isLoading?: boolean
  onViewReport: (report: SuperiorReportItem) => void
  onExportPdf: (report: SuperiorReportItem) => void
  selectedIds: string[]
  onToggleSelect: (workOrderId: string) => void
  onToggleSelectAll: () => void
  onClearSelection: () => void
  onExportSelected: () => void
  isBulkExporting: boolean
}

const CARD =
  'rounded-[20px] border border-[#DCE8F3] bg-white shadow-[0_8px_24px_-14px_rgba(59,99,133,0.25)]'

const KindChip: React.FC<{ item: SuperiorReportItem }> = ({ item }) => {
  const isRepair = item.taskKind === 'repair'
  const isSurvey = item.taskKind === 'survey'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${
        isRepair
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : isSurvey
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-[#EEF4FA] text-[#3B6385] border-[#DCE8F3]'
      }`}
    >
      {isRepair && <Wrench className="h-3 w-3 shrink-0" />}
      {isSurvey && <Video className="h-3 w-3 shrink-0" />}
      {!isRepair && !isSurvey && <SearchIcon className="h-3 w-3 shrink-0" />}
      {item.taskKindName}
    </span>
  )
}

const Box: React.FC<{ checked: boolean; label: string; onChange: () => void }> = ({ checked, label, onChange }) => (
  <label className="inline-flex cursor-pointer items-center" onClick={(e) => e.stopPropagation()}>
    <input type="checkbox" checked={checked} onChange={onChange} aria-label={label} className="peer sr-only" />
    <span
      aria-hidden
      className={`flex h-5 w-5 items-center justify-center rounded-md border transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#8FB8DA] ${
        checked ? 'border-[#4A7AA3] bg-[#4A7AA3] text-white' : 'border-slate-300 bg-white text-transparent hover:border-[#8FB8DA]'
      }`}
    >
      <Check className="h-3.5 w-3.5" />
    </span>
  </label>
)

const RowActions: React.FC<{
  item: SuperiorReportItem
  onViewReport: (report: SuperiorReportItem) => void
  onExportPdf: (report: SuperiorReportItem) => void
}> = ({ item, onViewReport, onExportPdf }) => (
  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
    <button
      type="button"
      onClick={() => onViewReport(item)}
      title="Xem báo cáo"
      aria-label={`Xem báo cáo ${item.workOrderId}`}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DCE8F3] bg-[#F3F8FC] text-[#3B6385] hover:bg-[#4A7AA3] hover:text-white transition cursor-pointer active:scale-95"
    >
      <FileText className="h-4 w-4" />
    </button>
    <button
      type="button"
      onClick={() => onExportPdf(item)}
      title="Xuất PDF"
      aria-label={`Xuất PDF ${item.workOrderId}`}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DCE8F3] bg-white text-slate-500 hover:border-[#8FB8DA] hover:bg-[#EEF4FA] hover:text-[#3B6385] transition cursor-pointer active:scale-95"
    >
      <Download className="h-4 w-4" />
    </button>
  </div>
)

export const ReportTable: React.FC<ReportTableProps> = ({
  reports,
  totalCount,
  isLoading = false,
  onViewReport,
  onExportPdf,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  onExportSelected,
  isBulkExporting,
}) => {
  if (isLoading) {
    return (
      <div className={`${CARD} p-12 flex flex-col items-center justify-center gap-3`}>
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#4A7AA3] border-t-transparent" />
        <p className="text-xs font-semibold text-slate-500">Đang tải danh sách báo cáo nghiệm thu...</p>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className={`${CARD} p-12 text-center`}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FA] text-[#4A7AA3]">
          <FileText className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">Không có báo cáo nghiệm thu phù hợp</h4>
        <p className="mt-1 text-xs text-slate-500">
          Hãy đổi loại công tác hoặc chọn tháng khác để tìm hồ sơ.
        </p>
      </div>
    )
  }

  const allSelected = reports.length > 0 && reports.every((r) => selectedIds.includes(r.workOrderId))
  const someSelected = selectedIds.length > 0

  return (
    <div className={`${CARD} shrink-0 overflow-hidden`}>
      <div className="flex h-[60px] items-center justify-between gap-3 border-b border-[#E4EFF8] px-5">
        <h3 className="text-[15px] font-extrabold text-slate-900">Báo cáo nghiệm thu</h3>
        {someSelected ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#3B6385]">Đã chọn {selectedIds.length}</span>
            <button
              type="button"
              onClick={onClearSelection}
              disabled={isBulkExporting}
              title="Bỏ chọn"
              aria-label="Bỏ chọn tất cả"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-[#EEF4FA] disabled:opacity-50 cursor-pointer transition"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onExportSelected}
              disabled={isBulkExporting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#4A7AA3] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#3B6385] disabled:opacity-60 cursor-pointer transition active:scale-95"
            >
              {isBulkExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {isBulkExporting ? 'Đang tạo PDF...' : `Tải ${selectedIds.length} biên bản PDF`}
            </button>
          </div>
        ) : (
          <span className="rounded-full bg-[#EEF4FA] px-3 py-1 text-xs font-bold text-[#3B6385]">
            {totalCount} lệnh đã nghiệm thu
          </span>
        )}
      </div>

      {/* Màn hình rộng: bảng 4 cột, không cuộn ngang */}
      <table className="hidden w-full table-fixed border-collapse text-left md:table">
        <thead>
          <tr className="border-b border-[#E4EFF8] bg-[#F8FBFD] text-xs font-bold text-slate-500 select-none">
            <th className="w-12 pl-5 py-3">
              <Box checked={allSelected} label="Chọn tất cả" onChange={onToggleSelectAll} />
            </th>
            <th className="w-[17%] px-3 py-3">Mã lệnh</th>
            <th className="px-3 py-3">Tiêu đề và tuyến đường</th>
            <th className="w-[22%] px-3 py-3">Người phụ trách</th>
            <th className="w-[21%] px-5 py-3 text-right">Nghiệm thu</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E4EFF8] text-xs text-slate-700">
          {reports.map((item) => (
            <tr
              key={item.workOrderId}
              onClick={() => onViewReport(item)}
              className={`group cursor-pointer transition-colors hover:bg-[#F3F8FC] ${
                selectedIds.includes(item.workOrderId) ? 'bg-[#F3F8FC]' : ''
              }`}
            >
              <td className="pl-5 py-3.5 align-middle">
                <Box
                  checked={selectedIds.includes(item.workOrderId)}
                  label={`Chọn ${item.workOrderId}`}
                  onChange={() => onToggleSelect(item.workOrderId)}
                />
              </td>
              <td className="px-3 py-3.5 align-middle">
                <div className="font-mono text-[13px] font-bold text-[#3B6385] truncate">{item.workOrderId}</div>
                <div className="mt-1.5">
                  <KindChip item={item} />
                </div>
              </td>
              <td className="px-3 py-3.5 align-middle">
                <div className="text-[13px] font-bold text-slate-900 group-hover:text-[#3B6385] transition-colors line-clamp-2">
                  {item.title}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 min-w-0">
                  <MapPin className="h-3 w-3 shrink-0 text-[#4A7AA3]" />
                  <span className="truncate">
                    {item.road} · <strong className="font-semibold text-slate-600">{item.communeName}</strong>
                  </span>
                </div>
              </td>
              <td className="px-3 py-3.5 align-middle">
                <div className="truncate text-[13px] font-semibold text-slate-800">{item.engineerName}</div>
                <div className="mt-0.5 truncate text-[11px] text-slate-500">Duyệt: {item.managerName}</div>
              </td>
              <td className="px-5 py-3.5 align-middle">
                <div className="flex items-center justify-end gap-3">
                  <span className="text-[13px] font-bold text-slate-700">{item.verifiedDate}</span>
                  <RowActions item={item} onViewReport={onViewReport} onExportPdf={onExportPdf} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Màn hình hẹp: mỗi lệnh là một thẻ */}
      <ul className="divide-y divide-[#E4EFF8] md:hidden">
        {reports.map((item) => (
          <li
            key={item.workOrderId}
            onClick={() => onViewReport(item)}
            className="cursor-pointer px-4 py-3.5 transition-colors active:bg-[#F3F8FC]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2.5">
                <Box
                  checked={selectedIds.includes(item.workOrderId)}
                  label={`Chọn ${item.workOrderId}`}
                  onChange={() => onToggleSelect(item.workOrderId)}
                />
                <span className="font-mono text-[13px] font-bold text-[#3B6385]">{item.workOrderId}</span>
              </span>
              <KindChip item={item} />
            </div>
            <div className="mt-1.5 text-[13px] font-bold text-slate-900">{item.title}</div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
              <MapPin className="h-3 w-3 shrink-0 text-[#4A7AA3]" />
              <span className="truncate">
                {item.road} · {item.communeName}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="min-w-0 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">{item.engineerName}</span> · Duyệt: {item.managerName} ·{' '}
                {item.verifiedDate}
              </div>
              <div className="flex items-center gap-1">
                <RowActions item={item} onViewReport={onViewReport} onExportPdf={onExportPdf} />
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
