import React from 'react'
import { Eye, Edit2, MapPin, Compass, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react'
import type { CommuneItem } from '../../../types/admin/communes'

export interface CommuneTableProps {
  communes: CommuneItem[]
  isLoading?: boolean
  onViewDetail: (commune: CommuneItem) => void
  onEdit: (commune: CommuneItem) => void
}

export const CommuneTable: React.FC<CommuneTableProps> = ({
  communes,
  isLoading = false,
  onViewDetail,
  onEdit,
}) => {
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-8 text-center text-xs text-slate-400">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Đang tải danh sách địa bàn hành chính...</span>
        </div>
      </div>
    )
  }

  if (communes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-12 text-center text-xs text-slate-400 space-y-2">
        <Compass className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="font-bold text-slate-600">Không tìm thấy địa bàn phù hợp</p>
        <p className="text-[11px] text-slate-400">Thử thay đổi từ khóa tìm kiếm hoặc thiết lập lại bộ lọc trạng thái BBox.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden text-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Mã Địa Bàn</th>
              <th className="py-3 px-4">Tên Xã / Thị Trấn</th>
              <th className="py-3 px-4">Khung Bản Đồ (BBox)</th>
              <th className="py-3 px-4">Tâm Bản Đồ (Center)</th>
              <th className="py-3 px-4">Ngày Cập Nhật</th>
              <th className="py-3 px-4 text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {communes.map((item) => {
              const hasBbox = Boolean(item.bbox)
              return (
                <tr
                  key={item.commune_id}
                  className="hover:bg-blue-50/40 transition group"
                >
                  {/* Mã địa bàn */}
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 text-xs">
                      {item.commune_id}
                    </span>
                  </td>

                  {/* Tên địa bàn */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200/70 text-blue-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span className="group-hover:text-blue-600 transition-colors">
                        {item.name || 'Chưa đặt tên'}
                      </span>
                    </div>
                  </td>

                  {/* Trạng thái BBox */}
                  <td className="py-3.5 px-4">
                    {hasBbox && item.bbox && typeof item.bbox.min_lng === 'number' && typeof item.bbox.min_lat === 'number' && typeof item.bbox.max_lng === 'number' && typeof item.bbox.max_lat === 'number' ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="font-mono">
                          [{item.bbox.min_lng.toFixed(2)}, {item.bbox.min_lat.toFixed(2)} → {item.bbox.max_lng.toFixed(2)}, {item.bbox.max_lat.toFixed(2)}]
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/90 shadow-2xs">
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>Chưa thiết lập BBox</span>
                      </span>
                    )}
                  </td>

                  {/* Tâm toạ độ */}
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/70">
                      {item.center?.lat && item.center?.lng
                        ? `${item.center.lat.toFixed(4)}, ${item.center.lng.toFixed(4)}`
                        : '—'}
                    </span>
                  </td>

                  {/* Ngày cập nhật */}
                  <td className="py-3.5 px-4 text-slate-500">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(item.updated_at || item.created_at)}</span>
                    </div>
                  </td>

                  {/* Thao tác */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewDetail(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition cursor-pointer"
                        title="Xem chi tiết địa bàn và khung BBox"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition cursor-pointer"
                        title="Chỉnh sửa địa bàn và vẽ lại BBox"
                      >
                        <Edit2 className="w-4 h-4" />
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
export default CommuneTable
