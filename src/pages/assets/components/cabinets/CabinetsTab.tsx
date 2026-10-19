import React, { useState, useMemo, useEffect } from 'react'
import { Search, Plus, Upload, Filter } from 'lucide-react'
import type { CabinetListItem } from '../../../../types/assets/cabinets'
import type { SegmentListItem } from '../../../../types/assets/segments'
import { CabinetTable } from './components/CabinetTable'
import { AddCabinetModal } from './components/AddCabinetModal'
import { EditCabinetModal } from './components/EditCabinetModal'
import { CabinetDetailModal } from './components/CabinetDetailModal'
import { TablePagination } from '../common/TablePagination'

export interface CabinetsTabProps {
  cabinets: CabinetListItem[]
  segments: SegmentListItem[]
  isLoading?: boolean
  activeCabinetCode?: string
  onClearActiveCabinet?: () => void
  onAddCabinet: (data: CabinetListItem) => void
  onAddCabinets: (dataList: CabinetListItem[]) => void
  onUpdateCabinet: (updated: CabinetListItem) => void
  onOpenImport: () => void
}

export const CabinetsTab: React.FC<CabinetsTabProps> = ({
  cabinets,
  segments,
  isLoading = false,
  activeCabinetCode,
  onClearActiveCabinet,
  onAddCabinet,
  onAddCabinets,
  onUpdateCabinet,
  onOpenImport,
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Flash highlight state
  const [flashingCabinetCode, setFlashingCabinetCode] = useState<string>('')

  // Modals state
  const [isAddCabinetModalOpen, setIsAddCabinetModalOpen] = useState(false)
  const [detailCabinet, setDetailCabinet] = useState<CabinetListItem | null>(null)
  const [editCabinet, setEditCabinet] = useState<CabinetListItem | null>(null)

  // Filtered Cabinets
  const filteredCabinets = useMemo(() => {
    const list = cabinets.filter((cab) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesQuery =
        !q ||
        (cab.cabinet_id && cab.cabinet_id.toLowerCase().includes(q)) ||
        (cab.cabinet_name && cab.cabinet_name.toLowerCase().includes(q)) ||
        (cab.external_ref && cab.external_ref.toLowerCase().includes(q)) ||
        (cab.commune_id && cab.commune_id.toLowerCase().includes(q))

      const hasGeo = Boolean(cab.location?.lat && cab.location?.lng)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'with_geo' ? hasGeo : !hasGeo)

      return matchesQuery && matchesStatus
    })

    return [...list].sort((a, b) =>
      (a.external_ref || '').localeCompare(b.external_ref || '', undefined, { numeric: true })
    )
  }, [cabinets, searchQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredCabinets.length / pageSize))

  const paginatedCabinets = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCabinets.slice(start, start + pageSize)
  }, [filteredCabinets, currentPage, pageSize])

  // Trigger flash highlight and jump to appropriate page when activeCabinetCode is provided
  useEffect(() => {
    if (activeCabinetCode) {
      setFlashingCabinetCode(activeCabinetCode)

      const targetIndex = filteredCabinets.findIndex(
        (c) => c.external_ref && c.external_ref.toLowerCase() === activeCabinetCode.toLowerCase()
      )

      if (targetIndex !== -1) {
        const targetPage = Math.floor(targetIndex / pageSize) + 1
        setCurrentPage(targetPage)
      }

      const timer = setTimeout(() => {
        setFlashingCabinetCode('')
        onClearActiveCabinet?.()
      }, 2500)

      return () => clearTimeout(timer)
    }
  }, [activeCabinetCode, filteredCabinets, pageSize, onClearActiveCabinet])

  const handleSaveCabinet = (updated: CabinetListItem) => {
    onUpdateCabinet(updated)
    if (detailCabinet && detailCabinet.cabinet_id === updated.cabinet_id) {
      setDetailCabinet(updated)
    }
  }

  return (
    <>
      {/* Search & Dynamic Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Left: Filters */}
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="flex-1 min-w-60 relative">
            <input
              type="text"
              placeholder="Tìm theo mã tủ (CAB-TL8), tên tủ, mốc thực địa..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
            >
              <option value="all">Tất cả trạng thái định vị</option>
              <option value="with_geo">Đã định vị GIS</option>
              <option value="no_geo">Chưa định vị</option>
            </select>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
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
            onClick={() => setIsAddCabinetModalOpen(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm border border-amber-400/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Tủ Điện</span>
          </button>
        </div>
      </div>

      {/* Cabinets Table */}
      <CabinetTable
        cabinets={paginatedCabinets}
        isLoading={isLoading}
        flashingCabinetCode={flashingCabinetCode}
        onViewDetail={(cab) => setDetailCabinet(cab)}
        onEdit={(cab) => setEditCabinet(cab)}
      />

      {/* Pagination Footer */}
      <TablePagination
        currentListLength={filteredCabinets.length}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        unitLabel="tủ điện"
        isLoading={isLoading}
        onPageChange={setCurrentPage}
      />

      {/* Modals for Cabinets */}
      <AddCabinetModal
        isOpen={isAddCabinetModalOpen}
        onClose={() => setIsAddCabinetModalOpen(false)}
        onAddCabinet={(data) => {
          onAddCabinet(data)
          setCurrentPage(1)
        }}
        onAddCabinets={(dataList) => {
          onAddCabinets(dataList)
          setCurrentPage(1)
        }}
        existingCount={cabinets.length}
        availableSegments={segments}
        availableCabinets={cabinets}
      />

      <CabinetDetailModal
        cabinet={detailCabinet}
        onClose={() => setDetailCabinet(null)}
      />

      <EditCabinetModal
        isOpen={!!editCabinet}
        cabinet={editCabinet}
        availableSegments={segments}
        onClose={() => setEditCabinet(null)}
        onSave={handleSaveCabinet}
      />
    </>
  )
}
