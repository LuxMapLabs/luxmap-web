import React, { useState, useEffect } from 'react'
import { X, Cable, Zap, AlertCircle } from 'lucide-react'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import type { FeederListItem, UpdateFeederRequest } from '../../../../../types/assets/feeders'
import { CabinetSearchSelect } from '../../common/CabinetSearchSelect'

export interface EditFeederModalProps {
  isOpen: boolean
  feeder: FeederListItem | null
  cabinets: CabinetListItem[]
  onClose: () => void
  onSave: (feederId: string, data: UpdateFeederRequest) => void
}

export const EditFeederModal: React.FC<EditFeederModalProps> = ({
  isOpen,
  feeder,
  cabinets,
  onClose,
  onSave,
}) => {
  const [feederName, setFeederName] = useState('')
  const [cabinetId, setCabinetId] = useState('')
  const [externalRef, setExternalRef] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (feeder && isOpen) {
      setFeederName(feeder.feeder_name || '')
      setCabinetId(feeder.cabinet?.cabinet_id || '')
      setExternalRef(feeder.external_ref || '')
      setErrorMsg(null)
    }
  }, [feeder, isOpen])

  if (!isOpen || !feeder) return null

  const selectedCabinet = cabinets.find(
    (c) => c.cabinet_id === cabinetId || c.external_ref === cabinetId
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!feederName.trim()) {
      setErrorMsg('Vui lòng nhập tên mạch điện / lộ xuất tuyến!')
      return
    }

    if (!feeder.feeder_id) {
      setErrorMsg('Thiếu mã định danh mạch điện để cập nhật!')
      return
    }

    const payload: UpdateFeederRequest = {
      feeder_name: feederName.trim(),
      cabinet_id: selectedCabinet?.cabinet_id || null,
      cabinet_source: selectedCabinet ? 'verified' : null,
      external_ref: externalRef.trim() || null,
    }

    onSave(feeder.feeder_id, payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-800">
              <Cable className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Chỉnh Sửa Mạch Điện
              </h2>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Mã mạch: {feeder.external_ref || feeder.feeder_id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Chọn Tủ điện cấp nguồn */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Tủ Điện Cấp Nguồn:
            </label>
            <CabinetSearchSelect
              cabinets={cabinets}
              value={cabinetId}
              onChange={(newCabId) => setCabinetId(newCabId)}
              placeholder="-- Chưa đấu nối vào tủ điện --"
              accentColor="amber"
              allowClear={true}
              getId={(c) => c.cabinet_id || ''}
            />
          </div>

          {/* Tên Mạch Điện */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Tên Mạch Xuất Tuyến <span className="text-rose-500">*</span>:
            </label>
            <input
              type="text"
              value={feederName}
              onChange={(e) => setFeederName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          {/* Mã Tham Chiếu Quản Lý (External Ref) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Mã Tham Chiếu Quản Lý:
            </label>
            <input
              type="text"
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Badge thống kê trụ */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Số cột đèn đang đấu nối:</span>
            </div>
            <span className="font-bold font-mono px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md">
              {feeder.pole_count} cột
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all"
            >
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
