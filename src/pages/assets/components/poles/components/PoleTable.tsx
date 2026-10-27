import React, { useEffect } from 'react'
import { Eye, Edit2, Trash2, Zap, Bookmark, Lightbulb, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '../../../../../components/StatusBadge'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import type { FixtureStatus } from '../../../../../types/common/enums'
import { formatFriendlyCommuneName } from '../../../../../utils/assets/communeUtils'
import { PoleTableSkeleton } from './PoleTableSkeleton'

export interface PoleTableProps {
  poles: PoleListItem[]
  cabinets: CabinetListItem[]
  segments: SegmentListItem[]
  poleStatusMap?: Map<string, FixtureStatus>
  isLoading?: boolean
  flashingPoleCode?: string
  onViewDetail: (pole: PoleListItem) => void
  onEdit: (pole: PoleListItem) => void
  onDelete?: (pole: PoleListItem) => void
  onViewCabinetDetail: (cabinet: CabinetListItem) => void
  onSelectFixture?: (fixtureCode: string) => void
  onSelectCabinet?: (cabinetCode: string) => void
}

export const PoleTable: React.FC<PoleTableProps> = ({
  poles,
  cabinets,
  segments,
  poleStatusMap,
  isLoading = false,
  flashingPoleCode,
  onViewDetail,
  onEdit,
  onDelete,
  onViewCabinetDetail,
  onSelectFixture,
  onSelectCabinet,
}) => {
  // Scroll to active flashing pole row smoothly
  useEffect(() => {
    if (flashingPoleCode) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`pole-row-${flashingPoleCode.toLowerCase()}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [flashingPoleCode])

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3.5">Mã cột</th>
              <th className="p-3.5">Tuyến đường</th>
              <th className="p-3.5">Tủ điện quản lý</th>
              <th className="p-3.5">Tọa độ GIS</th>
              <th className="p-3.5">Ghi chú</th>
              <th className="p-3.5">Địa bàn</th>
              <th className="p-3.5">Mã bộ đèn</th>
              <th className="p-3.5">Trạng thái</th>
              <th className="p-3.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {isLoading ? (
              <PoleTableSkeleton rowCount={8} />
            ) : poles.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400 dark:text-slate-400 text-xs">
                  Không tìm thấy cột đèn nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              poles.map((pole) => {
                const seg = segments.find(
                  (s) => s.segment_id === pole.segment_id || (s.external_ref && s.external_ref.toLowerCase() === pole.segment_id?.toLowerCase())
                )
                const segmentName = seg?.segment_name || (seg?.external_ref ? `Tuyến ${seg.external_ref}` : 'Chưa gắn')

                const targetCab = cabinets.find(
                  (c) =>
                    (pole.cabinet_id && (c.cabinet_id === pole.cabinet_id || c.external_ref === pole.cabinet_id)) ||
                    c.cabinet_id === pole.feeder_id ||
                    (c.external_ref && c.external_ref.toLowerCase() === pole.feeder_id?.toLowerCase()) ||
                    (c.feeder_ids && pole.feeder_id && c.feeder_ids.includes(pole.feeder_id))
                )
                const cabName = targetCab?.cabinet_name || pole.cabinet_name || targetCab?.external_ref || ''
                const feederLabel = pole.feeder_id ? (cabName ? `${cabName} • ${pole.feeder_id}` : pole.feeder_id) : (cabName || 'Chưa gắn')

                // Trạng thái đo sáng trắc quang đồng bộ từ GIS map
                let fixtureStatus: FixtureStatus = 'unknown'
                let fixtureLabel: string | undefined = undefined

                if (!pole.active_fixture) {
                  fixtureStatus = 'out'
                  fixtureLabel = 'Chưa gắn bộ đèn'
                } else {
                  const statusFromMap =
                    (pole.pole_id && poleStatusMap?.get(pole.pole_id)) ||
                    (pole.external_ref && (poleStatusMap?.get(pole.external_ref) || poleStatusMap?.get(pole.external_ref.toLowerCase())))
                  // Phương án 1 (đã duyệt): Bóng mới thêm/chưa quét trắc quang mang trạng thái 'unknown' (Chưa quét)
                  fixtureStatus = statusFromMap || 'unknown'
                }

                const poleExternal = pole.external_ref || ''
                const isFlashing = Boolean(
                  flashingPoleCode &&
                  poleExternal &&
                  poleExternal.toLowerCase() === flashingPoleCode.toLowerCase()
                )

                return (
                  <tr
                    key={pole.external_ref || pole.pole_id || Math.random()}
                    id={poleExternal ? `pole-row-${poleExternal.toLowerCase()}` : undefined}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition ${
                      isFlashing ? 'animate-row-flash' : ''
                    }`}
                  >
                    <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-white">
                      {pole.external_ref}
                    </td>
                    <td className="p-3.5 font-medium text-slate-700 dark:text-slate-200 max-w-45 truncate" title={segmentName}>
                      {segmentName}
                    </td>
                    {/* Tủ điện quản lý */}
                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (targetCab?.external_ref && onSelectCabinet) {
                            onSelectCabinet(targetCab.external_ref)
                          } else if (targetCab) {
                            onViewCabinetDetail(targetCab)
                          } else {
                            toast.info('Chưa có thông tin mở rộng cho tủ điện này')
                          }
                        }}
                        className="cursor-pointer inline-flex flex-col items-start text-left group transition"
                        title={`Tủ điện: ${feederLabel} - Bấm xem chi tiết`}
                      >
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 font-semibold shadow-2xs group-hover:border-indigo-400 group-hover:bg-indigo-100/70 transition">
                          <Zap className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500 shrink-0" />
                          <span className="font-bold tracking-tight font-mono text-xs">{targetCab?.external_ref || 'Chưa gắn'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 pl-0.5 max-w-36 truncate">
                          {feederLabel}
                        </span>
                      </button>
                    </td>
                    {/* Tọa độ GIS */}
                    <td className="p-3.5">
                      {pole.location && (pole.location.lat || pole.location.lng) ? (
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{pole.location.lat.toFixed(5)}, {pole.location.lng.toFixed(5)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-mono text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {pole.note ? (
                        <div
                          className="inline-flex items-center gap-1.5 max-w-44 text-slate-700 dark:text-slate-300"
                          title={pole.note}
                        >
                          <Bookmark className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate font-medium">{pole.note}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-mono">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      {formatFriendlyCommuneName(pole.commune_name, pole.commune_id)}
                    </td>
                    <td className="p-3.5">
                      {pole.active_fixture ? (
                        (() => {
                          const fixtureCode =
                            pole.active_fixture?.fixture_id ||
                            (pole.external_ref ? `FIX-${pole.external_ref}` : 'FIX-CHƯA-ĐẶT')
                          const lampCount = pole.active_fixture?.lamp_count || 1
                          return (
                            <div className="inline-flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onSelectFixture) {
                                    onSelectFixture(fixtureCode)
                                  } else {
                                    toast.info(`Mã bộ đèn: ${fixtureCode}`)
                                  }
                                }}
                                className="cursor-pointer inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 font-semibold shadow-2xs hover:border-amber-400 hover:bg-amber-100/70 transition group"
                                title={`Mã bộ đèn: ${fixtureCode} • ${lampCount} bóng — Bấm để chuyển sang tab Bộ đèn`}
                              >
                                <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0 group-hover:scale-110 transition" />
                                <span className="font-bold font-mono text-xs">{fixtureCode}</span>
                              </button>
                              {lampCount > 1 ? (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                                  title={`Bộ đèn gồm ${lampCount} bóng`}
                                >
                                  x{lampCount}
                                </span>
                              ) : (
                                <span
                                  className="text-[10px] text-slate-400 font-mono"
                                  title="Bộ đèn 1 bóng"
                                >
                                  (1)
                                </span>
                              )}
                            </div>
                          )
                        })()
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-mono">—</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <StatusBadge type="fixture" status={fixtureStatus} label={fixtureLabel} size="sm" />
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onViewDetail(pole)}
                          title="Xem chi tiết"
                          aria-label="Chi tiết"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(pole)}
                          title="Chỉnh sửa cột đèn"
                          aria-label="Sửa"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(pole)}
                            title="Xóa cột đèn"
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
