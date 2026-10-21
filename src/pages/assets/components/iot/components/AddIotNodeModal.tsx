import React, { useState } from 'react'
import { X, Cpu, Zap, AlertCircle, Check } from 'lucide-react'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import type { CreateIotNodeRequest, IotNodeItem } from '../../../../../types/assets/iot-nodes'
import type { DataSource } from '../../../../../types/common/enums'
import { formatCommuneDisplayName } from '../../../../../constants/communes'

export interface AddIotNodeModalProps {
  isOpen: boolean
  cabinets: CabinetListItem[]
  existingIotNodes: IotNodeItem[]
  onClose: () => void
  onSave: (data: CreateIotNodeRequest) => void
}

export const AddIotNodeModal: React.FC<AddIotNodeModalProps> = ({
  isOpen,
  cabinets,
  existingIotNodes,
  onClose,
  onSave,
}) => {
  const [cabinetId, setCabinetId] = useState('')
  const [dataSource, setDataSource] = useState<DataSource>('simulated')
  const [supportsRemoteControl, setSupportsRemoteControl] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  // Tìm danh sách tủ đã có node IoT
  const occupiedCabinetIds = new Set(
    existingIotNodes.map((n) => n.cabinet_id).filter(Boolean)
  )

  const selectedCabinet = cabinets.find((c) => c.cabinet_id === cabinetId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!cabinetId) {
      setErrorMsg('Vui lòng chọn tủ điện để gắn thiết bị IoT!')
      return
    }

    if (occupiedCabinetIds.has(cabinetId)) {
      setErrorMsg('Tủ điện này đã được gắn thiết bị IoT. Mỗi tủ chỉ gắn tối đa 1 thiết bị!')
      return
    }

    const payload: CreateIotNodeRequest = {
      cabinet_id: cabinetId,
      data_source: dataSource,
      supports_remote_control: supportsRemoteControl,
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
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-800">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Đăng Ký Thiết Bị IoT Mới
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Gắn bộ điều khiển viễn trắc IoT (Tele-controller) vào tủ điện
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Chọn Tủ điện */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tủ Điện Cấp Nguồn / Lắp Đặt <span className="text-rose-500">*</span>
            </label>
            <select
              value={cabinetId}
              onChange={(e) => {
                setCabinetId(e.target.value)
                setErrorMsg(null)
              }}
              required
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1f3864] dark:focus:border-blue-500 transition"
            >
              <option value="">-- Chọn tủ điện gắn thiết bị --</option>
              {cabinets.map((cab) => {
                const isOccupied = occupiedCabinetIds.has(cab.cabinet_id)
                return (
                  <option
                    key={cab.cabinet_id || cab.external_ref || Math.random().toString()}
                    value={cab.cabinet_id || ''}
                    disabled={isOccupied}
                  >
                    {cab.cabinet_name || cab.cabinet_id} ({cab.cabinet_id})
                    {cab.commune_id ? ` - ${formatCommuneDisplayName(cab.commune_id)}` : ''}
                    {isOccupied ? ' [ĐÃ CÓ THIẾT BỊ]' : ''}
                  </option>
                )
              })}
            </select>
            {selectedCabinet && (
              <div className="mt-1.5 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  Địa bàn quản lý: <strong>{formatCommuneDisplayName(selectedCabinet.commune_id)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Nguồn Dữ Liệu */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Nguồn Dữ Liệu Thiết Bị <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition ${
                  dataSource === 'simulated'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Mô Phỏng (Simulated)</span>
                  <input
                    type="radio"
                    name="dataSource"
                    value="simulated"
                    checked={dataSource === 'simulated'}
                    onChange={() => setDataSource('simulated')}
                    className="accent-emerald-600"
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Dữ liệu viễn trắc sinh qua phần mềm giả lập
                </span>
              </label>

              <label
                className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition ${
                  dataSource === 'calibration_rig'
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Kiểm Chuẩn (Rig)</span>
                  <input
                    type="radio"
                    name="dataSource"
                    value="calibration_rig"
                    checked={dataSource === 'calibration_rig'}
                    onChange={() => setDataSource('calibration_rig')}
                    className="accent-purple-600"
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Phần cứng thiết bị đo kiểm thử nghiệm
                </span>
              </label>
            </div>
          </div>

          {/* Hỗ trợ điều khiển từ xa */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={supportsRemoteControl}
                onChange={(e) => setSupportsRemoteControl(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-[#1f3864]"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Cho phép điều khiển từ xa (Remote Control)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Thiết bị sẽ chấp nhận các lệnh BẬT / TẮT / AUTO cho từng mạch xuất tuyến qua rơ-le.
                </span>
              </div>
            </label>
          </div>

          {/* Ghi chú quy chuẩn Backend */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/50 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
            <strong>Lưu ý:</strong> Sau khi đăng ký thành công, bạn cần bấm nút <em>"Cấp Secret"</em> để lấy chuỗi xác thực nạp vào firmware thiết bị, và cấu hình các rơ-le đấu nối tương ứng.
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1f3864] hover:bg-[#1f3864]/90 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Đăng Ký Thiết Bị</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
