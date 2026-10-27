import React, { useState, useCallback, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { createPortal } from 'react-dom'
import { X, Route, CheckCircle2, AlertCircle } from 'lucide-react'
import { SegmentRouteMap } from '../../../../../components/SegmentRouteMap'
import { calculateRouteLengthMeters } from '../../../../../utils/gis-map/routeUtils'
import type { RootState } from '../../../../../redux/rootReducer'
import { fetchCommunesRequest } from '../../../../../feature/communes/communeSlice'
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
  const dispatch = useDispatch()
  const communes = useSelector((state: RootState) => state.adminCommunes.communes)

  useEffect(() => {
    if (communes.length === 0) {
      dispatch(fetchCommunesRequest())
    }
  }, [dispatch, communes.length])

  const nextCode = `SEG-${String(existingCount + 1).padStart(3, '0')}`

  const segmentId = nextCode
  const [segmentName, setSegmentName] = useState('')
  const [roadClass, setRoadClass] = useState<RoadClass>('inter_commune')
  const [lengthM, setLengthM] = useState('0')
  const [communeId, setCommuneId] = useState('')

  useEffect(() => {
    if (communes.length > 0 && !communeId) {
      setCommuneId(communes[0]?.commune_id || '')
    }
  }, [communes, communeId])
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
      commune_id: communeId,
      commune_name: null,
      data_source: 'field',
      geom_wkt: geomWkt,
      updated_at: new Date().toISOString(),
    } as SegmentListItem)

    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:px-6 sm:py-4 bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <Route className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-blue-200">
                  {roadClass === 'inter_commune' ? 'Đường liên xã (Trục chính)' : 'Đường liên thôn / liên ấp'}
                </span>
              </div>
              <h3 className="font-extrabold text-base mt-0.5">Khai Báo Tuyến Đường Chiếu Sáng Mới</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Form Body - 2 Columns Layout */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
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
                  placeholder="VD: Tuyến D - Đường Bờ Kênh Củ Chi..."
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

              {/* Địa bàn quản lý */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Địa bàn quản lý (Xã/Thị trấn):
                </label>
                <select
                  value={communeId}
                  onChange={(e) => setCommuneId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                >
                  {communes.map((c) => (
                    <option key={c.commune_id || ''} value={c.commune_id || ''}>
                      {c.name || c.commune_id} ({c.commune_id})
                    </option>
                  ))}
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

              {/* Validation Error Alert Box */}
              {submitError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in slide-in-from-bottom-1">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
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
                  onRouteCoordsChange={handleRouteCoordsChange}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 italic text-center shrink-0">
                💡 Mẹo: Click trên bản đồ để thêm mốc nối tiếp. Bấm và kéo thả bất kỳ điểm nào để chỉnh sửa uốn cong đường đi.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs cursor-pointer transition shadow-2xs"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 text-xs cursor-pointer transition flex items-center gap-1.5 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Tạo Tuyến Đường</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default AddSegmentModal
