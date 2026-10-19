import React from 'react'
import { Search } from 'lucide-react'
import type { CitizenReportStatus } from '../../../types/common/enums'

export interface CitizenReviewFiltersProps {
  statusFilter: CitizenReportStatus[]
  communeFilter: string[]
  poleFilter: string | null
  availableCommunes: string[]
  pendingCount: number
  onStatusChange: (status: CitizenReportStatus[]) => void
  onCommuneChange: (communes: string[]) => void
  onPoleChange: (poleId: string | null) => void
}

export const CitizenReviewFilters: React.FC<CitizenReviewFiltersProps> = ({
  statusFilter,
  communeFilter,
  poleFilter,
  availableCommunes,
  pendingCount,
  onStatusChange,
  onCommuneChange,
  onPoleChange,
}) => {
  const currentStatus = statusFilter.length === 1 ? statusFilter[0] : ''

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* 1. Tìm kiếm theo mã cột đèn (hỗ trợ cả POLE-xxxx và external_ref) */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={poleFilter || ''}
            onChange={(e) => onPoleChange(e.target.value.trim() ? e.target.value : null)}
            placeholder="Tìm theo mã cột đèn..."
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition font-medium"
          />
        </div>

        {/* 2. Dropdown lọc theo Xã / Phường */}
        {availableCommunes.length > 0 && (
          <div className="w-full sm:w-56 shrink-0">
            <select
              value={communeFilter[0] || ''}
              onChange={(e) => {
                const val = e.target.value
                onCommuneChange(val ? [val] : [])
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition cursor-pointer font-medium"
            >
              <option value="">Tất cả địa bàn / Xã, Phường</option>
              {availableCommunes.map((communeId) => (
                <option key={communeId} value={communeId}>
                  {communeId}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 3. Dropdown lọc theo Trạng thái phản ánh (Ngang hàng với ô tìm kiếm) */}
        <div className="w-full sm:w-48 shrink-0">
          <select
            value={currentStatus}
            onChange={(e) => {
              const val = e.target.value as CitizenReportStatus | ''
              onStatusChange(val ? [val] : [])
            }}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition cursor-pointer font-medium"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">
              Chờ duyệt {pendingCount > 0 ? `(${pendingCount})` : ''}
            </option>
            <option value="accepted">Đã duyệt (Fault)</option>
            <option value="merged">Đã gộp</option>
            <option value="rejected">Đã từ chối</option>
          </select>
        </div>

        {/* 4. Huy hiệu cảnh báo có phản ánh chờ duyệt nếu pendingCount > 0 */}
        {pendingCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 text-xs font-semibold shadow-2xs shrink-0 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>{pendingCount} chờ duyệt</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default CitizenReviewFilters
