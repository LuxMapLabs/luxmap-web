import React, { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Route, CheckCircle2 } from 'lucide-react'
import { AssetModalFrame, AssetModalHeader, AssetModalFooter, AssetModalError } from '../../common/AssetModal'
import { SegmentPolePickerMap } from '../../../../../components/SegmentPolePickerMap'
import { SegmentPoleOrderList } from '../../../../../components/SegmentPoleOrderList'
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
  const { selected, toggle, remove, move, autoSort, lastAddedId, geometry } = useSegmentPoleSelection(candidates)
  const link = useSegmentPoleLink(lastAddedId)
  const poleCodes = useMemo(
    () => Object.fromEntries(candidates.map((p) => [p.id, p.code || p.id])),
    [candidates]
  )

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!geometry || selected.length < 2) {
      setSubmitError('Vui lòng chọn tối thiểu 2 cột đèn trên bản đồ để tạo tuyến đường.')
      return
    }
    if (geometry.lengthM < 1) {
      setSubmitError('Chiều dài tuyến đường quá ngắn. Vui lòng kiểm tra lại các cột đã chọn.')
      return
    }

    onAddSegment(
      {
        segment_id: segmentId.trim() || nextCode,
        segment_name: segmentName.trim() || `Tuyến đường ${segmentId}`,
        road_class: roadClass,
        length_m: geometry.lengthM,
        pole_count: selected.length,
        commune_id: managerCommuneId || null,
        commune_name: managerCommuneName,
        data_source: 'field',
        geom_wkt: geometry.geomWkt,
        updated_at: new Date().toISOString(),
      } as SegmentListItem,
      selected.map((p) => p.id)
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
            <div className="md:col-span-5 p-5 space-y-4 text-xs text-slate-800 dark:text-slate-200 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
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
                    Tự động đo từ các cột đã chọn
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  value={`${(geometry?.lengthM ?? 0).toLocaleString('vi-VN')} mét`}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-200 cursor-not-allowed select-none focus:outline-none"
                />
              </div>

              {/* Thống kê mốc tọa độ */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Cột đèn đã chọn:</span>
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

              {candidates.length === 0 && (
                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                  Không còn cột đèn nào có GPS mà chưa thuộc tuyến. Hãy thêm cột mới (hoặc bỏ cột khỏi tuyến khác) rồi quay lại tạo tuyến.
                </div>
              )}

            </div>

            {/* CỘT PHẢI: BẢN ĐỒ VẼ LỘ TRÌNH (60% width trên md) */}
            <div className="md:col-span-7 p-4 bg-blue-50 flex flex-col justify-between min-h-[480px] relative">
              <div className="min-h-[480px] h-[480px] rounded-2xl overflow-hidden border border-blue-200 shadow-inner relative">
                <SegmentPolePickerMap
                  poles={candidates}
                  selected={selected}
                  onTogglePole={toggle}
                  highlightId={link.highlightId}
                  onHoverPole={link.hoverFromMap}
                  focusRequest={link.focusRequest}
                  communeId={managerCommuneId}
                  height="480px"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 italic text-center shrink-0">
                💡 Mẹo: Click cột đèn (chấm vàng) để thêm vào tuyến, click lại để bỏ. Kéo thả trong danh sách bên trái để chỉnh thứ tự. Cột thuộc tuyến khác không hiển thị.
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
