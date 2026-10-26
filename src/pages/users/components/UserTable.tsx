import React from 'react'
import { useSelector } from 'react-redux'
import {
  Edit2,
  Lock,
  Unlock,
  Mail,
  MapPin,
  Globe,
  UserCheck,
} from 'lucide-react'
import type { RootState } from '../../../redux/rootReducer'
import type { UserAccountItem } from '../../../types/admin/users'
import { getUserRoleBadge } from '../../../constants/enums'
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
  // Lấy danh mục địa bàn thực tế từ Redux để map tên động theo ID
  const communes = useSelector((state: RootState) => state.adminCommunes.communes)

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

    const names = validIds.map((id) => {
      const found = communes.find((c) => c.commune_id === id)
      return found?.name || id
    })
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

  // Helper lấy 2 chữ cái đầu viết hoa đại diện người dùng
  const getInitials = (name?: string | null, username?: string | null) => {
    const raw = (name || username || 'User').trim()
    const parts = raw.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return raw.slice(0, 2).toUpperCase()
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/75 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/80 dark:border-slate-800">
            <tr>
              <th className="py-3 px-3.5 w-[30%] min-w-[220px]">Người dùng / Tài khoản</th>
              <th className="py-3 px-3.5 w-[18%] min-w-[150px]">Vai trò (RBAC)</th>
              <th className="py-3 px-3.5 w-[18%] min-w-[140px]">Phạm vi địa bàn</th>
              <th className="py-3 px-3.5 w-[12%] min-w-[100px]">Trạng thái</th>
              <th className="py-3 px-3.5 w-[10%] min-w-[95px]">Ngày tạo</th>
              <th className="py-3 px-3.5 w-[12%] min-w-[125px] text-right">Thao tác</th>
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
                const initials = getInitials(user.full_name, user.username)

                return (
                  <tr
                    key={user.user_id || user.username || Math.random()}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                  >
                    {/* User Info */}
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] font-mono tracking-tight shrink-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 shadow-2xs"
                        >
                          {initials}
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

                    {/* Action Buttons với Safety Divider & Hit Target >= 32px */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => onEdit(user)}
                          className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center justify-center transition cursor-pointer shadow-2xs active:scale-95"
                          title="Chỉnh sửa tài khoản"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Invite Button */}
                        <button
                          type="button"
                          onClick={() => onInvite(user)}
                          className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 flex items-center justify-center transition cursor-pointer shadow-2xs active:scale-95"
                          title="Gửi lại email mời đặt mật khẩu"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>

                        {/* Visual Safety Divider */}
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

                        {/* High-Risk Lock/Unlock Button */}
                        <button
                          type="button"
                          onClick={() => onToggleLock(user)}
                          className={`w-8 h-8 rounded-xl border flex items-center justify-center transition cursor-pointer shadow-2xs active:scale-95 ${
                            isLocked
                              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300'
                              : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/40 hover:bg-rose-100 hover:border-rose-300 text-rose-600 dark:text-rose-400'
                          }`}
                          title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản (Thao tác bảo mật)'}
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

