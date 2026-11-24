import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Cpu, Download, Eye, FileSpreadsheet, Loader2, MapPin, Pencil, Plus, Server, Unlink } from 'lucide-react'
import type { AppDispatch, RootState } from '../../redux/store'
import {
  detachNodeFeederRequest,
  fetchBridgeRequest,
  fetchNodeAssetsRequest,
  resetNodeDetach,
} from '../../feature/iot/iotBridgeSlice'
import type { IotNodeStatus } from '../../types/iot/nodes'
import type { IotServerStatus } from '../../types/iot/servers'
import { IOT_GATEWAY_STATUS, IOT_NODE_STATUS, IOT_TONE_CLASS, iotStatusBadge, type IotTone } from '../../constants/iot'
import { isSystemAdmin } from '../../utils/roleUtils'
import { feederOnRelayOne } from '../../utils/iot/iotRegistration'
import { formatRelativeTime } from '../../utils/admin-dashboard/formatters'
import { IotServerFormModal, type CommuneLoadStatus } from './components/IotServerFormModal'
import { ServerCredentialPanel } from './components/ServerCredentialPanel'
import { RegisterNodeModal } from './components/RegisterNodeModal'
import { EditNodeModal } from './components/EditNodeModal'
import { ImportNodesModal } from './components/ImportNodesModal'
import { IotBridgeModal, secondaryButtonClass } from './components/IotBridgeModal'
import { IotNodeDetailModal } from '../assets/components/iot/components/IotNodeDetailModal'

const SERVER_SHORT_STATUS_LABELS: Record<string, string> = {
  online: 'Online',
  offline: 'Mất kết nối',
  broker_down: 'Broker dừng',
  unreachable: 'Không tới được bridge',
  unconfigured: 'Chưa cấu hình',
}

const SERVER_STATUS_DESCRIPTIONS: Record<string, string> = {
  offline: 'Bridge không gửi tín hiệu. Kiểm tra nguồn và mạng của máy chạy bridge.',
  broker_down: 'Bridge chạy nhưng broker MQTT đã dừng, gateway không gửi được dữ liệu.',
  unreachable: 'Backend không gọi được tới địa chỉ của bridge.',
  unconfigured: 'Server chưa được cấu hình đủ để kết nối.',
}

const DOT_TONE_CLASS: Record<IotTone, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-rose-500',
  muted: 'bg-slate-400',
}

/**
 * Trang IoT Bridge: server, vị trí gateway, key MQTT và node.
 * Quản trị hệ thống tạo / chỉnh; vai trò khác chỉ xem. Mọi nút ghi đi qua
 * `canManage` — không render khi người dùng không phải `system_admin`.
 */
