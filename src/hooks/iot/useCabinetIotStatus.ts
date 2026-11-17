import { useEffect, useRef, useState } from 'react'
import iotAPI from '../../feature/iot/iotAPI'
import type { IotNodeStatus } from '../../types/iot/nodes'
import type { IotServerStatus } from '../../types/iot/servers'
import { apiErrorMessage } from '../../utils/iot/apiError'

/** Chu kỳ đọc lại trạng thái node và gateway của tủ (30 giây). */
export const CABINET_IOT_REFRESH_MS = 30_000

export interface UseCabinetIotStatusResult {
  nodes: IotNodeStatus[]
  servers: IotServerStatus[]
  loading: boolean
  error: string | null
}

/**
 * Trạng thái IoT của một tủ điện: danh sách node gắn tủ và gateway phụ trách các node đó.
 * Định kỳ 30s đọc lại; huỷ khi unmount hoặc đổi tủ; lỗi thì giữ dữ liệu cũ.
 */
export function useCabinetIotStatus(cabinetId: string | null): UseCabinetIotStatusResult {
  const [nodes, setNodes] = useState<IotNodeStatus[]>([])
  const [servers, setServers] = useState<IotServerStatus[]>([])
  const [loading, setLoading] = useState<boolean>(Boolean(cabinetId))
  const [error, setError] = useState<string | null>(null)

  const nodesRef = useRef<IotNodeStatus[]>([])
  const hasLoadedRef = useRef<boolean>(false)

  useEffect(() => {
    if (!cabinetId) {
      nodesRef.current = []
      hasLoadedRef.current = false
      setNodes([])
      setServers([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    nodesRef.current = []
    hasLoadedRef.current = false
    setNodes([])
    setServers([])
    setLoading(true)
    setError(null)

    const fetchAllNodes = async (): Promise<IotNodeStatus[]> => {
      const all: IotNodeStatus[] = []
      let page = 1
      let done = false
      while (!done) {
        const res = await iotAPI.getNodes({ page, page_size: 200 })
        const items = res?.items ?? []
        if (items.length === 0) {
          done = true
          break
        }
        all.push(...items)
        const total = typeof res?.total === 'number' ? res.total : undefined
        if (total !== undefined ? all.length >= total : items.length < 200) {
          done = true
          break
        }
        page += 1
      }
      return all
    }

    const load = async () => {
      const [nodesRes, serversRes] = await Promise.allSettled([
        fetchAllNodes(),
        iotAPI.getServers(),
      ])

      if (cancelled) return

      let activeNodes = nodesRef.current

      if (nodesRes.status === 'fulfilled') {
        const filteredNodes = nodesRes.value.filter((n) => n.cabinet_id === cabinetId)
        activeNodes = filteredNodes
        nodesRef.current = filteredNodes
        hasLoadedRef.current = true
        setNodes(filteredNodes)
        setError(null)
      } else {
        // Lỗi: giữ dữ liệu cũ. error = thông báo khi getNodes thất bại và chưa có dữ liệu
        if (!hasLoadedRef.current) {
          setError(apiErrorMessage(nodesRes.reason, 'Không thể tải trạng thái IoT của tủ.'))
        }
      }

      if (serversRes.status === 'fulfilled') {
        const serverIds = new Set(
          activeNodes.map((n) => n.server_id).filter((id): id is string => Boolean(id))
        )
        const filteredServers = serversRes.value.filter(
          (s) => s.server_id && serverIds.has(s.server_id)
        )
        setServers(filteredServers)
      } else {
        // getServers lỗi thì servers giữ cũ, không set error
      }

      setLoading(false)
    }

    load()
    const timer = window.setInterval(load, CABINET_IOT_REFRESH_MS)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [cabinetId])

  return { nodes, servers, loading, error }
}

export default useCabinetIotStatus
