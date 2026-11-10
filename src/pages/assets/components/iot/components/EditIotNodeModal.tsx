import React, { useState, useEffect } from 'react'
import { Cpu, Zap, CheckCircle2 } from 'lucide-react'
import { AssetModalFrame, AssetModalHeader, AssetModalFooter, AssetModalError } from '../../common/AssetModal'
import type { IotNodeItem, UpdateIotNodeRequest } from '../../../../../types/assets/iot-nodes'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import type { DataSource } from '../../../../../types/common/enums'
import { formatFriendlyCommuneName } from '../../../../../utils/assets/communeUtils'

export interface EditIotNodeModalProps {
  isOpen: boolean
  node: IotNodeItem | null
  cabinets: CabinetListItem[]
  onClose: () => void
  onSave: (nodeId: string, data: UpdateIotNodeRequest) => void
}

export const EditIotNodeModal: React.FC<EditIotNodeModalProps> = ({
  isOpen,
  node,
  cabinets,
  onClose,
  onSave,
}) => {
  const [dataSource, setDataSource] = useState<DataSource>('simulated')
  const [supportsRemoteControl, setSupportsRemoteControl] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (node) {
      setDataSource(node.data_source || 'simulated')
      setSupportsRemoteControl(!!node.supports_remote_control)
      setErrorMsg(null)
    }
  }, [node])

  if (!isOpen || !node) return null

  const selectedCabinet = cabinets.find((c) => c.cabinet_id === node.cabinet_id)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!node.node_id) {
      setErrorMsg('Thiếu mã định danh thiết bị IoT để cập nhật!')
      return
    }

    const payload: UpdateIotNodeRequest = {
      data_source: dataSource,
      supports_remote_control: supportsRemoteControl,
    }

    onSave(node.node_id, payload)
    onClose()
  }

  return (
    <AssetModalFrame widthClass="max-w-lg">
      <AssetModalHeader
        icon={<Cpu className="w-5 h-5" />}
        accent="cyan"
        title="Chỉnh sửa thiết bị IoT"
        subtitle={node.node_id}
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <AssetModalError message={errorMsg} />
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Tủ điện cố định */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">
              Tủ Điện & Khu Vực Lắp Đặt (Cố định)
            </span>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                {selectedCabinet?.cabinet_name || node.cabinet_id} ({node.cabinet_id})
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Địa bàn: <strong>{formatFriendlyCommuneName(selectedCabinet?.commune_name, node.commune_id, 'Chưa gán địa bàn')}</strong>
            </p>
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
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Mô Phỏng (Simulated)</span>
                  <input
                    type="radio"
                    name="editDataSource"
                    value="simulated"
                    checked={dataSource === 'simulated'}
                    onChange={() => setDataSource('simulated')}
                    className="accent-blue-600"
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
                    name="editDataSource"
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
