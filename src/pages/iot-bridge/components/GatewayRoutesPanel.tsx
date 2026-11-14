import React, { useCallback, useEffect, useState } from 'react'
import { Copy, KeyRound, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import iotAPI from '../../../feature/iot/iotAPI'
import type { IotGatewayCredential, IotGatewayRoute } from '../../../types/iot/servers'
import { apiErrorMessage } from '../../../utils/iot/apiError'
import { isValidBridgeId } from '../../../utils/iot/iotRegistration'
import { IotBridgeModal, fieldClass, labelClass, primaryButtonClass } from './IotBridgeModal'

/**
 * Tuyến MQTT gateway → thiết bị trên một server bridge, và cấp secret MQTT cho gateway.
 * Firmware gateway hiện chuyển tiếp một node, nên mỗi tuyến thêm đúng một `device_id`.
 */
export const GatewayRoutesPanel: React.FC<{ serverId: string }> = ({ serverId }) => {
  const [routes, setRoutes] = useState<IotGatewayRoute[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [gatewayId, setGatewayId] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [issuing, setIssuing] = useState<string | null>(null)
  const [credential, setCredential] = useState<IotGatewayCredential | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setRoutes(await iotAPI.getGatewayRoutes(serverId))
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Không đọc được tuyến gateway từ bridge.'))
    } finally {
      setLoading(false)
    }
  }, [serverId])

  useEffect(() => {
    load()
  }, [load])

  const addRoute = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const gw = gatewayId.trim()
    const dev = deviceId.trim()
    if (!isValidBridgeId(gw) || !isValidBridgeId(dev))
      return setFormError('Gateway ID và Device ID bắt đầu bằng chữ/số, chỉ gồm chữ, số, "-" hoặc "_" (tối đa 64 ký tự).')
    setSaving(true)
    try {
      await iotAPI.putGatewayRoute(serverId, gw, { device_id: dev })
      toast.success(`Đã đăng ký tuyến ${gw} → ${dev}`)
      setGatewayId('')
      setDeviceId('')
      await load()
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Không đăng ký được tuyến MQTT.'))
    } finally {
      setSaving(false)
    }
  }

  const issue = async (gateway: string) => {
    setIssuing(gateway)
    try {
      setCredential(await iotAPI.issueGatewayCredential(serverId, gateway))
      await load()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không cấp được secret MQTT.'))
    } finally {
      setIssuing(null)
    }
  }

  const copy = (value?: string | null) => {
    if (!value) return
    navigator.clipboard.writeText(value)
    toast.success('Đã sao chép')
  }

  return (
    <div className="glass-tile p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">
          Tuyến gateway của <span className="font-mono">{serverId}</span>
        </h3>
        <button
          type="button"
          onClick={load}
          title="Tải lại"
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loadError ? (
        <p className="text-xs text-rose-700">{loadError}</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-3 font-semibold">Gateway ID</th>
              <th className="py-2 pr-3 font-semibold">Thiết bị (device_id)</th>
              <th className="py-2 pr-3 font-semibold">Secret MQTT</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {routes.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="py-3 text-slate-500">
                  Chưa có tuyến nào.
                </td>
              </tr>
            )}
            {routes.map((route) => (
              <tr key={route.gateway_id || ''} className="border-b border-slate-100">
                <td className="py-2 pr-3 font-mono font-bold text-slate-800">{route.gateway_id}</td>
                <td className="py-2 pr-3 font-mono">{route.device_ids?.join(', ') || '—'}</td>
                <td className="py-2 pr-3">
                  {route.credential_issued ? (
                    <span className="text-emerald-700 font-semibold">Đã cấp</span>
                  ) : (
                    <span className="text-amber-700 font-semibold">Chưa cấp</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  {!route.credential_issued && route.gateway_id && (
                    <button
                      type="button"
                      disabled={issuing === route.gateway_id}
                      onClick={() => issue(route.gateway_id!)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-white font-bold disabled:opacity-50 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Cấp secret
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={addRoute} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end pt-1">
        <label className={labelClass}>
          Gateway ID
          <input className={`${fieldClass} font-mono`} value={gatewayId} onChange={(e) => setGatewayId(e.target.value)} placeholder="LUXMAP-GW001" />
        </label>
        <label className={labelClass}>
          Device ID của node
          <input className={`${fieldClass} font-mono`} value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="LUXMAP-P001" />
        </label>
        <button type="submit" disabled={saving} className={`${primaryButtonClass} inline-flex items-center gap-1 mb-1`}>
          <Plus className="w-4 h-4" /> Thêm tuyến
        </button>
      </form>
      {formError && <p className="text-[11px] font-semibold text-rose-700">{formError}</p>}

      {credential && (
        <IotBridgeModal title="Secret MQTT của gateway" subtitle={credential.client_id || ''} onClose={() => setCredential(null)}>
          <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
            Mật khẩu chỉ hiện <strong>một lần</strong>, cấp lại sẽ bị từ chối. Chép ngay vào trang cấu hình ESP32 (hoặc MQTTX khi test).
          </p>
          {(
            [
              ['Client ID', credential.client_id],
              ['Username', credential.username],
              ['Password', credential.password],
              ['Node', credential.node_ids?.join(', ')],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <span className={labelClass}>{label}</span>
              <div className="flex gap-2 items-end">
                <input readOnly value={value || ''} aria-label={label} className={`${fieldClass} font-mono font-bold`} />
                <button
                  type="button"
                  onClick={() => copy(value)}
                  title={`Sao chép ${label}`}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <button type="button" onClick={() => setCredential(null)} className={primaryButtonClass}>
              Đã lưu, đóng
            </button>
          </div>
        </IotBridgeModal>
      )}
    </div>
  )
}

export default GatewayRoutesPanel
