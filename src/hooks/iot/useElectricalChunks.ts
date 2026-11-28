/** Hook tải lịch sử điện theo khúc 6 giờ (tải trước theo hướng kéo, không giới hạn tổng số mẫu). */
import { useEffect, useId, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '../../redux/store'
import {
  chunkStartsCovering,
  type ElectricalChunkDirection,
  type ElectricalChunkState,
  type ElectricalPoint,
  type ElectricalTimeSpan,
} from '../../utils/iot/electricalSeries'
import {
  requestElectricalChunks,
  selectElectricalChunks,
  startElectricalChunks,
  stopElectricalChunks,
  type ElectricalTimeBasis,
  type IotMonitorState,
} from '../../feature/iot/iotMonitorSlice'
import type { IotFeederRepairPeriod } from '../../types/iot/feeders'

export interface UseElectricalChunksOptions {
  /** Mặc định `'measured_at'` (giờ đo trên node); `'received_at'` theo giờ Bridge nhận. */
  timeBasis?: ElectricalTimeBasis
  /** `true` bật hỏi định kỳ mẫu mới mỗi `ELECTRICAL_POLL_MS`. */
  live?: boolean
  /** Khung đang xem trên biểu đồ (ms). */
  view: ElectricalTimeSpan
  /** Khung nhìn 24 giờ trên thanh trượt (ms). */
  track: ElectricalTimeSpan
  /** Hướng kéo gần nhất: `-1` quá khứ, `1` tương lai, `0` đứng yên. */
  direction: ElectricalChunkDirection
  /** Giới hạn khoảng ngày (chế độ Theo ngày); nếu có thì không tải khúc ngoài khoảng này. */
  bounds?: ElectricalTimeSpan | null
}

const EMPTY_POINTS: ElectricalPoint[] = []
const EMPTY_REPAIRS: IotFeederRepairPeriod[] = []
const EMPTY_CHUNKS: Record<number, ElectricalChunkState> = {}

/**
 * Quản lý phiên tải dữ liệu điện theo khúc 6 giờ cho một mạch điện.
 * So sánh `view`, `track`, `bounds` theo giá trị số ms để tránh dispatch thừa khi tham chiếu object đổi.
 */
export function useElectricalChunks(
  feederId: string | null | undefined,
  {
    timeBasis = 'measured_at',
    live = true,
    view,
    track,
    direction,
    bounds = null,
  }: UseElectricalChunksOptions
) {
  const key = useId()
  const dispatch = useDispatch<AppDispatch>()
  const entry = useSelector((s: { iotMonitor: IotMonitorState }) =>
    selectElectricalChunks(s, key)
  )

  const viewFrom = view.from
  const viewTo = view.to
  const trackFrom = track.from
  const trackTo = track.to
  const boundsFrom = bounds ? bounds.from : null
  const boundsTo = bounds ? bounds.to : null

  useEffect(() => {
    if (!feederId) return
    dispatch(startElectricalChunks({ key, feederId, timeBasis, live }))
    return () => {
      dispatch(stopElectricalChunks({ key }))
    }
  }, [feederId, timeBasis, live, dispatch, key])

  useEffect(() => {
    if (!feederId) return
    dispatch(
      requestElectricalChunks({
        key,
        view: { from: viewFrom, to: viewTo },
        track: { from: trackFrom, to: trackTo },
        direction,
        bounds:
          boundsFrom !== null && boundsTo !== null
            ? { from: boundsFrom, to: boundsTo }
            : null,
      })
    )
  }, [
    feederId,
    timeBasis,
    live,
    viewFrom,
    viewTo,
    trackFrom,
    trackTo,
    direction,
    boundsFrom,
    boundsTo,
    dispatch,
    key,
  ])

  const points = entry ? entry.points : EMPTY_POINTS
  const chunks = entry ? entry.chunks : EMPTY_CHUNKS

  // Còn ít nhất một khúc phủ khung đang xem chưa `'loaded'` (và chưa dừng ở `'error'`).
  const viewLoading = useMemo(() => {
    if (!feederId) return false
    const effFrom = boundsFrom !== null ? Math.max(viewFrom, boundsFrom) : viewFrom
    const effTo = boundsTo !== null ? Math.min(viewTo, boundsTo) : viewTo
    if (effTo < effFrom) return false
    const needed = chunkStartsCovering(effFrom, effTo)
    if (needed.length === 0) return false
    return needed.some((start) => chunks[start] !== 'loaded' && chunks[start] !== 'error')
  }, [feederId, viewFrom, viewTo, boundsFrom, boundsTo, chunks])

  return {
    points,
    latest: points.length > 0 ? points[points.length - 1] : null,
    repairPeriods: entry ? entry.repairPeriods : EMPTY_REPAIRS,
    chunks,
    viewLoading,
    error: entry ? entry.error : null,
  }
}
