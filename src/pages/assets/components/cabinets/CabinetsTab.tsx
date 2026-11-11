import React, { useState, useMemo, useEffect } from 'react'
import { Button } from '../../../../components/Button'
import { Search, Plus, Upload, MapPin } from 'lucide-react'
import { OpsSelect } from '../../../../components/ops/OpsSelect'
import type { CabinetListItem } from '../../../../types/assets/cabinets'
import type { SegmentListItem } from '../../../../types/assets/segments'
import { CabinetTable } from './components/CabinetTable'
import { AddCabinetModal } from './components/AddCabinetModal'
import { EditCabinetModal } from './components/EditCabinetModal'
import { CabinetDetailModal } from './components/CabinetDetailModal'
import { ConfirmDeleteAssetModal } from '../common/ConfirmDeleteAssetModal'
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
  onDeleteCabinet?: (cabinetId: string) => void
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
  onDeleteCabinet,
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
  const [deleteCabinetItem, setDeleteCabinetItem] = useState<CabinetListItem | null>(null)

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

  const geoCounts = useMemo(() => {
    let withGeo = 0
    let noGeo = 0
    cabinets.forEach((cab) => {
      if (cab.location?.lat && cab.location?.lng) withGeo++
      else noGeo++
    })
    return {
      all: cabinets.length,
      withGeo,
      noGeo,
    }
  }, [cabinets])

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
          <OpsSelect
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val)
              setCurrentPage(1)
            }}
            icon={<MapPin className="w-3.5 h-3.5" />}
            headerLabel="Trạng thái định vị GIS"
            headerBadge={`${geoCounts.all} tủ`}
            triggerClassName="min-w-[215px]"
            popoverClassName="w-68"
            options={[
              {
                value: 'all',
                label: 'Tất cả trạng thái định vị',
                subLabel: 'Hiển thị toàn bộ tủ điều khiển',
                badge: `${geoCounts.all} tủ`,
              },
              {
                value: 'with_geo',
                label: 'Đã định vị GIS',
                subLabel: 'Đã gắn tọa độ GPS trên bản đồ',
                dotColor: 'bg-emerald-500',
                badge: `${geoCounts.withGeo} tủ`,
              },
              {
                value: 'no_geo',
                label: 'Chưa định vị',
                subLabel: 'Thiếu tọa độ thực địa (cần cập nhật)',
                dotColor: 'bg-amber-500',
                badge: `${geoCounts.noGeo} tủ`,
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
            onClick={() => setIsAddCabinetModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Thêm tủ điện
          </Button>
        </div>
      </div>

      {/* Cabinets Table */}
      <CabinetTable
        cabinets={paginatedCabinets}
        isLoading={isLoading}
        flashingCabinetCode={flashingCabinetCode}
        onViewDetail={(cab) => setDetailCabinet(cab)}
        onEdit={(cab) => setEditCabinet(cab)}
        onDelete={(cab) => setDeleteCabinetItem(cab)}
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
        availableCabinets={cabinets}
        onClose={() => setEditCabinet(null)}
        onSave={handleSaveCabinet}
      />

      <ConfirmDeleteAssetModal
        isOpen={!!deleteCabinetItem}
        assetTypeLabel="Tủ Điện"
        assetId={deleteCabinetItem?.cabinet_id || null}
        assetName={deleteCabinetItem?.cabinet_name || deleteCabinetItem?.cabinet_id || null}
        warningMessage={
          deleteCabinetItem
            ? `Bạn có chắc chắn muốn xóa tủ điện "${deleteCabinetItem.cabinet_name || deleteCabinetItem.cabinet_id}" không? Nếu tủ đang cấp nguồn cho các mạch điện hoặc có thiết bị IoT gắn kèm, hệ thống sẽ từ chối xóa.`
            : undefined
        }
        onClose={() => setDeleteCabinetItem(null)}
        onConfirm={() => {
          if (deleteCabinetItem?.cabinet_id && onDeleteCabinet) {
            onDeleteCabinet(deleteCabinetItem.cabinet_id)
            setDeleteCabinetItem(null)
          }
        }}
      />
    </>
  )
}
