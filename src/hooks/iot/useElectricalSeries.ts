import { useEffect, useId } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '../../redux/store'
import type { ElectricalPoint } from '../../utils/iot/electricalSeries'
import {
  selectElectricalSeries,
  startElectricalSeries,
  stopElectricalSeries,
  type IotMonitorState,
} from '../../feature/iot/iotMonitorSlice'

/**
 * Chu kỳ lấy mẫu mới định kỳ cho mạch đang gắn node (trang 1, 20 mẫu gần nhất).
 * Node chỉ ghi một mẫu điện mỗi 10 s (`SAMPLE_INTERVAL` của firmware), hỏi dày hơn chỉ về rỗng.
 */
export { ELECTRICAL_POLL_MS, ELECTRICAL_MAX_PAGES } from '../../feature/iot/iotMonitorSlice'

interface Options {
  /** Số mẫu mỗi trang khi tải đầu (tối đa 200 theo `page_size` của API). */
  initial: number
  /** Giữ tối đa chừng này điểm; mẫu cũ hơn bị bỏ. */
  maxPoints: number
  /**
   * Xem theo khoảng thời gian: tải ngược thêm trang tới khi phủ `windowMs` tính từ mẫu mới nhất
   * (hoặc hết dữ liệu / chạm `ELECTRICAL_MAX_PAGES`), và chỉ giữ mẫu trong khoảng đó.
   * Không đặt: chỉ tải một trang `initial` mẫu.
   */
  windowMs?: number
  /** Mặc định true: false thì chỉ tải lần đầu, không hỏi lại định kỳ (mạch đã gỡ node: chỉ xem lịch sử cũ). */
  live?: boolean
}

const EMPTY_POINTS: ElectricalPoint[] = []

/**
 * Chuỗi mẫu điện của một mạch điện: tải mẫu mới nhất theo mạch (một trang, hoặc đủ `windowMs`).
 * Nếu `live` (mặc định true): cứ `ELECTRICAL_POLL_MS` lấy mẫu mới nhất trang 1 (`page_size: 20`) gộp theo key.
 * Nếu `live` là false: chỉ tải lần đầu, không hỏi lại định kỳ.
 * Chỉ hỏi khi component đang hiện; `feederId` rỗng thì không gọi gì.
 * Hỏi ngầm: không bật lại `loading` (tắt ngay sau trang đầu; trang cũ hơn về thì biểu đồ dài thêm).
 * Lần sau chỉ hẹn sau khi lần trước đã về (BE chậm cũng không chồng request), và kết quả về sau khi đã đổi mạch /
 * chế độ / đóng bảng thì bỏ.
 */
export function useElectricalSeries(
  feederId: string | null | undefined,
  { initial, maxPoints, windowMs, live = true }: Options
) {
  const key = useId()
  const dispatch = useDispatch<AppDispatch>()
  const entry = useSelector((s: { iotMonitor: IotMonitorState }) => selectElectricalSeries(s, key))

  useEffect(() => {
    if (!feederId) return
    dispatch(
      startElectricalSeries({
        key,
        feederId,
        initial,
        maxPoints,
        windowMs,
        live,
      })
    )
    return () => {
      dispatch(stopElectricalSeries({ key }))
    }
  }, [feederId, initial, maxPoints, windowMs, live, dispatch, key])

  if (entry) {
    return {
      points: entry.points,
      latest: entry.points[entry.points.length - 1] ?? null,
      loading: entry.loading,
      backfilling: entry.backfilling,
      error: entry.error,
    }
  }

  return {
    points: EMPTY_POINTS,
    latest: null,
    loading: Boolean(feederId),
    backfilling: Boolean(feederId),
    error: null,
  }
}
