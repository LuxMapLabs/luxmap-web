import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Zap, X, CheckCircle2 } from 'lucide-react'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import type { SegmentListItem } from '../../../../../types/assets/segments'

export interface EditCabinetModalProps {
  isOpen: boolean
  cabinet: CabinetListItem | null
  availableSegments?: SegmentListItem[]
  onClose: () => void
  onSave: (updated: CabinetListItem) => void
}

export const EditCabinetModal: React.FC<EditCabinetModalProps> = ({
  isOpen,
  cabinet,
  onClose,
  onSave,
}) => {
  const [cabinetName, setCabinetName] = useState('')

  useEffect(() => {
    if (cabinet) {
      setCabinetName(cabinet.cabinet_name || cabinet.cabinet_id || '')
    }
  }, [cabinet])

  if (!isOpen || !cabinet) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const updated: CabinetListItem = {
      ...cabinet,
      cabinet_name: cabinetName,
      updated_at: new Date().toISOString(),
    }
    onSave(updated)
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
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-10 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 dark:bg-slate-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Chỉnh Sửa Tủ Điện: {cabinet.external_ref || cabinet.cabinet_id}</h3>
              <p className="text-[11px] text-slate-300 dark:text-slate-400">Địa bàn: {cabinet.commune_id || 'Củ Chi'}</p>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-800 dark:text-slate-200">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Tên tủ điện:</label>
            <input
              type="text"
              value={cabinetName}
              onChange={(e) => setCabinetName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1f3864]"
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1 text-slate-600 dark:text-slate-300 text-xs">
            <div><strong>Mã tủ điện (ID):</strong> {cabinet.cabinet_id || cabinet.external_ref}</div>
            <div><strong>Số mạch nguồn (Feeders):</strong> {cabinet.feeder_ids?.length || 0} mạch</div>
            <div><strong>Tọa độ GIS:</strong> {cabinet.location?.lat && cabinet.location?.lng ? `${cabinet.location.lat.toFixed(5)}, ${cabinet.location.lng.toFixed(5)}` : 'Chưa có tọa độ'}</div>
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
    </div>,
    document.body
  )
}
