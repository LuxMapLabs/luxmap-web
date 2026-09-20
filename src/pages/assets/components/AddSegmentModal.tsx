import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Route, CheckCircle2 } from 'lucide-react'

export interface NewSegmentData {
  segment_id: string
  segment_name: string
  road_class: 'inter_commune' | 'inter_village' | 'alley'
  length_m: number
  pole_count: number
  commune_name: string
}

interface AddSegmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAddSegment: (data: NewSegmentData) => void
  existingCount: number
}

export const AddSegmentModal: React.FC<AddSegmentModalProps> = ({
  isOpen,
  onClose,
  onAddSegment,
  existingCount,
}) => {
  const nextCode = `SEG-${String(existingCount + 1).padStart(3, '0')}`

  const [segmentId, setSegmentId] = useState(nextCode)
  const [segmentName, setSegmentName] = useState('')
  const [roadClass, setRoadClass] = useState<'inter_commune' | 'inter_village' | 'alley'>('inter_commune')
  const [lengthM, setLengthM] = useState('1200')
  const [poleCount, setPoleCount] = useState('35')
  const [communeName, setCommuneName] = useState('Xã Phước Hậu')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAddSegment({
      segment_id: segmentId.trim() || nextCode,
      segment_name: segmentName.trim() || `Tuyến đường ${segmentId}`,
      road_class: roadClass,
      length_m: parseInt(lengthM, 10) || 1000,
      pole_count: parseInt(poleCount, 10) || 0,
      commune_name: communeName,
    })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <Route className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Khai Báo Tuyến Đường Chiếu Sáng Mới</h3>
              <p className="text-xs text-blue-200">Tạo trục liên kết không gian địa lý cho các cột đèn</p>
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
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mã tuyến (Segment ID)</label>
              <input
                type="text"
                required
                value={segmentId}
                onChange={(e) => setSegmentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cấp đường</label>
              <select
                value={roadClass}
                onChange={(e) => setRoadClass(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="inter_commune" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Đường liên xã (Trục chính)</option>
                <option value="inter_village" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Đường liên thôn / liên ấp</option>
                <option value="alley" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Đường nhánh / Ngõ xóm</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tên tuyến đường</label>
            <input
              type="text"
              required
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
              placeholder="VD: Tuyến D - Đường Bờ Kênh Củ Chi..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Chiều dài tuyến (mét)</label>
              <input
                type="number"
                step="50"
                value={lengthM}
                onChange={(e) => setLengthM(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Số cột thiết kế dự kiến</label>
              <input
                type="number"
                value={poleCount}
                onChange={(e) => setPoleCount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Địa bàn Xã quản lý</label>
            <select
              value={communeName}
              onChange={(e) => setCommuneName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="Xã Phước Hậu" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Xã Phước Hậu</option>
              <option value="Xã Mỹ Hạnh Bắc" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Xã Mỹ Hạnh Bắc</option>
              <option value="Xã Đức Hòa Đông" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Xã Đức Hòa Đông</option>
            </select>
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 cursor-pointer transition flex items-center gap-1.5"
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
