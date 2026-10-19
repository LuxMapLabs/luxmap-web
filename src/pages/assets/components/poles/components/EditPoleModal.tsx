import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSelector } from 'react-redux'
import {
  X,
  CheckCircle2,
  Edit3,
  MapPin,
  Zap,
} from 'lucide-react'
import type { FeatureCollection, Feature } from 'geojson'
import type { RootState } from '../../../../../redux/rootReducer'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import { parseLineStringWkt } from '../../../../../utils/gis-map/routeUtils'
import { EditPoleMap } from './EditPoleMap'

export interface EditPoleModalProps {
  isOpen: boolean
  pole: PoleListItem | null
  segments?: SegmentListItem[]
  cabinets?: CabinetListItem[]
  allPoles?: PoleListItem[]
  onClose: () => void
  onSave: (updatedPole: PoleListItem) => void
}

export const EditPoleModal: React.FC<EditPoleModalProps> = ({
  isOpen,
  pole,
  segments = [],
  cabinets = [],
  allPoles = [],
  onClose,
  onSave,
}) => {
  // Lấy danh sách layer tuyến đường PostGIS từ Redux store
  const mapSegments = useSelector((state: RootState) => state.map.segments)

  // Form State
  const [externalRef, setExternalRef] = useState('')
  const [segmentId, setSegmentId] = useState('')
  const [cabinetId, setCabinetId] = useState('')
  const [nearSensitivePoi, setNearSensitivePoi] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [lat, setLat] = useState<number>(0)
  const [lng, setLng] = useState<number>(0)

  // Khởi tạo state khi mở modal hoặc thay đổi pole
  useEffect(() => {
    if (pole && isOpen) {
      setExternalRef(pole.external_ref || '')
      setSegmentId(pole.segment_id || '')
      setCabinetId(pole.cabinet_id || pole.feeder_id || '')
      setNearSensitivePoi(Boolean(pole.near_sensitive_poi))
      setNoteText(pole.note || '')
      setLat(pole.location?.lat ?? 10.9725)
      setLng(pole.location?.lng ?? 106.492)
    }
  }, [pole, isOpen])

  // Trích xuất tuyến đường chiếu sáng (Polyline Coordinates)
  const segmentCoords = useMemo<[number, number][]>(() => {
    if (!segmentId) return []

    // 1. ƯU TIÊN SỐ 1: Lấy LineString chuẩn từ PostGIS Backend (state.map.segments)
    const mapSeg = mapSegments.find(
      (s) => s.properties?.segment_id === segmentId
    )
    if (
      mapSeg &&
      mapSeg.geometry?.type === 'LineString' &&
      Array.isArray(mapSeg.geometry.coordinates)
    ) {
      const valid = mapSeg.geometry.coordinates.filter(
        (c) => Array.isArray(c) && c.length === 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])
      ) as [number, number][]
      if (valid.length >= 2) return valid
    }

    // 2. Nếu segment có trường geom_wkt
    const found = segments.find(
      (s) => s.segment_id === segmentId || s.external_ref === segmentId
    )
    if (found && 'geom_wkt' in found && typeof found.geom_wkt === 'string') {
      const parsed = parseLineStringWkt(found.geom_wkt)
      if (parsed.length >= 2) return parsed
    }

    // 3. Fallback: Nếu phải nối qua cột đèn, BẮT BUỘC SẮP XẾP tăng dần theo số hiệu cột
    // (TUYỆT ĐỐI không nối mảng lộn xộn gây đan chéo hình lưới mạng nhện)
    const segPoles = allPoles
      .filter(
        (p) =>
          p.segment_id === segmentId &&
          p.location &&
          Number.isFinite(p.location.lat) &&
          Number.isFinite(p.location.lng)
      )
      .sort((a, b) =>
        (a.external_ref || a.pole_id || '').localeCompare(
          b.external_ref || b.pole_id || '',
          undefined,
          { numeric: true }
        )
      )
      .map((p) => [p.location.lng, p.location.lat] as [number, number])

    if (segPoles.length >= 2) return segPoles

    return []
  }, [segmentId, mapSegments, segments, allPoles])

  // Trích xuất các cột khác trên cùng tuyến đường (GeoJSON FeatureCollection)
  const otherPolesGeoJSON = useMemo<FeatureCollection>(() => {
    if (!segmentId) {
      return { type: 'FeatureCollection', features: [] }
    }
    const features: Feature[] = allPoles
      .filter(
        (p) =>
          p.segment_id === segmentId &&
          p.pole_id !== pole?.pole_id &&
          p.location &&
          Number.isFinite(p.location.lng) &&
          Number.isFinite(p.location.lat)
      )
      .map((p) => ({
        type: 'Feature',
        properties: {
          id: p.pole_id,
          code: p.external_ref || p.pole_id,
          cabinet_id: p.cabinet_id || p.feeder_id,
        },
        geometry: {
          type: 'Point',
          coordinates: [p.location.lng, p.location.lat],
        },
      }))

    return {
      type: 'FeatureCollection',
      features,
    }
  }, [allPoles, segmentId, pole?.pole_id])

  // Lọc tủ điện cấp nguồn tương ứng với 1 tuyến đường
  const getAvailableCabinetsForSegment = useCallback(
    (targetSegId: string) => {
      if (!targetSegId || !cabinets || cabinets.length === 0) return cabinets || []

      // 1. Lấy ID tủ mà các cột trên tuyến này đang kết nối
      const connectedCabinetIds = new Set<string>()
      allPoles
        .filter((p) => p.segment_id === targetSegId)
        .forEach((p) => {
          if (p.cabinet_id) connectedCabinetIds.add(p.cabinet_id)
          if (p.feeder_id) connectedCabinetIds.add(p.feeder_id)
        })

      // 2. Lọc theo từ khóa tên tuyến (ví dụ: "Tỉnh Lộ 8")
      const segObj = segments.find(
        (s) => s.segment_id === targetSegId || s.external_ref === targetSegId
      )
      const segKeyword = segObj?.segment_name?.includes(' - ')
        ? segObj.segment_name.split(' - ')[1].trim().toLowerCase()
        : segObj?.segment_name?.toLowerCase() || ''

      const filtered = cabinets.filter((cab) => {
        if (
          (cab.cabinet_id && connectedCabinetIds.has(cab.cabinet_id)) ||
          (cab.external_ref && connectedCabinetIds.has(cab.external_ref))
        ) {
          return true
        }
        if (segKeyword && cab.cabinet_name?.toLowerCase().includes(segKeyword)) {
          return true
        }
        return false
      })

      return filtered.length > 0 ? filtered : cabinets
    },
    [cabinets, segments, allPoles]
  )

  // Lọc tủ điện cấp nguồn tương ứng với tuyến đường đang chọn
  const availableCabinetsOnSegment = useMemo(() => {
    return getAvailableCabinetsForSegment(segmentId)
  }, [getAvailableCabinetsForSegment, segmentId])

  // Xử lý đổi tuyến đường ở dropdown: cập nhật tuyến và reset tủ nếu tủ cũ không thuộc tuyến mới
  const handleSegmentChange = (newSegId: string) => {
    setSegmentId(newSegId)
    const newAvailableCabinets = getAvailableCabinetsForSegment(newSegId)
    const isStillValid = newAvailableCabinets.some(
      (c) => c.cabinet_id === cabinetId || c.external_ref === cabinetId
    )
    if (!isStillValid) {
      setCabinetId('')
    }
  }

  // Tủ điện đang được chọn
  const currentCabinet = useMemo(() => {
    return cabinets.find(
      (c) => c.cabinet_id === cabinetId || c.external_ref === cabinetId
    )
  }, [cabinets, cabinetId])

  if (!isOpen || !pole) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const selectedCab = cabinets.find(
      (c) => c.cabinet_id === cabinetId || c.external_ref === cabinetId
    )

    const updated: PoleListItem = {
      ...pole,
      external_ref: externalRef.trim() || pole.external_ref,
      segment_id: segmentId || null,
      feeder_id: cabinetId || null,
      cabinet_id: cabinetId || null,
      cabinet_name: selectedCab?.cabinet_name || null,
      near_sensitive_poi: nearSensitivePoi,
      note: noteText.trim() ? noteText.trim() : null,
      location: { lat, lng },
      updated_at: new Date().toISOString(),
    }

    onSave(updated)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog (Max-w-5xl, 2 columns Web GIS) */}
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-10 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 dark:bg-slate-950 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center font-bold">
              <Edit3 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                Chỉnh Sửa Cột Đèn: {pole.external_ref || pole.pole_id}
              </h3>
              <p className="text-[11px] text-slate-300 dark:text-slate-400">
                Hiệu chỉnh thông số kỹ thuật và định vị lại tọa độ chính xác trên bản đồ số
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form Layout 2 Cột */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
            {/* CỘT TRÁI: FORM THÔNG SỐ (42% width trên md) */}
            <div className="md:col-span-5 p-4 sm:p-5 space-y-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 overflow-y-auto text-xs">
              {/* Dòng 1: Mã cột & Tuyến đường */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Mã Cột Điện (Tem Cột) <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={externalRef}
                  onChange={(e) => setExternalRef(e.target.value)}
                  placeholder="VD: C-01, P.12..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Tuyến Đường Chiếu Sáng:
                </label>
                <select
                  value={segmentId}
                  onChange={(e) => handleSegmentChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Chưa gán tuyến đường --</option>
                  {segments.map((s) => (
                    <option
                      key={s.segment_id || s.external_ref || Math.random()}
                      value={s.segment_id || ''}
                    >
                      {s.segment_name || s.external_ref || s.segment_id || 'Tuyến không tên'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dòng 2: Tủ điện quản lý & Checkbox POI */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Tủ Điện Quản Lý (Mạch nguồn):</span>
                  </span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">(1 Cột - 1 Tủ)</span>
                </label>
                <select
                  value={cabinetId}
                  onChange={(e) => setCabinetId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">
                    {availableCabinetsOnSegment.length === 0
                      ? '(Tuyến này chưa có tủ điện khả dụng)'
                      : '-- Chọn tủ điện quản lý --'}
                  </option>
                  {availableCabinetsOnSegment.map((c) => (
                    <option
                      key={c.cabinet_id || c.external_ref || Math.random()}
                      value={c.cabinet_id || c.external_ref || ''}
                    >
                      ⚡️ {c.cabinet_name || c.external_ref || c.cabinet_id} ({c.external_ref || c.cabinet_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2.5">
                <input
                  id="edit-near-sensitive-poi-gis"
                  type="checkbox"
                  checked={nearSensitivePoi}
                  onChange={(e) => setNearSensitivePoi(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <label
                  htmlFor="edit-near-sensitive-poi-gis"
                  className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none leading-tight"
                >
                  Gần khu vực nhạy cảm (Trường học, bệnh viện, ngã tư lớn)
                </label>
              </div>

              {/* Dòng 3: Ghi chú */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Ghi chú hiện trường:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Tối đa 1000 ký tự</span>
                </label>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Ghi chú điểm tham chiếu, tình trạng trụ..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Dòng 4: Tọa độ số hiển thị */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  <span>Tọa độ WGS84 Hiện Tại:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Kinh độ (Lng)</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{lng.toFixed(6)}</span>
                  </div>
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Vĩ độ (Lat)</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{lat.toFixed(6)}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  💡 Kéo ghim màu cam hoặc click trực tiếp trên bản đồ để định vị lại tọa độ cột.
                </p>
              </div>
            </div>

            {/* CỘT PHẢI: BẢN ĐỒ GIS THEO NGỮ CẢNH (58% width trên md) */}
            <EditPoleMap
              lat={lat}
              lng={lng}
              segmentCoords={segmentCoords}
              otherPolesGeoJSON={otherPolesGeoJSON}
              currentCabinet={currentCabinet}
              onChangeCoords={({ lat: newLat, lng: newLng }) => {
                setLat(newLat)
                setLng(newLng)
              }}
            />
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Lưu Thay Đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default EditPoleModal
