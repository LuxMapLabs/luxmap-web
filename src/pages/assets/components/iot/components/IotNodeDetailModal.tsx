import React from 'react'
import {
  X,
  Cpu,
  Zap,
  Key,
  Sliders,
  Clock,
  Cable,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
} from 'lucide-react'
import type { IotNodeItem } from '../../../../../types/assets/iot-nodes'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import { formatCommuneDisplayName } from '../../../../../constants/communes'

export interface IotNodeDetailModalProps {
  isOpen: boolean
  node: IotNodeItem | null
  cabinets: CabinetListItem[]
  onClose: () => void
  onEdit: (node: IotNodeItem) => void
  onSetRelay: (node: IotNodeItem) => void
  onIssueCredential: (node: IotNodeItem) => void
}

export const IotNodeDetailModal: React.FC<IotNodeDetailModalProps> = ({
  isOpen,
  node,
  cabinets,
  onClose,
  onEdit,
  onSetRelay,
  onIssueCredential,
}) => {
  if (!isOpen || !node) return null

  const selectedCabinet = cabinets.find((c) => c.cabinet_id === node.cabinet_id)

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-800 shadow-xs">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-mono">
                  {node.node_id}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                  {node.node_role}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chi tiết bộ điều khiển viễn trắc IoT tủ điện
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

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Grid thông tin chung */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tủ điện */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Tủ Điện Cấp Nguồn</span>
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                {selectedCabinet?.cabinet_name || node.cabinet_id}
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Mã tủ: {node.cabinet_id}
              </div>
            </div>

            {/* Địa bàn */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span>Khu Vực Quản Lý</span>
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                {formatCommuneDisplayName(node.commune_id)}
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Mã xã: {node.commune_id}
              </div>
            </div>

            {/* Nguồn dữ liệu & Điều khiển */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Nguồn dữ liệu:</span>
                <span className="font-bold">
                  {node.data_source === 'simulated' ? (
                    <span className="text-emerald-600 font-semibold">Mô phỏng (Simulated)</span>
                  ) : (
                    <span className="text-purple-600 font-semibold">Kiểm chuẩn (Rig)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Điều khiển từ xa:</span>
                {node.supports_remote_control ? (
                  <span className="inline-flex items-center gap-1 text-blue-600 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Bật
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-400 font-semibold">
                    <XCircle className="w-3.5 h-3.5" /> Tắt (Chỉ đọc)
                  </span>
                )}
              </div>
            </div>

            {/* Secret & Báo cáo */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Secret xác thực:</span>
                {node.has_credential ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                    <Key className="w-3.5 h-3.5" /> Đã cấp
                  </span>
                ) : (
                  <span className="text-amber-600 font-semibold">Chưa cấp</span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Lần cấp secret:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {formatDateTime(node.credential_set_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Lần báo cáo và Cập nhật */}
          <div className="p-3 bg-slate-100/70 dark:bg-slate-800/30 rounded-xl flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Báo cáo viễn trắc gần nhất:</span>
              <strong className="text-slate-800 dark:text-slate-100">
                {formatDateTime(node.last_report_at)}
              </strong>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Cập nhật: {formatDateTime(node.updated_at)}</span>
            </div>
          </div>

          {/* Danh Sách Rơ-le Đấu Nối */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Cable className="w-4 h-4 text-indigo-600" />
                <span>Danh Sách Rơ-le Điều Khiển ({node.relays?.length || 0})</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onSetRelay(node)
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Cấu hình rơ-le</span>
              </button>
            </div>

            {node.relays && node.relays.length > 0 ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-bold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="py-2.5 px-3">Rơ-le #</th>
                      <th className="py-2.5 px-3">Mạch Xuất Tuyến</th>
                      <th className="py-2.5 px-3 text-center">Chế Độ Báo Cáo</th>
                      <th className="py-2.5 px-3 text-right">Thời Điểm Báo Cáo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {node.relays.map((r) => (
                      <tr key={r.relay_no} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          Rơ-le #{r.relay_no}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {r.feeder_id || <span className="text-slate-400 font-normal">Chưa đấu nối</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {r.control_mode ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {r.control_mode}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500">
                          {formatDateTime(r.mode_reported_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl text-center text-xs text-slate-400 italic border border-slate-200 dark:border-slate-800">
                Thiết bị hiện chưa có rơ-le nào được đấu nối vào mạch xuất tuyến.
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onIssueCredential(node)
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Cấp Secret</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onEdit(node)
                }}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>Chỉnh sửa</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
