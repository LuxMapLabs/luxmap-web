import { useCallback, useEffect, useRef, useState } from 'react'
import iotAPI from '../../feature/iot/iotAPI'
import type { IotArchivedSample } from '../../types/iot/nodes'
import { apiErrorMessage } from '../../utils/iot/apiError'
import { mergeElectricalPoints, toElectricalPoint, type ElectricalPoint } from '../../utils/iot/electricalSeries'

/**
 * Chu kỳ lấy mẫu mới bằng `after = cursor lớn nhất` (spec IoT mục 5). Node chỉ ghi một mẫu điện mỗi 10 s
 * (`SAMPLE_INTERVAL` của firmware), hỏi dày hơn chỉ về rỗng mà mỗi request BE vẫn gọi sang server IoT.
 */
export const ELECTRICAL_POLL_MS = 10_000

/** Trần số trang tải ngược khi xem theo khoảng thời gian (mỗi trang một request BE → server IoT). */
export const ELECTRICAL_MAX_PAGES = 50

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
}

const sampleTime = (s: IotArchivedSample) => toElectricalPoint(s)?.time ?? null

/**
 * Chuỗi mẫu điện của một node IoT: tải mẫu mới nhất (một trang, hoặc đủ `windowMs`), rồi cứ `ELECTRICAL_POLL_MS`
 * lấy mẫu mới bằng `after` = cursor lớn nhất đang có. Chỉ hỏi khi component đang hiện; `nodeId` rỗng thì không gọi gì.
 * Hỏi ngầm: không bật lại `loading` (tắt ngay sau trang đầu; trang cũ hơn về thì biểu đồ dài thêm).
 * Lần sau chỉ hẹn sau khi lần trước đã về (BE chậm cũng không chồng request), và kết quả về sau khi đã đổi node /
 * chế độ / đóng bảng thì bỏ.
 */
export function useElectricalSeries(nodeId: string | null | undefined, { initial, maxPoints, windowMs }: Options) {
  const [points, setPoints] = useState<ElectricalPoint[]>([])
  const [loading, setLoading] = useState(Boolean(nodeId))
  // Còn đang tải ngược các trang cũ cho đủ `windowMs` (`loading` đã tắt từ trang đầu): chuỗi còn dài thêm
  const [backfilling, setBackfilling] = useState(Boolean(nodeId))
  const [error, setError] = useState<string | null>(null)
  const maxCursor = useRef(0)

  const absorb = useCallback(
    (samples: IotArchivedSample[]) => {
      // Không có mẫu mới thì không đổi state: biểu đồ không vẽ lại
      if (samples.length === 0) return
      for (const s of samples) if (typeof s.cursor === 'number' && s.cursor > maxCursor.current) maxCursor.current = s.cursor
      setPoints((prev) => {
        const merged = mergeElectricalPoints(prev, samples, maxPoints)
        if (!windowMs || merged.length === 0) return merged
        const from = merged[merged.length - 1].time - windowMs
        return merged.filter((p) => p.time >= from)
      })
    },
    [maxPoints, windowMs]
  )

  useEffect(() => {
    maxCursor.current = 0
    setPoints([])
    setError(null)
    if (!nodeId) {
      setLoading(false)
      setBackfilling(false)
      return
    }
    let cancelled = false
    let timer: number | undefined
    setLoading(true)
    setBackfilling(true)

    const schedule = () => {
      if (!cancelled) timer = window.setTimeout(poll, ELECTRICAL_POLL_MS)
    }
    const poll = async () => {
      try {
        const page = await iotAPI.getElectricalHistory(nodeId, maxCursor.current, 100)
        if (cancelled) return
        absorb(page.items || [])
        setError(null)
      } catch (err) {
        if (!cancelled) setError(apiErrorMessage(err, 'Không lấy được mẫu điện mới.'))
      }
      schedule()
    }

    // Lần tải đầu lỗi (vd. 503 node chưa cấu hình nguồn đo) thì thử lại sau một chu kỳ, không dừng hẳn:
    // nguồn được cấu hình rồi thì biểu đồ tự chạy, không cần mở lại bảng.
    const load = async () => {
      let newest: number | null = null
      try {
        for (let page = 1; ; page++) {
          const result = await iotAPI.getElectricalHistoryPage(nodeId, { page, page_size: initial })
          if (cancelled) return
          const items = result.items || []
          absorb(items)
          if (page === 1) setLoading(false)
          if (!windowMs || items.length < initial || page >= ELECTRICAL_MAX_PAGES) break
          if (typeof result.total === 'number' && page * initial >= result.total) break
          // Trang mới nhất trước: mẫu cũ nhất của trang này đã ra ngoài khoảng thì đủ
          const times = items.map(sampleTime).filter((t): t is number => t !== null)
          if (times.length === 0) break
          newest ??= Math.max(...times)
          if (newest - Math.min(...times) >= windowMs) break
        }
        setError(null)
        setBackfilling(false)
        schedule()
      } catch (err) {
        if (cancelled) return
        setLoading(false)
        setBackfilling(false)
        setError(apiErrorMessage(err, 'Không đọc được lịch sử điện.'))
        timer = window.setTimeout(load, ELECTRICAL_POLL_MS)
      }
    }
    load()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [nodeId, initial, windowMs, absorb])

  return { points, latest: points[points.length - 1] ?? null, loading, backfilling, error }
}
