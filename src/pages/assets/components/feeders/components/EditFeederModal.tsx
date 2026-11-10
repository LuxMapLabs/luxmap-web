import React, { useState, useEffect } from 'react'
import { Cable, Zap, CheckCircle2 } from 'lucide-react'
import { AssetModalFrame, AssetModalHeader, AssetModalFooter, AssetModalError } from '../../common/AssetModal'
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
    <AssetModalFrame widthClass="max-w-lg">
      <AssetModalHeader
        icon={<Cable className="w-5 h-5" />}
        accent="emerald"
        title="Chỉnh sửa mạch điện"
        subtitle={`Mã mạch: ${feeder.external_ref || feeder.feeder_id}`}
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <AssetModalError message={errorMsg} />
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
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
              accentColor="blue"
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

        </div>

        <AssetModalFooter
          onCancel={onClose}
          submitLabel="Lưu thay đổi"
          submitIcon={<CheckCircle2 className="w-4 h-4" />}
        />
      </form>
    </AssetModalFrame>
  )
}
