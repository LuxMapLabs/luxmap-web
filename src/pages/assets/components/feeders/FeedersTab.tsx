import React, { useState, useMemo } from 'react'
import { Search, Plus, Upload } from 'lucide-react'
import type { FeederListItem, CreateFeederRequest, UpdateFeederRequest } from '../../../../types/assets/feeders'
import type { CabinetListItem } from '../../../../types/assets/cabinets'
import type { PoleListItem } from '../../../../types/assets/poles'
import { FeederTable } from './components/FeederTable'
import { AddFeederModal } from './components/AddFeederModal'
import { EditFeederModal } from './components/EditFeederModal'
import { FeederDetailModal } from './components/FeederDetailModal'
import { ConfirmDeleteAssetModal } from '../common/ConfirmDeleteAssetModal'
import { TablePagination } from '../common/TablePagination'

export interface FeedersTabProps {
  feeders: FeederListItem[]
  cabinets: CabinetListItem[]
  poles: PoleListItem[]
  isLoading?: boolean
  onAddFeeder: (data: CreateFeederRequest) => void
  onUpdateFeeder: (feederId: string, data: UpdateFeederRequest) => void
  onDeleteFeeder: (feederId: string) => void
  onOpenImport: () => void
}

export const FeedersTab: React.FC<FeedersTabProps> = ({
  feeders,
  cabinets,
  poles,
  isLoading = false,
  onAddFeeder,
  onUpdateFeeder,
  onDeleteFeeder,
  onOpenImport,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [detailFeeder, setDetailFeeder] = useState<FeederListItem | null>(null)
  const [editFeeder, setEditFeeder] = useState<FeederListItem | null>(null)
  const [deleteFeederItem, setDeleteFeederItem] = useState<FeederListItem | null>(null)

  // Filtered Feeders
  const filteredFeeders = useMemo(() => {
    return feeders.filter((f) => {
      const q = searchQuery.toLowerCase().trim()
      return (
        !q ||
        (f.feeder_id && f.feeder_id.toLowerCase().includes(q)) ||
        (f.feeder_name && f.feeder_name.toLowerCase().includes(q)) ||
        (f.external_ref && f.external_ref.toLowerCase().includes(q)) ||
        (f.cabinet?.cabinet_name && f.cabinet.cabinet_name.toLowerCase().includes(q)) ||
        (f.cabinet?.cabinet_id && f.cabinet.cabinet_id.toLowerCase().includes(q)) ||
        (f.commune_id && f.commune_id.toLowerCase().includes(q))
      )
    })
  }, [feeders, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredFeeders.length / pageSize))

  const paginatedFeeders = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredFeeders.slice(start, start + pageSize)
  }, [filteredFeeders, currentPage, pageSize])

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
              placeholder="Tìm theo mã lộ, tên mạch, tên tủ, địa bàn..."
              className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-xs focus:outline-none focus:border-[#1f3864] dark:focus:border-blue-500 font-medium transition"
            />
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Action Buttons: Import CSV & Add Feeder */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenImport}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-100 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Nhập dữ liệu tài sản từ file CSV"
          >
            <Upload className="w-4 h-4 text-blue-600 dark:text-sky-400" />
            <span>Import Dữ Liệu</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-1.5 bg-[#1f3864] dark:bg-blue-600 hover:bg-[#1f3864]/90 dark:hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Mạch Điện Mới</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <FeederTable
        feeders={paginatedFeeders}
        isLoading={isLoading}
        onViewDetail={(feeder) => setDetailFeeder(feeder)}
        onEdit={(feeder) => setEditFeeder(feeder)}
        onDelete={(feeder) => setDeleteFeederItem(feeder)}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <TablePagination
          currentListLength={filteredFeeders.length}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          unitLabel="mạch điện"
          isLoading={isLoading}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Modals */}
      <AddFeederModal
        isOpen={isAddModalOpen}
        cabinets={cabinets}
        onClose={() => setIsAddModalOpen(false)}
        onSave={onAddFeeder}
      />

      <EditFeederModal
        isOpen={Boolean(editFeeder)}
        feeder={editFeeder}
        cabinets={cabinets}
        onClose={() => setEditFeeder(null)}
        onSave={onUpdateFeeder}
      />

      <FeederDetailModal
        isOpen={Boolean(detailFeeder)}
        feeder={detailFeeder}
        poles={poles}
        onClose={() => setDetailFeeder(null)}
      />

      <ConfirmDeleteAssetModal
        isOpen={!!deleteFeederItem}
        assetTypeLabel="Mạch Điện"
        assetId={deleteFeederItem?.feeder_id || null}
        assetName={deleteFeederItem?.feeder_name || deleteFeederItem?.feeder_id || null}
        warningMessage={
          deleteFeederItem
            ? `Bạn có chắc chắn muốn xóa mạch điện "${deleteFeederItem.feeder_name || deleteFeederItem.feeder_id}" không? Nếu mạch vẫn đang cấp nguồn cho các cột đèn, hệ thống sẽ từ chối xóa.`
            : undefined
        }
        onClose={() => setDeleteFeederItem(null)}
        onConfirm={() => {
          if (deleteFeederItem?.feeder_id) {
            onDeleteFeeder(deleteFeederItem.feeder_id)
            setDeleteFeederItem(null)
          }
        }}
      />
    </div>
  )
}
