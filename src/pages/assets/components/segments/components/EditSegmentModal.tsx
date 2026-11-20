import React, { useEffect, useState, useMemo, useRef } from 'react'
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
  SegmentNoGpsPolePicker,
  noGpsPolesFor,
} from '../../../../../components/SegmentNoGpsPolePicker'
import {
  clipLineBetween,
  extendLine,
  insertVertex,
  type LngLat,
} from '../../../../../utils/gis-map/lineEdit'
import { ROUTE_CORRIDOR_M } from '../../../../../utils/gis-map/poleMove'
import { SegmentShapePanel } from '../../../../../components/SegmentShapePanel'
import { useSegmentRoadPick } from '../../../../../hooks/assets/useSegmentRoadPick'
import { lineToWkt } from '../../../../../utils/gis-map/roadRouting'
import { polesNearLine } from '../../../../../utils/gis-map/segmentReshape'
import {
  toPickablePoles,
  useSegmentPoleSelection,
} from '../../../../../hooks/assets/useSegmentPoleSelection'
import { useSegmentPoleLink } from '../../../../../hooks/assets/useSegmentPoleLink'
import {
  deriveInitialOrder,
  orderPolesAlongLine,
} from '../../../../../utils/gis-map/segmentPoleOrder'
import {
  calculateDistanceMeters,
  calculateRouteLengthMeters,
  parseLineStringWkt,
  snapPointToPolyline,
} from '../../../../../utils/gis-map/routeUtils'
import {
  isRoadShape,
  offRoadShapeMessage,
  polesOffRoadShape,
  roadShapeDetourMessage,
} from '../../../../../utils/gis-map/segmentRoadShape'
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

