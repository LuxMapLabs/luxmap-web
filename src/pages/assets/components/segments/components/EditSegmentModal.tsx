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
import { SegmentNoGpsPolePicker, noGpsPolesFor } from '../../../../../components/SegmentNoGpsPolePicker'
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

  const { selected, poles, toggle, remove, move, autoSort, addBend, moveBend, lastAddedId, geometry } =
    useSegmentPoleSelection(candidates, initial.ordered)
  // Cột chưa có GPS cũng gán được vào tuyến (không vào hình tuyến)
  const noGpsPoles = useMemo(() => noGpsPolesFor(allPoles, segment.segment_id), [allPoles, segment.segment_id])
  const [noGpsIds, setNoGpsIds] = useState<Set<string>>(() => new Set(allPoles.filter((p) => p.pole_id && !p.location && p.segment_id === segment.segment_id).map((p) => p.pole_id as string)))
  const toggleNoGps = (id: string) =>
    setNoGpsIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const link = useSegmentPoleLink(lastAddedId)
  const poleCodes = useMemo(
    () => Object.fromEntries(candidates.map((p) => [p.id, p.code || p.id])),
    [candidates]
  )

  // Đủ 2 cột có GPS thì có hình và chiều dài đo được
  const route = geometry && poles.length >= 2 ? geometry : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    // Tuyến đã có hình không thể quay về chưa có hình; tuyến chưa có hình thì cho lưu tiếp
    if (!route && segment.has_geometry) {
      setSubmitError('Tuyến đường đã có hình nên cần tối thiểu 2 cột đèn.')
      return
    }
    // Chưa có hình thì không gửi geom_wkt và length_m: BE giữ tuyến chưa có hình, chưa có chiều dài
    const { geom_wkt: _unused, length_m: _len, ...rest } = segment as SegmentListItem & { geom_wkt?: string }
    void _unused
    void _len
    onSave(
      {
        ...rest,
        segment_name: segmentName.trim() || segment.segment_id,
        road_class: roadClass,
        ...(route ? { length_m: route.lengthM } : {}),
        pole_count: poles.length + noGpsIds.size,
        has_geometry: route !== null,
        commune_id: activeCommuneId || null,
        ...(route ? { geom_wkt: route.geomWkt } : {}),
        updated_at: new Date().toISOString(),
      } as SegmentListItem,
      [...poles.map((p) => p.id), ...noGpsIds]
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
          <div className={`${candidates.length === 0 ? 'md:col-span-12' : 'md:col-span-5'} p-5 space-y-4 text-xs text-slate-800 dark:text-slate-200 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800`}>
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
                {route ? (
                  <input
                    type="text"
                    readOnly
                    value={`${route.lengthM.toLocaleString('vi-VN')} mét`}
                    className="w-full p-2.5 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-200 cursor-not-allowed select-none focus:outline-none"
                  />
                ) : (
                  <>
                    <input
                      type="text"
                      readOnly
                      value="-"
                      aria-label="Chiều dài tuyến"
                      className="w-full p-2.5 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-200 cursor-not-allowed select-none focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Chưa đủ 2 cột có GPS nên tuyến chưa có hình và chưa đo được chiều dài. Hình và chiều dài có khi vẽ tuyến từ các cột có GPS.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                Cột đèn thuộc tuyến:
              </span>
              <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {poles.length} / {candidates.length} cột
              </span>
            </div>

            {candidates.length > 0 && (
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
            )}

            <SegmentNoGpsPolePicker poles={noGpsPoles} selected={noGpsIds} onToggle={toggleNoGps} />

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
          {candidates.length > 0 && (
          <div className="md:col-span-7 p-4 bg-slate-950 flex flex-col justify-between min-h-[480px] relative">
            <div className="min-h-[480px] h-[480px] rounded-2xl overflow-hidden border border-slate-700/80 shadow-inner relative">
              <SegmentPolePickerMap
                poles={candidates}
                selected={selected}
                onTogglePole={toggle}
                onAddBend={addBend}
                onMoveBend={moveBend}
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
              trái nếu cần đổi. Đường cong hoặc góc rẽ thì bấm "Thêm điểm uốn" trên bản đồ.
            </p>
          </div>
          )}
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
