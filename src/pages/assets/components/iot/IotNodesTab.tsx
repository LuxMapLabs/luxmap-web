import React, { useState, useMemo } from 'react'
import { Search, Plus } from 'lucide-react'
import type {
  IotNodeItem,
  CreateIotNodeRequest,
  UpdateIotNodeRequest,
  IotNodeCredential,
} from '../../../../types/assets/iot-nodes'
import type { CabinetListItem } from '../../../../types/assets/cabinets'
import type { FeederListItem } from '../../../../types/assets/feeders'
import { IotNodeTable } from './components/IotNodeTable'
import { AddIotNodeModal } from './components/AddIotNodeModal'
import { EditIotNodeModal } from './components/EditIotNodeModal'
import { IotNodeDetailModal } from './components/IotNodeDetailModal'
import { SetRelayModal } from './components/SetRelayModal'
import { IssueCredentialModal } from './components/IssueCredentialModal'
import { ConfirmDeleteIotNodeModal } from './components/ConfirmDeleteIotNodeModal'
import { TablePagination } from '../common/TablePagination'

export interface IotNodesTabProps {
  iotNodes: IotNodeItem[]
  cabinets: CabinetListItem[]
  feeders: FeederListItem[]
  isLoading?: boolean
  onAddIotNode: (data: CreateIotNodeRequest) => void
  onUpdateIotNode: (nodeId: string, data: UpdateIotNodeRequest) => void
  onDeleteIotNode: (nodeId: string) => void
  onSetRelay: (nodeId: string, relayNo: number, feederId: string | null) => void
  onIssueCredential: (nodeId: string, onSuccess: (cred: IotNodeCredential) => void) => void
}

export const IotNodesTab: React.FC<IotNodesTabProps> = ({
  iotNodes,
  cabinets,
  feeders,
  isLoading = false,
  onAddIotNode,
  onUpdateIotNode,
  onDeleteIotNode,
  onSetRelay,
  onIssueCredential,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [detailNode, setDetailNode] = useState<IotNodeItem | null>(null)
  const [editNode, setEditNode] = useState<IotNodeItem | null>(null)
  const [selectedRelayNodeId, setSelectedRelayNodeId] = useState<string | null>(null)
  const [credentialNode, setCredentialNode] = useState<IotNodeItem | null>(null)
  const [deleteNodeId, setDeleteNodeId] = useState<string | null>(null)

  // Luôn tìm node rơ-le mới nhất từ Redux store iotNodes
  const activeRelayNode = useMemo(() => {
    if (!selectedRelayNodeId) return null
    return iotNodes.find((n) => n.node_id === selectedRelayNodeId) || null
  }, [iotNodes, selectedRelayNodeId])

  // Map cabinet lookup for search
  const cabinetMap = useMemo(() => {
    const map = new Map<string, string>()
    cabinets.forEach((c) => {
      if (c.cabinet_id) {
        map.set(c.cabinet_id, c.cabinet_name || c.external_ref || '')
      }
    })
    return map
  }, [cabinets])

  // Filtered IoT Nodes
  const filteredNodes = useMemo(() => {
    return iotNodes.filter((node) => {
      const q = searchQuery.toLowerCase().trim()
      if (!q) return true

      const cabName = node.cabinet_id ? cabinetMap.get(node.cabinet_id)?.toLowerCase() || '' : ''
      return (
        (node.node_id && node.node_id.toLowerCase().includes(q)) ||
        (node.cabinet_id && node.cabinet_id.toLowerCase().includes(q)) ||
        cabName.includes(q) ||
        (node.commune_id && node.commune_id.toLowerCase().includes(q)) ||
        (node.data_source && node.data_source.toLowerCase().includes(q))
      )
    })
  }, [iotNodes, searchQuery, cabinetMap])

  const totalPages = Math.max(1, Math.ceil(filteredNodes.length / pageSize))

  const paginatedNodes = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredNodes.slice(start, start + pageSize)
  }, [filteredNodes, currentPage, pageSize])

  const deleteTargetNode = useMemo(() => {
    if (!deleteNodeId) return null
    return iotNodes.find((n) => n.node_id === deleteNodeId) || null
  }, [deleteNodeId, iotNodes])

  const deleteNodeHasWiredRelays = useMemo(() => {
    return Boolean(deleteTargetNode?.relays?.some((r) => !!r.feeder_id))
  }, [deleteTargetNode])

  const handleDeleteWithCheck = (nodeId: string) => {
    setDeleteNodeId(nodeId)
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Search Box - Chiều dài co giãn giống tab Bóng đèn */}
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="flex-1 min-w-60 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Tìm theo mã thiết bị, mã tủ, tên tủ, địa bàn..."
              className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-xs focus:outline-none focus:border-primary dark:focus:border-blue-500 font-medium transition"
            />
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Action Button: Add IoT Node */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-primary dark:bg-blue-600 hover:bg-primary/90 dark:hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Đăng Ký Thiết Bị IoT</span>
          </button>
        </div>
      </div>

      {/* IoT Node Table */}
      <IotNodeTable
        iotNodes={paginatedNodes}
        cabinets={cabinets}
        isLoading={isLoading}
        onViewDetail={(node) => setDetailNode(node)}
        onEdit={(node) => setEditNode(node)}
        onDelete={handleDeleteWithCheck}
        onSetRelay={(node) => setSelectedRelayNodeId(node.node_id)}
        onIssueCredential={(node) => setCredentialNode(node)}
      />

      {/* Pagination */}
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

      {/* Modals */}
      <AddIotNodeModal
        isOpen={isAddModalOpen}
        cabinets={cabinets}
        existingIotNodes={iotNodes}
        onClose={() => setIsAddModalOpen(false)}
        onSave={onAddIotNode}
      />

      <EditIotNodeModal
        isOpen={!!editNode}
        node={editNode}
        cabinets={cabinets}
        onClose={() => setEditNode(null)}
        onSave={onUpdateIotNode}
      />

      <IotNodeDetailModal
        isOpen={!!detailNode}
        node={detailNode}
        cabinets={cabinets}
        onClose={() => setDetailNode(null)}
        onEdit={(node) => setEditNode(node)}
        onSetRelay={(node) => setSelectedRelayNodeId(node.node_id)}
        onIssueCredential={(node) => setCredentialNode(node)}
      />

      <SetRelayModal
        isOpen={!!selectedRelayNodeId}
        node={activeRelayNode}
        feeders={feeders}
        onClose={() => setSelectedRelayNodeId(null)}
        onSave={onSetRelay}
      />

      <IssueCredentialModal
        isOpen={!!credentialNode}
        node={credentialNode}
        onClose={() => setCredentialNode(null)}
        onIssue={onIssueCredential}
      />

      <ConfirmDeleteIotNodeModal
        isOpen={!!deleteNodeId}
        nodeId={deleteNodeId}
        hasWiredRelays={deleteNodeHasWiredRelays}
        onClose={() => setDeleteNodeId(null)}
        onConfirm={(nodeId) => {
          onDeleteIotNode(nodeId)
          setDeleteNodeId(null)
        }}
      />
    </div>
  )
}
export default IotNodesTab
