import React, { useCallback, useEffect, useState } from 'react'
import { MapPin, Plus, RefreshCw, Route } from 'lucide-react'
import { toast } from 'sonner'
import iotAPI from '../../feature/iot/iotAPI'
import { communeAPI } from '../../feature/communes/communeAPI'
import type { IotServerStatus } from '../../types/iot/servers'
import type { CommuneItem } from '../../types/admin/communes'
import { IOT_GATEWAY_STATUS, IOT_TONE_CLASS, iotStatusBadge } from '../../constants/iot'
import { apiErrorMessage } from '../../utils/iot/apiError'
import { IotServerFormModal, type CommuneLoadStatus } from './components/IotServerFormModal'
import { GatewayRoutesPanel } from './components/GatewayRoutesPanel'

/**
 * Admin: đăng ký server IoT Bridge, vị trí gateway, tuyến MQTT và secret (docs/LUXMAP-IOT-FE.md mục 2.1–2.2).
 * Gán nguồn đo cho node là việc của Quản lý, ở tab "Thiết bị IoT" trong Quản lý tài sản.
 */
export const IotBridgeAdminPage: React.FC = () => {
  const [servers, setServers] = useState<IotServerStatus[]>([])
  const [communes, setCommunes] = useState<CommuneItem[]>([])
  const [communeStatus, setCommuneStatus] = useState<CommuneLoadStatus>('loading')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formServer, setFormServer] = useState<IotServerStatus | null | undefined>(undefined)
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setCommuneStatus('loading')
    communeAPI
      .getCommunes({ page: 1, page_size: 200 })
      .then((result) => {
        setCommunes(result.items || [])
        setCommuneStatus('ready')
      })
      .catch(() => setCommuneStatus('failed'))
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
        <div className="glass-tile p-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-600 max-w-2xl">
            Mỗi server là một IoT Bridge (ESP32 gateway + node LoRa). Đăng ký server, thêm tuyến gateway → thiết bị, rồi cấp secret
            MQTT cho gateway. Sau đó Quản lý gán nguồn đo cho node ở tab <strong>Thiết bị IoT</strong>.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              title="Tải lại"
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setFormServer(null)}
              className="px-4 py-2 rounded-2xl bg-primary text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" /> Đăng ký server
            </button>
          </div>
        </div>

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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {selected && <GatewayRoutesPanel key={selected} serverId={selected} />}

        {formServer !== undefined && (
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
