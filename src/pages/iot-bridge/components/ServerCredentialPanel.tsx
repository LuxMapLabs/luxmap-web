import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Copy, Eye, EyeOff, KeyRound, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { AppDispatch, RootState } from '../../../redux/store'
import {
  clearCredential,
  issueServerCredentialRequest,
  revokeServerCredentialRequest,
  viewServerCredentialRequest,
} from '../../../feature/iot/iotBridgeSlice'
import {
  ConfirmModal,
  IotBridgeModal,
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './IotBridgeModal'

const formatCredentialError = (error: string | null): string | null => {
  if (!error) return null
  if (error.includes('NOT_RETRIEVABLE')) {
    return 'Key cũ không xem lại được, hãy thu hồi rồi cấp mới.'
  }
  if (/\b404\b/.test(error)) {
    return 'Server này chưa có key.'
  }
  return error
}

export interface ServerCredentialPanelProps {
  serverId: string
  credentialIssued?: boolean
}

/**
 * Quản lý key MQTT của một server IoT (ESP32 gateway): cấp, xem lại và thu hồi key.
 */
export const ServerCredentialPanel: React.FC<ServerCredentialPanelProps> = ({
  serverId,
  credentialIssued = false,
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const { credential, serverCredentialBusy, credentialError } = useSelector(
    (s: RootState) => s.iotBridge
  )

  const [showPassword, setShowPassword] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)

  useEffect(() => {
    dispatch(clearCredential())
    setShowPassword(false)
    setConfirmRevoke(false)
    return () => {
      dispatch(clearCredential())
    }
  }, [dispatch, serverId])

  const prevBusyRef = useRef(serverCredentialBusy)
  useEffect(() => {
    const ended = prevBusyRef.current
    prevBusyRef.current = serverCredentialBusy
    if (ended === 'revoke' && !serverCredentialBusy && !credentialError) {
      setConfirmRevoke(false)
    }
  }, [serverCredentialBusy, credentialError])

  const isBusy = Boolean(serverCredentialBusy)
  const displayError = formatCredentialError(credentialError)

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">Key MQTT của server</h3>
            {credentialIssued ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <KeyRound className="w-3 h-3" /> Đã cấp key
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-500 border border-dashed border-slate-300">
                Chưa cấp key
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Client ID và username tự bằng Server ID. Nhập key vào trang cấu hình ESP32.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {credentialIssued ? (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => dispatch(viewServerCredentialRequest(serverId))}
                className={`${secondaryButtonClass} inline-flex items-center gap-1.5 disabled:opacity-50`}
              >
                {serverCredentialBusy === 'view' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                Xem key
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setConfirmRevoke(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs disabled:opacity-50 cursor-pointer transition focus-visible:ring-2 ring-primary/40 focus:outline-none"
              >
                {serverCredentialBusy === 'revoke' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Thu hồi
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => dispatch(issueServerCredentialRequest(serverId))}
              className={`${primaryButtonClass} inline-flex items-center gap-1.5`}
            >
              {serverCredentialBusy === 'issue' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <KeyRound className="w-3.5 h-3.5" />
              )}
              Cấp key
            </button>
          )}
        </div>
      </div>

      {displayError && (
        <p role="alert" className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-800">
          {displayError}
        </p>
      )}

      {credential && (
        <IotBridgeModal
          title="Key MQTT của server"
          subtitle={credential.client_id || serverId}
          onClose={handleCloseCredential}
        >
          <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-800">
            Không lưu key vào chỗ công khai.
          </p>
          {(
            [
              ['Client ID', credential.client_id],
              ['Username', credential.username],
              ['Password', credential.password],
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

      {confirmRevoke && (
        <ConfirmModal
          title={`Thu hồi key của ${serverId}?`}
          message="Server đang kết nối sẽ bị ngắt ngay. Phải cấp key mới và nạp lại vào ESP32 thì server mới kết nối lại được."
          confirmLabel="Thu hồi key"
          tone="danger"
          busy={serverCredentialBusy === 'revoke'}
          onConfirm={() => dispatch(revokeServerCredentialRequest(serverId))}
          onCancel={() => setConfirmRevoke(false)}
        />
      )}
    </div>
  )
}

export default ServerCredentialPanel
