import React, { useState, useEffect } from 'react'
import { Edit3, X, CheckCircle2 } from 'lucide-react'

export interface EditablePoleData {
  id: string
  pole_id: string
  segment_id: string
  segment_name: string
  commune_id: string
  commune_name: string
  lamp_watt: number
  power_source: 'grid' | 'solar'
  fixture_status: 'normal' | 'dim' | 'out' | 'unknown'
  feeder_id: string
  warranty_expiry: string
  atlas?: string
}

interface EditPoleModalProps {
  isOpen: boolean
  pole: EditablePoleData | null
  onClose: () => void
  onSave: (updated: EditablePoleData) => void
}

export const EditPoleModal: React.FC<EditPoleModalProps> = ({
  isOpen,
  pole,
  onClose,
  onSave,
}) => {
  const [segmentName, setSegmentName] = useState('')
  const [lampWatt, setLampWatt] = useState<number>(100)
  const [powerSource, setPowerSource] = useState<'grid' | 'solar'>('grid')
  const [fixtureStatus, setFixtureStatus] = useState<'normal' | 'dim' | 'out' | 'unknown'>('normal')
  const [feederId, setFeederId] = useState('')
  const [warrantyExpiry, setWarrantyExpiry] = useState('')
  const [atlas, setAtlas] = useState('')

  useEffect(() => {
    if (pole) {
      setSegmentName(pole.segment_name || '')
      setLampWatt(pole.lamp_watt || 100)
      setPowerSource(pole.power_source || 'grid')
      setFixtureStatus(pole.fixture_status || 'normal')
      setFeederId(pole.feeder_id || '')
      setWarrantyExpiry(pole.warranty_expiry || '')
      setAtlas(pole.atlas || '')
    }
  }, [pole])

  if (!isOpen || !pole) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...pole,
      segment_name: segmentName,
      lamp_watt: lampWatt,
      power_source: powerSource,
      fixture_status: fixtureStatus,
      feeder_id: feederId,
      warranty_expiry: warrantyExpiry,
      atlas: atlas,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-10 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 dark:bg-slate-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center font-bold">
              <Edit3 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Chỉnh Sửa Thông Số Cột: {pole.pole_id}</h3>
              <p className="text-[11px] text-slate-300 dark:text-slate-400">{pole.commune_name}</p>
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
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Tuyến đường:</label>
            <input
              type="text"
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1f3864] dark:focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Công suất:</label>
              <select
                value={lampWatt}
                onChange={(e) => setLampWatt(Number(e.target.value))}
                className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value={50} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">50W</option>
                <option value={60} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">60W</option>
                <option value={100} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">100W LED</option>
                <option value={120} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">120W Solar</option>
                <option value={150} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">150W Cao Áp</option>
                <option value={200} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">200W Đô Thị</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Nguồn cấp:</label>
              <select
                value={powerSource}
                onChange={(e) => setPowerSource(e.target.value as 'grid' | 'solar')}
                className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="grid" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Lưới điện 220V</option>
                <option value="solar" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Năng lượng MT</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Trạng thái vận hành:</label>
              <select
                value={fixtureStatus}
                onChange={(e) => setFixtureStatus(e.target.value as any)}
                className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="normal" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🟢 Bình thường</option>
                <option value="dim" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🟡 Đèn mờ (Suy hao Lux)</option>
                <option value="out" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">🔴 Hỏng / Tắt nguồn</option>
                <option value="unknown" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">⚪ Chưa quét / Không rõ</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Bảo hành đến:</label>
              <input
                type="date"
                value={warrantyExpiry}
                onChange={(e) => setWarrantyExpiry(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:outline-none"
              >
              </input>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Tuyến Feeder kết nối:</label>
            <input
              type="text"
              value={feederId}
              onChange={(e) => setFeederId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Mốc định vị thực tế (Atlas Landmark):</label>
            <input
              type="text"
              value={atlas}
              onChange={(e) => setAtlas(e.target.value)}
              placeholder="VD: Gần quán cà phê, ngã ba..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="p-4 -mx-5 -mb-5 mt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex justify-end gap-2">
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
              <span>Lưu Thay Đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
