import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import iotAPI from '../../../../feature/iot/iotAPI'
import type { IotNodeStatus } from '../../../../types/iot/nodes'
import type { CabinetListItem } from '../../../../types/assets/cabinets'
import type { FeederListItem } from '../../../../types/assets/feeders'
import type { PoleListItem } from '../../../../types/assets/poles'
import { apiErrorMessage } from '../../../../utils/iot/apiError'
import { IotNodeTable } from './components/IotNodeTable'
import { NodeSourceModal } from './components/NodeSourceModal'
import { TablePagination } from '../common/TablePagination'

/** `page_size` tối đa của API. Số node IoT (một node / tủ) nhỏ, nên tải một lần rồi lọc, phân trang ở client. */
const FETCH_SIZE = 200

export interface IotNodesTabProps {
  cabinets: CabinetListItem[]
  feeders: FeederListItem[]
  /** Trụ để chọn trụ đại diện khi gán nguồn đo IoT bridge. */
  poles?: PoleListItem[]
}

/** Tab Thiết bị IoT của Quản lý: danh sách lấy từ `GET /iot/nodes` (nhóm IotDiagnostics). */
export const IotNodesTab: React.FC<IotNodesTabProps> = ({ cabinets, feeders, poles = [] }) => {
  const [nodes, setNodes] = useState<IotNodeStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceNode, setSourceNode] = useState<IotNodeStatus | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await iotAPI.getNodes({ page: 1, page_size: FETCH_SIZE })
      setNodes(result.items || [])
    } catch (err) {
      setError(apiErrorMessage(err, 'Không đọc được danh sách thiết bị IoT.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const cabinetMap = useMemo(() => {
    const map = new Map<string, string>()
    cabinets.forEach((c) => {
      if (c.cabinet_id) map.set(c.cabinet_id, c.cabinet_name || c.external_ref || '')
    })
    return map
  }, [cabinets])

  const filteredNodes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return nodes
    return nodes.filter((node) => {
      const cabName = node.cabinet_id ? cabinetMap.get(node.cabinet_id)?.toLowerCase() || '' : ''
      return [node.node_id, node.cabinet_id, node.commune_id, node.server_id]
        .some((value) => value?.toLowerCase().includes(q)) || cabName.includes(q)
    })
  }, [nodes, searchQuery, cabinetMap])

  const totalPages = Math.max(1, Math.ceil(filteredNodes.length / pageSize))
  const paginatedNodes = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredNodes.slice(start, start + pageSize)
  }, [filteredNodes, currentPage, pageSize])

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="ops-rise bg-white dark:bg-slate-900 p-3 rounded-[20px] shadow-ops flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-60 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Tìm theo mã thiết bị, mã tủ, tên tủ, địa bàn, server..."
            className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-xs focus:outline-none focus:border-primary dark:focus:border-blue-500 font-medium transition"
          />
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-2.5 top-2.5" />
        </div>
        <button
          type="button"
          onClick={load}
          title="Tải lại"
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <IotNodeTable
        iotNodes={paginatedNodes}
        cabinets={cabinets}
        feeders={feeders}
        isLoading={isLoading}
        onSetSource={setSourceNode}
      />

      {filteredNodes.length > 0 && (
        <TablePagination
          currentListLength={filteredNodes.length}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          unitLabel="thiết bị IoT"
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}

      {sourceNode && (
        <NodeSourceModal
          key={sourceNode.node_id}
          node={sourceNode}
          feeders={feeders}
          poles={poles}
          onClose={() => setSourceNode(null)}
          onSaved={() => {
            setSourceNode(null)
            load()
          }}
        />
      )}
    </div>
  )
}
export default IotNodesTab
