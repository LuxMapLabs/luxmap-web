import React, { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
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
import { SegmentShapePanel } from '../../../../../components/SegmentShapePanel'
import { useSegmentRoadPick } from '../../../../../hooks/assets/useSegmentRoadPick'
import { lineToWkt } from '../../../../../utils/gis-map/roadRouting'
import {
  calculateRouteLengthMeters,
  parseLineStringWkt,
} from '../../../../../utils/gis-map/routeUtils'
import { orderPolesAlongLine } from '../../../../../utils/gis-map/segmentPoleOrder'
import { polesNearLine } from '../../../../../utils/gis-map/segmentReshape'
import {
  offRoadShapeMessage,
  polesOffRoadShape,
} from '../../../../../utils/gis-map/segmentRoadShape'
import {
  toPickablePoles,
  useSegmentPoleSelection,
} from '../../../../../hooks/assets/useSegmentPoleSelection'
import { useSegmentPoleLink } from '../../../../../hooks/assets/useSegmentPoleLink'
import type { RootState } from '../../../../../redux/rootReducer'
import type { RoadClass } from '../../../../../types/common/enums'
import type { SegmentListItem } from '../../../../../types/assets/segments'

interface AddSegmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAddSegment: (data: SegmentListItem, poleIds: string[]) => void
  existingCount: number
}

