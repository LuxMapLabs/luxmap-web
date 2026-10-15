import React from 'react'
import { FileText, Download, Wrench, Search as SearchIcon, Video } from 'lucide-react'
import type { SuperiorReportItem } from '../../../types/reports/report'

interface ReportTableProps {
  reports: SuperiorReportItem[]
  isLoading?: boolean
  onViewReport: (report: SuperiorReportItem) => void
  onExportPdf: (report: SuperiorReportItem) => void
}

export const ReportTable: React.FC<ReportTableProps> = ({
  reports,
  isLoading = false,
  onViewReport,
  onExportPdf,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Đang tải danh sách báo cáo nghiệm thu...</p>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 text-xl">
          📑
        </div>
        <h4 className="text-sm font-bold text-slate-800">Không tìm thấy báo cáo nghiệm thu phù hợp</h4>
        <p className="text-xs text-slate-400 mt-1">
          Hãy thử đổi bộ lọc giai đoạn, xã hoặc chọn tháng khác để tìm kiếm hồ sơ.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-slate-900">
          Danh Sách Báo Cáo Nghiệm Thu
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
              <th className="py-3 px-4">Mã lệnh công tác</th>
              <th className="py-3 px-4">Tiêu đề & Tuyến đường</th>
              <th className="py-3 px-4">Loại công tác</th>
              <th className="py-3 px-4">Quản lý thẩm duyệt</th>
              <th className="py-3 px-4">Kỹ sư thực hiện</th>
              <th className="py-3 px-4">Ngày nghiệm thu</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {reports.map((item) => {
              const isRepair = item.taskKind === 'repair'
              const isSurvey = item.taskKind === 'survey'

              return (
                <tr
                  key={item.workOrderId}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => onViewReport(item)}
                >
                  {/* Cột 1: Mã lệnh công tác */}
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                    <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg shadow-2xs">
                      {item.workOrderId}
                    </span>
                  </td>

                  {/* Cột 2: Tiêu đề & Tuyến đường */}
                  <td className="py-3.5 px-4 min-w-[260px]">
                    <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>📍</span>
                      <span>{item.road}</span>
                      <span>•</span>
                      <strong className="text-slate-600 font-semibold">{item.communeName}</strong>
                    </div>
                  </td>

                  {/* Cột 3: Loại công tác */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        isRepair
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isSurvey
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {isRepair && <Wrench className="w-3 h-3 shrink-0" />}
                      {isSurvey && <Video className="w-3 h-3 shrink-0" />}
                      {!isRepair && !isSurvey && <SearchIcon className="w-3 h-3 shrink-0" />}
                      <span>{item.taskKindName}</span>
                    </span>
                  </td>

                  {/* Cột 4: Quản lý thẩm duyệt (Chỉ tên sạch) */}
                  <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                    {item.managerName}
                  </td>

                  {/* Cột 5: Kỹ sư thực hiện (Chỉ tên sạch) */}
                  <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                    {item.engineerName}
                  </td>

                  {/* Cột 6: Ngày nghiệm thu (Chỉ ngày) */}
                  <td className="py-3.5 px-4 font-bold text-slate-700 whitespace-nowrap">
                    {item.verifiedDate}
                  </td>

                  {/* Cột 7: Thao tác */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onViewReport(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Xem báo cáo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onExportPdf(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
                        title="Xuất file PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
