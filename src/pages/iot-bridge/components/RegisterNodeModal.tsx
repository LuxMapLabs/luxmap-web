import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CheckCircle2, Cpu, Gauge, MapPin } from 'lucide-react'
import type { AppDispatch, RootState } from '../../../redux/store'
import {
  fetchNodeAssetsRequest,
  registerNodeRequest,
  resetNodeSubmit,
} from '../../../feature/iot/iotBridgeSlice'
import type { IotServerStatus } from '../../../types/iot/servers'
import type { RegisteredNode } from '../../../types/iot/nodes'
import type { CommuneItem } from '../../../types/admin/communes'
import { isValidBridgeId } from '../../../utils/iot/iotRegistration'
import {
  AssetModalError,
  AssetModalFooter,
  AssetModalFrame,
  AssetModalHeader,
} from '../../assets/components/common/AssetModal'
import { Field, inputClass } from './IotBridgeModal'
import type { CommuneLoadStatus } from './IotServerFormModal'

const positive = (value: string) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

const SectionTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
    {icon}
    {children}
  </h4>
)

/**
 * Admin đăng ký một bộ IoT bridge (`POST /iot/nodes/register`, `ManageSettings`): tạo node ở tủ điện, đấu mạch vào
 * rơ-le #1, lưu nguồn đo (chỉ số danh định) và tuyến MQTT trong một lần.
 * Thứ tự chọn: xã → tủ của xã → mạch chưa gắn node của tủ; server chỉ lấy trong cùng xã (backend từ chối server khác xã).
 * Nguồn dữ liệu cố định `calibration_rig` (phần cứng nhóm tự dựng); web không cho chọn `simulated`.
 */
