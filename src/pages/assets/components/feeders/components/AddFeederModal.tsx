import React, { useState } from 'react'
import { X, Cable, Zap, AlertCircle } from 'lucide-react'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import type { CreateFeederRequest } from '../../../../../types/assets/feeders'
import { CabinetSearchSelect } from '../../common/CabinetSearchSelect'

export interface AddFeederModalProps {
  isOpen: boolean
  cabinets: CabinetListItem[]
  onClose: () => void
  onSave: (data: CreateFeederRequest) => void
}

export const AddFeederModal: React.FC<AddFeederModalProps> = ({
  isOpen,
  cabinets,
  onClose,
  onSave,
}) => {
  const [feederName, setFeederName] = useState('')
  const [cabinetId, setCabinetId] = useState('')
  const [externalRef, setExternalRef] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

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

    const payload: CreateFeederRequest = {
      feeder_name: feederName.trim(),
      cabinet_id: selectedCabinet?.cabinet_id || null,
      cabinet_source: selectedCabinet ? 'verified' : null,
      external_ref: externalRef.trim() || null,
      commune_id: selectedCabinet?.commune_id || 'COM-001',
    }

    onSave(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
              <Cable className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Thêm Mạch Điện Chiếu Sáng
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tạo lộ xuất tuyến cấp nguồn cho các cột đèn
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

        {/* Modal Body */}
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
              onChange={(newCabId) => {
                setCabinetId(newCabId)
                if (newCabId && !feederName) {
                  const cab = cabinets.find(
                    (c) => c.cabinet_id === newCabId || c.external_ref === newCabId
                  )
                  if (cab) {
                    setFeederName(`Lộ 1 - ${cab.cabinet_name || cab.external_ref || cab.cabinet_id}`)
                  }
                }
              }}
              placeholder="-- Chọn tủ điện đấu nối --"
              accentColor="emerald"
              allowClear={true}
              getId={(c) => c.cabinet_id || ''}
            />
            <p className="text-[11px] text-slate-400 italic">
              Lộ xuất tuyến sẽ được gắn trực tiếp vào trạm tủ điều khiển này.
            </p>
          </div>

          {/* Tên Mạch Điện */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Tên Mạch Điện (Lộ xuất tuyến) <span className="text-rose-500">*</span>:
            </label>
            <input
              type="text"
              value={feederName}
              onChange={(e) => setFeederName(e.target.value)}
              placeholder="Ví dụ: Lộ 1 - Tuyến Tỉnh Lộ 8"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Mã Tham Chiếu Quản Lý (External Ref) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Mã Tham Chiếu Quản Lý (Tùy chọn):
            </label>
            <input
              type="text"
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              placeholder="Ví dụ: FDR-CAB-TL8-A"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Thông tin khu vực tự động */}
          {selectedCabinet && (
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>Khu vực quản lý theo tủ điện:</span>
              </div>
              <p className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">
                Mã xã/phường: {selectedCabinet.commune_id}
              </p>
            </div>
          )}

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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all"
            >
              Lưu Mạch Điện
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
