import React, { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Cpu, Eye, MapPin, Plus, Route } from 'lucide-react'
import { toast } from 'sonner'
import type { RootState } from '../../redux/store'
import iotAPI from '../../feature/iot/iotAPI'
import { communeAPI } from '../../feature/communes/communeAPI'
import type { IotServerStatus } from '../../types/iot/servers'
import type { IotNodeStatus } from '../../types/iot/nodes'
import type { CommuneItem } from '../../types/admin/communes'
import { IOT_GATEWAY_STATUS, IOT_NODE_STATUS, IOT_TONE_CLASS, iotStatusBadge } from '../../constants/iot'
import { apiErrorMessage } from '../../utils/iot/apiError'
import { isSystemAdmin } from '../../utils/roleUtils'
import { IotServerFormModal, type CommuneLoadStatus } from './components/IotServerFormModal'
import { GatewayRoutesPanel } from './components/GatewayRoutesPanel'
import { RegisterNodeModal } from './components/RegisterNodeModal'
import { IotNodeDetailModal } from '../assets/components/iot/components/IotNodeDetailModal'

/**
 * Trang IoT Bridge (docs/LUXMAP-IOT-FE.md mục 2): server, vị trí gateway, tuyến MQTT, secret và node.
 * Luật của dự án: server và node IoT do Quản trị hệ thống tạo / chỉnh; vai trò khác chỉ xem. Mọi nút ghi đi qua
 * `canManage` — không hiện (không chỉ disable) khi người dùng không phải `system_admin`.
 */
export const IotBridgeAdminPage: React.FC = () => {
  const canManage = useSelector((state: RootState) => isSystemAdmin(state.auth.user?.role))
  const [servers, setServers] = useState<IotServerStatus[]>([])
  const [nodes, setNodes] = useState<IotNodeStatus[]>([])
  const [nodesError, setNodesError] = useState<string | null>(null)
  const [communes, setCommunes] = useState<CommuneItem[]>([])
  const [communeStatus, setCommuneStatus] = useState<CommuneLoadStatus>('loading')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formServer, setFormServer] = useState<IotServerStatus | null | undefined>(undefined)
  const [selected, setSelected] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNodesError(null)
    setCommuneStatus('loading')
    communeAPI
      .getCommunes({ page: 1, page_size: 200 })
      .then((result) => {
        setCommunes(result.items || [])
        setCommuneStatus('ready')
      })
      .catch(() => setCommuneStatus('failed'))
    iotAPI
      .getNodes({ page: 1, page_size: 200 })
      .then((result) => setNodes(result.items || []))
      .catch((err) => setNodesError(apiErrorMessage(err, 'Không đọc được danh sách node IoT.')))
    try {
      setServers(await iotAPI.getServers())
    } catch (err) {
      setError(apiErrorMessage(err, 'Không đọc được danh sách server IoT.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const communeName = (id?: string | null) => communes.find((c) => c.commune_id === id)?.name || id || '—'

  return (
    <div className="admin-glass-root h-full w-full overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 text-slate-800">
      <div className="glass-slab w-full max-w-[1600px] mx-auto p-5 md:p-6 space-y-4">
        {canManage && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setFormServer(null)}
              className="px-4 py-2 rounded-2xl bg-primary text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" /> Đăng ký server
            </button>
          </div>
        )}

        {error && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}

        <div className="glass-tile p-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3 font-semibold">Server ID</th>
                <th className="py-2 pr-3 font-semibold">Trạng thái gateway</th>
                <th className="py-2 pr-3 font-semibold">Xã / phường</th>
                <th className="py-2 pr-3 font-semibold">Toạ độ</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {servers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-4 text-slate-500">
                    Chưa có server IoT nào trong phạm vi của bạn.
                  </td>
                </tr>
              )}
              {servers.map((server) => {
                const badge = iotStatusBadge(IOT_GATEWAY_STATUS, server.status)
                return (
                  <tr key={server.server_id || ''} className={`border-b border-slate-100 ${selected === server.server_id ? 'bg-blue-50/60' : ''}`}>
                    <td className="py-2.5 pr-3 font-mono font-bold">{server.server_id}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${IOT_TONE_CLASS[badge.tone]}`}>{badge.label}</span>
                    </td>
                    <td className="py-2.5 pr-3">{communeName(server.commune_id)}</td>
                    <td className="py-2.5 pr-3 font-mono">
                      {server.location ? `${server.location.lat}, ${server.location.lng}` : '—'}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap space-x-1.5">
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelected(server.server_id || null)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold cursor-pointer"
                          >
                            <Route className="w-3.5 h-3.5" /> Tuyến gateway
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormServer(server)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5" /> Sửa vị trí
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {canManage && selected && <GatewayRoutesPanel key={selected} serverId={selected} />}

        <div className="glass-tile p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-600" /> Node IoT
            </h3>
            {canManage && (
              <button
                type="button"
                onClick={() => setRegistering(true)}
                className="px-3 py-1.5 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Đăng ký node
              </button>
            )}
          </div>
          {nodesError ? (
            <p className="text-xs text-rose-700">{nodesError}</p>
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
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {nodes.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="py-3 text-slate-500">
                        Chưa có node IoT nào.
                      </td>
                    </tr>
                  )}
                  {nodes.map((node) => {
                    const badge = iotStatusBadge(IOT_NODE_STATUS, node.status)
                    return (
                      <tr key={node.node_id || ''} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-mono font-bold">{node.node_id}</td>
                        <td className="py-2 pr-3 font-mono">{node.cabinet_id || '—'}</td>
                        <td className="py-2 pr-3 font-mono">{node.server_id || '—'}</td>
                        <td className="py-2 pr-3">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${IOT_TONE_CLASS[badge.tone]}`}>{badge.label}</span>
                        </td>
                        <td className="py-2 pr-3">
                          {node.last_received_at ? new Date(node.last_received_at).toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="py-2 text-right">
                          {node.node_id && (
                            <button
                              type="button"
                              onClick={() => setDetailNodeId(node.node_id!)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> Chi tiết
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {canManage && registering && (
          <RegisterNodeModal
            servers={servers}
            communes={communes}
            communeStatus={communeStatus}
            onClose={() => setRegistering(false)}
            onSaved={() => {
              setRegistering(false)
              load()
            }}
          />
        )}

        {detailNodeId && <IotNodeDetailModal key={detailNodeId} nodeId={detailNodeId} onClose={() => setDetailNodeId(null)} />}

        {canManage && formServer !== undefined && (
          <IotServerFormModal
            server={formServer}
            communes={communes}
            communeStatus={communeStatus}
            onClose={() => setFormServer(undefined)}
            onSaved={() => {
              toast.success(formServer ? 'Đã cập nhật vị trí server' : 'Đã đăng ký server IoT')
              setFormServer(undefined)
              load()
            }}
          />
        )}
      </div>
    </div>
  )
}

export default IotBridgeAdminPage
