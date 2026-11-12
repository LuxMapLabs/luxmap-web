import { useShowCommune } from '../../../../../hooks/useShowCommune'
import React, { useEffect } from 'react'
import { RowActions } from '../../common/RowActions'
import { Trash2, Zap, Bookmark, Lightbulb, MapPin } from 'lucide-react'
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
  /** Các pole_id đang được chọn để in tem QR */
  selectedPoleIds?: Set<string>
  onToggleSelect?: (pole: PoleListItem) => void
  onTogglePage?: (checked: boolean) => void
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
  selectedPoleIds,
  onToggleSelect,
  onTogglePage,
}) => {
  const showCommune = useShowCommune()
  const selectablePoles = poles.filter((p) => Boolean(p.pole_id))
  const isPoleSelected = (p: PoleListItem) => Boolean(p.pole_id && selectedPoleIds?.has(p.pole_id))
  const selectedOnPage = selectablePoles.filter(isPoleSelected).length
  const allOnPageSelected = selectablePoles.length > 0 && selectedOnPage === selectablePoles.length
  const someOnPageSelected = selectedOnPage > 0 && !allOnPageSelected

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
    <div className="ops-rise bg-white dark:bg-slate-900 rounded-[20px] shadow-ops overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f8fafc] dark:bg-slate-950/80 text-slate-500 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3.5 w-10">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả cột đèn trong trang này để in tem QR"
                  title="Chọn tất cả cột trong trang này"
                  checked={allOnPageSelected}
                  disabled={isLoading || selectablePoles.length === 0}
                  ref={(el) => {
                    if (el) el.indeterminate = someOnPageSelected
                  }}
                  onChange={(e) => onTogglePage?.(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-primary cursor-pointer disabled:cursor-not-allowed"
                />
              </th>
              <th className="p-3.5">Mã cột</th>
              <th className="p-3.5">Tuyến đường</th>
              <th className="p-3.5">Tủ điện quản lý</th>
              <th className="p-3.5">Tọa độ GIS</th>
              <th className="p-3.5">Ghi chú</th>
              {showCommune && <th className="p-3.5">Địa bàn</th>}
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
                <td colSpan={showCommune ? 10 : 9} className="p-8 text-center text-slate-400 dark:text-slate-400 text-xs">
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
                    className={`hover:bg-teal-50/40 dark:hover:bg-slate-800/80 hover:shadow-[inset_3px_0_0_#be457a] transition-all ${
                      isFlashing ? 'animate-row-flash' : ''
                    } ${isPoleSelected(pole) ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''}`}
                  >
                    <td className="p-3.5 w-10">
                      <input
                        type="checkbox"
                        aria-label={`Chọn cột ${pole.external_ref || pole.pole_id} để in tem QR`}
                        checked={isPoleSelected(pole)}
                        onChange={() => onToggleSelect?.(pole)}
                        className="w-4 h-4 rounded border-slate-300 accent-primary cursor-pointer"
                      />
                    </td>
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
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold">
                          Chưa có GPS
                        </span>
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
                    {showCommune && (
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        {formatFriendlyCommuneName(pole.commune_name, pole.commune_id)}
                      </td>
                    )}
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
                                className="cursor-pointer inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold shadow-2xs hover:border-teal-400 hover:bg-teal-50 transition group"
                                title={`Mã bộ đèn: ${fixtureCode} • ${lampCount} bóng — Bấm để chuyển sang tab Bộ đèn`}
                              >
                                <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0 group-hover:scale-110 transition" />
                                <span className="font-bold font-mono text-xs">{fixtureCode}</span>
                              </button>
                              {lampCount > 1 ? (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
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
                      <RowActions
                        viewLabel="Xem chi tiết cột đèn"
                        editLabel="Chỉnh sửa cột đèn"
                        onView={() => onViewDetail(pole)}
                        onEdit={() => onEdit(pole)}
                        menuItems={onDelete ? [{ key: 'delete', label: 'Xóa cột đèn', icon: <Trash2 />, danger: true, onClick: () => onDelete?.(pole) }] : []}
                      />
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
