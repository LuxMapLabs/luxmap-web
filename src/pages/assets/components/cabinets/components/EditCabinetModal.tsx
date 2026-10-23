import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSelector, useDispatch } from 'react-redux'
import { Zap, X, CheckCircle2, MapPin, AlertCircle, Route } from 'lucide-react'
import type { RootState } from '../../../../../redux/rootReducer'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import type { DataSource } from '../../../../../types/common/enums'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import { parseLineStringWkt } from '../../../../../utils/gis-map/routeUtils'
import { fetchMapLayersRequest } from '../../../../../feature/map/mapSlice'
import { EditCabinetMap } from './EditCabinetMap'

export interface EditCabinetModalProps {
  isOpen: boolean
  cabinet: CabinetListItem | null
  availableSegments?: SegmentListItem[]
  availableCabinets?: CabinetListItem[]
  onClose: () => void
  onSave: (updated: CabinetListItem) => void
}

const EditCabinetModalInner: React.FC<EditCabinetModalProps & { cabinet: CabinetListItem }> = ({
  cabinet,
  availableSegments = [],
  availableCabinets = [],
  onClose,
  onSave,
}) => {
  const dispatch = useDispatch()
  const mapSegments = useSelector((state: RootState) => state.map.segments)

  // Fetch map layers nếu chưa có dữ liệu GIS
  useEffect(() => {
    if (!mapSegments || mapSegments.length === 0) {
      dispatch(fetchMapLayersRequest())
    }
  }, [mapSegments, dispatch])

  const [cabinetName, setCabinetName] = useState(() => cabinet.cabinet_name || '')
  const [externalRef, setExternalRef] = useState(() => cabinet.external_ref || '')
  const [lat, setLat] = useState(() => (cabinet.location?.lat ? String(cabinet.location.lat) : '10.9701'))
  const [lng, setLng] = useState(() => (cabinet.location?.lng ? String(cabinet.location.lng) : '106.4896'))
  const [dataSource, setDataSource] = useState<DataSource>(() => cabinet.data_source || 'field')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('')

  useEffect(() => {
    if (cabinet) {
      setCabinetName(cabinet.cabinet_name || '')
      setExternalRef(cabinet.external_ref || '')
      if (cabinet.location?.lat) setLat(String(cabinet.location.lat))
      if (cabinet.location?.lng) setLng(String(cabinet.location.lng))
      setDataSource(cabinet.data_source || 'field')
      setErrorMsg(null)
    }
  }, [cabinet])

  // Trích xuất tọa độ của tuyến đường đang chọn để highlight trên bản đồ
  const segmentCoords = useMemo<[number, number][]>(() => {
    if (!selectedSegmentId) return []

    // 1. LineString từ mapSegments PostGIS
    const mapSeg = mapSegments?.find((s) => s.properties?.segment_id === selectedSegmentId)
    if (
      mapSeg &&
      mapSeg.geometry?.type === 'LineString' &&
      Array.isArray(mapSeg.geometry.coordinates)
    ) {
      return mapSeg.geometry.coordinates as [number, number][]
    }

    // 2. LineString từ geom_wkt
    const found = availableSegments.find((s) => s.segment_id === selectedSegmentId)
    if (found && 'geom_wkt' in found && typeof found.geom_wkt === 'string') {
      const parsed = parseLineStringWkt(found.geom_wkt)
      if (parsed.length >= 2) return parsed
    }

    return []
  }, [selectedSegmentId, availableSegments, mapSegments])

  const parsedLat = parseFloat(lat) || 10.9701
  const parsedLng = parseFloat(lng) || 106.4896

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const trimmedName = cabinetName.trim()
    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập tên tủ điện!')
      return
    }

    const trimmedRef = externalRef.trim()

    let nLat = cabinet.location?.lat ?? 0
    let nLng = cabinet.location?.lng ?? 0

    if (lat.trim() || lng.trim()) {
      const parsedNLat = parseFloat(lat.trim())
      const parsedNLng = parseFloat(lng.trim())

      if (isNaN(parsedNLat) || isNaN(parsedNLng)) {
        setErrorMsg('Tọa độ GIS không hợp lệ! Vui lòng nhập số thực cho Vĩ độ và Kinh độ.')
        return
      }

      if (parsedNLat < -90 || parsedNLat > 90 || parsedNLng < -180 || parsedNLng > 180) {
        setErrorMsg('Tọa độ vượt quá phạm vi địa lý hợp lệ (Vĩ độ: -90..90, Kinh độ: -180..180)!')
        return
      }

      nLat = parsedNLat
      nLng = parsedNLng
    }

    const updated: CabinetListItem = {
      ...cabinet,
      cabinet_name: trimmedName,
      external_ref: trimmedRef || null,
      data_source: dataSource,
      location: {
        lat: nLat,
        lng: nLng,
      },
      updated_at: new Date().toISOString(),
    }

    onSave(updated)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs select-none animate-in fade-in">
      {/* Modal Dialog */}
      <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-10 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 dark:bg-slate-950 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold border border-purple-500/30">
              <Zap className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Chỉnh Sửa Tủ Điện: {cabinet.external_ref || cabinet.cabinet_id}
              </h3>
              <p className="text-xs text-slate-300 dark:text-slate-400">
                Mã hệ thống: {cabinet.cabinet_id || 'Chưa gán'} • Địa bàn: {cabinet.commune_id || 'Củ Chi'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 shrink-0 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Content - 2 Columns (Form trái + Map phải) */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto md:overflow-hidden">
            
            {/* CỘT TRÁI (~40%): THÔNG SỐ TỦ ĐIỆN & TỌA ĐỘ */}
            <div className="md:col-span-5 p-6 space-y-4 text-xs text-slate-800 dark:text-slate-200 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Tên tủ điện */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                    Tên tủ điện <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={cabinetName}
                    onChange={(e) => setCabinetName(e.target.value)}
                    placeholder="Nhập tên tủ điện (VD: Tủ A - Hương lộ 2)"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-600 shadow-2xs"
                  />
                </div>

                {/* Lọc nhanh tuyến đường trên bản đồ (tùy chọn) */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                    <Route className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Lọc nhanh tuyến đường trên bản đồ (tùy chọn):</span>
                  </label>
                  <select
                    value={selectedSegmentId}
                    onChange={(e) => setSelectedSegmentId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-600 shadow-2xs cursor-pointer"
                  >
                    <option value="">-- Không chọn (Xem toàn bộ mạng lưới) --</option>
                    {availableSegments.map((seg) => (
                      <option key={seg.segment_id} value={seg.segment_id || ''}>
                        {seg.segment_name} ({seg.external_ref || seg.segment_id})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 italic">
                    💡 Chọn một tuyến đường để tô sáng nổi bật trên bản đồ khi cần đối chiếu.
                  </p>
                </div>

                {/* Mã tham chiếu thực địa (External Ref) */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                    Mã sơn thực địa (External Ref):
                  </label>
                  <input
                    type="text"
                    value={externalRef}
                    onChange={(e) => setExternalRef(e.target.value)}
                    placeholder="VD: CAB-TL8-A hoặc số hiệu sơn trên vỏ tủ"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-600 font-mono shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-400 italic">
                    Mã quản lý do địa phương hoặc cán bộ hiện trường sơn thực tế trên tủ.
                  </p>
                </div>

                {/* Tọa độ vị trí GIS (WGS-84) */}
                <div className="space-y-1.5 p-3.5 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 rounded-2xl">
                  <label className="font-bold text-purple-900 dark:text-purple-300 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Tọa độ vị trí GIS (WGS-84):</span>
                    </span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                      (Tự động cập nhật)
                    </span>
                  </label>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                        Kinh độ (Lng):
                      </span>
                      <input
                        type="text"
                        value={lng}
                        onChange={(e) => setLng(e.target.value)}
                        placeholder="VD: 106.491234"
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-600"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                        Vĩ độ (Lat):
                      </span>
                      <input
                        type="text"
                        value={lat}
                        onChange={(e) => setLat(e.target.value)}
                        placeholder="VD: 10.975210"
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-600"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-purple-700 dark:text-purple-300/80 pt-1 flex items-center gap-1">
                    <span>💡 Kéo ghim ⚡ hoặc nhấp chuột lên bản đồ vệ tinh bên phải để đổi vị trí.</span>
                  </p>
                </div>

                {/* Readonly Specs Box */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-slate-600 dark:text-slate-300 text-xs">
                  <div className="flex justify-between">
                    <strong>Mã tủ điện nội bộ:</strong>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                      {cabinet.cabinet_id || 'Chưa cấp'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <strong>Nguồn dữ liệu:</strong>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
                      {cabinet.data_source === 'field' ? 'Thực địa (field)' : (cabinet.data_source || 'field')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <strong>Số mạch nguồn (Feeders):</strong>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {cabinet.feeder_ids?.length || 0} mạch xuất tuyến
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </div>

            {/* CỘT PHẢI (~60%): BẢN ĐỒ VỆ TINH GIS ĐỊNH VỊ */}
            <div className="md:col-span-7 h-[380px] md:h-full relative overflow-hidden bg-slate-950">
              <EditCabinetMap
                key={cabinet?.cabinet_id || cabinet?.external_ref || 'edit-cabinet-map'}
                lat={parsedLat}
                lng={parsedLng}
                currentCabinetId={cabinet?.cabinet_id}
                currentExternalRef={cabinet?.external_ref}
                activeSegmentId={selectedSegmentId}
                availableSegments={availableSegments}
                segmentCoords={segmentCoords}
                otherCabinets={availableCabinets}
                onChangeCoords={({ lat: newLat, lng: newLng }) => {
                  setLat(newLat.toFixed(6))
                  setLng(newLng.toFixed(6))
                }}
              />
            </div>

          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export const EditCabinetModal: React.FC<EditCabinetModalProps> = (props) => {
  if (!props.isOpen || !props.cabinet) return null
  return (
    <EditCabinetModalInner
      key={props.cabinet.cabinet_id || props.cabinet.external_ref || 'edit-cabinet-dialog'}
      {...props}
      cabinet={props.cabinet}
    />
  )
}