export const RegisterNodeModal: React.FC<{
  servers: IotServerStatus[]
  communes: CommuneItem[]
  communeStatus: CommuneLoadStatus
  onClose: () => void
  onSaved: (node: RegisteredNode) => void
}> = ({ servers, communes, communeStatus, onClose, onSaved }) => {
  const dispatch = useDispatch<AppDispatch>()
  const {
    cabinets,
    feeders,
    nodeAssetsStatus,
    nodeAssetsError,
    nodeSubmit,
    nodeSubmitError,
    registeredNode,
  } = useSelector((s: RootState) => s.iotBridge)

  const [communeId, setCommuneId] = useState('')
  const [cabinetId, setCabinetId] = useState('')
  const [feederId, setFeederId] = useState('')
  const [serverId, setServerId] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [gatewayId, setGatewayId] = useState('')
  const [remote, setRemote] = useState(true)
  const [voltage, setVoltage] = useState('')
  const [currentMa, setCurrentMa] = useState('')
  const [powerMw, setPowerMw] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const assetsLoaded = nodeAssetsStatus === 'ready' || nodeAssetsStatus === 'error'
  const saving = nodeSubmit === 'submitting'
  const error = localError || nodeSubmitError || nodeAssetsError

  const submittedRef = useRef(false)
  const hasSavedRef = useRef(false)

  useEffect(() => {
    dispatch(resetNodeSubmit())
    dispatch(fetchNodeAssetsRequest())
    return () => {
      dispatch(resetNodeSubmit())
    }
  }, [dispatch])

  useEffect(() => {
    if (submittedRef.current && nodeSubmit === 'succeeded' && registeredNode && !hasSavedRef.current) {
      hasSavedRef.current = true
      onSaved(registeredNode)
    }
  }, [nodeSubmit, registeredNode, onSaved])

  // Một tủ gắn được nhiều node, mỗi node đúng một mạch (backend: `iot_node_ids` của tủ, `control.node_id` của mạch).
  const communeCabinets = useMemo(
    () => cabinets.filter((c) => c.cabinet_id && c.commune_id === communeId),
    [cabinets, communeId]
  )
  // Chỉ mạch chưa gắn node của tủ đã chọn.
  const cabinetFeeders = feeders.filter((f) => f.feeder_id && f.cabinet?.cabinet_id === cabinetId && !f.control?.node_id)
  const communeServers = servers.filter((s) => s.server_id && s.commune_id === communeId)

  const selectCommune = (id: string) => {
    setCommuneId(id)
    setCabinetId('')
    setFeederId('')
    setServerId('')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    const v = positive(voltage)
    const c = positive(currentMa)
    const p = positive(powerMw)
    if (!communeId) return setLocalError('Chọn xã / phường trước.')
    if (!cabinetId || !feederId || !serverId) return setLocalError('Chọn tủ điện, mạch và server IoT.')
    if (!isValidBridgeId(deviceId.trim())) return setLocalError('Device ID bắt đầu bằng chữ/số, chỉ gồm chữ, số, "-" hoặc "_".')
    if (gatewayId.trim() && !isValidBridgeId(gatewayId.trim()))
      return setLocalError('Gateway ID bắt đầu bằng chữ/số, chỉ gồm chữ, số, "-" hoặc "_".')
    if (v === null || c === null || p === null) return setLocalError('Điện áp, dòng, công suất danh định phải là số dương.')

    submittedRef.current = true
    dispatch(
      registerNodeRequest({
        server_id: serverId,
        cabinet_id: cabinetId,
        feeder_id: feederId,
        device_id: deviceId.trim(),
        nominal_voltage: v,
        nominal_current_ma: c,
        nominal_power_mw: p,
      })
    )
  }

  const cabinetHint = !communeId
    ? 'Chọn xã / phường trước.'
    : assetsLoaded && communeCabinets.length === 0
      ? 'Xã này chưa có tủ điện.'
      : undefined
  const serverHint = !communeId
    ? 'Chọn xã / phường trước.'
    : communeServers.length === 0
      ? 'Xã này chưa có server IoT, đăng ký server trước.'
      : 'Chỉ server cùng xã với tủ.'

  return (
    <AssetModalFrame widthClass="max-w-3xl">
      <AssetModalHeader
        icon={<Cpu className="w-5 h-5" />}
        accent="purple"
        title="Đăng ký node IoT"
        subtitle="Node LoRa gắn ở tủ điện, mạch đấu vào rơ-le #1"
        onClose={onClose}
      />
      <AssetModalError message={error} />

      <form onSubmit={submit} className="flex-1 min-h-0 flex flex-col">
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <section className="space-y-4">
            <SectionTitle icon={<MapPin className="w-4 h-4 text-blue-600" />}>Vị trí lắp đặt</SectionTitle>
            <Field label="Xã / phường">
              <select
                aria-label="Xã / phường"
                className={`${inputClass} cursor-pointer`}
                value={communeId}
                onChange={(e) => selectCommune(e.target.value)}
              >
                <option value="" disabled>
                  {communeStatus === 'loading' ? 'Đang tải danh sách…' : '— Chọn xã / phường —'}
                </option>
                {communes.map((c) => (
                  <option key={c.commune_id || ''} value={c.commune_id || ''}>
                    {c.name ? `${c.name} (${c.commune_id})` : c.commune_id}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tủ điện" hint={cabinetHint}>
              <select
                aria-label="Tủ điện"
                className={`${inputClass} cursor-pointer`}
                value={cabinetId}
                disabled={!communeId}
                onChange={(e) => {
                  setCabinetId(e.target.value)
                  setFeederId('')
                }}
              >
                <option value="">— Chọn tủ —</option>
                {communeCabinets.map((c) => (
                  <option key={c.cabinet_id!} value={c.cabinet_id!}>
                    {c.cabinet_name ? `${c.cabinet_name} (${c.cabinet_id})` : c.cabinet_id}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mạch (rơ-le #1)" hint={cabinetId && cabinetFeeders.length === 0 ? 'Mọi mạch của tủ này đã gắn node (mỗi mạch một node).' : 'Chỉ mạch chưa gắn node.'}>
              <select
                aria-label="Mạch (rơ-le #1)"
                className={`${inputClass} cursor-pointer`}
                value={feederId}
                disabled={!cabinetId}
                onChange={(e) => setFeederId(e.target.value)}
              >
                <option value="">— Chọn mạch —</option>
                {cabinetFeeders.map((f) => (
                  <option key={f.feeder_id!} value={f.feeder_id!}>
                    {f.feeder_name ? `${f.feeder_name} (${f.feeder_id})` : f.feeder_id}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Server IoT" hint={serverHint}>
              <select
                aria-label="Server IoT"
                className={`${inputClass} cursor-pointer`}
                value={serverId}
                disabled={!communeId}
                onChange={(e) => setServerId(e.target.value)}
              >
                <option value="">— Chọn server —</option>
                {communeServers.map((s) => (
                  <option key={s.server_id!} value={s.server_id!}>
                    {s.server_id}
                  </option>
                ))}
              </select>
            </Field>
          </section>

          <section className="space-y-4">
            <SectionTitle icon={<Gauge className="w-4 h-4 text-blue-600" />}>Thiết bị và chỉ số danh định</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Device ID" hint="Trùng DEVICE_ID trong firmware node.">
                <input
                  className={`${inputClass} font-mono`}
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="LUXMAP-P002"
                />
              </Field>
              <Field label="Gateway ID" hint="Tuỳ chọn.">
                <input
                  className={`${inputClass} font-mono`}
                  value={gatewayId}
                  onChange={(e) => setGatewayId(e.target.value)}
                  placeholder="LUXMAP-GW002"
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Điện áp (V)">
                <input className={inputClass} inputMode="decimal" value={voltage} onChange={(e) => setVoltage(e.target.value)} placeholder="5" />
              </Field>
              <Field label="Dòng (mA)">
                <input className={inputClass} inputMode="decimal" value={currentMa} onChange={(e) => setCurrentMa(e.target.value)} placeholder="100" />
              </Field>
              <Field label="Công suất (mW)">
                <input className={inputClass} inputMode="decimal" value={powerMw} onChange={(e) => setPowerMw(e.target.value)} placeholder="500" />
              </Field>
            </div>
            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Nguồn dữ liệu</span>
              <p data-testid="register-node-data-source" className={`${inputClass} bg-slate-50 dark:bg-slate-900`}>
                Phần cứng nhóm tự dựng (calibration_rig)
              </p>
              <span className="block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Node đăng ký ở đây luôn là thiết bị thật trên testbed của nhóm.
              </span>
            </div>
            <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />
              Cho phép điều khiển từ xa
            </label>
          </section>
        </div>

        <AssetModalFooter
          onCancel={onClose}
          submitLabel="Đăng ký node"
          submitIcon={<CheckCircle2 className="w-4 h-4" />}
          loading={saving}
        />
      </form>
    </AssetModalFrame>
  )
}

export default RegisterNodeModal
