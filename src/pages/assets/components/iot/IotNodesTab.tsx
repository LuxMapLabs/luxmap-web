import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '../../../../redux/store'
import { Search, RefreshCw } from 'lucide-react'
import {
  fetchNodesTabRequest,
  selectNodesTab,
} from '../../../../feature/iot/iotMonitorSlice'
import type { CabinetListItem } from '../../../../types/assets/cabinets'
import type { FeederListItem } from '../../../../types/assets/feeders'
import { IotNodeTable } from './components/IotNodeTable'
import { IotNodeDetailModal } from './components/IotNodeDetailModal'
import { TablePagination } from '../common/TablePagination'
import { feederOnRelayOne } from '../../../../utils/iot/iotRegistration'

export interface IotNodesTabProps {
  cabinets: CabinetListItem[]
  feeders: FeederListItem[]
}

/**
 * Tab Thiết bị IoT của Quản lý: danh sách `GET /iot/nodes`, CHỈ XEM. Đăng ký và chỉnh node / server là việc của
 * Quản trị hệ thống ở trang IoT Bridge; Quản lý xem chi tiết + lịch sử thông số / sự cố / lệnh ở đây,
 * còn GIS chỉ có số mới nhất và điều khiển.
 */
export const IotNodesTab: React.FC<IotNodesTabProps> = ({ cabinets, feeders }) => {
  const dispatch = useDispatch<AppDispatch>()
  const { nodes, diagnosticsByNode, isLoading, error } = useSelector(selectNodesTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const load = useCallback(() => {
    dispatch(fetchNodesTabRequest())
  }, [dispatch])

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
        diagnosticsByNode={diagnosticsByNode}
        isLoading={isLoading}
        onShowDetail={(node) => node.node_id && setDetailNodeId(node.node_id)}
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

      {detailNodeId && (() => {
        const detailNode = nodes.find((n) => n.node_id === detailNodeId) ?? null
        const detailFeeder = feederOnRelayOne(feeders, detailNodeId)
        const detailCabinet = detailNode?.cabinet_id
          ? cabinets.find((c) => c.cabinet_id === detailNode.cabinet_id) ?? null
          : null
        return (
          <IotNodeDetailModal
            key={detailNodeId}
            nodeId={detailNodeId}
            node={detailNode}
            cabinet={
              detailCabinet || detailNode?.cabinet_id
                ? {
                    name: detailCabinet?.cabinet_name || detailCabinet?.external_ref || null,
                    code: detailCabinet?.external_ref || detailNode?.cabinet_id || null,
                  }
                : null
            }
            feederId={detailFeeder?.feeder_id ?? null}
            feederLabel={detailFeeder?.external_ref || detailFeeder?.feeder_id || null}
            onClose={() => setDetailNodeId(null)}
          />
        )
      })()}
    </div>
  )
}
export default IotNodesTab
