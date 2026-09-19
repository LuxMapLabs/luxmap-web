import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { PlusCircle, X, MapPin, CheckCircle2 } from 'lucide-react'

export interface NewPoleData {
  pole_id: string
  segment_id: string
  segment_name: string
  commune_id: string
  commune_name: string
  lat: number
  lng: number
  lamp_watt: number
  power_source: 'grid'
  fixture_type: 'led_road_lamp'
  feeder_id: string
  warranty_expiry: string
  near_sensitive_poi: boolean
  atlas: string
}

interface AddPoleModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPole: (data: NewPoleData) => void
  existingPoleCount: number
}

const COMMUNES = [
  { id: 'COM-001', name: 'Xã Phước Hậu' },
  { id: 'COM-002', name: 'Xã Mỹ Hạnh Bắc' },
  { id: 'COM-003', name: 'Xã Đức Hòa Đông' },
]

const SEGMENTS = [
  { id: 'SEG-001', name: 'Tuyến A - Tỉnh Lộ 8' },
  { id: 'SEG-002', name: 'Tuyến B - Hương Lộ 2' },
  { id: 'SEG-003', name: 'Tuyến C - Đường liên ấp' },
]

export const AddPoleModal: React.FC<AddPoleModalProps> = ({
  isOpen,
  onClose,
  onAddPole,
  existingPoleCount,
}) => {
  const nextIdNum = String(existingPoleCount + 1).padStart(4, '0')
  const defaultCode = `POLE-${nextIdNum}`

  const [poleId, setPoleId] = useState(defaultCode)
  const [communeId, setCommuneId] = useState('COM-001')
  const [segmentId, setSegmentId] = useState('SEG-001')
  const [customSegmentName, setCustomSegmentName] = useState('')
  const [lat, setLat] = useState('10.9715')
  const [lng, setLng] = useState('106.4925')
  const [lampWatt, setLampWatt] = useState<number>(100)
  const [powerSource] = useState<'grid'>('grid')
  const [fixtureType] = useState<'led_road_lamp'>('led_road_lamp')
  const [feederId, setFeederId] = useState('CAB-TL8-ROOT')
  const [warrantyExpiry, setWarrantyExpiry] = useState('2027-12-31')
  const [nearSensitivePoi, setNearSensitivePoi] = useState(false)
  const [atlas, setAtlas] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!poleId.trim()) {
      setErrorMsg('Vui lòng nhập mã cột!')
      return
    }

    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    if (isNaN(latNum) || isNaN(lngNum)) {
      setErrorMsg('Tọa độ GPS (Vĩ độ / Kinh độ) không hợp lệ!')
      return
    }

    const selectedCommune = COMMUNES.find((c) => c.id === communeId) || COMMUNES[0]
    const matchedSegment = SEGMENTS.find((s) => s.id === segmentId)
    const segName = customSegmentName.trim() || matchedSegment?.name || 'Tuyến chưa đặt tên'

    onAddPole({
      pole_id: poleId.trim().toUpperCase(),
      segment_id: segmentId,
      segment_name: segName,
      commune_id: communeId,
      commune_name: selectedCommune.name,
      lat: latNum,
      lng: lngNum,
      lamp_watt: lampWatt,
      power_source: powerSource,
      fixture_type: fixtureType,
      feeder_id: feederId.trim(),
      warranty_expiry: warrantyExpiry,
      near_sensitive_poi: nearSensitivePoi,
      atlas: atlas.trim(),
    })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-10 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-[#1f3864] dark:bg-slate-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center font-bold">
              <PlusCircle className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Đăng Ký Tài Sản Cột Đèn Mới Vào GIS</h3>
              <p className="text-[11px] text-slate-200 dark:text-slate-400">Khai báo thông số kỹ thuật và tọa độ định vị thực địa</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-800 dark:text-slate-200 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium text-[11px]">
              {errorMsg}
            </div>
          )}

          {/* Row 1: Code & Commune */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Mã cột định danh (GIS Code):</label>
              <input
                type="text"
                value={poleId}
                onChange={(e) => setPoleId(e.target.value)}
                placeholder="VD: POLE-0104"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#1f3864] dark:focus:border-blue-500 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Địa bàn Xã / Thị trấn:</label>
              <select
                value={communeId}
                onChange={(e) => setCommuneId(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1f3864] dark:focus:border-blue-500 cursor-pointer shadow-2xs"
              >
                {COMMUNES.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Segment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Phân đoạn tuyến đường:</label>
              <select
                value={segmentId}
                onChange={(e) => setSegmentId(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                {SEGMENTS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Tên tuyến hiển thị chi tiết:</label>
              <input
                type="text"
                value={customSegmentName}
                onChange={(e) => setCustomSegmentName(e.target.value)}
                placeholder="VD: Đường liên ấp 3, Cột số 12"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#1f3864] dark:focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 3: GPS Box */}
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800/50 space-y-2">
            <div className="font-bold text-blue-950 dark:text-blue-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Tọa độ Định Vị GPS (Hệ WGS84 / EPSG:4326):</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Vĩ độ (Latitude):</label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="10.9715"
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-700/60 rounded-lg font-mono font-bold text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Kinh độ (Longitude):</label>
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="106.4925"
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-700/60 rounded-lg font-mono font-bold text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Power & Wattage */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Công suất bóng:</label>
              <select
                value={lampWatt}
                onChange={(e) => setLampWatt(Number(e.target.value))}
                className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value={50} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">50W</option>
                <option value={60} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">60W</option>
                <option value={100} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">100W LED</option>
                <option value={120} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">120W LED</option>
                <option value={150} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">150W Cao áp</option>
                <option value={200} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">200W Đô thị</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Nguồn cấp điện:</label>
              <select
                value={powerSource}
                disabled
                className="w-full p-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-not-allowed"
              >
                <option value="grid" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Lưới điện 220V</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Loại bộ đèn:</label>
              <select
                value={fixtureType}
                disabled
                className="w-full p-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-not-allowed"
              >
                <option value="led_road_lamp" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">LED Road Lamp</option>
              </select>
            </div>
          </div>

          {/* Row 5: Feeder & Warranty */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Tủ điện Feeder / Đấu nối:</label>
              <input
                type="text"
                value={feederId}
                onChange={(e) => setFeederId(e.target.value)}
                placeholder="VD: CAB-TL8-ROOT"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Hạn bảo hành (YYYY-MM-DD):</label>
              <input
                type="date"
                value={warrantyExpiry}
                onChange={(e) => setWarrantyExpiry(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 6: Atlas landmark & Sensitive POI */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Mốc định vị thực tế (Atlas Landmark):</label>
            <input
              type="text"
              value={atlas}
              onChange={(e) => setAtlas(e.target.value)}
              placeholder="VD: Gần nhà ông B, quán cà phê Milano, đầu dốc cầu Đen..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="poi-check"
              checked={nearSensitivePoi}
              onChange={(e) => setNearSensitivePoi(e.target.checked)}
              className="w-4 h-4 rounded text-[#1f3864] dark:text-blue-600 cursor-pointer"
            />
            <label htmlFor="poi-check" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              Gần khu vực nhạy cảm (Trường học, Bệnh viện, Khu đông dân cư)
            </label>
          </div>

          {/* Footer Actions */}
          <div className="p-4 -mx-5 -mb-5 mt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1f3864] dark:bg-blue-600 hover:bg-[#1f3864]/90 dark:hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Lưu & Đăng Ký Vào GIS</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
