import { useShowCommune } from '../../../../../hooks/useShowCommune'
import React from 'react'
import { Cpu, Zap, Clock, Cable, RadioTower } from 'lucide-react'
import type { IotNodeStatus } from '../../../../../types/iot/nodes'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import type { FeederListItem } from '../../../../../types/assets/feeders'
import { IotNodeTableSkeleton } from './IotNodeTableSkeleton'
import { formatFriendlyCommuneName } from '../../../../../utils/assets/communeUtils'
import { IOT_NODE_STATUS, IOT_TONE_CLASS, iotStatusBadge } from '../../../../../constants/iot'
import { feederOnRelayOne } from '../../../../../utils/iot/iotRegistration'

export interface IotNodeTableProps {
  /** Một trang của `GET /iot/nodes`. */
  iotNodes: IotNodeStatus[]
  cabinets: CabinetListItem[]
  feeders: FeederListItem[]
  isLoading?: boolean
  onSetSource: (node: IotNodeStatus) => void
}

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const IotNodeTable: React.FC<IotNodeTableProps> = ({ iotNodes, cabinets, feeders, isLoading = false, onSetSource }) => {
  const showCommune = useShowCommune()
  const cabinetOf = (cabinetId?: string | null) => cabinets.find((c) => c.cabinet_id === cabinetId)

  if (!isLoading && iotNodes.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100 dark:border-purple-800/60 shadow-sm">
          <Cpu className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Chưa có thiết bị IoT nào</h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto">
          Hệ thống chưa ghi nhận thiết bị IoT nào gắn tại tủ điện trong địa bàn của bạn.
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
              <th className="py-3 px-4">Mã thiết bị</th>
              <th className="py-3 px-4">Tủ điện cấp nguồn</th>
              {showCommune && <th className="py-3 px-4">Địa bàn</th>}
              <th className="py-3 px-4">Mạch (rơ-le #1)</th>
              <th className="py-3 px-4">Server IoT</th>
              <th className="py-3 px-4">Trạng thái bridge</th>
              <th className="py-3 px-4">Nhận gần nhất</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {isLoading ? (
              <IotNodeTableSkeleton rowCount={8} />
            ) : (
              iotNodes.map((node) => {
                const nodeId = node.node_id || 'Chưa cấp mã'
                const cabinet = cabinetOf(node.cabinet_id)
                const feederId = feederOnRelayOne(feeders, node.node_id)?.feeder_id
                const badge = iotStatusBadge(IOT_NODE_STATUS, node.status)
                const receivedAt = formatDateTime(node.last_received_at)

                return (
                  <tr key={nodeId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
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

                    <td className="py-3.5 px-4">
                      {node.cabinet_id ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Zap className="w-3 h-3" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-100">
                              {cabinet?.cabinet_name || cabinet?.external_ref || node.cabinet_id}
                            </span>
                            <span className="block text-[10px] font-mono text-slate-400 dark:text-slate-500">{node.cabinet_id}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa gán tủ</span>
                      )}
                    </td>

                    {showCommune && (
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {formatFriendlyCommuneName(cabinet?.commune_name, node.commune_id)}
                      </td>
                    )}

                    <td className="py-3.5 px-4">
                      {feederId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                          <Cable className="w-2.5 h-2.5" />
                          {feederId}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa đấu nối</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-200">
                      {node.server_id || <span className="font-sans text-slate-400 italic">—</span>}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${IOT_TONE_CLASS[badge.tone]}`}>
                        {badge.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {receivedAt ? (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{receivedAt}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa có mẫu đo</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSetSource(node)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer whitespace-nowrap"
                      >
                        <RadioTower className="w-3.5 h-3.5" /> Nguồn đo
                      </button>
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
