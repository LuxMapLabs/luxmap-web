import React, { useState, useMemo, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Search, Plus, Upload, Filter, Printer } from 'lucide-react'
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

  return (
    <>
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
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
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-[#1f3864] dark:focus:border-blue-500 transition"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="normal">🟢 Sáng tốt</option>
              <option value="dim">🟡 Sáng yếu</option>
              <option value="out">🔴 Mất sáng</option>
              <option value="unknown">⚪ Chưa quét</option>
              <option value="no_fixture">⚫ Chưa gắn bóng</option>
            </select>
          </div>
        </div>

        {/* Action Buttons: Add, Bulk QR Print & Import */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBulkPrintModalOpen(true)}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-100 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Dàn trang và in hàng loạt tem mã QR decal (khổ A4)"
          >
            <Printer className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>In Tem QR</span>
          </button>
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
            onClick={() => setIsAddPoleModalOpen(true)}
            className="px-4 py-1.5 bg-[#1f3864] dark:bg-blue-600 hover:bg-[#1f3864]/90 dark:hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Cột Đèn Mới</span>
          </button>
        </div>
      </div>

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
        onViewCabinetDetail={handleCabinetClick}
        onSelectFixture={onSelectFixture}
        onSelectCabinet={onSelectCabinet}
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
        poles={filteredPoles}
        segments={segments}
        onClose={() => setIsBulkPrintModalOpen(false)}
      />

      {/* Modal Detail Cabinet (when clicked inside pole row) */}
      <CabinetDetailModal
        cabinet={internalCabinetDetail}
        onClose={() => setInternalCabinetDetail(null)}
      />
    </>
  )
}
