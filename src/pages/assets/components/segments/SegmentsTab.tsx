import React, { useState, useMemo } from 'react'
import { Button } from '../../../../components/Button'
import { Search, Plus, Upload, Route } from 'lucide-react'
import { OpsSelect } from '../../../../components/ops/OpsSelect'
import type { SegmentListItem } from '../../../../types/assets/segments'
import { SegmentTable } from './components/SegmentTable'
import { AddSegmentModal } from './components/AddSegmentModal'
import { EditSegmentModal } from './components/EditSegmentModal'
import { SegmentDetailModal } from './components/SegmentDetailModal'
import { ConfirmDeleteAssetModal } from '../common/ConfirmDeleteAssetModal'
import { TablePagination } from '../common/TablePagination'

export interface SegmentsTabProps {
  segments: SegmentListItem[]
  isLoading?: boolean
  onAddSegment: (data: SegmentListItem, poleIds: string[]) => void
  onUpdateSegment: (updated: SegmentListItem, poleIds: string[]) => void
  onDeleteSegment?: (segmentId: string) => void
  onOpenImport: () => void
}

export const SegmentsTab: React.FC<SegmentsTabProps> = ({
  segments,
  isLoading = false,
  onAddSegment,
  onUpdateSegment,
  onDeleteSegment,
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
  const [deleteSegmentItem, setDeleteSegmentItem] = useState<SegmentListItem | null>(null)

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

  const handleSaveSegment = (updated: SegmentListItem, poleIds: string[]) => {
    onUpdateSegment(updated, poleIds)
    if (detailSegment && detailSegment.segment_id === updated.segment_id) {
      setDetailSegment(updated)
    }
  }

  // Thống kê nhanh theo cấp đường
  const roadClassCounts = useMemo(() => {
    let interCommune = 0
    let interVillage = 0
    segments.forEach((seg) => {
      if (seg.road_class === 'inter_commune') interCommune++
      else if (seg.road_class === 'inter_village') interVillage++
    })
    return {
      all: segments.length,
      interCommune,
      interVillage,
    }
  }, [segments])

  return (
    <>
      {/* Search & Dynamic Filter Bar */}
      <div className="ops-rise relative z-20 bg-white dark:bg-slate-900 p-3 rounded-[20px] shadow-ops flex flex-wrap items-center justify-between gap-3">
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
          <OpsSelect
            value={roadClassFilter}
            onChange={(val) => {
              setRoadClassFilter(val)
              setCurrentPage(1)
            }}
            icon={<Route className="w-3.5 h-3.5" />}
            headerLabel="Phân loại cấp đường"
            headerBadge={`${roadClassCounts.all} tuyến`}
            triggerClassName="min-w-[195px]"
            popoverClassName="w-68"
            options={[
              {
                value: 'all',
                label: 'Tất cả cấp đường',
                subLabel: 'Hiển thị toàn bộ các tuyến quản lý',
                badge: `${roadClassCounts.all} tuyến`,
              },
              {
                value: 'inter_commune',
                label: 'Đường liên xã',
                subLabel: 'Trục giao thông chính kết nối liên xã',
                dotColor: 'bg-blue-500',
                badge: `${roadClassCounts.interCommune} tuyến`,
              },
              {
                value: 'inter_village',
                label: 'Đường liên thôn',
                subLabel: 'Tuyến nhánh nội bộ thôn, ấp, khu dân cư',
                dotColor: 'bg-teal-500',
                badge: `${roadClassCounts.interVillage} tuyến`,
              },
            ]}
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={onOpenImport}
            leftIcon={<Upload className="w-4 h-4 text-blue-600 dark:text-sky-400" />}
            title="Nhập dữ liệu tài sản từ file CSV"
          >
            Import dữ liệu
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsAddSegmentModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Thêm tuyến đường
          </Button>
        </div>
      </div>

      {/* Segments Table */}
      <SegmentTable
        segments={paginatedSegments}
        isLoading={isLoading}
        onViewDetail={(seg) => setDetailSegment(seg)}
        onEdit={(seg) => setEditSegment(seg)}
        onDelete={(seg) => setDeleteSegmentItem(seg)}
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
      {isAddSegmentModalOpen && (
        <AddSegmentModal
          isOpen={isAddSegmentModalOpen}
          onClose={() => setIsAddSegmentModalOpen(false)}
          onAddSegment={(data, poleIds) => {
            onAddSegment(data, poleIds)
            setCurrentPage(1)
          }}
          existingCount={segments.length}
        />
      )}

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

      <ConfirmDeleteAssetModal
        isOpen={!!deleteSegmentItem}
        assetTypeLabel="Tuyến Đường"
        assetId={deleteSegmentItem?.segment_id || null}
        assetName={deleteSegmentItem?.segment_name || deleteSegmentItem?.segment_id || null}
        warningMessage={
          deleteSegmentItem
            ? `Bạn có chắc chắn muốn xóa tuyến đường "${deleteSegmentItem.segment_name || deleteSegmentItem.segment_id}" không? Nếu trên tuyến vẫn còn cột đèn, sự cố hoặc vùng sự cố, hệ thống sẽ từ chối xóa.`
            : undefined
        }
        onClose={() => setDeleteSegmentItem(null)}
        onConfirm={() => {
          if (deleteSegmentItem?.segment_id && onDeleteSegment) {
            onDeleteSegment(deleteSegmentItem.segment_id)
            setDeleteSegmentItem(null)
          }
        }}
      />
    </>
  )
}
