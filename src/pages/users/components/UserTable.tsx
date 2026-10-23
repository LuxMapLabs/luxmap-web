import React from 'react'
import {
  Edit2,
  Lock,
  Unlock,
  Mail,
  MapPin,
  Globe,
  UserCheck,
} from 'lucide-react'
import type { UserAccountItem } from '../../../types/admin/users'
import { getUserRoleBadge } from '../../../constants/enums'
import { getCommuneName } from '../../../constants/communes'
import { UserTableSkeleton } from './UserTableSkeleton'

export interface UserTableProps {
  users: UserAccountItem[]
  isLoading?: boolean
  onEdit: (user: UserAccountItem) => void
  onToggleLock: (user: UserAccountItem) => void
  onInvite: (user: UserAccountItem) => void
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading = false,
  onEdit,
  onToggleLock,
  onInvite,
}) => {
  // Helper render danh sách xã thân thiện
  const renderCommuneScope = (communeIds?: string[] | null) => {
    // Nếu rỗng hoặc chứa dấu '*' -> Toàn hệ thống
    const isGlobal =
      !communeIds ||
      !Array.isArray(communeIds) ||
      communeIds.length === 0 ||
      communeIds.some((id) => id === '*' || id === 'all')

    if (isGlobal) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium border border-slate-200/60 dark:border-slate-700/60">
          <Globe className="w-3 h-3 text-slate-400 shrink-0" />
          <span>Toàn hệ thống</span>
        </span>
      )
    }

    const validIds = communeIds.filter((id) => Boolean(id) && id !== '*')
    if (validIds.length === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium border border-slate-200/60 dark:border-slate-700/60">
          <Globe className="w-3 h-3 text-slate-400 shrink-0" />
          <span>Toàn hệ thống</span>
        </span>
      )
    }

    const names = validIds.map((id) => getCommuneName(id))
    if (names.length <= 2) {
      return (
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          {names.map((name, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium border border-rose-200/60 dark:border-rose-800/60"
            >
              <MapPin className="w-2.5 h-2.5 text-rose-500 shrink-0" />
              <span>{name}</span>
            </span>
          ))}
        </div>
      )
    }

    return (
      <div className="flex items-center gap-1 text-[11px]">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium border border-rose-200/60 dark:border-rose-800/60">
          <MapPin className="w-2.5 h-2.5 text-rose-500 shrink-0" />
          <span>{names[0]}</span>
        </span>
        <span
          className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[10px] border border-slate-200/60 dark:border-slate-700/60"
          title={names.slice(1).join(', ')}
        >
          +{names.length - 1} xã
        </span>
      </div>
    )
  }

  // Helper avatar styling theo vai trò
  const getAvatarStyle = (role?: string | null) => {
    switch (role) {
      case 'system_admin':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 ring-purple-200 dark:ring-purple-800'
      case 'manager':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-800'
      case 'superior':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 ring-amber-200 dark:ring-amber-800'
      case 'field_engineer':
        return 'bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 ring-sky-200 dark:ring-sky-800'
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ring-slate-200 dark:ring-slate-700'
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/75 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/80 dark:border-slate-800">
            <tr>
              <th className="py-3 px-3.5">Người dùng / Tài khoản</th>
              <th className="py-3 px-3.5">Vai trò (RBAC)</th>
              <th className="py-3 px-3.5">Phạm vi địa bàn</th>
              <th className="py-3 px-3.5">Trạng thái</th>
              <th className="py-3 px-3.5">Ngày tạo</th>
              <th className="py-3 px-3.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {isLoading ? (
              <UserTableSkeleton rowCount={8} />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                  Không tìm thấy tài khoản người dùng nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isLocked = user.status === 'locked'
                const roleBadge = getUserRoleBadge(user.role)
                const avatarLetter = (user.full_name || user.username || 'U')
                  .trim()
                  .charAt(0)
                  .toUpperCase()
                const avatarClass = getAvatarStyle(user.role)

                return (
                  <tr
                    key={user.user_id || user.username || Math.random()}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                  >
                    {/* User Info */}
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7.5 h-7.5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ring-1 shadow-2xs ${avatarClass}`}
                        >
                          {avatarLetter}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white truncate">
                            {user.full_name || user.username}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate">
                            @{user.username} {user.email ? `• ${user.email}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${roleBadge.colorClass}`}
                      >
                        <UserCheck className="w-3 h-3 shrink-0" />
                        <span>{roleBadge.label}</span>
                      </span>
                    </td>

                    {/* Commune Scope */}
                    <td className="py-2.5 px-3.5">
                      {renderCommuneScope(user.commune_ids)}
                    </td>

                    {/* Status Dot */}
                    <td className="py-2.5 px-3.5">
                      {isLocked ? (
                        <div className="inline-flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
                          <span>Tạm khóa</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                          <span>Hoạt động</span>
                        </div>
                      )}
                    </td>

                    {/* Created At */}
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '—'}
                    </td>

                    {/* Compact Icon Actions */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => onEdit(user)}
                          className="w-7 h-7 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center justify-center transition cursor-pointer shadow-2xs"
                          title="Chỉnh sửa tài khoản"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Invite Button */}
                        <button
                          type="button"
                          onClick={() => onInvite(user)}
                          className="w-7 h-7 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 flex items-center justify-center transition cursor-pointer shadow-2xs"
                          title="Gửi lại email mời đặt mật khẩu"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>

                        {/* Lock/Unlock Button */}
                        <button
                          type="button"
                          onClick={() => onToggleLock(user)}
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition cursor-pointer shadow-2xs ${
                            isLocked
                              ? 'border-emerald-200/80 dark:border-emerald-850/80 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                              : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400'
                          }`}
                          title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                        >
                          {isLocked ? (
                            <Unlock className="w-3.5 h-3.5" />
                          ) : (
                            <Lock className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

