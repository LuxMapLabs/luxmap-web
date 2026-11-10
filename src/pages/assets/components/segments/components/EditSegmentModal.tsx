import React, { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Route, CheckCircle2, AlertTriangle } from 'lucide-react'
import {
  AssetModalFrame,
  AssetModalHeader,
  AssetModalFooter,
  AssetModalError,
} from '../../common/AssetModal'
import { SegmentPolePickerMap } from '../../../../../components/SegmentPolePickerMap'
import { SegmentPoleOrderList } from '../../../../../components/SegmentPoleOrderList'
import {
  toPickablePoles,
  useSegmentPoleSelection,
} from '../../../../../hooks/assets/useSegmentPoleSelection'
import { useSegmentPoleLink } from '../../../../../hooks/assets/useSegmentPoleLink'
import { deriveInitialOrder } from '../../../../../utils/gis-map/segmentPoleOrder'
import {
  fetchSegmentDetailRequest,
  clearSegmentDetail,
} from '../../../../../feature/assets/assetSlice'

import type { RoadClass } from '../../../../../types/common/enums'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import type { RootState } from '../../../../../redux/rootReducer'

export interface EditSegmentModalProps {
  isOpen: boolean
  segment: SegmentListItem | null
  onClose: () => void
  onSave: (updated: SegmentListItem, poleIds: string[]) => void
}

interface EditSegmentModalContentProps {
  segment: SegmentListItem
  /** Đường nối đang lưu của tuyến; null khi không lấy được (khi đó thứ tự cột được suy ra). */
  geomWkt: string | null
  onClose: () => void
  onSave: (updated: SegmentListItem, poleIds: string[]) => void
}

