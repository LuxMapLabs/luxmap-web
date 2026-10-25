import React, { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, Search, Filter, X } from 'lucide-react'
import type { RootState } from '../../../redux/rootReducer'
import type { CommuneItem, CreateCommuneRequest, UpdateCommuneRequest } from '../../../types/admin/communes'
import {
  fetchCommunesRequest,
  createCommuneRequest,
  updateCommuneRequest,
  setCommuneFilters,
  setCommunePage,
} from '../../../feature/communes/communeSlice'
import { CommuneTable } from './CommuneTable'
import { CommuneFormModal } from './CommuneFormModal'
import { CommuneDetailModal } from './CommuneDetailModal'
import { TablePagination } from '../../assets/components/common/TablePagination'

export const CommunesTab: React.FC = () => {
  const dispatch = useDispatch()
  const {
    communes,
    total,
    page,
    pageSize,
    isLoading,
    isSubmitting,
    filters,
  } = useSelector((state: RootState) => state.adminCommunes)

  // Local state modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingCommune, setEditingCommune] = useState<CommuneItem | null>(null)
  const [viewingCommune, setViewingCommune] = useState<CommuneItem | null>(null)

  // Tải danh sách địa bàn khi mount
  useEffect(() => {
    dispatch(fetchCommunesRequest({ page, page_size: pageSize }))
  }, [dispatch, page, pageSize])

  // Lọc theo search và trạng thái BBox trên Client
  const filteredCommunes = useMemo(() => {
    let list = communes

    // Lọc trạng thái BBox
    if (filters.hasBbox === 'has_bbox') {
      list = list.filter((c) => Boolean(c.bbox))
    } else if (filters.hasBbox === 'no_bbox') {
      list = list.filter((c) => !c.bbox)
    }

    // Lọc từ khoá tìm kiếm
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim()
      list = list.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.commune_id || '').toLowerCase().includes(q)
      )
    }

    return list
  }, [communes, filters.search, filters.hasBbox])

  const handleCreateSubmit = (payload: { name: string; bbox?: any }) => {
    dispatch(createCommuneRequest(payload as CreateCommuneRequest))
    setIsFormModalOpen(false)
  }

  const handleEditSubmit = (payload: { name: string; bbox?: any }) => {
    if (!editingCommune?.commune_id) return
    dispatch(
      updateCommuneRequest({
        id: editingCommune.commune_id,
        data: payload as UpdateCommuneRequest,
      })
    )
    setIsFormModalOpen(false)
    setEditingCommune(null)
  }

  const totalPages = Math.ceil(total / pageSize) || 1

  return (
    <div className="space-y-3.5">
      {/* Toolbar Filter & Action */}
      <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-full md:max-w-xl">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => dispatch(setCommuneFilters({ search: e.target.value }))}
            placeholder="Tìm theo tên địa bàn, mã xã/thị trấn (VD: Tân An Hội, COM-001)..."
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => dispatch(setCommuneFilters({ search: '' }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer transition"
              title="Xóa tìm kiếm"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filters & Add Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter BBox */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/70 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filters.hasBbox}
              onChange={(e) =>
                dispatch(setCommuneFilters({ hasBbox: e.target.value as any }))
              }
              className="bg-transparent text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">Tất cả trạng thái BBox</option>
              <option value="has_bbox">Đã có khung BBox</option>
              <option value="no_bbox">Chưa có khung BBox</option>
            </select>
          </div>

          {/* Add Commune Button */}
          <button
            type="button"
            onClick={() => {
              setEditingCommune(null)
              setIsFormModalOpen(true)
            }}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0 ml-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm địa bàn</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <CommuneTable
        communes={filteredCommunes}
        isLoading={isLoading}
        onViewDetail={(commune) => setViewingCommune(commune)}
        onEdit={(commune) => {
          setEditingCommune(commune)
          setIsFormModalOpen(true)
        }}
      />

      {/* Pagination */}
      <TablePagination
        currentListLength={filteredCommunes.length}
        currentPage={page}
        pageSize={pageSize}
        totalPages={totalPages}
        unitLabel="địa bàn"
        isLoading={isLoading}
        onPageChange={(newPage) => dispatch(setCommunePage(newPage))}
      />

      {/* Modals */}
      <CommuneFormModal
        isOpen={isFormModalOpen}
        isSubmitting={isSubmitting}
        commune={editingCommune}
        onClose={() => {
          setIsFormModalOpen(false)
          setEditingCommune(null)
        }}
        onSubmit={editingCommune ? handleEditSubmit : handleCreateSubmit}
      />

      <CommuneDetailModal
        isOpen={Boolean(viewingCommune)}
        commune={viewingCommune}
        onClose={() => setViewingCommune(null)}
        onEdit={(commune) => {
          setViewingCommune(null)
          setEditingCommune(commune)
          setIsFormModalOpen(true)
        }}
      />
    </div>
  )
}
export default CommunesTab
