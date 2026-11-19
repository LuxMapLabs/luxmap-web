import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Loader2 } from 'lucide-react'
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
 * server IoT cùng xã, Device ID, mạch cùng tủ chưa gắn node khác, và 3 chỉ số danh định.
 */
export const EditNodeModal: React.FC<EditNodeModalProps> = ({ node, servers, onClose }) => {
  const dispatch = useDispatch<AppDispatch>()
  const nodeId = node.node_id || ''

  const { feeders, nodeAssetsStatus, nodeAssetsError, nodeEdit, nodeEditError } = useSelector(
    (s: RootState) => s.iotBridge
  )
  const sourceEntry = useSelector((s: RootState) => selectNodeSource(s, nodeId))
  const sourceData = sourceEntry && !sourceEntry.loading ? sourceEntry.data : null

  const [serverId, setServerId] = useState(node.server_id || '')
  const [deviceId, setDeviceId] = useState('')
  const [feederId, setFeederId] = useState('')
  const [voltage, setVoltage] = useState('')
  const [currentMa, setCurrentMa] = useState('')
  const [powerMw, setPowerMw] = useState('')
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

  const cabinetFeeders = useMemo(
    () =>
      feeders.filter(
        (f) =>
          f.feeder_id &&
          (!node.cabinet_id || f.cabinet?.cabinet_id === node.cabinet_id) &&
          (!f.control?.node_id || f.control.node_id === nodeId)
      ),
    [feeders, node.cabinet_id, nodeId]
  )

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
    if (!feederId) return setLocalError('Chọn mạch.')
    if (v === null || c === null || p === null) {
      return setLocalError('Điện áp, dòng, công suất danh định phải là số dương.')
    }

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
        },
      })
    )
  }

  return (
    <IotBridgeModal
      title={`Sửa node ${nodeId}`}
      subtitle={node.cabinet_id ? `Tủ ${node.cabinet_id}` : undefined}
      onClose={saving ? () => {} : onClose}
    >
      <form onSubmit={submit} className="space-y-4 text-xs">
        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium"
          >
            {error}
          </div>
        )}

        <Field
          label="Server IoT"
          hint={communeServers.length === 0 ? 'Không có server IoT cùng xã.' : 'Chỉ server cùng xã với node.'}
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

        <Field label="Device ID" hint="Trùng DEVICE_ID trong firmware node.">
          <input
            aria-label="Device ID"
            className={`${inputClass} font-mono`}
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="LUXMAP-P002"
          />
        </Field>

        <Field
          label="Mạch (rơ-le #1)"
          hint={
            assetsLoaded && cabinetFeeders.length === 0
              ? 'Không có mạch khả dụng trong tủ này.'
              : 'Chỉ mạch của tủ chưa gắn node khác.'
          }
        >
          <select
            aria-label="Mạch (rơ-le #1)"
            className={`${inputClass} cursor-pointer`}
            value={feederId}
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

        <div className="grid grid-cols-3 gap-3">
          <Field label="Điện áp (V)">
            <input
              aria-label="Điện áp (V)"
              className={inputClass}
              inputMode="decimal"
              value={voltage}
              onChange={(e) => setVoltage(e.target.value)}
              placeholder="5"
            />
          </Field>
          <Field label="Dòng (mA)">
            <input
              aria-label="Dòng (mA)"
              className={inputClass}
              inputMode="decimal"
              value={currentMa}
              onChange={(e) => setCurrentMa(e.target.value)}
              placeholder="100"
            />
          </Field>
          <Field label="Công suất (mW)">
            <input
              aria-label="Công suất (mW)"
              className={inputClass}
              inputMode="decimal"
              value={powerMw}
              onChange={(e) => setPowerMw(e.target.value)}
              placeholder="500"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className={secondaryButtonClass}
          >
            Huỷ
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`${primaryButtonClass} inline-flex items-center gap-1.5`}
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Lưu thay đổi
          </button>
        </div>
      </form>
    </IotBridgeModal>
  )
}

export default EditNodeModal
