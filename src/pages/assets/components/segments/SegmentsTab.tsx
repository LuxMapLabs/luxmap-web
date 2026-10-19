import React, { useState, useMemo } from 'react'
import { Search, Plus, Upload, Filter } from 'lucide-react'
import type { SegmentListItem } from '../../../../types/assets/segments'
import { SegmentTable } from './components/SegmentTable'
import { AddSegmentModal } from './components/AddSegmentModal'
import { EditSegmentModal } from './components/EditSegmentModal'
import { SegmentDetailModal } from './components/SegmentDetailModal'
import { TablePagination } from '../common/TablePagination'

export interface SegmentsTabProps {
  segments: SegmentListItem[]
  isLoading?: boolean
  onAddSegment: (data: SegmentListItem) => void
  onUpdateSegment: (updated: SegmentListItem) => void
  onOpenImport: () => void
}

export const SegmentsTab: React.FC<SegmentsTabProps> = ({
  segments,
  isLoading = false,
  onAddSegment,
  onUpdateSegment,
  onOpenImport,
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [roadClassFilter, setRoadClassFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Modals state
  const [isAddSegmentModalOpen, setIsAddSegmentModalOpen] = useState(false)
  const [detailSegment, setDetailSegment] = useState<SegmentListItem | null>(null)
  const [editSegment, setEditSegment] = useState<SegmentListItem | null>(null)

  // Filtered Segments
  const filteredSegments = useMemo(() => {
    const list = segments.filter((seg) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesQuery =
        !q ||
        (seg.external_ref && seg.external_ref.toLowerCase().includes(q)) ||
        (seg.segment_name && seg.segment_name.toLowerCase().includes(q)) ||
        (seg.commune_id && seg.commune_id.toLowerCase().includes(q))

      const matchesRoadClass =
        roadClassFilter === 'all' || seg.road_class === roadClassFilter

      return matchesQuery && matchesRoadClass
    })

    return [...list].sort((a, b) =>
      (a.external_ref || '').localeCompare(b.external_ref || '', undefined, { numeric: true })
    )
  }, [segments, searchQuery, roadClassFilter])

  const totalPages = Math.max(1, Math.ceil(filteredSegments.length / pageSize))

  const paginatedSegments = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSegments.slice(start, start + pageSize)
  }, [filteredSegments, currentPage, pageSize])

  const handleSaveSegment = (updated: SegmentListItem) => {
    onUpdateSegment(updated)
    if (detailSegment && detailSegment.segment_id === updated.segment_id) {
      setDetailSegment(updated)
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
              placeholder="Tìm theo mã tuyến (SEG-001), tên tuyến đường..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Filter Road Class */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
            <select
              value={roadClassFilter}
              onChange={(e) => {
                setRoadClassFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
            >
              <option value="all">Tất cả cấp đường</option>
              <option value="inter_commune">Đường liên xã</option>
              <option value="inter_village">Đường liên thôn</option>
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
            onClick={() => setIsAddSegmentModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm border border-indigo-400/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Tuyến Đường</span>
          </button>
        </div>
      </div>

      {/* Segments Table */}
      <SegmentTable
        segments={paginatedSegments}
        isLoading={isLoading}
        onViewDetail={(seg) => setDetailSegment(seg)}
        onEdit={(seg) => setEditSegment(seg)}
      />

      {/* Pagination Footer */}
      <TablePagination
        currentListLength={filteredSegments.length}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        unitLabel="tuyến đường"
        isLoading={isLoading}
        onPageChange={setCurrentPage}
      />

      {/* Modals for Segments */}
      <AddSegmentModal
        isOpen={isAddSegmentModalOpen}
        onClose={() => setIsAddSegmentModalOpen(false)}
        onAddSegment={(data) => {
          onAddSegment(data)
          setCurrentPage(1)
        }}
        existingCount={segments.length}
      />

      <SegmentDetailModal
        segment={detailSegment}
        onClose={() => setDetailSegment(null)}
      />

      <EditSegmentModal
        isOpen={!!editSegment}
        segment={editSegment}
        onClose={() => setEditSegment(null)}
        onSave={handleSaveSegment}
      />
    </>
  )
}
