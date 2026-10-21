import React, { useState, useMemo } from 'react'
import { Search, Plus, Upload, Filter, Cable, Zap, Lightbulb } from 'lucide-react'
import type { FeederListItem, CreateFeederRequest, UpdateFeederRequest } from '../../../../types/assets/feeders'
import type { CabinetListItem } from '../../../../types/assets/cabinets'
import type { PoleListItem } from '../../../../types/assets/poles'
import { FeederTable } from './components/FeederTable'
import { AddFeederModal } from './components/AddFeederModal'
import { EditFeederModal } from './components/EditFeederModal'
import { FeederDetailModal } from './components/FeederDetailModal'
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
  const [cabinetFilter, setCabinetFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [detailFeeder, setDetailFeeder] = useState<FeederListItem | null>(null)
  const [editFeeder, setEditFeeder] = useState<FeederListItem | null>(null)

  // Filtered Feeders
  const filteredFeeders = useMemo(() => {
    return feeders.filter((f) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesQuery =
        !q ||
        (f.feeder_id && f.feeder_id.toLowerCase().includes(q)) ||
        (f.feeder_name && f.feeder_name.toLowerCase().includes(q)) ||
        (f.external_ref && f.external_ref.toLowerCase().includes(q)) ||
        (f.cabinet?.cabinet_name && f.cabinet.cabinet_name.toLowerCase().includes(q)) ||
        (f.cabinet?.cabinet_id && f.cabinet.cabinet_id.toLowerCase().includes(q)) ||
        (f.commune_id && f.commune_id.toLowerCase().includes(q))

      const matchesCabinet =
        cabinetFilter === 'all' ||
        f.cabinet?.cabinet_id === cabinetFilter ||
        (f as unknown as { cabinet_id?: string }).cabinet_id === cabinetFilter

      return matchesQuery && matchesCabinet
    })
  }, [feeders, searchQuery, cabinetFilter])

  const totalPages = Math.max(1, Math.ceil(filteredFeeders.length / pageSize))

  const paginatedFeeders = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredFeeders.slice(start, start + pageSize)
  }, [filteredFeeders, currentPage, pageSize])

  // Stats calculation
  const totalPolesOnFeeders = useMemo(() => {
    return feeders.reduce((sum, f) => sum + (f.pole_count || 0), 0)
  }, [feeders])

  const activeFeedersCount = useMemo(() => {
    return feeders.filter((f) => (f.pole_count || 0) > 0).length
  }, [feeders])

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Banner & Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/60 shrink-0">
            <Cable className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tổng Số Mạch Điện
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {feeders.length} <span className="text-xs font-normal text-slate-400">lộ</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/60 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Mạch Đang Cấp Nguồn
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {activeFeedersCount} <span className="text-xs font-normal text-slate-400">/ {feeders.length} lộ</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-800/60 shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tổng Cột Đèn Đấu Nối
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {totalPolesOnFeeders} <span className="text-xs font-normal text-slate-400">cột</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar: Search, Filters, and Action Buttons */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search & Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Tìm theo mã lộ, tên mạch, tên tủ..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Cabinet Dropdown Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={cabinetFilter}
              onChange={(e) => {
                setCabinetFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">⚡ Tất cả tủ điện</option>
              {cabinets.map((cab) => (
                <option key={cab.cabinet_id} value={cab.cabinet_id || ''}>
                  {cab.cabinet_name || cab.external_ref || cab.cabinet_id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons: Add Feeder & Import CSV */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Nạp CSV Mạch</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Mạch Điện</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <FeederTable
        feeders={paginatedFeeders}
        isLoading={isLoading}
        onViewDetail={(feeder) => setDetailFeeder(feeder)}
        onEdit={(feeder) => setEditFeeder(feeder)}
        onDelete={onDeleteFeeder}
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
    </div>
  )
}
