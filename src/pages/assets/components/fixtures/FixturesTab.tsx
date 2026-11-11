import React, { useState, useMemo, useEffect } from 'react'
import { Button } from '../../../../components/Button'
import { Search, Plus, Upload, Filter, Zap } from 'lucide-react'
import { OpsSelect } from '../../../../components/ops/OpsSelect'
import type { CreateFixtureRequest, RetireFixtureRequest } from '../../../../types/assets/fixtures'
import type { ManagedFixture } from '../../../../hooks/assets/useAssetData'
import type { PoleListItem } from '../../../../types/assets/poles'
import type { SegmentListItem } from '../../../../types/assets/segments'
import { FixtureTable } from './components/FixtureTable'
import { AddFixtureModal } from './components/AddFixtureModal'
import { EditFixtureModal } from './components/EditFixtureModal'
import { RetireFixtureModal } from './components/RetireFixtureModal'
import { FixtureDetailModal } from './components/FixtureDetailModal'
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
  onRetireFixture?: (fixtureId: string, req: RetireFixtureRequest) => void
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
  onRetireFixture,
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
  const [retiringFixture, setRetiringFixture] = useState<ManagedFixture | null>(null)
  const [viewingFixture, setViewingFixture] = useState<ManagedFixture | null>(null)

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

  const fixtureCounts = useMemo(() => {
    const watts: Record<string, number> = { '60': 0, '100': 0, '120': 0, '150': 0 }
    let active = 0
    let retired = 0

    fixtures.forEach((f) => {
      const w = String(f.lamp_watt)
      if (watts[w] !== undefined) watts[w]++
      if (f.removed_date) retired++
      else active++
    })

    return {
      all: fixtures.length,
      watts,
      active,
      retired,
    }
  }, [fixtures])

  return (
    <div className="space-y-4">
      {/* Search & Dynamic Filter Bar */}
      <div className="ops-rise relative z-20 bg-white dark:bg-slate-900 p-3 rounded-[20px] shadow-ops flex flex-wrap items-center justify-between gap-3">
        {/* Left: Filters */}
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="flex-1 min-w-60 relative">
            <input
              type="text"
              placeholder="Tìm theo mã bộ đèn (FIX-...), mã cột (POLE-0001), công suất..."
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
          <OpsSelect
            value={wattFilter}
            onChange={(val) => {
              setWattFilter(val)
              setCurrentPage(1)
            }}
            icon={<Zap className="w-3.5 h-3.5" />}
            headerLabel="Công suất định mức"
            headerBadge={`${fixtureCounts.all} bóng`}
            triggerClassName="min-w-[175px]"
            popoverClassName="w-64"
            options={[
              {
                value: 'all',
                label: 'Tất cả công suất',
                subLabel: 'Mọi mức công suất đèn LED',
                badge: `${fixtureCounts.all} bóng`,
              },
              {
                value: '60',
                label: '60 W',
                subLabel: 'Đèn nhánh / ngõ xóm tiết kiệm điện',
                badge: `${fixtureCounts.watts['60']} bóng`,
              },
              {
                value: '100',
                label: '100 W',
                subLabel: 'Đèn đường liên thôn tiêu chuẩn',
                badge: `${fixtureCounts.watts['100']} bóng`,
              },
              {
                value: '120',
                label: '120 W',
                subLabel: 'Đèn trục chính công suất trung bình',
                badge: `${fixtureCounts.watts['120']} bóng`,
              },
              {
                value: '150',
                label: '150 W',
                subLabel: 'Đèn cao áp trục liên xã / tỉnh lộ',
                badge: `${fixtureCounts.watts['150']} bóng`,
              },
            ]}
          />

          {/* Status Filter */}
          <OpsSelect
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val as 'all' | 'active' | 'retired')
              setCurrentPage(1)
            }}
            icon={<Filter className="w-3.5 h-3.5" />}
            headerLabel="Vòng đời thiết bị"
            headerBadge={`${fixtureCounts.all} bóng`}
            triggerClassName="min-w-[175px]"
            popoverClassName="w-64"
            options={[
              {
                value: 'all',
                label: 'Tất cả trạng thái',
                subLabel: 'Toàn bộ lịch sử lắp đặt bộ đèn',
                badge: `${fixtureCounts.all} bóng`,
              },
              {
                value: 'active',
                label: 'Đang hoạt động',
                subLabel: 'Đang gắn trên cột và vận hành',
                dotColor: 'bg-emerald-500',
                badge: `${fixtureCounts.active} bóng`,
              },
              {
                value: 'retired',
                label: 'Đã tháo dỡ',
                subLabel: 'Đã thu hồi hoặc thay thế mới',
                dotColor: 'bg-slate-400',
                badge: `${fixtureCounts.retired} bóng`,
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
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Thêm bộ đèn
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <FixtureTable
        fixtures={paginatedFixtures}
        poles={poles}
        flashingFixtureCode={flashingFixtureCode}
        isLoading={isLoading}
        onViewDetail={(f) => setViewingFixture(f)}
        onEditFixture={(f) => setEditingFixture(f)}
        onRetireFixture={(f) => setRetiringFixture(f)}
        onSelectPole={onSelectPole}
      />

      {/* Pagination */}
      <TablePagination
        currentListLength={filteredFixtures.length}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        unitLabel="bộ đèn"
        isLoading={isLoading}
        onPageChange={(page) => setCurrentPage(page)}
      />

      {/* Modals */}
      <FixtureDetailModal
        isOpen={Boolean(viewingFixture)}
        fixture={viewingFixture}
        poles={poles}
        segments={segments}
        onClose={() => setViewingFixture(null)}
      />

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
        segments={segments}
        onUpdateFixture={onUpdateFixture}
      />

      <RetireFixtureModal
        isOpen={Boolean(retiringFixture)}
        onClose={() => setRetiringFixture(null)}
        fixture={retiringFixture}
        onConfirm={(fixtureId, req) => {
          onRetireFixture?.(fixtureId, req)
        }}
      />
    </div>
  )
}
