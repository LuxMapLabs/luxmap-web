import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CheckCircle2, Cpu, Gauge, Globe, MapPin, RadioTower } from 'lucide-react'
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
import { isWithinCoverage } from '../../../utils/iot/serverCoverage'
import { useCommuneBoundary } from '../../../hooks/gis-map/useCommuneBoundary'
import { NodeCoverageMap } from './NodeCoverageMap'
import { FormSection, NodeRadiusInput, UnitInput, MAX_NODE_RADIUS_KM, parseNodeRadiusKm } from './NodeFormParts'
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

/**
 * Admin đăng ký một bộ IoT bridge (`POST /iot/nodes/register`, `ManageSettings`): tạo node ở tủ điện, đấu mạch vào
 * rơ-le #1, lưu nguồn đo (chỉ số danh định) và tuyến MQTT trong một lần.
 * Thứ tự chọn: xã → tủ của xã → mạch chưa gắn node của tủ; server chỉ lấy trong cùng xã (backend từ chối server khác xã).
 * Nguồn dữ liệu mặc định là `calibration_rig` (phần cứng nhóm tự dựng), web không hiện và không cho chọn.
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
  const [voltage, setVoltage] = useState('')
  const [currentMa, setCurrentMa] = useState('')
  const [powerMw, setPowerMw] = useState('')
  const [radiusText, setRadiusText] = useState('')
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
  const selectedServer = communeServers.find((s) => s.server_id === serverId) ?? null
  const selectedCabinet = communeCabinets.find((c) => c.cabinet_id === cabinetId)
  const outOfRange = isWithinCoverage(selectedServer, selectedCabinet?.location) === false
  // Hook gộp ranh giới của mọi xã khi chưa chọn xã: bỏ đi để bản đồ không nhảy sang vị trí lạ.
  const allBoundaries = useCommuneBoundary(communeId || null)
  const communeBoundary = communeId ? allBoundaries : null
  const communeBbox = communes.find((c) => c.commune_id === communeId)?.bbox

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
    if (v === null || c === null || p === null) return setLocalError('Điện áp, dòng, công suất danh định phải là số dương.')
    const radius = parseNodeRadiusKm(radiusText)
    if (radius === null) return setLocalError(`Bán kính node phải từ 0 đến ${MAX_NODE_RADIUS_KM} km.`)

    submittedRef.current = true
    dispatch(
      registerNodeRequest({
        server_id: serverId,
        feeder_id: feederId,
        device_id: deviceId.trim(),
        nominal_voltage: v,
        nominal_current_ma: c,
        nominal_power_mw: p,
        radius_km: radius,
      })
    )
  }

  const cabinetHint = !communeId
    ? 'Chọn xã / phường trước.'
    : assetsLoaded && communeCabinets.length === 0
      ? 'Xã này chưa có tủ điện.'
      : outOfRange
        ? 'Tủ nằm ngoài vùng phủ sóng của server đã chọn, kiểm tra lại trước khi lưu.'
        : 'Bấm chấm tủ trên bản đồ để chọn nhanh.'
  const serverHint = !communeId
    ? 'Chọn xã / phường trước.'
    : communeServers.length === 0
      ? 'Xã này chưa có server IoT, đăng ký server trước.'
      : 'Chỉ server cùng xã với tủ.'

  return (
    <AssetModalFrame widthClass="max-w-5xl">
      <AssetModalHeader
        icon={<Cpu className="w-5 h-5" />}
        accent="purple"
        title="Đăng ký node IoT"
        subtitle="Node LoRa gắn ở tủ điện, mạch đấu vào rơ-le #1"
        onClose={onClose}
      />
      <AssetModalError message={error} />

      <form noValidate onSubmit={submit} className="flex-1 min-h-0 flex flex-col">
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-x-8 gap-y-6 text-xs">
          <div className="space-y-6">
            <FormSection icon={<MapPin className="w-4 h-4" />} title="Vị trí lắp đặt">
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
              <Field
                label="Mạch (rơ-le #1)"
                hint={
                  !cabinetId
                    ? 'Chọn tủ điện trước.'
                    : cabinetFeeders.length === 0
                      ? 'Mọi mạch của tủ này đã gắn node (mỗi mạch một node).'
                      : 'Chỉ hiện mạch chưa gắn node.'
                }
              >
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
            </FormSection>

            <FormSection icon={<RadioTower className="w-4 h-4" />} title="Kết nối IoT">
              <div className="grid grid-cols-2 gap-3">
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
                <Field label="Mã thiết bị của node (Device ID)" hint="ID nạp trong firmware của node.">
                  <input
                    className={`${inputClass} font-mono`}
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    placeholder="LUXMAP-P002"
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection icon={<Gauge className="w-4 h-4" />} title="Thông số danh định">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Điện áp">
                  <UnitInput label="Điện áp (V)" unit="V" value={voltage} onChange={setVoltage} placeholder="5" />
                </Field>
                <Field label="Dòng">
                  <UnitInput label="Dòng (mA)" unit="mA" value={currentMa} onChange={setCurrentMa} placeholder="100" />
                </Field>
                <Field label="Công suất">
                  <UnitInput label="Công suất (mW)" unit="mW" value={powerMw} onChange={setPowerMw} placeholder="500" />
                </Field>
              </div>
              <Field label="Bán kính node (km)" hint="Node cố định theo tủ đã chọn; vòng chàm trên bản đồ quanh tủ. Để trống là 0.">
                <NodeRadiusInput value={radiusText} onChange={setRadiusText} />
              </Field>
            </FormSection>
          </div>

          <div className="lg:sticky lg:top-0 lg:self-start">
            <FormSection icon={<MapPin className="w-4 h-4" />} title="Vùng phủ sóng của server">
              {communeId ? (
                <NodeCoverageMap
                  key={communeId}
                  server={selectedServer}
                  cabinets={communeCabinets}
                  selectedCabinetId={cabinetId}
                  boundaryGeometry={communeBoundary}
                  bbox={communeBbox}
                  height="clamp(300px, 46vh, 420px)"
                  nodeRadiusKm={parseNodeRadiusKm(radiusText) ?? 0}
                  onSelectCabinet={(id) => {
                    setCabinetId(id)
                    setFeederId('')
                  }}
                />
              ) : (
                // Chưa chọn xã thì chưa có tủ / viền để vẽ: tránh bản đồ nhảy tới vị trí ngẫu nhiên.
                <div
                  data-testid="register-node-map-placeholder"
                  style={{ height: 'clamp(300px, 46vh, 420px)' }}
                  className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-500"
                >
                  <Globe className="w-6 h-6 text-slate-400" aria-hidden />
                  <span className="font-semibold">Chọn xã / phường để hiện bản đồ</span>
                </div>
              )}
            </FormSection>
          </div>
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
