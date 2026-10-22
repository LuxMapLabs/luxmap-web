import React from 'react'
import { Eye, Edit2, Trash2, Zap, AlertCircle, MapPin, Cable } from 'lucide-react'
import type { FeederListItem } from '../../../../../types/assets/feeders'

export interface FeederTableProps {
  feeders: FeederListItem[]
  isLoading?: boolean
  flashingFeederId?: string
  onViewDetail: (feeder: FeederListItem) => void
  onEdit: (feeder: FeederListItem) => void
  onDelete: (feederId: string) => void
}

export const FeederTable: React.FC<FeederTableProps> = ({
  feeders,
  isLoading = false,
  flashingFeederId,
  onViewDetail,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mb-3" />
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
          Đang tải danh mục mạch điện chiếu sáng...
        </p>
      </div>
    )
  }

  if (feeders.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-800/60 shadow-sm">
          <Zap className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
          Chưa có mạch điện nào
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto mb-4">
          Hệ thống chưa ghi nhận mạch xuất tuyến nào. Bạn có thể thêm mạch mới hoặc nạp dữ liệu từ file CSV.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold select-none uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Mã Mạch</th>
              <th className="py-3 px-4">Tên Mạch Xuất Tuyến</th>
              <th className="py-3 px-4">Tủ Điện Cấp Nguồn</th>
              <th className="py-3 px-4">Địa bàn</th>
              <th className="py-3 px-4 text-center">Số Cột Đèn</th>
              <th className="py-3 px-4 text-center">Tuyến Cáp (GIS)</th>
              <th className="py-3 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {feeders.map((feeder) => {
              const isFlashing =
                flashingFeederId &&
                (feeder.feeder_id === flashingFeederId || feeder.external_ref === flashingFeederId)

              return (
                <tr
                  key={feeder.feeder_id || feeder.external_ref || Math.random().toString()}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                    isFlashing
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-l-4 border-l-emerald-500 animate-pulse'
                      : ''
                  }`}
                >
                  {/* Mã Mạch */}
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {feeder.external_ref || feeder.feeder_id || 'Chưa cấp mã'}
                  </td>

                  {/* Tên Mạch */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
                        <Cable className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {feeder.feeder_name || 'Mạch chiếu sáng'}
                      </span>
                    </div>
                  </td>

                  {/* Tủ Điện Cấp Nguồn */}
                  <td className="py-3.5 px-4">
                    {feeder.cabinet?.cabinet_name || feeder.cabinet?.cabinet_id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          ⚡ {feeder.cabinet.cabinet_name || feeder.cabinet.cabinet_id}
                        </span>
                        <span className="font-mono text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-full font-bold">
                          {feeder.cabinet.cabinet_id}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px] flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        Chưa gắn tủ điện
                      </span>
                    )}
                  </td>

                  {/* Địa bàn */}
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{feeder.commune_name || feeder.commune_id || '—'}</span>
                    </div>
                  </td>

                  {/* Số Cột Đèn */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center font-bold px-2.5 py-0.5 rounded-full text-xs font-mono ${
                        feeder.pole_count > 0
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {feeder.pole_count} cột
                    </span>
                  </td>

                  {/* Tuyến Cáp GIS */}
                  <td className="py-3.5 px-4 text-center">
                    {feeder.has_geometry ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        ✓ Có tuyến cáp
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        Chưa số hóa cáp
                      </span>
                    )}
                  </td>

                  {/* Thao Tác */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onViewDetail(feeder)}
                        title="Xem chi tiết & Cột đèn đấu nối"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(feeder)}
                        title="Chỉnh sửa thông số mạch"
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (feeder.feeder_id) {
                            if (
                              window.confirm(
                                `Bạn có chắc chắn muốn xóa mạch điện "${feeder.feeder_name || feeder.feeder_id}"? Thao tác này không thể hoàn tác.`
                              )
                            ) {
                              onDelete(feeder.feeder_id)
                            }
                          }
                        }}
                        title="Xóa mạch điện"
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
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
