import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { LogOut } from 'lucide-react'
import type { CurrentUserResponse } from '../types/auth/me'
import { getRoleName } from '../utils/roleUtils'
import { ProfileModal } from './ProfileModal'

interface SidebarAccountProps {
  user: CurrentUserResponse | null
  collapsed: boolean
  onLogout: () => void
  /** Màu nền và chữ của avatar theo role */
  avatarClassName: string
  /** Màu icon đăng xuất khi rê chuột, theo role */
  logoutHoverClassName: string
}

// Một hàng duy nhất cho tài khoản ở chân sidebar: bấm vào người dùng mở hồ sơ, icon bên cạnh để đăng xuất
export const SidebarAccount: React.FC<SidebarAccountProps> = ({
  user,
  collapsed,
  onLogout,
  avatarClassName,
  logoutHoverClassName,
}) => {
  const [profileOpen, setProfileOpen] = useState(false)

  const displayName = user?.full_name || user?.username || 'bạn'
  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0))
      .slice(-2)
      .join('')
      .toUpperCase() || 'U'
  const roleName = user ? getRoleName(user.role).replace(/\s*\([^)]*\)\s*$/, '') : ''

  return (
    <>
      <div className={collapsed ? 'space-y-1' : 'flex items-center gap-1'}>
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          title={`${displayName} · ${roleName} (xem hồ sơ cá nhân)`}
          aria-label={`Hồ sơ cá nhân của ${displayName}`}
          className={`group flex items-center rounded-2xl transition-colors duration-200 cursor-pointer hover:bg-white/60 ${
            collapsed ? 'mx-auto h-12 w-12 justify-center' : 'min-w-0 flex-1 gap-2.5 p-2 text-left'
          }`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ring-2 ring-white ${avatarClassName}`}
          >
            {initials}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-bold text-slate-800">{displayName}</span>
              <span className="mt-0.5 block truncate text-[11px] text-slate-500">{roleName}</span>
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onLogout}
          title="Đăng xuất"
          aria-label="Đăng xuất"
          className={`group flex shrink-0 items-center justify-center rounded-2xl text-slate-500 transition-colors duration-200 cursor-pointer hover:bg-white/60 ${logoutHoverClassName} ${
            collapsed ? 'mx-auto h-12 w-12' : 'h-11 w-11'
          }`}
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Portal ra body: sidebar kính mờ (backdrop-filter) sẽ nhốt modal fixed vào trong sidebar */}
      {createPortal(
        <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} user={user} />,
        document.body,
      )}
    </>
  )
}
