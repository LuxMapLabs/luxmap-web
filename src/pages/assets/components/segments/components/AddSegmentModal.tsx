import React, { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Route, CheckCircle2 } from 'lucide-react'
import { AssetModalFrame, AssetModalHeader, AssetModalFooter, AssetModalError } from '../../common/AssetModal'
import { SegmentPolePickerMap } from '../../../../../components/SegmentPolePickerMap'
import { SegmentPoleOrderList } from '../../../../../components/SegmentPoleOrderList'
import { SegmentNoGpsPolePicker, noGpsPolesFor } from '../../../../../components/SegmentNoGpsPolePicker'
import { toPickablePoles, useSegmentPoleSelection } from '../../../../../hooks/assets/useSegmentPoleSelection'
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
  const { selected, poles, toggle, remove, move, autoSort, addBend, moveBend, lastAddedId, geometry } =
    useSegmentPoleSelection(candidates)
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

  const route = geometry && poles.length >= 2 ? geometry : null

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    // Chưa đủ 2 cột có GPS thì tạo tuyến chưa có hình và chưa có chiều dài
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
        subtitle={roadClass === 'inter_commune' ? 'Đường liên xã (Trục chính)' : 'Đường liên thôn / liên ấp'}
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <AssetModalError message={submitError} />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto md:overflow-hidden">
            {/* CỘT TRÁI (40% width trên md) */}
            <div className={`${candidates.length === 0 ? 'md:col-span-12' : 'md:col-span-5'} p-5 space-y-4 text-xs text-slate-800 dark:text-slate-200 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800`}>
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
                    {route ? 'Tự động đo từ các cột đã chọn' : 'Chưa có hình'}
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
                      Chưa đủ 2 cột có GPS nên tuyến chưa có hình và chưa đo được chiều dài. Hình và chiều dài có khi vẽ tuyến từ các cột có GPS.
                    </p>
                  </>
                )}
              </div>

              {/* Thống kê mốc tọa độ */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Cột đèn đã chọn:</span>
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

              {candidates.length === 0 && noGpsPoles.length === 0 && (
                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                  Không còn cột đèn nào có GPS mà chưa thuộc tuyến. Hãy thêm cột mới (hoặc bỏ cột khỏi tuyến khác) rồi quay lại tạo tuyến.
                </div>
              )}

            </div>

            {/* CỘT PHẢI: BẢN ĐỒ VẼ LỘ TRÌNH (60% width trên md) */}
            {candidates.length > 0 && (
            <div className="md:col-span-7 p-4 bg-blue-50 flex flex-col justify-between min-h-[480px] relative">
              <div className="min-h-[480px] h-[480px] rounded-2xl overflow-hidden border border-blue-200 shadow-inner relative">
                <SegmentPolePickerMap
                  poles={candidates}
                  selected={selected}
                  onTogglePole={toggle}
                  onAddBend={addBend}
                  onMoveBend={moveBend}
                  highlightId={link.highlightId}
                  onHoverPole={link.hoverFromMap}
                  focusRequest={link.focusRequest}
                  communeId={managerCommuneId}
                  height="480px"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 italic text-center shrink-0">
                💡 Mẹo: Click cột đèn (chấm vàng) để thêm vào tuyến, click lại để bỏ. Kéo thả trong danh sách bên trái để chỉnh thứ tự. Đường cong hoặc góc rẽ thì bấm "Thêm điểm uốn" trên bản đồ. Cột thuộc tuyến khác không hiển thị.
              </p>
            </div>
            )}
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
