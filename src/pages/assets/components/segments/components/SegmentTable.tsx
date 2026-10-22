import React from 'react'
import { Eye, Edit2, Database } from 'lucide-react'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import { SegmentTableSkeleton } from './SegmentTableSkeleton'
import { getDataSourceDisplayName } from '../../../../../constants/enums'

export interface SegmentTableProps {
  segments: SegmentListItem[]
  isLoading?: boolean
  onViewDetail: (segment: SegmentListItem) => void
  onEdit: (segment: SegmentListItem) => void
}

export const SegmentTable: React.FC<SegmentTableProps> = ({
  segments,
  isLoading = false,
  onViewDetail,
  onEdit,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3.5">Mã tuyến</th>
              <th className="p-3.5">Tên tuyến đường</th>
              <th className="p-3.5">Cấp đường</th>
              <th className="p-3.5">Chiều dài (m)</th>
              <th className="p-3.5">Số cột chiếu sáng</th>
              <th className="p-3.5">Địa bàn</th>
              <th className="p-3.5">Nguồn dữ liệu</th>
              <th className="p-3.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {isLoading ? (
              <SegmentTableSkeleton rowCount={8} />
            ) : segments.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-400 text-xs">
                  Không tìm thấy tuyến đường nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              segments.map((seg) => (
                <tr key={seg.external_ref || seg.segment_id || Math.random()} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition">
                  <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-white">
                    {seg.external_ref}
                  </td>
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white max-w-60 truncate">
                    {seg.segment_name}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${
                        seg.road_class === 'inter_commune'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 border-blue-200 dark:border-blue-800/60'
                          : seg.road_class === 'inter_village'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {seg.road_class === 'inter_commune'
                        ? 'Đường liên xã'
                        : seg.road_class === 'inter_village'
                        ? 'Đường liên thôn'
                        : 'Đường ngõ xóm'}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {seg.length_m.toLocaleString()} m ({((seg.length_m) / 1000).toFixed(1)} km)
                  </td>
                  <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {seg.pole_count} cột
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">
                    {seg.commune_name || seg.commune_id || '—'}
                  </td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-sky-300 border border-blue-200/60 dark:border-blue-800/60 whitespace-nowrap">
                      <Database className="w-3 h-3 text-blue-500 shrink-0" />
                      <span>{getDataSourceDisplayName(seg.data_source)}</span>
                    </span>
                  </td>
                  <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onViewDetail(seg)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-sky-300 font-bold rounded-lg text-xs transition cursor-pointer inline-flex items-center gap-1 border border-transparent dark:border-sky-500/20"
                    >
                      <Eye className="w-3 h-3 text-sky-400" />
                      <span>Chi tiết</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(seg)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-xs transition cursor-pointer inline-flex items-center gap-1 border border-transparent dark:border-slate-700"
                    >
                      <Edit2 className="w-3 h-3 text-slate-400" />
                      <span>Sửa</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