const sameLine = (a: ReadonlyArray<LngLat>, b: ReadonlyArray<LngLat>): boolean =>
  a.length === b.length && a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1])

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
    const own = candidates
      .filter((c) => ownIds.has(c.id))
      .map((p) => ({ id: p.id, coord: p.coord }))
    return { ...deriveInitialOrder(own, geomWkt), roadShape: isRoadShape(own, geomWkt) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Hình thật của con đường: giữ nguyên khi lưu ở đây, không dựng lại từ cột
  const storedLine = useMemo(
    () => (initial.roadShape ? parseLineStringWkt(geomWkt) : []),
    [initial.roadShape, geomWkt]
  )
  const [editedLine, setEditedLine] = useState<LngLat[] | null>(() =>
    initial.roadShape ? storedLine : null
  )
  const prevPoleIdsRef = useRef<string[]>(initial.ordered.map((p) => p.id))

  const [segmentName, setSegmentName] = useState(segment.segment_name || '')
  const [roadClass, setRoadClass] = useState<RoadClass>(
    (segment.road_class as RoadClass) || 'inter_commune'
  )
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    selected,
    poles,
    toggle,
    addMany,
    remove,
    move,
    autoSort,
    moveBend,
    lastAddedId,
    geometry,
  } = useSegmentPoleSelection(candidates, initial.ordered)
  // Cột chưa có GPS cũng gán được vào tuyến (không vào hình tuyến)
  const noGpsPoles = useMemo(
    () => noGpsPolesFor(allPoles, segment.segment_id),
    [allPoles, segment.segment_id]
  )
  const [noGpsIds, setNoGpsIds] = useState<Set<string>>(
    () =>
      new Set(
        allPoles
          .filter((p) => p.pole_id && !p.location && p.segment_id === segment.segment_id)
          .map((p) => p.pole_id as string)
      )
  )
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

  const syncLineToPoles = (nextPolesCoords: typeof poles) => {
    const prevIds = prevPoleIdsRef.current
    const currIds = nextPolesCoords.map((p) => p.id)
    const samePoles =
      prevIds.length === currIds.length && prevIds.every((id, i) => id === currIds[i])
    if (samePoles) return

    const currIdSet = new Set(currIds)
    const hasRemovedPole = prevIds.some((id) => !currIdSet.has(id))
    prevPoleIdsRef.current = currIds

    if (!editedLine || editedLine.length < 2) return

    let nextLine = editedLine
    const initialIds = new Set(initial.ordered.map((p) => p.id))

    for (const p of nextPolesCoords) {
      if (initialIds.has(p.id)) continue
      const snap = snapPointToPolyline(p.coord, nextLine)
      if (snap.distMeters <= ROUTE_CORRIDOR_M) continue
      const atStart =
        snap.segmentIndex === 0 &&
        calculateDistanceMeters(snap.snappedPoint, nextLine[0]) <= 0.5
      const atEnd =
        snap.segmentIndex === nextLine.length - 2 &&
        calculateDistanceMeters(snap.snappedPoint, nextLine[nextLine.length - 1]) <= 0.5
      if (atStart || atEnd) {
        nextLine = extendLine(nextLine, p.coord).line
      }
    }

    if (hasRemovedPole && nextPolesCoords.length >= 2) {
      const dists = nextPolesCoords.map(
        (p) => snapPointToPolyline(p.coord, nextLine).accumulatedDist
      )
      const min = Math.min(...dists)
      const max = Math.max(...dists)
      let totalLen = 0
      for (let i = 1; i < nextLine.length; i++) {
        totalLen += calculateDistanceMeters(nextLine[i - 1], nextLine[i])
      }
      if (min > 0.5 || max < totalLen - 0.5) {
        nextLine = clipLineBetween(nextLine, min, max)
      }
    }

    if (!sameLine(nextLine, editedLine)) {
      setEditedLine(nextLine)
    }
  }

  useEffect(() => {
    syncLineToPoles(poles)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poles])

  // Lấy (lại) hình theo đường ngay trong form: bấm trên bản đồ nền
  const roadPick = useSegmentRoadPick()
  const newRoadLine = roadPick.line
  const roadLine = newRoadLine ?? editedLine

  const editedLineChanged = Boolean(
    initial.roadShape && editedLine && !sameLine(editedLine, storedLine)
  )

  // Hình mới lấy: gửi hình đó và chiều dài đo trên nó. Hình thật đang lưu: gửi lại đúng hình và chiều dài đang lưu.
  // Còn lại: đủ 2 cột có GPS thì có hình nháp nối cột và chiều dài đo được
  const route = newRoadLine
    ? { geomWkt: lineToWkt(newRoadLine), lengthM: calculateRouteLengthMeters(newRoadLine) }
    : editedLineChanged && editedLine
      ? { geomWkt: lineToWkt(editedLine), lengthM: calculateRouteLengthMeters(editedLine) }
      : initial.roadShape && geomWkt
        ? { geomWkt, lengthM: segment.length_m || calculateRouteLengthMeters(storedLine) }
        : geometry && poles.length >= 2
          ? geometry
          : null
  const shapeKind = roadLine ? 'road' : route ? 'draft' : 'none'
  const detourWarning = useMemo(
    () => (newRoadLine && !roadPick.picking ? roadShapeDetourMessage(newRoadLine, poles) : null),
    [newRoadLine, roadPick.picking, poles]
  )
  // Hình không chạy theo cột nên cột của tuyến phải nằm trong hành lang quanh hình.
  // Hình mới lấy: mọi cột phải nằm trong (backend đo lại cả tuyến khi hình đổi).
  // Hình đang lưu: cột chọn thêm phải nằm trong; cột đã thuộc tuyến từ trước mà nằm xa thì chỉ nhắc,
  // để vẫn đổi được tên / cấp đường.
  const { polesOffRoad, earlierPolesOffRoad } = useMemo(() => {
    if (!roadLine) return { polesOffRoad: [], earlierPolesOffRoad: [] }
    const far = (list: typeof poles) =>
      polesOffRoadShape(
        list.map((p) => ({ label: poleCodes[p.id] || p.id, coord: p.coord })),
        roadLine
      )
    if (newRoadLine) return { polesOffRoad: far(poles), earlierPolesOffRoad: [] }
    const earlierIds = new Set(initial.ordered.map((p) => p.id))
    return {
      polesOffRoad: far(poles.filter((p) => !earlierIds.has(p.id))),
      earlierPolesOffRoad: far(poles.filter((p) => earlierIds.has(p.id))),
    }
  }, [initial, poles, poleCodes, roadLine, newRoadLine])
  const suggestedIds = useMemo(() => {
    if (!roadLine) return [] as string[]
    const chosen = new Set(poles.map((p) => p.id))
    return polesNearLine(
      candidates.filter((c) => !chosen.has(c.id)),
      roadLine
    )
  }, [roadLine, poles, candidates])
  const suggestedSet = useMemo(() => new Set(suggestedIds), [suggestedIds])
  // Có hình theo đường thì thứ tự cột do đường quyết, không kéo thả
  const listRoute = useMemo(
    () => (roadLine ? orderPolesAlongLine(poles, roadLine) : selected),
    [roadLine, poles, selected]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (polesOffRoad.length > 0) {
      setSubmitError(offRoadShapeMessage(polesOffRoad))
      return
    }

    // Tuyến đã có hình không thể quay về chưa có hình; tuyến chưa có hình thì cho lưu tiếp
    if (!route && segment.has_geometry) {
      setSubmitError('Tuyến đường đã có hình nên cần tối thiểu 2 cột đèn.')
      return
    }
    // Chưa có hình thì không gửi geom_wkt và length_m: BE giữ tuyến chưa có hình, chưa có chiều dài
    const {
      geom_wkt: _unused,
      length_m: _len,
      ...rest
    } = segment as SegmentListItem & { geom_wkt?: string }
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
          <div
            className={`md:col-span-5 p-5 space-y-4 text-xs text-slate-800 dark:text-slate-200 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800`}
          >
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
                      Chưa có hình nên chưa đo được chiều dài. Vẽ hình tuyến trên bản đồ, hoặc
                      chọn từ 2 cột có GPS để có hình nháp.
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

            <SegmentShapePanel
              kind={shapeKind}
              lengthM={route ? route.lengthM : null}
              picking={roadPick.picking}
              pointCount={roadPick.points.length}
              error={roadPick.error}
              onStart={roadPick.start}
              freehand={roadPick.freehand}
              onFreehandChange={roadPick.setFreehand}
              onUndo={roadPick.undo}
              onFinish={roadPick.finish}
              onCancel={roadPick.cancel}
              suggestedCount={suggestedIds.length}
              onAddSuggested={() => addMany(suggestedIds)}
              warning={detourWarning}
              allowDraw={false}
            />

            {candidates.length > 0 && (
              <SegmentPoleOrderList
                route={listRoute}
                codes={poleCodes}
                highlightId={link.highlightId}
                revealId={link.revealId}
                onHover={link.hoverFromList}
                onFocus={link.focusPole}
                onMove={roadLine ? undefined : move}
                onRemove={remove}
                onAutoSort={roadLine ? undefined : autoSort}
              />
            )}

            <SegmentNoGpsPolePicker poles={noGpsPoles} selected={noGpsIds} onToggle={toggleNoGps} />

            {initial.roadShape && !newRoadLine && (
              <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-300 flex gap-2">
                <Route className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Tuyến đã có hình theo con đường (nét xanh trên bản đồ) nên lưu ở đây giữ nguyên
                  hình, không nối lại theo cột. Cột chọn vào tuyến phải nằm trong 25 m quanh hình.
                  Muốn đổi hình: kéo chấm trắng trên bản đồ để uốn, kéo chấm mờ để thêm chỗ uốn. Thêm hoặc bỏ cột ở đầu/cuối thì hình tự nối dài hoặc cắt theo.
                </span>
              </div>
            )}

            {polesOffRoad.length > 0 && (
              <div
                role="alert"
                className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 flex gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{offRoadShapeMessage(polesOffRoad)}</span>
              </div>
            )}

            {earlierPolesOffRoad.length > 0 && (
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {earlierPolesOffRoad.length} cột của tuyến đang nằm cách hình tuyến quá 25 m (
                  {earlierPolesOffRoad.slice(0, 5).join(', ')}
                  {earlierPolesOffRoad.length > 5 ? '…' : ''}): khảo sát sẽ không thấy các cột này.
                  Vẫn lưu được; nên dời cột về sát đường ở Bản đồ GIS.
                </span>
              </div>
            )}

            {!initial.exact && !roadLine && (
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
                fixedLine={roadLine ?? undefined}
                onTogglePole={toggle}
                onMoveBend={moveBend}
                onInsertBend={
                  roadLine
                    ? undefined
                    : (to, edge) =>
                        route && roadPick.setLine(insertVertex(parseLineStringWkt(route.geomWkt), edge + 1, to))
                }
                onRemoveBend={remove}
                onEditLine={roadLine ? roadPick.setLine : undefined}
                pickMode={roadPick.picking}
                onPickRoadPoint={roadPick.pick}
                pickedPoints={roadPick.points}
                suggestedIds={suggestedSet}
                highlightId={link.highlightId}
                onHoverPole={link.hoverFromMap}
                focusRequest={link.focusRequest}
                communeId={activeCommuneId}
                height="480px"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic text-center shrink-0">
              {roadPick.picking && roadPick.freehand
                ? '💡 Vẽ tay: bấm từng điểm dọc con đường trên ảnh vệ tinh, không chọn cột. Bấm "Xong" khi tới điểm cuối.'
                : roadPick.picking
                  ? '💡 Đang lấy hình: bấm trên con đường, không chọn cột. Bấm "Xong" khi tới điểm cuối.'
                  : roadLine
                    ? '💡 Uốn hình: kéo chấm trắng; kéo chấm mờ giữa hai chấm trắng để thêm chỗ uốn; nhấp đúp chấm trắng để xoá. Chấm xanh là cột thuộc tuyến, viền cam là cột nằm sát đường.'
                    : '💡 Mẹo: Chấm xanh là cột thuộc tuyến, chấm vàng là cột chưa thuộc tuyến nào. Click để thêm hoặc bỏ cột; máy tự xếp thứ tự và nối thành hình nháp. Kéo chấm mờ giữa hai cột để uốn hình.'}
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
