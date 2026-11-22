import { useEffect, useId } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '../../redux/store'
import type { IotCommandChoice } from '../../utils/iot/iotCommand'
import {
  selectCommandModes,
  startCommandModes,
  stopCommandModes,
  type IotMonitorState,
} from '../../feature/iot/iotMonitorSlice'

/** Chu kỳ đọc lại trạng thái lệnh hiện tại của node từ GET /iot/nodes/{nodeId}/command. */
export { COMMAND_MODE_POLL_MS } from '../../feature/iot/iotMonitorSlice'

/**
 * Chế độ Bật / Tắt / AUTO đang chạy của từng node, đọc từ
 * GET /iot/nodes/{nodeId}/command. Node lỗi hoặc chưa có mode → null.
 * `refreshKey` đổi (vd. sau khi gửi lệnh) thì đọc lại ngay.
 */
export function useFeederCommandModes(nodeIds: string[], refreshKey = 0): Record<string, IotCommandChoice | null> {
  const key = useId()
  const dispatch = useDispatch<AppDispatch>()
  const modes = useSelector((s: { iotMonitor: IotMonitorState }) => selectCommandModes(s, key))

  const ids = [...new Set(nodeIds)].sort().join(',')

  // Effect 1: nạp dữ liệu khi ids hoặc refreshKey thay đổi, không stop khi đổi tham số để giữ modes cũ
  useEffect(() => {
    if (!ids) {
      dispatch(stopCommandModes({ key }))
    } else {
      dispatch(startCommandModes({ key, nodeIds: ids.split(',') }))
    }
  }, [ids, refreshKey, dispatch, key])

  // Effect 2: chỉ dừng khi component unmount
  useEffect(() => {
    return () => {
      dispatch(stopCommandModes({ key }))
    }
  }, [dispatch, key])

  return modes
}
