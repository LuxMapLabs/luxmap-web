import { useEffect, useId } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '../../redux/store'
import type { IotNodeStatus } from '../../types/iot/nodes'
import type { IotServerStatus } from '../../types/iot/servers'
import {
  selectCabinetStatus,
  startCabinetStatus,
  stopCabinetStatus,
  type IotMonitorState,
} from '../../feature/iot/iotMonitorSlice'

/** Chu kỳ đọc lại trạng thái node và gateway của tủ (30 giây). */
export { CABINET_IOT_REFRESH_MS } from '../../feature/iot/iotMonitorSlice'

export interface UseCabinetIotStatusResult {
  nodes: IotNodeStatus[]
  servers: IotServerStatus[]
  loading: boolean
  error: string | null
}

const EMPTY_NODES: IotNodeStatus[] = []
const EMPTY_SERVERS: IotServerStatus[] = []

/**
 * Trạng thái IoT của một tủ điện: danh sách node gắn tủ và gateway phụ trách các node đó.
 * Định kỳ 30s đọc lại; huỷ khi unmount hoặc đổi tủ; lỗi thì giữ dữ liệu cũ.
 */
export function useCabinetIotStatus(cabinetId: string | null): UseCabinetIotStatusResult {
  const key = useId()
  const dispatch = useDispatch<AppDispatch>()
  const entry = useSelector((s: { iotMonitor: IotMonitorState }) => selectCabinetStatus(s, key))

  useEffect(() => {
    if (!cabinetId) return
    dispatch(startCabinetStatus({ key, cabinetId }))
    return () => {
      dispatch(stopCabinetStatus({ key }))
    }
  }, [cabinetId, dispatch, key])

  if (entry) {
    return {
      nodes: entry.nodes,
      servers: entry.servers,
      loading: entry.loading,
      error: entry.error,
    }
  }

  return {
    nodes: EMPTY_NODES,
    servers: EMPTY_SERVERS,
    loading: Boolean(cabinetId),
    error: null,
  }
}

export default useCabinetIotStatus
