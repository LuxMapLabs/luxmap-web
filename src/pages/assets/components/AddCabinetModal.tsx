import React, { useState } from 'react'
import { X, Zap, CheckCircle2, MapPin } from 'lucide-react'

export interface NewCabinetData {
  cabinet_id: string
  cabinet_name: string
  role: 'root_cabinet' | 'sub_cabinet'
  segment_id: string
  segment_name: string
  voltage_v: number
  current_load_kw: number
  total_poles_managed: number
  landmark_note: string
  lat: number
  lng: number
  installed_at: string
}

interface AddCabinetModalProps {
  isOpen: boolean
  onClose: () => void
  onAddCabinet: (data: NewCabinetData) => void
  existingCount: number
}

const SEGMENTS = [
  { id: 'SEG-001', name: 'Tuyến A - Tỉnh Lộ 8' },
  { id: 'SEG-002', name: 'Tuyến B - Hương Lộ 2' },
  { id: 'SEG-003', name: 'Tuyến C - Huỳnh Văn Cọ' },
]

export const AddCabinetModal: React.FC<AddCabinetModalProps> = ({
  isOpen,
  onClose,
  onAddCabinet,
  existingCount,
}) => {
  const nextCode = `CAB-NEW-${String(existingCount + 1).padStart(3, '0')}`

  const [cabinetId, setCabinetId] = useState(nextCode)
  const [cabinetName, setCabinetName] = useState('Tủ điều khiển mới')
  const [role, setRole] = useState<'root_cabinet' | 'sub_cabinet'>('root_cabinet')
  const [segmentId, setSegmentId] = useState('SEG-001')
  const [voltage, setVoltage] = useState('220.0')
  const [loadKw, setLoadKw] = useState('15.0')
  const [polesManaged, setPolesManaged] = useState('30')
  const [landmark, setLandmark] = useState('Ngã ba trung tâm, đối diện trạm y tế')
  const [lat, setLat] = useState('10.9710')
  const [lng, setLng] = useState('106.4910')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const seg = SEGMENTS.find((s) => s.id === segmentId)

    onAddCabinet({
      cabinet_id: cabinetId.trim() || nextCode,
      cabinet_name: cabinetName.trim(),
      role,
      segment_id: segmentId,
      segment_name: seg?.name || 'Tuyến A - Tỉnh Lộ 8',
      voltage_v: parseFloat(voltage) || 220,
      current_load_kw: parseFloat(loadKw) || 15,
      total_poles_managed: parseInt(polesManaged, 10) || 30,
      landmark_note: landmark.trim(),
      lat: parseFloat(lat) || 10.9710,
      lng: parseFloat(lng) || 106.4910,
      installed_at: new Date().toISOString().split('T')[0],
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-700 dark:to-orange-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <Zap className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Đăng Ký Tủ Điện Điều Khiển Mới</h3>
              <p className="text-xs text-amber-100 dark:text-amber-200">Khai báo thông số tủ cấp nguồn hạ thế vào bản đồ GIS</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-800 dark:text-slate-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mã định danh tủ (ID)</label>
              <input
                type="text"
                required
                value={cabinetId}
                onChange={(e) => setCabinetId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-600"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phân cấp tủ điện</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="root_cabinet" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Tủ điện xuất tuyến chính (Root)</option>
                <option value="sub_cabinet" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Tủ điện phân đoạn phụ (Sub)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tên tủ điện mô tả</label>
            <input
              type="text"
              required
              value={cabinetName}
              onChange={(e) => setCabinetName(e.target.value)}
              placeholder="VD: Tủ Đỉnh Tuyến A (Tỉnh Lộ 8)..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Thuộc tuyến đường chiếu sáng</label>
            <select
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              {SEGMENTS.map((s) => (
                <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                  {s.name} ({s.id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Điện áp danh định</label>
              <input
                type="number"
                step="0.1"
                value={voltage}
                onChange={(e) => setVoltage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Công suất tải (kW)</label>
              <input
                type="number"
                step="0.5"
                value={loadKw}
                onChange={(e) => setLoadKw(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Số cột quản lý</label>
              <input
                type="number"
                value={polesManaged}
                onChange={(e) => setPolesManaged(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {/* GPS Coordinates */}
          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 text-xs">
              <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Tọa độ vị trí đặt tủ (WGS84)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">Vĩ độ (Latitude)</label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">Kinh độ (Longitude)</label>
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ghi chú mốc thực địa (Landmark)</label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="VD: Cạnh trạm biến áp, ngã ba đường..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md shadow-amber-600/20 cursor-pointer transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu Tủ Điện</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
