import { useCallback, useEffect, useRef, useState } from 'react'
import iotAPI from '../../feature/iot/iotAPI'
import type { IotArchivedSample } from '../../types/iot/nodes'
import { apiErrorMessage } from '../../utils/iot/apiError'
import { mergeElectricalPoints, type ElectricalPoint } from '../../utils/iot/electricalSeries'

/**
 * Chu kỳ lấy mẫu mới bằng `after = cursor lớn nhất` (spec IoT mục 5). Node chỉ ghi một mẫu điện mỗi 10 s
 * (`SAMPLE_INTERVAL` của firmware), hỏi dày hơn chỉ về rỗng mà mỗi request BE vẫn gọi sang server IoT.
 */
export const ELECTRICAL_POLL_MS = 10_000

interface Options {
  /** Lần tải đầu: số mẫu mới nhất (tối đa 200 theo `page_size` của API). */
  initial: number
  /** Giữ tối đa chừng này điểm; mẫu cũ hơn bị bỏ. */
  maxPoints: number
}

/**
 * Chuỗi mẫu điện của một node IoT: tải `initial` mẫu mới nhất, rồi cứ `ELECTRICAL_POLL_MS` lấy mẫu mới
 * bằng `after` = cursor lớn nhất đang có. Chỉ hỏi khi component đang hiện; `nodeId` rỗng thì không gọi gì.
 * Hỏi ngầm: không bật lại `loading`. Lần sau chỉ hẹn sau khi lần trước đã về (BE chậm cũng không chồng request),
 * và kết quả về sau khi đã đổi node / đóng bảng thì bỏ.
 */
export function useElectricalSeries(nodeId: string | null | undefined, { initial, maxPoints }: Options) {
  const [points, setPoints] = useState<ElectricalPoint[]>([])
  const [loading, setLoading] = useState(Boolean(nodeId))
  const [error, setError] = useState<string | null>(null)
  const maxCursor = useRef(0)

  const absorb = useCallback(
    (samples: IotArchivedSample[]) => {
      // Không có mẫu mới thì không đổi state: biểu đồ không vẽ lại
      if (samples.length === 0) return
      for (const s of samples) if (typeof s.cursor === 'number' && s.cursor > maxCursor.current) maxCursor.current = s.cursor
      setPoints((prev) => mergeElectricalPoints(prev, samples, maxPoints))
    },
    [maxPoints]
  )

  useEffect(() => {
    maxCursor.current = 0
    setPoints([])
    setError(null)
    if (!nodeId) {
      setLoading(false)
      return
    }
    let cancelled = false
    let timer: number | undefined
    setLoading(true)

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
    const load = () =>
      iotAPI
        .getElectricalHistoryPage(nodeId, { page: 1, page_size: initial })
        .then((result) => {
          if (cancelled) return
          absorb(result.items || [])
          setError(null)
          schedule()
        })
        .catch((err) => {
          if (cancelled) return
          setError(apiErrorMessage(err, 'Không đọc được lịch sử điện.'))
          timer = window.setTimeout(load, ELECTRICAL_POLL_MS)
        })
        .finally(() => !cancelled && setLoading(false))
    load()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [nodeId, initial, absorb])

  return { points, latest: points[points.length - 1] ?? null, loading, error }
}
