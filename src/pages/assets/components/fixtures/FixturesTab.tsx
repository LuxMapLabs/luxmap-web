import React, { useState, useMemo, useEffect } from 'react'
import { Search, Plus, Upload, Filter } from 'lucide-react'
import type { CreateFixtureRequest } from '../../../../types/assets/fixtures'
import type { ManagedFixture } from '../../../../hooks/assets/useAssetData'
import type { PoleListItem } from '../../../../types/assets/poles'
import type { SegmentListItem } from '../../../../types/assets/segments'
import { FixtureTable } from './components/FixtureTable'
import { AddFixtureModal } from './components/AddFixtureModal'
import { EditFixtureModal } from './components/EditFixtureModal'
import { TablePagination } from '../common/TablePagination'

export interface FixturesTabProps {
  fixtures: ManagedFixture[]
  poles: PoleListItem[]
  segments?: SegmentListItem[]
  activeFixtureCode?: string
  onClearActiveFixture?: () => void
  isLoading?: boolean
  onAddFixture: (data: CreateFixtureRequest) => void
  onAddFixtures?: (data: CreateFixtureRequest[]) => void
  onUpdateFixture: (updated: ManagedFixture) => void
  onOpenImport: () => void
  onSelectPole?: (poleCode: string) => void
}

export const FixturesTab: React.FC<FixturesTabProps> = ({
  fixtures,
  poles,
  segments = [],
  activeFixtureCode,
  isLoading = false,
  onClearActiveFixture,
  onAddFixture,
  onAddFixtures,
  onUpdateFixture,
  onOpenImport,
  onSelectPole,
}) => {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [wattFilter, setWattFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'retired'>('all')

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingFixture, setEditingFixture] = useState<ManagedFixture | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Flash highlight state
  const [flashingFixtureCode, setFlashingFixtureCode] = useState<string>('')

  // Filtered List
  const filteredFixtures = useMemo(() => {
    const list = fixtures.filter((item) => {
      // Search by pole_external_ref or fixture_id
      const query = searchTerm.toLowerCase().trim()
      const matchSearch =
        !query ||
        (item.pole_external_ref && item.pole_external_ref.toLowerCase().includes(query)) ||
        (item.fixture_id && item.fixture_id.toLowerCase().includes(query))

      // Filter by Watt
      const matchWatt =
        wattFilter === 'all' || String(item.lamp_watt) === wattFilter

      // Filter by Status
      const isRetired = Boolean(item.removed_date)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !isRetired) ||
        (statusFilter === 'retired' && isRetired)

      return matchSearch && matchWatt && matchStatus
    })

    return [...list].sort((a, b) => {
      const codeA = a.fixture_id || (a.pole_external_ref ? `FIX-${a.pole_external_ref}` : '')
      const codeB = b.fixture_id || (b.pole_external_ref ? `FIX-${b.pole_external_ref}` : '')
      return codeA.localeCompare(codeB, undefined, { numeric: true })
    })
  }, [fixtures, searchTerm, wattFilter, statusFilter])

  // Trigger flash highlight and jump to appropriate page without overwriting search box
  useEffect(() => {
    if (activeFixtureCode) {
      setFlashingFixtureCode(activeFixtureCode)

      const targetIndex = filteredFixtures.findIndex((f) => {
        const fixtureId = f.fixture_id || (f.pole_external_ref ? `FIX-${f.pole_external_ref}` : '')
        return (
          (fixtureId && fixtureId.toLowerCase() === activeFixtureCode.toLowerCase()) ||
          (f.pole_external_ref && f.pole_external_ref.toLowerCase() === activeFixtureCode.toLowerCase())
        )
      })

      if (targetIndex !== -1) {
        const targetPage = Math.floor(targetIndex / pageSize) + 1
        setCurrentPage(targetPage)
      }

      const timer = setTimeout(() => {
        setFlashingFixtureCode('')
        onClearActiveFixture?.()
      }, 2500)

      return () => clearTimeout(timer)
    }
  }, [activeFixtureCode, filteredFixtures, pageSize, onClearActiveFixture])

  // Paginated List
  const paginatedFixtures = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredFixtures.slice(start, start + pageSize)
  }, [filteredFixtures, currentPage, pageSize])

  const totalPages = Math.ceil(filteredFixtures.length / pageSize) || 1

  return (
    <div className="space-y-4">
      {/* Search & Dynamic Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Left: Filters */}
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="flex-1 min-w-60 relative">
            <input
              type="text"
              placeholder="Tìm theo mã bóng (FIX-...), mã cột (POLE-0001), công suất..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Watt Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
            <select
              value={wattFilter}
              onChange={(e) => {
                setWattFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
            >
              <option value="all">Tất cả công suất</option>
              <option value="60">60 W</option>
              <option value="100">100 W</option>
              <option value="120">120 W</option>
              <option value="150">150 W</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | 'active' | 'retired')
                setCurrentPage(1)
              }}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="retired">Đã tháo dỡ</option>
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
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm border border-blue-400/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Đăng ký Bóng mới</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <FixtureTable
        fixtures={paginatedFixtures}
        poles={poles}
        flashingFixtureCode={flashingFixtureCode}
        isLoading={isLoading}
        onEditFixture={(f) => setEditingFixture(f)}
        onSelectPole={onSelectPole}
      />

      {/* Pagination */}
      <TablePagination
        currentListLength={filteredFixtures.length}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        unitLabel="bóng đèn"
        isLoading={isLoading}
        onPageChange={(page) => setCurrentPage(page)}
      />

      {/* Modals */}
      <AddFixtureModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        poles={poles}
        segments={segments}
        onAddFixture={onAddFixture}
        onAddFixtures={onAddFixtures}
      />

      <EditFixtureModal
        isOpen={Boolean(editingFixture)}
        onClose={() => setEditingFixture(null)}
        fixture={editingFixture}
        poles={poles}
        onUpdateFixture={onUpdateFixture}
      />
    </div>
  )
}
