import React from 'react'
import {
  Eye,
  Edit2,
  Trash2,
  Cpu,
  Zap,
  Key,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  Cable,
} from 'lucide-react'
import type { IotNodeItem } from '../../../../../types/assets/iot-nodes'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import { IotNodeTableSkeleton } from './IotNodeTableSkeleton'

export interface IotNodeTableProps {
  iotNodes: IotNodeItem[]
  cabinets: CabinetListItem[]
  isLoading?: boolean
  onViewDetail: (node: IotNodeItem) => void
  onEdit: (node: IotNodeItem) => void
  onDelete: (nodeId: string) => void
  onSetRelay: (node: IotNodeItem) => void
  onIssueCredential: (node: IotNodeItem) => void
}

export const IotNodeTable: React.FC<IotNodeTableProps> = ({
  iotNodes,
  cabinets,
  isLoading = false,
  onViewDetail,
  onEdit,
  onDelete,
  onSetRelay,
  onIssueCredential,
}) => {
  const getCabinetName = (cabinetId: string | null) => {
    if (!cabinetId) return 'Chưa gán tủ'
    const cab = cabinets.find((c) => c.cabinet_id === cabinetId)
    return cab?.cabinet_name || cab?.external_ref || cabinetId
  }

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (!isLoading && iotNodes.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100 dark:border-purple-800/60 shadow-sm">
          <Cpu className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
          Chưa có thiết bị IoT nào
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto mb-4">
          Hệ thống chưa ghi nhận bộ điều khiển viễn trắc IoT nào gắn tại tủ điện. Bạn có thể nhấn nút đăng ký thiết bị mới.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold select-none uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Mã Thiết Bị</th>
              <th className="py-3 px-4">Tủ Điện Cấp Nguồn</th>
              <th className="py-3 px-4">Địa bàn</th>
              <th className="py-3 px-4 text-center">Nguồn Dữ Liệu</th>
              <th className="py-3 px-4 text-center">Điều Khiển Từ Xa</th>
              <th className="py-3 px-4 text-center">Xác Thực (Secret)</th>
              <th className="py-3 px-4">Báo Cáo Gần Nhất</th>
              <th className="py-3 px-4">Rơ-le Đấu Nối</th>
              <th className="py-3 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {isLoading ? (
              <IotNodeTableSkeleton rowCount={8} />
            ) : (
              iotNodes.map((node) => {
                const nodeId = node.node_id || 'Chưa cấp mã'

                return (
                  <tr
                    key={nodeId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Mã Thiết Bị */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/50 dark:border-purple-800/50">
                          <Cpu className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate max-w-[150px]" title={nodeId}>
                          {nodeId}
                        </span>
                      </div>
                    </td>

                    {/* Tủ Điện Cấp Nguồn */}
                    <td className="py-3.5 px-4">
                      {node.cabinet_id ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Zap className="w-3 h-3" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-100">
                              {getCabinetName(node.cabinet_id)}
                            </span>
                            <span className="block text-[10px] font-mono text-slate-400 dark:text-slate-500">
                              {node.cabinet_id}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa gán tủ</span>
                      )}
                    </td>

                    {/* Địa bàn */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {node.commune_name || node.commune_id || '—'}
                    </td>

                    {/* Nguồn Dữ Liệu */}
                    <td className="py-3.5 px-4 text-center">
                      {node.data_source === 'simulated' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Mô phỏng
                        </span>
                      ) : node.data_source === 'calibration_rig' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          Kiểm chuẩn (Rig)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {node.data_source}
                        </span>
                      )}
                    </td>

                    {/* Điều Khiển Từ Xa */}
                    <td className="py-3.5 px-4 text-center">
                      {node.supports_remote_control ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          Hỗ trợ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          <XCircle className="w-3 h-3 text-slate-400" />
                          Chỉ đọc
                        </span>
                      )}
                    </td>

                    {/* Xác Thực (Secret) */}
                    <td className="py-3.5 px-4 text-center">
                      {node.has_credential ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-help"
                          title={`Secret cấp ngày: ${formatDateTime(node.credential_set_at)}`}
                        >
                          <Key className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          Đã cấp
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Chưa cấp
                        </span>
                      )}
                    </td>

                    {/* Báo Cáo Gần Nhất */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {node.last_report_at ? (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDateTime(node.last_report_at)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa có tín hiệu</span>
                      )}
                    </td>

                    {/* Rơ-le Đấu Nối */}
                    <td className="py-3.5 px-4">
                      {node.relays && node.relays.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                          {node.relays.map((r) => (
                            <span
                              key={r.relay_no}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${
                                r.feeder_id
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                              }`}
                              title={`Rơ-le ${r.relay_no}: ${
                                r.feeder_id ? `Đấu nối mạch ${r.feeder_id}` : 'Chưa đấu nối'
                              } (Chế độ: ${r.control_mode || 'Chưa báo cáo'})`}
                            >
                              <Cable className="w-2.5 h-2.5" />
                              <span>
                                R{r.relay_no}: {r.feeder_id || 'Trống'}
                              </span>
                              {r.control_mode && (
                                <span className="uppercase text-[9px] px-1 py-0.2 bg-white/60 dark:bg-black/30 rounded">
                                  {r.control_mode}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">0 rơ-le</span>
                      )}
                    </td>

                    {/* Thao Tác */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onViewDetail(node)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Xem chi tiết thiết bị IoT"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onSetRelay(node)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Cấu hình đấu nối rơ-le"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onIssueCredential(node)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Cấp Secret xác thực mới"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(node)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Chỉnh sửa thiết bị"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => node.node_id && onDelete(node.node_id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Xóa thiết bị"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
