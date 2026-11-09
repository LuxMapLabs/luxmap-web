import React, { useState } from 'react'
import { Cpu, Zap, CheckCircle2 } from 'lucide-react'
import { AssetModalFrame, AssetModalHeader, AssetModalFooter, AssetModalError } from '../../common/AssetModal'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import type { CreateIotNodeRequest, IotNodeItem } from '../../../../../types/assets/iot-nodes'
import type { DataSource } from '../../../../../types/common/enums'
import { formatFriendlyCommuneName } from '../../../../../utils/assets/communeUtils'
import { CabinetSearchSelect } from '../../common/CabinetSearchSelect'

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
    <AssetModalFrame widthClass="max-w-lg">
      <AssetModalHeader
        icon={<Cpu className="w-5 h-5" />}
        accent="cyan"
        title="Đăng Ký Thiết Bị IoT Mới"
        subtitle={'Gắn bộ điều khiển viễn trắc IoT (Tele-controller) vào tủ điện'}
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <AssetModalError message={errorMsg} />
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Chọn Tủ điện */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tủ Điện Cấp Nguồn / Lắp Đặt <span className="text-rose-500">*</span>
            </label>
            <CabinetSearchSelect
              cabinets={cabinets}
              value={cabinetId}
              onChange={(newId) => {
                setCabinetId(newId)
                setErrorMsg(null)
              }}
              placeholder="-- Chọn tủ điện gắn thiết bị --"
              accentColor="emerald"
              allowClear={true}
              getId={(c) => c.cabinet_id || ''}
              isOptionDisabled={(c) => Boolean(c.cabinet_id && occupiedCabinetIds.has(c.cabinet_id))}
              getOptionBadge={(c) => (c.cabinet_id && occupiedCabinetIds.has(c.cabinet_id) ? '[ĐÃ CÓ THIẾT BỊ]' : null)}
            />
            {selectedCabinet && (
              <div className="mt-1.5 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  Địa bàn quản lý: <strong>{formatFriendlyCommuneName(selectedCabinet.commune_name, selectedCabinet.commune_id, 'Chưa gán địa bàn')}</strong>
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

        </div>

        <AssetModalFooter
          onCancel={onClose}
          submitLabel="Đăng Ký Thiết Bị"
          submitIcon={<CheckCircle2 className="w-4 h-4" />}
        />
      </form>
    </AssetModalFrame>
  )
}
