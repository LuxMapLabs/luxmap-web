import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Copy, Eye, EyeOff, KeyRound, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { AppDispatch, RootState } from '../../../redux/store'
import {
  clearCredential,
  fetchRoutesRequest,
  issueCredentialRequest,
  putRouteRequest,
  resetRouteSubmit,
  revokeCredentialRequest,
  viewCredentialRequest,
} from '../../../feature/iot/iotBridgeSlice'
import { isValidBridgeId } from '../../../utils/iot/iotRegistration'
import {
  ConfirmModal,
  IotBridgeModal,
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './IotBridgeModal'

/**
 * Tuyến MQTT gateway → thiết bị trên một server bridge, và cấp key MQTT cho gateway.
 * Firmware gateway hiện chuyển tiếp một node, nên mỗi tuyến thêm đúng một `device_id`.
 */
export const GatewayRoutesPanel: React.FC<{ serverId: string }> = ({ serverId }) => {
  const dispatch = useDispatch<AppDispatch>()
  const {
    routes,
    routesStatus,
    routesError,
    routeSubmit,
    routeSubmitError,
    credential,
    credentialBusy,
    credentialError,
  } = useSelector((s: RootState) => s.iotBridge)

  const [gatewayId, setGatewayId] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [revokeGw, setRevokeGw] = useState<string | null>(null)
  const [isAddingRoute, setIsAddingRoute] = useState(false)
  const [viewError, setViewError] = useState<{ gatewayId: string; message: string } | null>(null)

  const loading = routesStatus === 'loading'
  const saving = routeSubmit === 'submitting'
  const error = formError || routeSubmitError

  useEffect(() => {
    dispatch(fetchRoutesRequest(serverId))
    dispatch(resetRouteSubmit())
    dispatch(clearCredential())
    setViewError(null)
    return () => {
      dispatch(resetRouteSubmit())
      dispatch(clearCredential())
    }
  }, [dispatch, serverId])

  useEffect(() => {
    if (routeSubmit === 'succeeded') {
      setGatewayId('')
      setDeviceId('')
      setIsAddingRoute(false)
      dispatch(resetRouteSubmit())
    }
  }, [routeSubmit, dispatch])

  const prevBusyRef = useRef(credentialBusy)
  useEffect(() => {
    const ended = prevBusyRef.current // { gatewayId, action } vừa chạy xong
    prevBusyRef.current = credentialBusy
    if (!ended || credentialBusy) return
    if (credentialError) {
      if (ended.action === 'view') setViewError({ gatewayId: ended.gatewayId, message: credentialError })
      return // lỗi revoke: hộp xác nhận giữ mở như cũ
    }
    // thành công
    setViewError((v) => (v?.gatewayId === ended.gatewayId ? null : v))
    if (ended.action === 'revoke') setRevokeGw(null)
  }, [credentialBusy, credentialError])

  const addRoute = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const gw = gatewayId.trim()
    const dev = deviceId.trim()
    if (!isValidBridgeId(gw) || !isValidBridgeId(dev))
      return setFormError('Gateway ID và Device ID bắt đầu bằng chữ/số, chỉ gồm chữ, số, "-" hoặc "_" (tối đa 64 ký tự).')
    dispatch(putRouteRequest({ serverId, gatewayId: gw, body: { device_id: dev } }))
  }

  const copy = (value?: string | null) => {
    if (!value) return
    navigator.clipboard.writeText(value)
    toast.success('Đã sao chép')
  }

  const handleCloseCredential = () => {
    setShowPassword(false)
    dispatch(clearCredential())
  }

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">
          Gateway ({routes.length})
        </h3>
        <button
          type="button"
          onClick={() => {
            setViewError(null)
            dispatch(fetchRoutesRequest(serverId))
          }}
          title="Tải lại"
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {routesError ? (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <span>{routesError}</span>
          <button
            type="button"
            onClick={() => {
              setViewError(null)
              dispatch(fetchRoutesRequest(serverId))
            }}
            className="font-bold underline cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none"
          >
            Thử lại
          </button>
        </div>
      ) : loading && routes.length === 0 ? (
        <div className="space-y-2 py-3">
          <div className="h-6 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-6 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-6 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      ) : routes.length === 0 ? (
        <div className="p-6 text-center space-y-3">
          <p className="text-xs text-slate-500">Server này chưa có gateway.</p>
          {!isAddingRoute && (
            <button
              type="button"
              onClick={() => setIsAddingRoute(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-xl transition cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none"
            >
              <Plus className="w-4 h-4" /> Thêm gateway
            </button>
          )}
        </div>
      ) : (
        <>
          <table className="w-full text-xs table-fixed">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="w-[28%] py-2 pr-3 font-semibold">Gateway</th>
                <th className="w-[32%] py-2 pr-3 font-semibold">Thiết bị</th>
                <th className="w-[16%] py-2 pr-3 font-semibold">Key MQTT</th>
                <th className="w-[24%] py-2 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => {
                const gw = route.gateway_id || ''
                const isBusy = Boolean(credentialBusy)
                const isGwBusy = credentialBusy?.gatewayId === gw

                return (
                  <React.Fragment key={gw}>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-mono font-bold text-slate-800 truncate">{route.gateway_id}</td>
                      <td className="py-2 pr-3">
                        {route.device_ids && route.device_ids.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {route.device_ids.map((devId) => (
                              <span key={devId} className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                                {devId}
                              </span>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {route.credential_issued ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <KeyRound className="w-3 h-3" /> Đã cấp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-500 border border-dashed border-slate-300">
                            Chưa cấp
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {gw && (
                          route.credential_issued ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => dispatch(viewCredentialRequest({ serverId, gatewayId: gw }))}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold disabled:opacity-50 cursor-pointer transition focus-visible:ring-2 ring-primary/40 focus:outline-none"
                              >
                                {isGwBusy && credentialBusy?.action === 'view' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                                Xem key
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setRevokeGw(gw)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-bold disabled:opacity-50 cursor-pointer transition focus-visible:ring-2 ring-primary/40 focus:outline-none"
                              >
                                {isGwBusy && credentialBusy?.action === 'revoke' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                                Thu hồi
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => dispatch(issueCredentialRequest({ serverId, gatewayId: gw }))}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold disabled:opacity-50 cursor-pointer transition focus-visible:ring-2 ring-primary/40 focus:outline-none"
                            >
                              {isGwBusy && credentialBusy?.action === 'issue' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <KeyRound className="w-3.5 h-3.5" />
                              )}
                              Cấp key
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                    {viewError?.gatewayId === gw && (
                      <tr className="bg-amber-50/50">
                        <td colSpan={4} className="py-1 px-2 text-[11px] text-amber-700">
                          {viewError.message}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>

          {!isAddingRoute && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsAddingRoute(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-xl transition cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none"
              >
                <Plus className="w-4 h-4" /> Thêm gateway
              </button>
            </div>
          )}
        </>
      )}

      {isAddingRoute && (
        <form onSubmit={addRoute} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end pt-1">
          <label className={labelClass}>
            Gateway ID
            <input
              className={`${fieldClass} font-mono`}
              value={gatewayId}
              onChange={(e) => setGatewayId(e.target.value)}
              placeholder="VD: LUXMAP-GW006"
            />
          </label>
          <label className={labelClass}>
            Device ID của node
            <input
              className={`${fieldClass} font-mono`}
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="VD: LUXMAP-P006"
            />
          </label>
          <div className="flex items-center gap-1.5 mb-1">
            <button
              type="button"
              onClick={() => {
                setIsAddingRoute(false)
                setFormError(null)
                setGatewayId('')
                setDeviceId('')
                dispatch(resetRouteSubmit())
              }}
              className={secondaryButtonClass}
            >
              Huỷ
            </button>
            <button type="submit" disabled={saving} className={`${primaryButtonClass} inline-flex items-center gap-1`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Thêm
            </button>
          </div>
        </form>
      )}
      {error && <p className="text-[11px] font-semibold text-rose-700">{error}</p>}

      {credential && (
        <IotBridgeModal title="Key MQTT của gateway" subtitle={credential.client_id || ''} onClose={handleCloseCredential}>
          <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
            Nạp các thông tin này vào trang cấu hình ESP32. Có thể xem lại key ở đây bất cứ lúc nào.
          </p>
          {(
            [
              ['Client ID', credential.client_id],
              ['Username', credential.username],
              ['Password', credential.password],
              ['Node', credential.node_ids?.join(', ')],
            ] as const
          ).map(([label, value]) => {
            const isPassword = label === 'Password'
            return (
              <div key={label}>
                <span className={labelClass}>{label}</span>
                <div className="flex gap-2 items-end">
                  <input
                    readOnly
                    type={isPassword ? (showPassword ? 'text' : 'password') : 'text'}
                    value={value || ''}
                    aria-label={label}
                    className={`${fieldClass} font-mono font-bold`}
                  />
                  {isPassword && (
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => copy(value)}
                    title={`Sao chép ${label}`}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
          <div className="flex justify-end">
            <button type="button" onClick={handleCloseCredential} className={primaryButtonClass}>
              Đóng
            </button>
          </div>
        </IotBridgeModal>
      )}

      {revokeGw && (
        <ConfirmModal
          title={`Thu hồi key của ${revokeGw}?`}
          message="Gateway đang kết nối sẽ bị ngắt ngay. Phải cấp key mới và nạp lại vào ESP32 thì gateway mới kết nối lại được."
          confirmLabel="Thu hồi key"
          tone="danger"
          busy={credentialBusy?.gatewayId === revokeGw && credentialBusy?.action === 'revoke'}
          onConfirm={() => {
            dispatch(revokeCredentialRequest({ serverId, gatewayId: revokeGw }))
          }}
          onCancel={() => setRevokeGw(null)}
        />
      )}
    </div>
  )
}

export default GatewayRoutesPanel
