import React, { useState, useMemo, useEffect } from 'react'
import { Button } from '../../../../components/Button'
import { useDispatch, useSelector } from 'react-redux'
import { Search, Plus, Upload, Filter, Printer } from 'lucide-react'
import { OpsSelect } from '../../../../components/ops/OpsSelect'
import type { RootState } from '../../../../redux/rootReducer'
import { fetchMapLayersRequest } from '../../../../feature/map/mapSlice'
import type { FixtureStatus } from '../../../../types/common/enums'
import type { PolePropertiesFeature } from '../../../../types/map/poles'
import type { PoleListItem } from '../../../../types/assets/poles'
import type { CabinetListItem } from '../../../../types/assets/cabinets'
import type { SegmentListItem } from '../../../../types/assets/segments'
import { PoleTable } from './components/PoleTable'
import { AddPoleModal } from './components/AddPoleModal'
import { EditPoleModal } from './components/EditPoleModal'
import { PoleDetailModal } from './components/PoleDetailModal'
import { PoleQrModal } from './components/PoleQrModal'
import { BulkPoleQrPrintModal } from './components/BulkPoleQrPrintModal'
import { CabinetDetailModal } from '../cabinets/components/CabinetDetailModal'
import { ConfirmDeleteAssetModal } from '../common/ConfirmDeleteAssetModal'
import { TablePagination } from '../common/TablePagination'

export interface PolesTabProps {
  poles: PoleListItem[]
  cabinets: CabinetListItem[]
  segments: SegmentListItem[]
  isLoading?: boolean
  activePoleCode?: string
  onClearActivePole?: () => void
  onAddPole: (data: PoleListItem) => void
  onAddPoles: (dataList: PoleListItem[]) => void
  onUpdatePole: (updated: PoleListItem) => void
  onDeletePole?: (poleId: string) => void
  onOpenImport: () => void
  onViewCabinetDetail?: (cabinet: CabinetListItem) => void
  onSelectFixture?: (fixtureCode: string) => void
  onSelectCabinet?: (cabinetCode: string) => void
}

