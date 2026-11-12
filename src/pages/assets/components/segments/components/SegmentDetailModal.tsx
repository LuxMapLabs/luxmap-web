import { useShowCommune } from '../../../../../hooks/useShowCommune'
import React, { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSelector } from 'react-redux'
import { X, Route, MapPin, CheckCircle2 } from 'lucide-react'
import { SegmentRouteMap, SegmentPoleItem } from '../../../../../components/SegmentRouteMap'
import { extractSegmentCoordinates } from '../../../../../utils/gis-map/routeUtils'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import type { RootState } from '../../../../../redux/rootReducer'
import { getDataSourceDisplayName } from '../../../../../constants/enums'
import { formatFriendlyCommuneName } from '../../../../../utils/assets/communeUtils'

interface SegmentDetailModalProps {
  segment: SegmentListItem | null
  onClose: () => void
}

export const SegmentDetailModal: React.FC<SegmentDetailModalProps> = ({
  segment,
  onClose,
}) => {
  const showCommune = useShowCommune()
  const allPoles = useSelector((state: RootState) => state.assets.poles)

  const segmentPoles = useMemo<SegmentPoleItem[]>(() => {
    if (!segment?.segment_id) return []
    return allPoles
      .filter(
        (p) =>
          p.segment_id === segment.segment_id &&
          p.location &&
          Number.isFinite(p.location.lat) &&
          Number.isFinite(p.location.lng)
      )
      .sort((a, b) =>
        (a.external_ref || '').localeCompare(b.external_ref || '', undefined, { numeric: true })
      )
      .map((p) => ({
        id: p.pole_id || p.external_ref || 'unknown',
        code: p.external_ref || p.pole_id || undefined,
        coord: [p.location.lng, p.location.lat] as [number, number],
        status: p.active_fixture ? 'normal' : 'unknown',
        atlas: p.active_fixture?.fixture_type,
      }))
  }, [allPoles, segment?.segment_id])

  const { initialStart, initialEnd, initialCoords } = useMemo(() => {
    if (!segment) {
      return {
        initialStart: [106.4896, 10.9701] as [number, number],
        initialEnd: [106.4950, 10.9750] as [number, number],
        initialCoords: [] as [number, number][],
      }
    }
    return extractSegmentCoordinates(segment, segmentPoles)
  }, [segment, segmentPoles])

  if (!segment) return null

  const hasLength = segment.has_geometry && segment.length_m > 0

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 bg-linear-to-r from-teal-700 to-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Route className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-white/25 px-2 py-0.5 rounded-md font-bold">
                  {segment.external_ref}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-100">
                  {segment.road_class === 'inter_commune'
                    ? 'Đường liên xã'
                    : segment.road_class === 'inter_village'
                    ? 'Đường liên thôn'
                    : 'Đường nhánh'}
                </span>
              </div>
              <h3 className="font-extrabold text-base mt-0.5">{segment.segment_name}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-800 dark:text-slate-200 max-h-[75vh] overflow-y-auto">
          {/* 3 Metrics */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Chiều dài</div>
              <div className="text-lg font-black text-blue-700 dark:text-blue-400 mt-1">
                {hasLength ? `${(segment.length_m / 1000).toFixed(1)} km` : '-'}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">{hasLength ? `${segment.length_m.toLocaleString()} mét` : 'Chưa có hình'}</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Số cột đèn</div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                {segment.pole_count}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">Điểm chiếu sáng</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Nguồn dữ liệu</div>
              <div className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-1 flex items-center justify-center gap-1">
                <span>{getDataSourceDisplayName(segment.data_source)}</span>
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">
                Phương thức thu thập GIS
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl space-y-2.5">
            {showCommune && (
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                  <span>Địa bàn quản lý:</span>
                </span>
                <strong className="text-slate-800 dark:text-slate-200">{formatFriendlyCommuneName(segment.commune_name, segment.commune_id, 'Chưa gán địa bàn')}</strong>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
              <span className="text-slate-500 dark:text-slate-400">Mật độ cột trung bình:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {segment.pole_count > 0 && hasLength ? `~${Math.round(segment.length_m / segment.pole_count)} mét / cột` : segment.pole_count > 0 ? '-' : 'Chưa gắn cột'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-slate-500 dark:text-slate-400">Trạng thái cập nhật:</span>
              <span className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{segment.updated_at ? new Date(segment.updated_at).toLocaleDateString('vi-VN') : 'Mới cập nhật'}</span>
              </span>
            </div>
          </div>

          {/* Bản đồ Tuyến đường Thực địa */}
          <div className="space-y-1.5 pt-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between text-xs">
              <span>Lộ trình Tuyến đường Chiếu sáng:</span>
            </label>
            {segment.has_geometry || segmentPoles.length >= 2 ? (
              <SegmentRouteMap
                coordinates={initialCoords}
                startCoord={initialStart}
                endCoord={initialEnd}
                poles={segmentPoles}
                communeId={segment.commune_id}
                height="220px"
              />
            ) : (
              <div className="h-[220px] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-center px-6 text-slate-500 dark:text-slate-400">
                Tuyến chưa có hình. Hình tuyến hiện khi có từ 2 cột có GPS thuộc tuyến.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-blue-50 transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
export default SegmentDetailModal
