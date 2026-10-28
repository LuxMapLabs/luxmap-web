import React, { useEffect } from 'react'
import { Eye, Edit2, Trash2, Zap, CheckCircle, MapPin } from 'lucide-react'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import { formatFriendlyCommuneName } from '../../../../../utils/assets/communeUtils'
import { CabinetTableSkeleton } from './CabinetTableSkeleton'

export interface CabinetTableProps {
  cabinets: CabinetListItem[]
  isLoading?: boolean
  flashingCabinetCode?: string
  onViewDetail: (cabinet: CabinetListItem) => void
  onEdit: (cabinet: CabinetListItem) => void
  onDelete?: (cabinet: CabinetListItem) => void
}

export const CabinetTable: React.FC<CabinetTableProps> = ({
  cabinets,
  isLoading = false,
  flashingCabinetCode,
  onViewDetail,
  onEdit,
  onDelete,
}) => {
  // Scroll to active flashing cabinet row smoothly
  useEffect(() => {
    if (flashingCabinetCode) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`cabinet-row-${flashingCabinetCode.toLowerCase()}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [flashingCabinetCode])

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3.5">Mã tủ điện</th>
              <th className="p-3.5">Tên tủ điện</th>
              <th className="p-3.5">Địa bàn</th>
              <th className="p-3.5">Số mạch nguồn</th>
              <th className="p-3.5">Tọa độ GIS</th>
              <th className="p-3.5">Nguồn dữ liệu</th>
              <th className="p-3.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {isLoading ? (
              <CabinetTableSkeleton rowCount={8} />
            ) : cabinets.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-400 text-xs">
                  Không tìm thấy tủ điện nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              cabinets.map((cab) => {
                const cabExternal = cab.external_ref || ''
                const isFlashing = Boolean(
                  flashingCabinetCode &&
                  cabExternal &&
                  cabExternal.toLowerCase() === flashingCabinetCode.toLowerCase()
                )
                const hasGeo = Boolean(cab.location?.lat && cab.location?.lng)

                return (
                  <tr
                    key={cab.external_ref || cab.cabinet_id || Math.random()}
                    id={cabExternal ? `cabinet-row-${cabExternal.toLowerCase()}` : undefined}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition ${
                      isFlashing ? 'animate-row-flash' : ''
                    }`}
                  >
                  <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-white">
                    {cab.external_ref || cab.cabinet_id}
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>{cab.cabinet_name || cab.external_ref || cab.cabinet_id}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">
                    {formatFriendlyCommuneName(cab.commune_name, cab.commune_id)}
                  </td>
                  <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {cab.feeder_ids?.length || 0} mạch
                  </td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      <span>{hasGeo ? `${cab.location.lat.toFixed(4)}, ${cab.location.lng.toFixed(4)}` : 'Chưa định vị'}</span>
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{cab.data_source || 'field'}</span>
                    </span>
                  </td>
                  <td className="p-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onViewDetail(cab)}
                        title="Xem chi tiết"
                        aria-label="Chi tiết"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(cab)}
                        title="Chỉnh sửa tủ điện"
                        aria-label="Sửa"
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(cab)}
                          title="Xóa tủ điện"
                          aria-label="Xóa"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
        </table>
      </div>
    </div>
  )
}
