import { useEffect, useState } from 'react'
import iotAPI from '../../feature/iot/iotAPI'
import { latestSuccessChoice, type IotCommandChoice } from '../../utils/iot/iotCommand'

/** Chu kỳ đọc lại lịch sử lệnh: lệnh vừa gửi còn pending, node ACK thì mới thành success. */
export const COMMAND_MODE_POLL_MS = 10_000

/**
 * Chế độ Bật / Tắt / AUTO đang chạy của từng node, theo lệnh `success` mới nhất ở
 * GET /iot/nodes/{nodeId}/command/history. Node lỗi hoặc chưa có lệnh success → null.
 * `refreshKey` đổi (vd. sau khi gửi lệnh) thì đọc lại ngay.
 */
export function useFeederCommandModes(nodeIds: string[], refreshKey = 0): Record<string, IotCommandChoice | null> {
  const [modes, setModes] = useState<Record<string, IotCommandChoice | null>>({})
  const key = [...new Set(nodeIds)].sort().join(',')

  useEffect(() => {
    const ids = key ? key.split(',') : []
    if (ids.length === 0) {
      setModes({})
      return
    }
    let cancelled = false
    const load = async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const page = await iotAPI.getCommandHistory(id, { page: 1, page_size: 20 })
            return [id, latestSuccessChoice(page.items)] as const
          } catch {
            return [id, null] as const
          }
        })
      )
      if (!cancelled) setModes(Object.fromEntries(entries))
    }
    load()
    const timer = window.setInterval(load, COMMAND_MODE_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [key, refreshKey])

  return modes
}