export const PolesTab: React.FC<PolesTabProps> = ({
  poles,
  cabinets,
  segments,
  isLoading = false,
  activePoleCode,
  onClearActivePole,
  onAddPole,
  onAddPoles,
  onUpdatePole,
  onDeletePole,
  onOpenImport,
  onViewCabinetDetail,
  onSelectFixture,
  onSelectCabinet,
}) => {
  const dispatch = useDispatch()
  const mapPoles = useSelector((state: RootState) => state.map.poles)

  // Tự động tải lớp bản đồ GIS khi mở trang quản lý tài sản nếu store chưa có
  useEffect(() => {
    if (!mapPoles || mapPoles.length === 0) {
      dispatch(fetchMapLayersRequest())
    }
  }, [dispatch, mapPoles])

  // Bản đồ tra cứu trạng thái đo sáng trắc quang theo pole_id / external_ref từ tầng GIS
  const poleStatusMap = useMemo(() => {
    const map = new Map<string, FixtureStatus>()
    if (mapPoles && mapPoles.length > 0) {
      mapPoles.forEach((feature: PolePropertiesFeature) => {
        const props = feature.properties
        if (props?.pole_id && props.fixture_status) {
          map.set(props.pole_id, props.fixture_status)
          map.set(props.pole_id.toLowerCase(), props.fixture_status)
        }
      })
    }
    return map
  }, [mapPoles])

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Flash highlight state
  const [flashingPoleCode, setFlashingPoleCode] = useState<string>('')

  // Modals state
  const [isAddPoleModalOpen, setIsAddPoleModalOpen] = useState(false)
  const [detailPole, setDetailPole] = useState<PoleListItem | null>(null)
  const [editPole, setEditPole] = useState<PoleListItem | null>(null)
  const [deletePoleItem, setDeletePoleItem] = useState<PoleListItem | null>(null)
  const [qrPole, setQrPole] = useState<PoleListItem | null>(null)
  const [isBulkPrintModalOpen, setIsBulkPrintModalOpen] = useState(false)
  const [internalCabinetDetail, setInternalCabinetDetail] = useState<CabinetListItem | null>(null)

  // Filtered Poles
  const filteredPoles = useMemo(() => {
    const list = poles.filter((pole) => {
      const q = searchQuery.toLowerCase().trim()
      const seg = segments.find((s) => s.segment_id === pole.segment_id)
      const segName = seg?.segment_name || pole.segment_id || ''
      const cab = cabinets.find(
        (c) => c.cabinet_id === pole.feeder_id || (c.external_ref && c.external_ref.toLowerCase() === pole.feeder_id?.toLowerCase())
      )
      const cabName = cab?.cabinet_name || cab?.external_ref || pole.feeder_id || ''

      const matchesQuery =
        !q ||
        (pole.external_ref && pole.external_ref.toLowerCase().includes(q)) ||
        segName.toLowerCase().includes(q) ||
        (pole.commune_id && pole.commune_id.toLowerCase().includes(q)) ||
        cabName.toLowerCase().includes(q)

      const hasFixture = Boolean(pole.active_fixture)
      const currentStatus: FixtureStatus = hasFixture
        ? (pole.pole_id && poleStatusMap.get(pole.pole_id)) ||
          (pole.external_ref && (poleStatusMap.get(pole.external_ref) || poleStatusMap.get(pole.external_ref.toLowerCase()))) ||
          'unknown'
        : 'out'

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'no_gps' && !pole.location) ||
        (statusFilter === 'no_fixture' && !hasFixture) ||
        (statusFilter === 'normal' && hasFixture && currentStatus === 'normal') ||
        (statusFilter === 'dim' && hasFixture && currentStatus === 'dim') ||
        (statusFilter === 'out' && hasFixture && currentStatus === 'out') ||
        (statusFilter === 'unknown' && hasFixture && currentStatus === 'unknown')

      return matchesQuery && matchesStatus
    })

    return [...list].sort((a, b) => {
      return (a.external_ref || '').localeCompare(b.external_ref || '', undefined, { numeric: true })
    })
  }, [poles, segments, cabinets, searchQuery, statusFilter, poleStatusMap])

  const totalPages = Math.max(1, Math.ceil(filteredPoles.length / pageSize))

  const paginatedPoles = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredPoles.slice(start, start + pageSize)
  }, [filteredPoles, currentPage, pageSize])

  // Chọn cột đèn để in tem QR (giữ nguyên lựa chọn khi đổi trang hoặc bộ lọc)
  const [selectedPoleIds, setSelectedPoleIds] = useState<Set<string>>(new Set())
  const selectedPoles = useMemo(
    () => poles.filter((p) => p.pole_id && selectedPoleIds.has(p.pole_id)),
    [poles, selectedPoleIds]
  )

  const handleToggleSelect = (pole: PoleListItem) => {
    const id = pole.pole_id
    if (!id) return
    setSelectedPoleIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleTogglePage = (checked: boolean) => {
    setSelectedPoleIds((prev) => {
      const next = new Set(prev)
      paginatedPoles.forEach((p) => {
        const id = p.pole_id
        if (!id) return
        if (checked) next.add(id)
        else next.delete(id)
      })
      return next
    })
  }

  const handleSelectAllFiltered = () => {
    setSelectedPoleIds(new Set(filteredPoles.flatMap((p) => (p.pole_id ? [p.pole_id] : []))))
  }

  const handleClearSelection = () => setSelectedPoleIds(new Set())

  // Trigger flash highlight and jump to appropriate page when activePoleCode is provided
  useEffect(() => {
    if (activePoleCode) {
      setFlashingPoleCode(activePoleCode)

      const targetIndex = filteredPoles.findIndex(
        (p) => p.external_ref && p.external_ref.toLowerCase() === activePoleCode.toLowerCase()
      )

      if (targetIndex !== -1) {
        const targetPage = Math.floor(targetIndex / pageSize) + 1
        setCurrentPage(targetPage)
      }

      const timer = setTimeout(() => {
        setFlashingPoleCode('')
        onClearActivePole?.()
      }, 2500)

      return () => clearTimeout(timer)
    }
  }, [activePoleCode, filteredPoles, pageSize, onClearActivePole])

  const handleSavePole = (updated: PoleListItem) => {
    onUpdatePole(updated)
    if (detailPole && detailPole.pole_id === updated.pole_id) {
      setDetailPole(updated)
    }
  }

  const handleCabinetClick = (cab: CabinetListItem) => {
    if (onViewCabinetDetail) {
      onViewCabinetDetail(cab)
    } else {
      setInternalCabinetDetail(cab)
    }
  }

  const poleStatusCounts = useMemo(() => {
    let normal = 0
    let dim = 0
    let out = 0
    let unknown = 0
    let noFixture = 0
    let noGps = 0

    poles.forEach((pole) => {
      if (!pole.location) noGps++
      const hasFixture = Boolean(pole.active_fixture)
      if (!hasFixture) {
        noFixture++
        return
      }
      const currentStatus: FixtureStatus =
        (pole.pole_id && poleStatusMap.get(pole.pole_id)) ||
        (pole.external_ref &&
          (poleStatusMap.get(pole.external_ref) ||
            poleStatusMap.get(pole.external_ref.toLowerCase()))) ||
        'unknown'
      if (currentStatus === 'normal') normal++
      else if (currentStatus === 'dim') dim++
      else if (currentStatus === 'out') out++
      else unknown++
    })

    return {
      all: poles.length,
      normal,
      dim,
      out,
      unknown,
      noFixture,
      noGps,
    }
  }, [poles, poleStatusMap])

  return (
    <>
      {/* Action Toolbar */}
      <div className="ops-rise relative z-20 bg-white dark:bg-slate-900 p-3 rounded-[20px] shadow-ops flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Box - Chiều dài co giãn giống tab Bóng đèn */}
          <div className="flex-1 min-w-60 relative">
            <input
              type="text"
              placeholder="Tìm theo mã cột, tuyến đường, địa bàn..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-xs focus:outline-none focus:border-[#1f3864] dark:focus:border-blue-500 font-medium transition"
            />
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Filter Status Dropdown */}
          <OpsSelect
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val)
              setCurrentPage(1)
            }}
            icon={<Filter className="w-3.5 h-3.5" />}
            headerLabel="Trạng thái chiếu sáng"
            headerBadge={`${poleStatusCounts.all} cột`}
            triggerClassName="min-w-[185px]"
            popoverClassName="w-68"
            options={[
              {
                value: 'all',
                label: 'Tất cả trạng thái',
                subLabel: 'Hiển thị toàn bộ cột đèn trên địa bàn',
                badge: `${poleStatusCounts.all} cột`,
              },
              {
                value: 'normal',
                label: 'Sáng tốt',
                nativeLabel: '🟢 Sáng tốt',
                subLabel: 'Bóng đèn hoạt động bình thường',
                dotColor: 'bg-emerald-500',
                badge: poleStatusCounts.normal,
              },
              {
                value: 'dim',
                label: 'Sáng yếu',
                nativeLabel: '🟡 Sáng yếu',
                subLabel: 'Độ rọi suy giảm, cần kiểm tra',
                dotColor: 'bg-amber-400',
                badge: poleStatusCounts.dim,
              },
              {
                value: 'out',
                label: 'Mất sáng',
                nativeLabel: '🔴 Mất sáng',
                subLabel: 'Bóng đèn tắt hoặc gặp sự cố',
                dotColor: 'bg-rose-500',
                badge: poleStatusCounts.out,
              },
              {
                value: 'unknown',
                label: 'Chưa quét',
                nativeLabel: '⚪ Chưa quét',
                subLabel: 'Chưa có dữ liệu khảo sát gần đây',
                dotColor: 'bg-slate-300',
                badge: poleStatusCounts.unknown,
              },
              {
                value: 'no_fixture',
                label: 'Chưa gắn bóng',
                nativeLabel: '⚫ Chưa gắn bóng',
                subLabel: 'Cột đèn chưa lắp đặt bộ đèn',
                dotColor: 'bg-slate-700',
                badge: poleStatusCounts.noFixture,
              },
              {
                value: 'no_gps',
                label: 'Chưa có GPS',
                nativeLabel: '📍 Chưa có GPS',
                subLabel: 'Cột chưa gắn vị trí, chưa hiện trên bản đồ',
                dotColor: 'bg-amber-500',
                badge: poleStatusCounts.noGps,
              },
            ]}
          />
        </div>

        {/* Action Buttons: Add, Bulk QR Print & Import */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={selectedPoles.length === 0}
            onClick={() => setIsBulkPrintModalOpen(true)}
            leftIcon={<Printer className="w-4 h-4 text-amber-500 dark:text-amber-400" />}
            title={
              selectedPoles.length === 0
                ? 'Tích chọn cột đèn trong bảng trước khi in tem QR'
                : `In tem QR cho ${selectedPoles.length} cột đã chọn`
            }
          >
            {selectedPoles.length > 0 ? `In tem QR (${selectedPoles.length})` : 'In tem QR'}
          </Button>
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
            onClick={() => setIsAddPoleModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Thêm cột đèn
          </Button>
        </div>
      </div>

      {selectedPoles.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 min-h-[42px] rounded-xl border text-xs transition-colors border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200">
          <span>
            Đã chọn <strong>{selectedPoles.length}</strong> cột đèn để in tem QR
          </span>
          <div className="flex items-center gap-3">
            {selectedPoles.length < filteredPoles.length && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="font-semibold underline underline-offset-2 hover:text-blue-600 dark:hover:text-blue-100 cursor-pointer"
              >
                Chọn tất cả {filteredPoles.length} cột đang lọc
              </button>
            )}
            <button
              type="button"
              onClick={handleClearSelection}
              className="font-semibold underline underline-offset-2 hover:text-blue-600 dark:hover:text-blue-100 cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <PoleTable
        poles={paginatedPoles}
        cabinets={cabinets}
        segments={segments}
        poleStatusMap={poleStatusMap}
        isLoading={isLoading}
        flashingPoleCode={flashingPoleCode}
        onViewDetail={(pole) => setDetailPole(pole)}
        onEdit={(pole) => setEditPole(pole)}
        onDelete={(pole) => setDeletePoleItem(pole)}
        onViewCabinetDetail={handleCabinetClick}
        onSelectFixture={onSelectFixture}
        onSelectCabinet={onSelectCabinet}
        selectedPoleIds={selectedPoleIds}
        onToggleSelect={handleToggleSelect}
        onTogglePage={handleTogglePage}
      />

      {/* Pagination Footer */}
      <TablePagination
        currentListLength={filteredPoles.length}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        unitLabel="cột điện"
        isLoading={isLoading}
        onPageChange={setCurrentPage}
      />

      {/* Modal Add Pole */}
      <AddPoleModal
        isOpen={isAddPoleModalOpen}
        onClose={() => setIsAddPoleModalOpen(false)}
        onAddPole={onAddPole}
        onAddPoles={onAddPoles}
        existingPoleCount={poles.length}
        availableSegments={segments}
        availableCabinets={cabinets}
      />

      {/* Modal Edit Pole */}
      <EditPoleModal
        isOpen={!!editPole}
        pole={editPole}
        segments={segments}
        cabinets={cabinets}
        allPoles={poles}
        onClose={() => setEditPole(null)}
        onSave={handleSavePole}
      />

      {/* Modal Detail Pole */}
      <PoleDetailModal
        isOpen={!!detailPole}
        pole={detailPole}
        segments={segments}
        cabinets={cabinets}
        fixtureStatus={
          detailPole
            ? (detailPole.pole_id && poleStatusMap.get(detailPole.pole_id)) ||
              (detailPole.external_ref && (poleStatusMap.get(detailPole.external_ref) || poleStatusMap.get(detailPole.external_ref.toLowerCase()))) ||
              'unknown'
            : undefined
        }
        onClose={() => setDetailPole(null)}
        onViewQr={(pole) => setQrPole(pole)}
      />

      {/* Modal QR Code */}
      <PoleQrModal
        isOpen={!!qrPole}
        pole={qrPole}
        segmentName={
          segments.find((s) => s.segment_id === qrPole?.segment_id)?.segment_name ||
          qrPole?.segment_id ||
          ''
        }
        communeName={qrPole?.commune_id || ''}
        onClose={() => setQrPole(null)}
      />

      {/* Modal In Tem QR Hàng Loạt */}
      <BulkPoleQrPrintModal
        isOpen={isBulkPrintModalOpen}
        poles={selectedPoles}
        segments={segments}
        onClose={() => setIsBulkPrintModalOpen(false)}
      />

      {/* Modal Detail Cabinet (when clicked inside pole row) */}
      <CabinetDetailModal
        cabinet={internalCabinetDetail}
        onClose={() => setInternalCabinetDetail(null)}
      />

      <ConfirmDeleteAssetModal
        isOpen={!!deletePoleItem}
        assetTypeLabel="Cột Đèn"
        assetId={deletePoleItem?.pole_id || null}
        assetName={deletePoleItem?.external_ref || deletePoleItem?.pole_id || null}
        warningMessage={
          deletePoleItem
            ? `Bạn có chắc chắn muốn xóa cột đèn "${deletePoleItem.external_ref || deletePoleItem.pole_id}" không? Nếu cột vẫn còn bóng đèn hoặc liên kết tới mạch điện, hệ thống sẽ từ chối xóa.`
            : undefined
        }
        onClose={() => setDeletePoleItem(null)}
        onConfirm={() => {
          if (deletePoleItem?.pole_id && onDeletePole) {
            onDeletePole(deletePoleItem.pole_id)
            setDeletePoleItem(null)
          }
        }}
      />
    </>
  )
}
