import React from 'react'
import { Filter, MapPin, Search } from 'lucide-react'
import { OpsSelect } from '../../../components/ops/OpsSelect'
import type { CitizenReportStatus } from '../../../types/common/enums'

export interface CitizenReviewFiltersProps {
  statusFilter: CitizenReportStatus[]
  communeFilter: string[]
  poleFilter: string | null
  availableCommunes: string[]
  communeNames?: Record<string, string>
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
  communeNames = {},
  pendingCount,
  onStatusChange,
  onCommuneChange,
  onPoleChange,
}) => {
  const currentStatus = statusFilter.length === 1 ? statusFilter[0] : ''

  return (
    <div className="ops-rise relative z-20 bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-xl p-4">
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

        {/* 2. Dropdown lọc theo Xã / Phường (chỉ khi phụ trách từ 2 xã trở lên; Manager chỉ có 1 xã) */}
        {availableCommunes.length > 1 && (
          <div className="w-full sm:w-60 shrink-0">
            <OpsSelect
              value={communeFilter[0] || ''}
              onChange={(val) => onCommuneChange(val ? [val] : [])}
              icon={<MapPin className="w-3.5 h-3.5" />}
              headerLabel="Địa bàn quản lý"
              headerBadge={`${availableCommunes.length} xã`}
              triggerClassName="w-full min-h-[40px]"
              popoverClassName="w-68"
              options={[
                {
                  value: '',
                  label: 'Tất cả địa bàn / Xã, Phường',
                  subLabel: 'Hiển thị phản ánh trên toàn địa bàn',
                },
                ...availableCommunes.map((communeId) => ({
                  value: communeId,
                  label: communeNames[communeId] || communeId,
                  subLabel: `Mã địa bàn: ${communeId}`,
                  dotColor: 'bg-blue-500',
                })),
              ]}
            />
          </div>
        )}

        {/* 3. Dropdown lọc theo Trạng thái phản ánh (Ngang hàng với ô tìm kiếm) */}
        <div className="w-full sm:w-56 shrink-0">
          <OpsSelect
            value={currentStatus}
            onChange={(val) => {
              const statusVal = val as CitizenReportStatus | ''
              onStatusChange(statusVal ? [statusVal] : [])
            }}
            icon={<Filter className="w-3.5 h-3.5" />}
            headerLabel="Trạng thái phản ánh"
            headerBadge={pendingCount > 0 ? `${pendingCount} chờ duyệt` : undefined}
            align="right"
            triggerClassName="w-full min-h-[40px]"
            popoverClassName="w-68"
            options={[
              {
                value: '',
                label: 'Tất cả trạng thái',
                subLabel: 'Toàn bộ phản ánh từ người dân',
              },
              {
                value: 'pending',
                label: 'Chờ duyệt',
                nativeLabel: `Chờ duyệt ${pendingCount > 0 ? `(${pendingCount})` : ''}`.trim(),
                subLabel: 'Phản ánh mới cần quản lý thẩm định',
                dotColor: 'bg-amber-400',
                badge: pendingCount > 0 ? pendingCount : undefined,
              },
              {
                value: 'accepted',
                label: 'Đã duyệt (Fault)',
                subLabel: 'Đã tạo hồ sơ sự cố kỹ thuật',
                dotColor: 'bg-emerald-500',
              },
              {
                value: 'merged',
                label: 'Đã gộp',
                subLabel: 'Gộp vào sự cố đang mở trên cùng cột',
                dotColor: 'bg-blue-500',
              },
              {
                value: 'rejected',
                label: 'Đã từ chối',
                subLabel: 'Báo cáo trùng lặp hoặc không hợp lệ',
                dotColor: 'bg-rose-500',
              },
            ]}
          />
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