export const AddSegmentModal: React.FC<AddSegmentModalProps> = ({
  isOpen,
  onClose,
  onAddSegment,
  existingCount,
}) => {
  const communes = useSelector((state: RootState) => state.adminCommunes?.communes || [])
  const currentUser = useSelector((state: RootState) => state.auth?.user)
  const managerCommuneId =
    currentUser?.communes?.[0]?.commune_id || currentUser?.commune_ids?.[0] || ''
  const managerCommuneName =
    currentUser?.communes?.[0]?.name ||
    communes.find((c) => c.commune_id === managerCommuneId)?.name ||
    null

  const nextCode = `SEG-${String(existingCount + 1).padStart(3, '0')}`

  const segmentId = nextCode
  const [segmentName, setSegmentName] = useState('')
  const [roadClass, setRoadClass] = useState<RoadClass>('inter_commune')
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Chỉ hiện cột có GPS và chưa thuộc tuyến nào
  const allPoles = useSelector((state: RootState) => state.assets?.poles || [])
  const candidates = useMemo(() => toPickablePoles(allPoles), [allPoles])
  const {
    selected,
    poles,
    toggle,
    addMany,
    remove,
    move,
    autoSort,
    addBend,
    moveBend,
    lastAddedId,
    geometry,
  } = useSegmentPoleSelection(candidates)
  // Cột chưa có GPS cũng gán được vào tuyến (không vào hình tuyến)
  const noGpsPoles = useMemo(() => noGpsPolesFor(allPoles), [allPoles])
  const [noGpsIds, setNoGpsIds] = useState<Set<string>>(new Set())
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

  // Hình theo con đường (bấm trên bản đồ nền); không có thì nối các cột đã chọn thành hình nháp
  const roadPick = useSegmentRoadPick()
  const roadLine = roadPick.line
  const route = roadLine
    ? { geomWkt: lineToWkt(roadLine), lengthM: calculateRouteLengthMeters(roadLine) }
    : geometry && poles.length >= 2
      ? geometry
      : null
  const shapeKind = roadLine ? 'road' : route ? 'draft' : 'none'
  // Hình theo con đường thì mọi cột có GPS của tuyến phải nằm trong hành lang khảo sát quanh nó
  const polesOffRoad = useMemo(
    () =>
      roadLine
        ? polesOffRoadShape(
            poles.map((p) => ({ label: poleCodes[p.id] || p.id, coord: p.coord })),
            roadLine
          )
        : [],
    [roadLine, poles, poleCodes]
  )
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

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (polesOffRoad.length > 0) {
      setSubmitError(offRoadShapeMessage(polesOffRoad))
      return
    }
    // Chưa đủ 2 cột có GPS và chưa lấy hình theo đường thì tạo tuyến chưa có hình và chưa có chiều dài
    if (route && !(route.lengthM >= 1)) {
      setSubmitError('Chiều dài tuyến đường quá ngắn. Vui lòng kiểm tra lại các cột đã chọn.')
      return
    }

    onAddSegment(
      {
        segment_id: segmentId.trim() || nextCode,
        segment_name: segmentName.trim() || `Tuyến đường ${segmentId}`,
        road_class: roadClass,
        ...(route ? { length_m: route.lengthM } : {}),
        pole_count: poles.length + noGpsIds.size,
        has_geometry: route !== null,
        commune_id: managerCommuneId || null,
        commune_name: managerCommuneName,
        data_source: 'field',
        ...(route ? { geom_wkt: route.geomWkt } : {}),
        updated_at: new Date().toISOString(),
      } as SegmentListItem,
      [...poles.map((p) => p.id), ...noGpsIds]
    )

    onClose()
  }

  return (
    <AssetModalFrame widthClass="max-w-5xl">
      <AssetModalHeader
        icon={<Route className="w-5 h-5" />}
        accent="indigo"
        title="Khai báo tuyến đường chiếu sáng mới"
        subtitle={
          roadClass === 'inter_commune' ? 'Đường liên xã (Trục chính)' : 'Đường liên thôn / liên ấp'
        }
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <AssetModalError message={submitError} />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto md:overflow-hidden">
          {/* CỘT TRÁI (40% width trên md) */}
          <div
            className={`md:col-span-5 p-5 space-y-4 text-xs text-slate-800 dark:text-slate-200 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800`}
          >
            {/* Tên tuyến đường */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Tên tuyến đường <span className="text-rose-500">*</span>:
              </label>
              <input
                type="text"
                required
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
                placeholder="VD: Tuyến D - Đường Bờ Kênh..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Cấp đường quy hoạch */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Cấp đường quy hoạch:
              </label>
              <select
                value={roadClass}
                onChange={(e) => setRoadClass(e.target.value as RoadClass)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="inter_commune">Đường liên xã (Trục chính)</option>
                <option value="inter_village">Đường liên thôn / liên ấp</option>
              </select>
            </div>

            {/* Chiều dài tuyến */}
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Chiều dài tuyến (mét):
                </label>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/60">
                  {shapeKind === 'road'
                    ? 'Đo trên con đường đã lấy'
                    : shapeKind === 'draft'
                      ? 'Đo trên hình nháp nối cột'
                      : 'Chưa có hình'}
                </span>
              </div>
              {route ? (
                <input
                  type="text"
                  readOnly
                  value={`${route.lengthM.toLocaleString('vi-VN')} mét`}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-200 cursor-not-allowed select-none focus:outline-none"
                />
              ) : (
                <>
                  <input
                    type="text"
                    readOnly
                    value="-"
                    aria-label="Chiều dài tuyến"
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-200 cursor-not-allowed select-none focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Chưa có hình nên chưa đo được chiều dài. Lấy hình theo đường trên bản đồ, hoặc
                    chọn từ 2 cột có GPS để có hình nháp.
                  </p>
                </>
              )}
            </div>

            {/* Thống kê mốc tọa độ */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                Cột đèn đã chọn:
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
              onEditDraft={() => route && roadPick.setLine(parseLineStringWkt(route.geomWkt))}
            />

            {polesOffRoad.length > 0 && (
              <div
                role="alert"
                className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 flex gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{offRoadShapeMessage(polesOffRoad)}</span>
              </div>
            )}

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

            {candidates.length === 0 && noGpsPoles.length === 0 && (
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                Không còn cột đèn nào chưa thuộc tuyến. Vẫn tạo được tuyến và lấy hình theo đường;
                gán cột vào tuyến sau, ở form cột hoặc "Sửa tuyến".
              </div>
            )}
          </div>

          {/* CỘT PHẢI: BẢN ĐỒ (60% width trên md) */}
          <div className="md:col-span-7 p-4 bg-blue-50 flex flex-col justify-between min-h-[480px] relative">
            <div className="min-h-[480px] h-[480px] rounded-2xl overflow-hidden border border-blue-200 shadow-inner relative">
              <SegmentPolePickerMap
                poles={candidates}
                selected={selected}
                fixedLine={roadLine ?? undefined}
                onTogglePole={toggle}
                onMoveBend={moveBend}
                onInsertBend={roadLine ? undefined : addBend}
                onRemoveBend={remove}
                onEditLine={roadLine ? roadPick.setLine : undefined}
                pickMode={roadPick.picking}
                onPickRoadPoint={roadPick.pick}
                pickedPoints={roadPick.points}
                suggestedIds={suggestedSet}
                highlightId={link.highlightId}
                onHoverPole={link.hoverFromMap}
                focusRequest={link.focusRequest}
                communeId={managerCommuneId}
                height="480px"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic text-center shrink-0">
              {roadPick.picking && roadPick.freehand
                ? '💡 Vẽ tay: bấm từng điểm dọc con đường trên ảnh vệ tinh, không chọn cột. Bấm "Xong" khi tới điểm cuối.'
                : roadPick.picking
                  ? '💡 Đang lấy hình: bấm trên con đường, không chọn cột. Bấm "Xong" khi tới điểm cuối.'
                  : roadLine
                    ? '💡 Uốn hình: kéo chấm trắng; kéo chấm mờ giữa hai chấm trắng để thêm chỗ uốn; nhấp đúp chấm trắng để xoá. Click cột để thêm / bỏ; viền cam là cột nằm sát đường.'
                    : '💡 Mẹo: Click cột đèn (chấm vàng) để thêm vào tuyến, click lại để bỏ; máy tự xếp thứ tự. Kéo chấm mờ giữa hai cột để uốn hình. Cột thuộc tuyến khác không hiển thị.'}
            </p>
          </div>
        </div>

        <AssetModalFooter
          onCancel={onClose}
          submitLabel="Tạo tuyến đường"
          submitIcon={<CheckCircle2 className="w-4 h-4" />}
        />
      </form>
    </AssetModalFrame>
  )
}

export default AddSegmentModal
