import React, { useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { Route, CheckCircle2 } from 'lucide-react'
import { AssetModalFrame, AssetModalHeader, AssetModalFooter, AssetModalError } from '../../common/AssetModal'
import { SegmentRouteMap } from '../../../../../components/SegmentRouteMap'
import { calculateRouteLengthMeters } from '../../../../../utils/gis-map/routeUtils'
import type { RootState } from '../../../../../redux/rootReducer'
import type { RoadClass } from '../../../../../types/common/enums'
import type { SegmentListItem } from '../../../../../types/assets/segments'

interface AddSegmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAddSegment: (data: SegmentListItem) => void
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
  const [lengthM, setLengthM] = useState('0')
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Auto-calculate route length when user clicks/draws route coordinates on map
  const handleRouteCoordsChange = useCallback((coords: [number, number][]) => {
    setRouteCoords(coords)
    if (coords.length >= 2) {
      const calcMeters = calculateRouteLengthMeters(coords)
      setLengthM(String(calcMeters))
      if (calcMeters >= 5) {
        setSubmitError(null)
      }
    } else {
      setLengthM('0')
    }
  }, [])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    // 1. Kiểm tra số điểm mốc
    if (routeCoords.length < 2) {
      setSubmitError('Vui lòng click vẽ tối thiểu 2 điểm mốc trên bản đồ để tạo lộ trình tuyến đường.')
      return
    }

    // 2. Lọc bỏ các điểm trùng nhau liên tiếp (consecutive duplicates)
    const cleanCoords: [number, number][] = []
    routeCoords.forEach((pt) => {
      if (cleanCoords.length === 0) {
        cleanCoords.push(pt)
      } else {
        const prev = cleanCoords[cleanCoords.length - 1]
        if (Math.abs(prev[0] - pt[0]) > 0.000001 || Math.abs(prev[1] - pt[1]) > 0.000001) {
          cleanCoords.push(pt)
        }
      }
    })

    if (cleanCoords.length < 2) {
      setSubmitError('Vui lòng click vẽ tối thiểu 2 điểm mốc trên bản đồ để tạo lộ trình tuyến đường.')
      return
    }

    // 3. Kiểm tra chiều dài tuyến
    const actualLen = calculateRouteLengthMeters(cleanCoords)
    if (actualLen < 5 || parseInt(lengthM, 10) < 5) {
      setSubmitError('Chiều dài tuyến đường quá ngắn (< 5m). Vui lòng kiểm tra lại các điểm mốc trên bản đồ.')
      return
    }

    // Generate standard PostGIS WKT LINESTRING
    const geomWkt = `LINESTRING(${cleanCoords.map((c) => `${c[0]} ${c[1]}`).join(', ')})`

    onAddSegment({
      segment_id: segmentId.trim() || nextCode,
      segment_name: segmentName.trim() || `Tuyến đường ${segmentId}`,
      road_class: roadClass,
      length_m: actualLen,
      pole_count: 0,
      commune_id: managerCommuneId || null,
      commune_name: managerCommuneName,
      data_source: 'field',
      geom_wkt: geomWkt,
      updated_at: new Date().toISOString(),
    } as SegmentListItem)

    onClose()
  }

  return (
    <AssetModalFrame widthClass="max-w-5xl">
      <AssetModalHeader
        icon={<Route className="w-5 h-5" />}
        accent="indigo"
        title="Khai Báo Tuyến Đường Chiếu Sáng Mới"
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
                    Tự động đo từ bản đồ
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  value={`${Number(lengthM).toLocaleString('vi-VN')} mét`}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-200 cursor-not-allowed select-none focus:outline-none"
                />
              </div>

              {/* Thống kê mốc tọa độ */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Mốc tọa độ đã vẽ:</span>
                <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {routeCoords.length} điểm mốc
                </span>
              </div>

            </div>

            {/* CỘT PHẢI: BẢN ĐỒ VẼ LỘ TRÌNH (60% width trên md) */}
            <div className="md:col-span-7 p-4 bg-slate-950 flex flex-col justify-between min-h-[480px] relative">
              <div className="min-h-[480px] h-[480px] rounded-2xl overflow-hidden border border-slate-700/80 shadow-inner relative">
                <SegmentRouteMap
                  coordinates={routeCoords}
                  height="480px"
                  editable={true}
                  defaultEditMode="append"
                  hideTerminalPins={true}
                  communeId={managerCommuneId}
                  onRouteCoordsChange={handleRouteCoordsChange}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 italic text-center shrink-0">
                💡 Mẹo: Click trên bản đồ để thêm mốc nối tiếp. Bấm và kéo thả bất kỳ điểm nào để chỉnh sửa uốn cong đường đi.
              </p>
            </div>
          </div>

        <AssetModalFooter
          onCancel={onClose}
          submitLabel="Tạo Tuyến Đường"
          submitIcon={<CheckCircle2 className="w-4 h-4" />}
        />
      </form>
    </AssetModalFrame>
  )
}

export default AddSegmentModal