export const IotBridgeAdminPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const canManage = useSelector((state: RootState) => isSystemAdmin(state.auth.user?.role))
  const {
    servers,
    serversStatus,
    serversError,
    nodes,
    nodesStatus,
    nodesError,
    communes,
    communesStatus,
    feeders,
    nodeDetach,
    nodeDetachError,
  } = useSelector((state: RootState) => state.iotBridge)

  const [formServer, setFormServer] = useState<IotServerStatus | null | undefined>(undefined)
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)
  const [importing, setImporting] = useState(false)
  const [editingNode, setEditingNode] = useState<IotNodeStatus | null>(null)
  const [detachingNode, setDetachingNode] = useState<{ nodeId: string; feederLabel: string } | null>(null)
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const detachSubmittedRef = useRef(false)

  useEffect(() => {
    dispatch(fetchBridgeRequest())
    if (canManage) {
      dispatch(fetchNodeAssetsRequest())
    }
  }, [dispatch, canManage])

  useEffect(() => {
    if (detachSubmittedRef.current && nodeDetach === 'succeeded') {
      detachSubmittedRef.current = false
      setDetachingNode(null)
      dispatch(resetNodeDetach())
      dispatch(fetchNodeAssetsRequest())
    }
  }, [nodeDetach, dispatch])

  // Tự chọn server đầu tiên khi danh sách tải xong và chưa chọn gì; server đang chọn biến mất khỏi danh sách thì chọn lại server đầu
  useEffect(() => {
    if (servers.length > 0) {
      if (!selectedServerId || !servers.some((s) => s.server_id === selectedServerId)) {
        setSelectedServerId(servers[0].server_id || null)
      }
    } else {
      setSelectedServerId(null)
    }
  }, [servers, selectedServerId])

  const communeName = (id?: string | null) => communes.find((c) => c.commune_id === id)?.name || id || '-'

  const modalCommuneStatus: CommuneLoadStatus =
    communesStatus === 'ready' ? 'ready' : communesStatus === 'error' ? 'failed' : 'loading'

  const selectedServer = servers.find((s) => s.server_id === selectedServerId)

  // Danh sách các trạng thái có trong danh sách node hiện tại
  const availableStatuses = useMemo(() => {
    const set = new Set<string>()
    nodes.forEach((n) => {
      if (n.status) set.add(n.status)
    })
    return Array.from(set)
  }, [nodes])

  // Tự về 'all' nếu trạng thái đang lọc không còn trong danh sách sau khi tải lại
  useEffect(() => {
    if (statusFilter !== 'all' && !availableStatuses.includes(statusFilter)) {
      setStatusFilter('all')
    }
  }, [statusFilter, availableStatuses])

  // Lọc node phía client
  const filteredNodes = useMemo(() => {
    if (statusFilter === 'all') return nodes
    return nodes.filter((n) => n.status === statusFilter)
  }, [nodes, statusFilter])

  return (
    <div className="admin-glass-root h-full w-full overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 text-slate-800">
      <div className="glass-slab w-full max-w-[1600px] mx-auto p-5 md:p-6 space-y-6">
        {/* Khối Server IoT */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-blue-600" /> Server IoT{' '}
              <span className="text-[11px] px-1.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                {servers.length}
              </span>
            </h3>
            {canManage && servers.length > 0 && (
              <button
                type="button"
                onClick={() => setFormServer(null)}
                className="px-4 py-2 rounded-2xl bg-primary text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-primary/90 transition focus-visible:ring-2 ring-primary/40 focus:outline-none"
              >
                <Plus className="w-4 h-4" /> Đăng ký server
              </button>
            )}
          </div>

          {serversError ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
              <span>{serversError}</span>
              <button
                type="button"
                onClick={() => dispatch(fetchBridgeRequest())}
                className="font-bold underline cursor-pointer hover:text-rose-900 focus-visible:ring-2 ring-primary/40 focus:outline-none"
              >
                Thử lại
              </button>
            </div>
          ) : serversStatus === 'loading' && servers.length === 0 ? (
            <div className="glass-tile p-4 space-y-2">
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            </div>
          ) : servers.length === 0 ? (
            <div className="glass-tile p-8 text-center text-slate-500 space-y-3">
              <p className="text-xs">Chưa có server IoT nào trong phạm vi của bạn.</p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setFormServer(null)}
                  className="px-4 py-2 rounded-2xl bg-primary text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-primary/90 transition focus-visible:ring-2 ring-primary/40 focus:outline-none"
                >
                  <Plus className="w-4 h-4" /> Đăng ký server
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr] gap-4 items-start">
              {/* Cột trái: danh sách server */}
              <div className="glass-tile p-3 space-y-2 lg:sticky lg:top-4 self-start">
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {servers.map((server) => {
                    const badge = iotStatusBadge(IOT_GATEWAY_STATUS, server.status)
                    const shortLabel = (server.status && SERVER_SHORT_STATUS_LABELS[server.status]) || badge.label
                    const isSelected = selectedServerId === server.server_id
                    const serverNodeCount = nodes.filter((n) => n.server_id === server.server_id).length
                    const nodeCountText = serverNodeCount > 0 ? `${serverNodeCount} node` : 'Chưa có node'

                    return (
                      <button
                        type="button"
                        key={server.server_id || ''}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedServerId(server.server_id || null)}
                        className={`w-full text-left p-3 rounded-xl transition cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none ${
                          isSelected
                            ? 'bg-white ring-1 ring-primary/30 shadow-xs'
                            : 'bg-transparent hover:bg-white/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-mono font-bold text-xs truncate ${isSelected ? 'text-primary' : 'text-slate-900'}`}>
                            {server.server_id}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 shrink-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${DOT_TONE_CLASS[badge.tone]}`} />
                            {shortLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-slate-500">
                          <span className="truncate">{communeName(server.commune_id)}</span>
                          <span className="shrink-0">{nodeCountText}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Cột phải: chi tiết server đang chọn */}
              {selectedServer ? (
                <div className="glass-tile overflow-hidden">
                  <div className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-mono text-base font-bold text-slate-900">
                          {selectedServer.server_id}
                        </h4>
                        {(() => {
                          const badge = iotStatusBadge(IOT_GATEWAY_STATUS, selectedServer.status)
                          const shortLabel = (selectedServer.status && SERVER_SHORT_STATUS_LABELS[selectedServer.status]) || badge.label
                          return (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${DOT_TONE_CLASS[badge.tone]}`} />
                              {shortLabel}
                            </span>
                          )
                        })()}
                      </div>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setFormServer(selectedServer)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition focus-visible:ring-2 ring-primary/40 focus:outline-none"
                        >
                          <MapPin className="w-3.5 h-3.5" /> Sửa vị trí
                        </button>
                      )}
                    </div>

                    {selectedServer.status && selectedServer.status !== 'online' && SERVER_STATUS_DESCRIPTIONS[selectedServer.status] && (
                      <p className="text-xs text-slate-500">
                        {SERVER_STATUS_DESCRIPTIONS[selectedServer.status]}
                      </p>
                    )}

                    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                        <dt className="text-[11px] font-semibold text-slate-500">Xã / phường</dt>
                        <dd className="text-xs font-medium text-slate-800 mt-0.5 truncate">
                          {communeName(selectedServer.commune_id)}
                        </dd>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                        <dt className="text-[11px] font-semibold text-slate-500">Toạ độ</dt>
                        <dd className="text-xs font-mono text-slate-800 mt-0.5">
                          {selectedServer.location ? (
                            `${selectedServer.location.lat}, ${selectedServer.location.lng}`
                          ) : canManage ? (
                            <button
                              type="button"
                              onClick={() => setFormServer(selectedServer)}
                              className="text-primary hover:underline font-sans font-semibold cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none"
                            >
                              Đặt vị trí
                            </button>
                          ) : (
                            '-'
                          )}
                        </dd>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                        <dt className="text-[11px] font-semibold text-slate-500">Node</dt>
                        <dd className="text-xs font-medium text-slate-800 mt-0.5">
                          {(() => {
                            const sNodes = nodes.filter((n) => n.server_id === selectedServer.server_id)
                            const onlineCount = sNodes.filter((n) => n.status === 'online').length
                            if (sNodes.length === 0) return '0 node'
                            return onlineCount > 0 ? `${sNodes.length} node, ${onlineCount} online` : `${sNodes.length} node`
                          })()}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Key MQTT của server (chỉ admin) */}
                  {canManage && selectedServer.server_id && (
                    <div className="border-t border-slate-200/80">
                      <ServerCredentialPanel
                        key={selectedServer.server_id}
                        serverId={selectedServer.server_id}
                        credentialIssued={selectedServer.credential_issued}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="glass-tile p-8 text-center text-slate-400 text-xs">
                  Chọn một server để xem chi tiết
                </div>
              )}
            </div>
          )}
        </div>

        {/* Khối Node IoT */}
        <div className="glass-tile p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-600" /> Node IoT{' '}
              <span className="text-[11px] px-1.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                {nodes.length}
              </span>
            </h3>
            {canManage && (
              <div className="flex items-center gap-2">
                {/* Giao diện trước: backend chưa có API xuất node, nên nút tạm khoá. Nối saga khi có API. */}
                <button
                  type="button"
                  disabled
                  title="Chưa dùng được: chờ backend bổ sung API xuất danh sách node."
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-xs opacity-50 cursor-not-allowed"
                >
                  <Download className="w-4 h-4" /> Xuất Excel
                </button>
                <button
                  type="button"
                  onClick={() => setImporting(true)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-slate-50 transition focus-visible:ring-2 ring-primary/40 focus:outline-none"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Nhập Excel
                </button>
                <button
                  type="button"
                  onClick={() => setRegistering(true)}
                  className="px-3 py-1.5 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-primary/90 transition focus-visible:ring-2 ring-primary/40 focus:outline-none"
                >
                  <Plus className="w-4 h-4" /> Đăng ký node
                </button>
              </div>
            )}
          </div>

          {/* Chip lọc theo trạng thái */}
          {nodes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none ${
                  statusFilter === 'all'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Tất cả ({nodes.length})
              </button>
              {availableStatuses.map((st) => {
                const count = nodes.filter((n) => n.status === st).length
                const label = IOT_NODE_STATUS[st as keyof typeof IOT_NODE_STATUS]?.label || st
                return (
                  <button
                    type="button"
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none ${
                      statusFilter === st
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {label} ({count})
                  </button>
                )
              })}
            </div>
          )}

          {nodesError ? (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
              <span>{nodesError}</span>
              <button
                type="button"
                onClick={() => dispatch(fetchBridgeRequest())}
                className="font-bold underline cursor-pointer hover:text-rose-900 focus-visible:ring-2 ring-primary/40 focus:outline-none"
              >
                Thử lại
              </button>
            </div>
          ) : nodesStatus === 'loading' && nodes.length === 0 ? (
            <div className="space-y-2 py-3">
              <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-3 font-semibold">Node</th>
                    <th className="py-2 pr-3 font-semibold">Tủ điện</th>
                    <th className="py-2 pr-3 font-semibold">Server</th>
                    <th className="py-2 pr-3 font-semibold">Trạng thái</th>
                    <th className="py-2 pr-3 font-semibold">Nhận gần nhất</th>
                    <th className="py-2 text-right font-semibold">
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500">
                        Chưa có node IoT nào.
                      </td>
                    </tr>
                  ) : filteredNodes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500">
                        Không có node ở trạng thái này.
                      </td>
                    </tr>
                  ) : (
                    filteredNodes.map((node) => {
                      const badge = iotStatusBadge(IOT_NODE_STATUS, node.status)
                      const isServerSelected = Boolean(selectedServerId && node.server_id === selectedServerId)
                      const attachedFeeder = feederOnRelayOne(feeders, node.node_id)
                      const attachedFeederLabel =
                        attachedFeeder?.external_ref ||
                        attachedFeeder?.feeder_name ||
                        attachedFeeder?.feeder_id ||
                        null
                      return (
                        <tr key={node.node_id || ''} className={`border-b border-slate-100 transition ${isServerSelected ? 'bg-blue-50/50' : ''}`}>
                          <td className="py-2.5 pr-3 font-mono font-bold text-slate-900">{node.node_id}</td>
                          <td className="py-2.5 pr-3 font-mono">{node.cabinet_id || '-'}</td>
                          <td className="py-2.5 pr-3 font-mono">
                            {node.server_id ? (
                              <button
                                type="button"
                                onClick={() => setSelectedServerId(node.server_id!)}
                                className="text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid font-mono cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none"
                              >
                                {node.server_id}
                              </button>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-2.5 pr-3">
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${IOT_TONE_CLASS[badge.tone]}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-slate-600">
                            {node.last_received_at ? (
                              <span title={new Date(node.last_received_at).toLocaleString('vi-VN')}>
                                {formatRelativeTime(node.last_received_at)}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-2.5 text-right">
                            {node.node_id && (
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setDetailNodeId(node.node_id!)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold cursor-pointer text-slate-700 transition focus-visible:ring-2 ring-primary/40 focus:outline-none"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Chi tiết
                                </button>
                                {canManage && (
                                  <button
                                    type="button"
                                    aria-label={`Sửa node ${node.node_id}`}
                                    onClick={() => setEditingNode(node)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold cursor-pointer text-slate-700 transition focus-visible:ring-2 ring-primary/40 focus:outline-none"
                                  >
                                    <Pencil className="w-3.5 h-3.5" /> Sửa
                                  </button>
                                )}
                                {canManage && attachedFeeder && attachedFeederLabel && (
                                  <button
                                    type="button"
                                    aria-label={`Gỡ node ${node.node_id} khỏi mạch`}
                                    onClick={() => {
                                      dispatch(resetNodeDetach())
                                      setDetachingNode({
                                        nodeId: node.node_id!,
                                        feederLabel: attachedFeederLabel,
                                      })
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 font-semibold cursor-pointer text-rose-700 transition focus-visible:ring-2 ring-primary/40 focus:outline-none"
                                  >
                                    <Unlink className="w-3.5 h-3.5" /> Gỡ khỏi mạch
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {canManage && registering && (
          <RegisterNodeModal
            servers={servers}
            communes={communes}
            communeStatus={modalCommuneStatus}
            onClose={() => setRegistering(false)}
            onSaved={() => {
              setRegistering(false)
              dispatch(fetchNodeAssetsRequest())
            }}
          />
        )}

        {canManage && importing && (
          <ImportNodesModal onClose={() => setImporting(false)} />
        )}

        {canManage && editingNode && (
          <EditNodeModal
            key={editingNode.node_id || ''}
            node={editingNode}
            servers={servers}
            onClose={() => {
              setEditingNode(null)
              dispatch(fetchNodeAssetsRequest())
            }}
          />
        )}

        {canManage && detachingNode && (
          <IotBridgeModal
            title="Gỡ node khỏi mạch"
            onClose={
              nodeDetach === 'submitting'
                ? () => {}
                : () => {
                    setDetachingNode(null)
                    dispatch(resetNodeDetach())
                  }
            }
          >
            {nodeDetachError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium"
              >
                {nodeDetachError}
              </div>
            )}
            <p className="text-xs text-slate-600 leading-relaxed">
              Gỡ node <span className="font-mono font-bold text-slate-800">{detachingNode.nodeId}</span> khỏi mạch{' '}
              <span className="font-mono font-bold text-slate-800">{detachingNode.feederLabel}</span>? Node vẫn ở trong
              tủ và lịch sử được giữ.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={nodeDetach === 'submitting'}
                onClick={() => {
                  setDetachingNode(null)
                  dispatch(resetNodeDetach())
                }}
                className={secondaryButtonClass}
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={nodeDetach === 'submitting'}
                onClick={() => {
                  detachSubmittedRef.current = true
                  dispatch(detachNodeFeederRequest(detachingNode.nodeId))
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1.5 focus-visible:ring-2 ring-primary/40 focus:outline-none"
              >
                {nodeDetach === 'submitting' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Gỡ khỏi mạch
              </button>
            </div>
          </IotBridgeModal>
        )}

        {detailNodeId && (
          <IotNodeDetailModal
            key={detailNodeId}
            nodeId={detailNodeId}
            allowReceivedTime
            onClose={() => setDetailNodeId(null)}
          />
        )}

        {canManage && formServer !== undefined && (
          <IotServerFormModal
            server={formServer}
            communes={communes}
            communeStatus={modalCommuneStatus}
            onClose={() => setFormServer(undefined)}
            onSaved={() => {
              setFormServer(undefined)
            }}
          />
        )}
      </div>
    </div>
  )
}

export default IotBridgeAdminPage