const EditSegmentModalContent: React.FC<EditSegmentModalContentProps> = ({
  segment,
  geomWkt,
  onClose,
  onSave,
}) => {
  const allPoles = useSelector((state: RootState) => state.assets?.poles || [])
  const currentUser = useSelector((state: RootState) => state.auth?.user)
  const activeCommuneId =
    segment.commune_id ||
    currentUser?.communes?.[0]?.commune_id ||
    currentUser?.commune_ids?.[0] ||
    ''

  // Cột chọn được: chưa thuộc tuyến nào hoặc đang thuộc tuyến này (cột của tuyến khác bị ẩn)
  const candidates = useMemo(
    () => toPickablePoles(allPoles, segment.segment_id),
    [allPoles, segment.segment_id]
  )

  // Thứ tự ban đầu của các cột đang thuộc tuyến này (chỉ tính một lần khi mở form)
  const initial = useMemo(() => {
    const ownIds = new Set(
      allPoles.filter((p) => p.segment_id === segment.segment_id).map((p) => p.pole_id)
    )
    const own = candidates.filter((c) => ownIds.has(c.id))
    return deriveInitialOrder(
      own.map((p) => ({ id: p.id, coord: p.coord })),
      geomWkt
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [segmentName, setSegmentName] = useState(segment.segment_name || '')
  const [roadClass, setRoadClass] = useState<RoadClass>(
    (segment.road_class as RoadClass) || 'inter_commune'
  )
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { selected, toggle, remove, move, autoSort, lastAddedId, geometry } =
    useSegmentPoleSelection(candidates, initial.ordered)
  const link = useSegmentPoleLink(lastAddedId)
  const poleCodes = useMemo(
    () => Object.fromEntries(candidates.map((p) => [p.id, p.code || p.id])),
    [candidates]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!geometry || selected.length < 2) {
      setSubmitError('Tuyến đường cần tối thiểu 2 cột đèn.')
      return
    }

    onSave(
      {
        ...segment,
        segment_name: segmentName.trim() || segment.segment_id,
        road_class: roadClass,
        length_m: geometry.lengthM,
        pole_count: selected.length,
        commune_id: activeCommuneId || null,
        geom_wkt: geometry.geomWkt,
        updated_at: new Date().toISOString(),
      } as SegmentListItem,
      selected.map((p) => p.id)
    )
    onClose()
  }

  return (
    <>
      <AssetModalHeader
        icon={<Route className="w-5 h-5" />}
        accent="indigo"
        title={`Chỉnh Sửa Tuyến Đường: ${segment.external_ref || segment.segment_id}`}
        subtitle={segment.segment_name}
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <AssetModalError message={submitError} />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto md:overflow-hidden">
          {/* CỘT TRÁI */}
          <div className="md:col-span-5 p-5 space-y-4 text-xs text-slate-800 dark:text-slate-200 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Tên tuyến đường:
              </label>
              <input
                type="text"
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Cấp đường quy hoạch:
                </label>
                <select
                  value={roadClass}
                  onChange={(e) => setRoadClass(e.target.value as RoadClass)}
                  className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
                >
                  <option value="inter_commune">Đường liên xã</option>
                  <option value="inter_village">Đường liên ấp / thôn</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Chiều dài tuyến (mét):
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${(geometry?.lengthM ?? 0).toLocaleString('vi-VN')} mét`}
                  className="w-full p-2.5 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-200 cursor-not-allowed select-none focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                Cột đèn thuộc tuyến:
              </span>
              <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {selected.length} / {candidates.length} cột
              </span>
            </div>

            <SegmentPoleOrderList
              route={selected}
              codes={poleCodes}
              highlightId={link.highlightId}
              revealId={link.revealId}
              onHover={link.hoverFromList}
              onFocus={link.focusPole}
              onMove={move}
              onRemove={remove}
              onAutoSort={autoSort}
            />

            {!initial.exact && (
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Thứ tự ban đầu của các cột được suy ra tự động. Hãy xem đường nối xanh trên bản đồ
                  có đi đúng dọc tuyến không; nếu sai, kéo thả trong danh sách để chỉnh.
                </span>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: BẢN ĐỒ */}
          <div className="md:col-span-7 p-4 bg-slate-950 flex flex-col justify-between min-h-[480px] relative">
            <div className="min-h-[480px] h-[480px] rounded-2xl overflow-hidden border border-slate-700/80 shadow-inner relative">
              <SegmentPolePickerMap
                poles={candidates}
                selected={selected}
                onTogglePole={toggle}
                highlightId={link.highlightId}
                onHoverPole={link.hoverFromMap}
                focusRequest={link.focusRequest}
                communeId={activeCommuneId}
                height="480px"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic text-center shrink-0">
              💡 Mẹo: Chấm xanh là cột thuộc tuyến, chấm vàng là cột chưa thuộc tuyến nào. Click để
              thêm hoặc bỏ cột; cột thêm mới tự chèn vào chỗ hợp lý, kéo thả trong danh sách bên
              trái nếu cần đổi.
            </p>
          </div>
        </div>

        <AssetModalFooter
          onCancel={onClose}
          submitLabel="Lưu Thay Đổi"
          submitIcon={<CheckCircle2 className="w-4 h-4" />}
        />
      </form>
    </>
  )
}

export const EditSegmentModal: React.FC<EditSegmentModalProps> = ({
  isOpen,
  segment,
  onClose,
  onSave,
}) => {
  const dispatch = useDispatch()
  const segmentId = isOpen ? segment?.segment_id : null
  const detail = useSelector((state: RootState) => state.assets?.segmentDetail)

  // Lấy đường nối đang lưu để danh sách hiện đúng thứ tự đã lưu thay vì đoán
  useEffect(() => {
    if (!segmentId) return
    dispatch(fetchSegmentDetailRequest(segmentId))
    return () => {
      dispatch(clearSegmentDetail())
    }
  }, [dispatch, segmentId])

  if (!isOpen || !segment) return null

  const isReady = detail?.segmentId === segment.segment_id && detail.isSettled

  return (
    <AssetModalFrame widthClass="max-w-5xl">
      {!isReady ? (
        <div className="p-10 text-center text-xs text-slate-500 dark:text-slate-400" role="status">
          Đang tải thứ tự cột của tuyến...
        </div>
      ) : (
        <EditSegmentModalContent
          key={segment.segment_id}
          segment={segment}
          geomWkt={detail.geomWkt}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </AssetModalFrame>
  )
}

export default EditSegmentModal
