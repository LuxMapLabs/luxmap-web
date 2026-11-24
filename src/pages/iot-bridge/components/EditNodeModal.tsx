import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AlertCircle, AlertTriangle, Gauge, Loader2, MapPin, PlugZap, RadioTower } from 'lucide-react'
import type { AppDispatch, RootState } from '../../../redux/store'
import {
  fetchNodeAssetsRequest,
  resetNodeEdit,
  updateNodeRequest,
} from '../../../feature/iot/iotBridgeSlice'
import {
  clearNodeSource,
  fetchNodeSourceRequest,
  selectNodeSource,
} from '../../../feature/iot/iotMonitorSlice'
import type { IotNodeStatus } from '../../../types/iot/nodes'
import type { IotServerStatus } from '../../../types/iot/servers'
import { feederOnRelayOne, isValidBridgeId } from '../../../utils/iot/iotRegistration'
import { isWithinCoverage } from '../../../utils/iot/serverCoverage'
import { useCommuneBoundary } from '../../../hooks/gis-map/useCommuneBoundary'
import { NodeCoverageMap } from './NodeCoverageMap'
import { FormSection, NodeRadiusInput, UnitInput, MAX_NODE_RADIUS_KM, parseNodeRadiusKm } from './NodeFormParts'
import {
  Field,
  IotBridgeModal,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './IotBridgeModal'

const positive = (value: string): number | null => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

export interface EditNodeModalProps {
  node: IotNodeStatus
  servers: IotServerStatus[]
  onClose: () => void
}

/**
 * Admin cập nhật cấu hình node IoT (`PUT /api/v1/iot/nodes/{nodeId}`):
 * server IoT cùng xã, Device ID, tủ điện cùng xã rồi mạch của tủ đó (chưa gắn node khác), và 3 chỉ số danh định.
 * Bản đồ bên cạnh cho xem vòng bán kính của server để chọn tủ cho hợp lý.
 */
export const EditNodeModal: React.FC<EditNodeModalProps> = ({ node, servers, onClose }) => {
  const dispatch = useDispatch<AppDispatch>()
  const nodeId = node.node_id || ''

  const { cabinets, feeders, nodeAssetsStatus, nodeAssetsError, nodeEdit, nodeEditError } = useSelector(
    (s: RootState) => s.iotBridge
  )
  const sourceEntry = useSelector((s: RootState) => selectNodeSource(s, nodeId))
  const sourceData = sourceEntry && !sourceEntry.loading ? sourceEntry.data : null

  const [serverId, setServerId] = useState(node.server_id || '')
  const [deviceId, setDeviceId] = useState('')
  const [cabinetId, setCabinetId] = useState(node.cabinet_id || '')
  const [feederId, setFeederId] = useState('')
  const [voltage, setVoltage] = useState('')
  const [currentMa, setCurrentMa] = useState('')
  const [powerMw, setPowerMw] = useState('')
  const [radiusText, setRadiusText] = useState(node.radius_km ? String(node.radius_km) : '')
  const [localError, setLocalError] = useState<string | null>(null)

  const hydratedSourceRef = useRef(false)
  const hydratedFeederRef = useRef(false)
  const submittedRef = useRef(false)
  const closedRef = useRef(false)

  useEffect(() => {
    dispatch(resetNodeEdit())
    dispatch(fetchNodeAssetsRequest())
    if (nodeId) {
      dispatch(fetchNodeSourceRequest(nodeId))
    }
    return () => {
      dispatch(resetNodeEdit())
      if (nodeId) {
        dispatch(clearNodeSource(nodeId))
      }
    }
  }, [dispatch, nodeId])

  useEffect(() => {
    if (!sourceData || hydratedSourceRef.current) return
    hydratedSourceRef.current = true
    if (sourceData.server_id) setServerId(sourceData.server_id)
    if (sourceData.device_id) setDeviceId(sourceData.device_id)
    if (sourceData.feeder_id) {
      setFeederId(sourceData.feeder_id)
      hydratedFeederRef.current = true
    }
    if (typeof sourceData.nominal_voltage === 'number' && Number.isFinite(sourceData.nominal_voltage)) {
      setVoltage(String(sourceData.nominal_voltage))
    }
    if (typeof sourceData.nominal_current_ma === 'number' && Number.isFinite(sourceData.nominal_current_ma)) {
      setCurrentMa(String(sourceData.nominal_current_ma))
    }
    if (typeof sourceData.nominal_power_mw === 'number' && Number.isFinite(sourceData.nominal_power_mw)) {
      setPowerMw(String(sourceData.nominal_power_mw))
    }
  }, [sourceData])

  useEffect(() => {
    if (hydratedFeederRef.current || !nodeId) return
    const currentFeeder = feederOnRelayOne(feeders, nodeId)
    if (currentFeeder?.feeder_id) {
      setFeederId(currentFeeder.feeder_id)
      hydratedFeederRef.current = true
    }
  }, [feeders, nodeId])

  useEffect(() => {
    if (submittedRef.current && nodeEdit === 'succeeded' && !closedRef.current) {
      closedRef.current = true
      onClose()
    }
  }, [nodeEdit, onClose])

  const communeServers = useMemo(
    () =>
      servers.filter(
        (s) => s.server_id && (!node.commune_id || s.commune_id === node.commune_id)
      ),
    [servers, node.commune_id]
  )

  // Node đã gỡ khỏi tủ vẫn gắn lại được vào tủ khác cùng xã: backend suy ra tủ từ mạch được chọn.
  const communeCabinets = useMemo(
    () => cabinets.filter((c) => c.cabinet_id && (!node.commune_id || c.commune_id === node.commune_id)),
    [cabinets, node.commune_id]
  )

  const cabinetFeeders = useMemo(
    () =>
      feeders.filter(
        (f) =>
          f.feeder_id &&
          f.cabinet?.cabinet_id === cabinetId &&
          (!f.control?.node_id || f.control.node_id === nodeId)
      ),
    [feeders, cabinetId, nodeId]
  )

  // Mạch đã có sẵn (đang gắn node này) mà chưa biết tủ thì lấy tủ của mạch đó.
  useEffect(() => {
    if (cabinetId || !feederId) return
    const owner = feeders.find((f) => f.feeder_id === feederId)?.cabinet?.cabinet_id
    if (owner) setCabinetId(owner)
  }, [cabinetId, feederId, feeders])

  const selectedServer = useMemo(() => servers.find((s) => s.server_id === serverId) ?? null, [servers, serverId])
  const selectedCabinet = communeCabinets.find((c) => c.cabinet_id === cabinetId)
  const outOfRange = isWithinCoverage(selectedServer, selectedCabinet?.location) === false
  const communeBoundary = useCommuneBoundary(node.commune_id || null)
  // Xã chưa vẽ ranh giới (polygon) thì bản đồ dùng khung bbox của xã.
  const communeBbox = useSelector((s: RootState) =>
    s.iotBridge.communes.find((c) => c.commune_id === node.commune_id)
  )?.bbox

  const saving = nodeEdit === 'submitting'
  const assetsLoaded = nodeAssetsStatus === 'ready' || nodeAssetsStatus === 'error'
  const error = localError || nodeEditError || nodeAssetsError

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    const v = positive(voltage)
    const c = positive(currentMa)
    const p = positive(powerMw)
    if (!serverId) return setLocalError('Chọn server IoT.')
    if (!isValidBridgeId(deviceId.trim())) {
      return setLocalError('Device ID bắt đầu bằng chữ/số, chỉ gồm chữ, số, "-" hoặc "_".')
    }
    if (!cabinetId) return setLocalError('Chọn tủ điện.')
    if (!feederId) return setLocalError('Chọn mạch.')
    if (v === null || c === null || p === null) {
      return setLocalError('Điện áp, dòng, công suất danh định phải là số dương.')
    }
    const radius = parseNodeRadiusKm(radiusText)
    if (radius === null) return setLocalError(`Bán kính node phải từ 0 đến ${MAX_NODE_RADIUS_KM} km.`)

    submittedRef.current = true
    dispatch(
      updateNodeRequest({
        nodeId,
        body: {
          server_id: serverId,
          device_id: deviceId.trim(),
          feeder_id: feederId,
          nominal_voltage: v,
          nominal_current_ma: c,
          nominal_power_mw: p,
          radius_km: radius,
        },
      })
    )
  }

  const formId = `edit-node-${nodeId}`

  return (
    <IotBridgeModal
      title={`Sửa node ${nodeId}`}
      subtitle={node.cabinet_id ? `Tủ ${node.cabinet_id}` : undefined}
      onClose={saving ? () => {} : onClose}
      widthClass="max-w-5xl"
      footer={
        <>
          <button type="button" disabled={saving} onClick={onClose} className={secondaryButtonClass}>
            Huỷ
          </button>
          <button
            type="submit"
            form={formId}
            disabled={saving}
            className={`${primaryButtonClass} inline-flex items-center gap-1.5`}
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Lưu thay đổi
          </button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={submit}
        className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-x-8 gap-y-6 text-xs"
      >
        <div className="space-y-6">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium"
            >
              <AlertCircle className="w-4 h-4 mt-px shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <FormSection icon={<RadioTower className="w-4 h-4" />} title="Kết nối IoT">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Server IoT"
                hint={communeServers.length === 0 ? 'Không có server IoT cùng xã.' : 'Chỉ server cùng xã.'}
              >
                <select
                  aria-label="Server IoT"
                  className={`${inputClass} cursor-pointer`}
                  value={serverId}
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
                  aria-label="Device ID"
                  className={`${inputClass} font-mono`}
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="LUXMAP-P002"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection icon={<PlugZap className="w-4 h-4" />} title="Vị trí đấu nối">
            <Field
              label="Tủ điện"
              hint={
                outOfRange ? (
                  <span className="inline-flex items-start gap-1 text-amber-700 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden />
                    Ngoài vùng phủ sóng của server đã chọn, kiểm tra lại trước khi lưu.
                  </span>
                ) : assetsLoaded && communeCabinets.length === 0 ? (
                  'Xã này chưa có tủ điện.'
                ) : (
                  'Chọn tủ trước, hoặc bấm biểu tượng tủ trên bản đồ.'
                )
              }
            >
              <select
                aria-label="Tủ điện"
                className={`${inputClass} cursor-pointer`}
                value={cabinetId}
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
                  : assetsLoaded && cabinetFeeders.length === 0
                    ? 'Tủ này không còn mạch trống.'
                    : 'Chỉ hiện mạch chưa gắn node khác.'
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
            <Field label="Bán kính node (km)" hint="Node cố định theo tủ đã chọn; vòng chàm trên bản đồ quanh tủ. Để trống là 0.">
              <NodeRadiusInput value={radiusText} onChange={setRadiusText} />
            </Field>
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
          </FormSection>
        </div>

        <div className="lg:sticky lg:top-0 lg:self-start">
          <FormSection icon={<MapPin className="w-4 h-4" />} title="Vùng phủ sóng của server">
            <NodeCoverageMap
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
          </FormSection>
        </div>
      </form>
    </IotBridgeModal>
  )
}

export default EditNodeModal
