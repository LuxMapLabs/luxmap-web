import React, { useEffect, useMemo, useState } from 'react'
import { X, RadioTower, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import iotAPI from '../../../../../feature/iot/iotAPI'
import type { IotNodeItem } from '../../../../../types/assets/iot-nodes'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { IotNodeStatus } from '../../../../../types/iot/nodes'
import type { IotServerStatus } from '../../../../../types/iot/servers'
import { apiErrorMessage } from '../../../../../utils/iot/apiError'
import { isValidBridgeId } from '../../../../../utils/iot/iotRegistration'

const RELAY_NO = 1

export interface NodeSourceModalProps {
  node: IotNodeItem | null
  poles: PoleListItem[]
  onClose: () => void
}

const inputClass =
  'mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary'
const labelClass = 'block text-xs font-bold text-slate-700 dark:text-slate-300'

/** Số dương hữu hạn từ ô nhập; sai thì null. */
const positive = (value: string): number | null => {
  const n = Number(value)
  return value.trim() && Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Gán nguồn đo IoT bridge cho node (docs/LUXMAP-IOT-FE.md mục 2.4). Node đã có nguồn → sửa (PUT, gửi lại đủ hồ sơ) hoặc gỡ.
 * Mạch lấy từ rơ-le #1 của node; trụ đại diện phải thuộc đúng mạch đó (backend kiểm lại).
 */
export const NodeSourceModal: React.FC<NodeSourceModalProps> = ({ node, poles, onClose }) => {
  const [servers, setServers] = useState<IotServerStatus[]>([])
  const [current, setCurrent] = useState<IotNodeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [serverId, setServerId] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [poleId, setPoleId] = useState('')
  const [voltage, setVoltage] = useState('')
  const [currentMa, setCurrentMa] = useState('')
  const [powerMw, setPowerMw] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nodeId = node?.node_id || ''
  const feederId = node?.relays?.find((r) => r.relay_no === RELAY_NO)?.feeder_id || null
  const feederPoles = useMemo(() => poles.filter((p) => p.feeder_id && p.feeder_id === feederId), [poles, feederId])
  const configured = Boolean(current && (current.server_id || current.status !== 'unconfigured'))

  useEffect(() => {
    if (!nodeId) return
    let cancelled = false
    setLoading(true)
    Promise.allSettled([iotAPI.getServers(), iotAPI.getNodes({ page: 1, page_size: 200 })]).then(([s, n]) => {
      if (cancelled) return
      const serverList = s.status === 'fulfilled' ? s.value : []
      const status = n.status === 'fulfilled' ? n.value.items?.find((item) => item.node_id === nodeId) || null : null
      setServers(serverList)
      setCurrent(status)
      setServerId(status?.server_id || serverList[0]?.server_id || '')
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [nodeId])

  useEffect(() => {
    if (!poleId && feederPoles[0]?.pole_id) setPoleId(feederPoles[0].pole_id)
  }, [feederPoles, poleId])

  if (!node) return null

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const nominalVoltage = positive(voltage)
    const nominalCurrent = positive(currentMa)
    const nominalPower = positive(powerMw)
    if (!feederId) return setError('Node chưa đấu rơ-le #1 vào mạch nào. Hãy cấu hình đấu nối rơ-le trước.')
    if (!serverId) return setError('Chưa có server IoT nào. Nhờ Quản trị viên đăng ký server ở trang IoT Bridge.')
    if (!isValidBridgeId(deviceId.trim())) return setError('Device ID không hợp lệ (chữ, số, "-" hoặc "_", tối đa 64 ký tự).')
    if (!poleId) return setError(`Mạch ${feederId} chưa có trụ nào để làm trụ đại diện.`)
    if (!nominalVoltage || !nominalCurrent || !nominalPower)
      return setError('Điện áp, dòng và công suất danh định phải là số dương.')

    const profile = {
      server_id: serverId,
      device_id: deviceId.trim(),
      feeder_id: feederId,
      pole_id: poleId,
      relay_no: RELAY_NO,
      nominal_voltage: nominalVoltage,
      nominal_current_ma: nominalCurrent,
      nominal_power_mw: nominalPower,
    }
    setSaving(true)
    try {
      if (configured) await iotAPI.updateNodeSource(nodeId, profile)
      else await iotAPI.registerNodeSource(nodeId, profile)
      toast.success(configured ? `Đã cập nhật nguồn đo của ${nodeId}` : `Đã gán nguồn đo cho ${nodeId}`)
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'Không lưu được nguồn đo.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirmDelete) return setConfirmDelete(true)
    setSaving(true)
    setError(null)
    try {
      await iotAPI.deleteNodeSource(nodeId)
      toast.success(`Đã gỡ nguồn đo của ${nodeId}`)
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'Không gỡ được nguồn đo.'))
    } finally {
      setSaving(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-label="Nguồn đo IoT bridge"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
              <RadioTower className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Nguồn đo IoT bridge</h3>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {nodeId} · {loading ? 'đang tải…' : configured ? `đã gán (${current?.server_id || '—'})` : 'chưa gán'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Đóng"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={save} className="p-6 space-y-3">
          {!node.supports_remote_control && (
            <p className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200">
              Node đang tắt "điều khiển từ xa": gán nguồn vẫn đọc được số đo, nhưng không bật/tắt mạch qua bridge được. Bật lại ở
              "Chỉnh sửa thiết bị".
            </p>
          )}
          {configured && (
            <p className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-200">
              Node đã có nguồn đo. Backend không trả lại hồ sơ cũ, nên khi lưu cần nhập lại đầy đủ các ô bên dưới.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Server IoT
              <select className={inputClass} value={serverId} onChange={(e) => setServerId(e.target.value)}>
                {servers.length === 0 && <option value="">— chưa có server —</option>}
                {servers.map((s) => (
                  <option key={s.server_id || ''} value={s.server_id || ''}>
                    {s.server_id}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Device ID (trên firmware)
              <input
                className={`${inputClass} font-mono`}
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="LUXMAP-P001"
              />
            </label>
            <label className={labelClass}>
              Mạch (rơ-le #1)
              <input className={`${inputClass} font-mono`} value={feederId || 'Chưa đấu nối'} readOnly disabled />
            </label>
            <label className={labelClass}>
              Trụ đại diện
              <select className={inputClass} value={poleId} onChange={(e) => setPoleId(e.target.value)}>
                {feederPoles.length === 0 && <option value="">— mạch chưa có trụ —</option>}
                {feederPoles.map((p) => (
                  <option key={p.pole_id || ''} value={p.pole_id || ''}>
                    {p.pole_id}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className={labelClass}>
              Điện áp (V)
              <input className={inputClass} inputMode="decimal" value={voltage} onChange={(e) => setVoltage(e.target.value)} placeholder="5" />
            </label>
            <label className={labelClass}>
              Dòng (mA)
              <input className={inputClass} inputMode="decimal" value={currentMa} onChange={(e) => setCurrentMa(e.target.value)} placeholder="100" />
            </label>
            <label className={labelClass}>
              Công suất (mW)
              <input className={inputClass} inputMode="decimal" value={powerMw} onChange={(e) => setPowerMw(e.target.value)} placeholder="500" />
            </label>
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
            Chỉ số danh định thực tế của mạch khi bật — API chẩn đoán so mẫu đo với các số này. Device ID phải trùng tuyến Admin đã đăng ký.
          </p>

          {error && <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">{error}</p>}

          <div className="flex items-center justify-between gap-2.5 pt-1">
            {configured ? (
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40 disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> {confirmDelete ? 'Bấm lần nữa để gỡ' : 'Gỡ nguồn đo'}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving || loading}
                className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                {saving ? 'Đang lưu…' : configured ? 'Cập nhật nguồn đo' : 'Gán nguồn đo'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NodeSourceModal
