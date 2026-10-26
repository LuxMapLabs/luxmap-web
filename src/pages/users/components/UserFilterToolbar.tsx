import React from 'react'
import { Search, Filter, ShieldCheck, X, UserPlus } from 'lucide-react'
import { USER_ROLE_LABELS } from '../../../constants/enums'

export interface UserFilterToolbarProps {
  searchTerm: string
  selectedRole: string
  selectedStatus: string
  onSearchChange: (value: string) => void
  onRoleChange: (role: string) => void
  onStatusChange: (status: string) => void
  onOpenCreateModal: () => void
}

export const UserFilterToolbar: React.FC<UserFilterToolbarProps> = ({
  searchTerm,
  selectedRole,
  selectedStatus,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onOpenCreateModal,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Search Input with Clear Button */}
      <div className="relative flex-1 max-w-full md:max-w-2xl">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm theo họ tên, tài khoản, email..."
          className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer transition"
            title="Xóa tìm kiếm"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Filter Dropdowns and Add User Button on the far right */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Role Filter */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/70 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedRole}
            onChange={(e) => onRoleChange(e.target.value)}
            className="bg-transparent text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
          >
            <option value="">Tất cả vai trò</option>
            {Object.entries(USER_ROLE_LABELS).map(([roleKey, label]) => (
              <option key={roleKey} value={roleKey} className="dark:bg-slate-900">
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/70 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-transparent text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active" className="dark:bg-slate-900">Đang hoạt động</option>
            <option value="locked" className="dark:bg-slate-900">Đã khóa</option>
          </select>
        </div>

        {/* Add User Button - Far right */}
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0 ml-1"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Thêm người dùng</span>
        </button>
      </div>
    </div>
  )
}


