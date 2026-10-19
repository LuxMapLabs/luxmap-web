import React from 'react'
import {
  LightbulbOff,
  ZapOff,
  AlertTriangle,
  HelpCircle,
  Camera,
  Users,
  ChevronRight,
  Inbox,
  AlertCircle,
  CheckCircle2,
  GitMerge,
  XCircle,
} from 'lucide-react'
import type { CitizenReportItem } from '../../../types/citizen-reports/citizen-reports'
import type { CitizenReportKind, CitizenReportStatus } from '../../../types/common/enums'
import type { PoleListItem } from '../../../types/assets/poles'
import { TablePagination } from '../../assets/components/common/TablePagination'

export interface CitizenReviewTableProps {
  items: CitizenReportItem[]
  poles?: PoleListItem[]
  total: number
  page: number
  pageSize: number
  isLoading: boolean
  onPageChange: (page: number) => void
  onSelectReport: (reportId: string) => void
}

/**
 * Render biểu tượng và nhãn loại sự cố dân báo
 */
const renderKindBadge = (kind: CitizenReportKind) => {
  switch (kind) {
    case 'lamp_out':
      return (
        <span
          key={kind}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-semibold"
          title="Đèn tắt hoàn toàn"
        >
          <LightbulbOff className="w-3 h-3" />
          <span>Đèn tắt</span>
        </span>
      )
    case 'lamp_dim':
      return (
        <span
          key={kind}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px] font-semibold"
          title="Đèn sáng yếu / chập chờn"
        >
          <ZapOff className="w-3 h-3" />
          <span>Sáng yếu</span>
        </span>
      )
    case 'pole_damaged':
      return (
        <span
          key={kind}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-[11px] font-semibold"
          title="Cột đèn nghiêng / hỏng móng"
        >
          <AlertTriangle className="w-3 h-3" />
          <span>Hỏng cột</span>
        </span>
      )
    case 'other':
    default:
      return (
        <span
          key={kind}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold"
          title="Sự cố nguy hiểm khác"
        >
          <HelpCircle className="w-3 h-3" />
          <span>Khác</span>
        </span>
      )
  }
}

/**
 * Render Huy hiệu trạng thái duyệt
 */
const renderStatusBadge = (status: CitizenReportStatus) => {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>Chờ duyệt</span>
        </span>
      )
    case 'accepted':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
          <CheckCircle2 className="w-3 h-3" />
          <span>Đã tạo Fault</span>
        </span>
      )
    case 'merged':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
          <GitMerge className="w-3 h-3" />
          <span>Đã gộp</span>
        </span>
      )
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
          <XCircle className="w-3 h-3" />
          <span>Từ chối</span>
        </span>
      )
    default:
      return null
  }
}

/**
 * Format thời gian hiển thị thân thiện
 */
const formatTimeAgo = (isoString?: string | null): string => {
  if (!isoString) return '-'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return '-'
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)

    if (diffSec < 60) return 'Vừa xong'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

export const CitizenReviewTable: React.FC<CitizenReviewTableProps> = ({
  items,
  poles = [],
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onSelectReport,
}) => {
  const totalPages = Math.ceil(total / pageSize) || 1

  // Map tra cứu nhanh external_ref theo pole_id
  const poleCodeMap = React.useMemo(() => {
    const map = new Map<string, string>()
    poles.forEach((p) => {
      if (p.pole_id && p.external_ref) {
        map.set(p.pole_id, p.external_ref)
      }
    })
    return map
  }, [poles])

  return (
    <div className="space-y-3">
      {/* Container Bảng Dữ Liệu */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10.5px]">
              <tr>
                <th className="py-3 px-3.5">Thời gian & Đêm</th>
                <th className="py-3 px-3.5">Cột đèn & Vị trí</th>
                <th className="py-3 px-3.5">Hiện trạng dân báo</th>
                <th className="py-3 px-3.5 text-center">Lượt gửi / Ảnh</th>
                <th className="py-3 px-3.5">Cảnh báo vị trí</th>
                <th className="py-3 px-3.5">Trạng thái</th>
                <th className="py-3 px-3.5 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {isLoading ? (
                // Skeleton loading rows
                Array.from({ length: pageSize }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3 px-3.5">
                      <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-1.5" />
                      <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-1.5" />
                      <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-md" />
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="h-7 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
                      <span className="text-xs font-medium">
                        Không có phản ánh nào phù hợp với bộ lọc hiện tại.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.report_id || `${item.pole_id}-${item.night_of}`}
                    onClick={() => item.report_id && onSelectReport(item.report_id)}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    {/* Cột thời gian */}
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        Đêm {item.night_of || '-'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatTimeAgo(item.last_submitted_at || item.created_at)}
                      </div>
                    </td>

                    {/* Cột cột đèn & địa bàn (Ưu tiên hiển thị external_ref thực địa) */}
                    <td className="py-3 px-3.5">
                      {(() => {
                        const externalRef = item.pole_id ? poleCodeMap.get(item.pole_id) : null
                        const primaryCode = externalRef || item.pole_id || '-'

                        return (
                          <div>
                            <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                              {primaryCode}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                              {item.commune_id || 'Chưa định địa bàn'}
                            </div>
                          </div>
                        )
                      })()}
                    </td>

                    {/* Cột hiện trạng */}
                    <td className="py-3 px-3.5">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(item.kinds) && item.kinds.length > 0 ? (
                          item.kinds.map((k) => renderKindBadge(k))
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </div>
                    </td>

                    {/* Cột lượt gửi / ảnh */}
                    <td className="py-3 px-3.5 text-center">
                      <div className="inline-flex items-center gap-2 font-medium">
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300"
                          title={`${item.submission_count} lượt người dân gửi phản ánh`}
                        >
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{item.submission_count}</span>
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300"
                          title={`${item.photo_count} ảnh chụp hiện trường`}
                        >
                          <Camera className="w-3 h-3 text-slate-400" />
                          <span>{item.photo_count}</span>
                        </span>
                      </div>
                    </td>

                    {/* Cột cảnh báo xa cột */}
                    <td className="py-3 px-3.5">
                      {item.far_from_pole ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 text-[10.5px] font-semibold"
                          title="Tọa độ người dân gửi cách cột đèn >200m, cần kiểm tra kỹ ảnh hiện trường!"
                        >
                          <AlertCircle className="w-3 h-3 shrink-0 text-amber-600" />
                          <span>&gt; 200m</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Chuẩn vị trí
                        </span>
                      )}
                    </td>

                    {/* Cột trạng thái */}
                    <td className="py-3 px-3.5">
                      {renderStatusBadge(item.status)}
                    </td>

                    {/* Cột thao tác */}
                    <td className="py-3 px-3.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (item.report_id) onSelectReport(item.report_id)
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 text-xs font-semibold transition shadow-2xs cursor-pointer"
                      >
                        <span>{item.status === 'pending' ? 'Thẩm định' : 'Xem chi tiết'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phân trang */}
      <TablePagination
        currentListLength={total}
        currentPage={page}
        pageSize={pageSize}
        totalPages={totalPages}
        unitLabel="phản ánh"
        isLoading={isLoading}
        onPageChange={onPageChange}
      />
    </div>
  )
}
