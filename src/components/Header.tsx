import React, { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Lightbulb,
  Bell,
  Map,
  Boxes,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  RefreshCw,
  ChevronDown,
} from 'lucide-react'
import { User, UserRole } from '../types/auth'
import { getRoleName } from '../utils/roleUtils'
import { ProfileModal } from './ProfileModal'

export interface HeaderProps {
  brandTitle?: string
  brandSubtitle?: string
  user?: User | null
  userName?: string
  userRoleTitle?: string
  userInitials?: string
  isAdminUser?: boolean
  hasNotification?: boolean
  onNotificationClick?: () => void
  onLogout?: () => void
  onRefreshProfile?: () => void
  isRefreshingProfile?: boolean
  className?: string
}

export const Header: React.FC<HeaderProps> = ({
  brandTitle = 'LUXMAP',
  brandSubtitle = 'Hệ thống Giám sát & Quản lý Chiếu sáng Công cộng',
  user = null,
  userName,
  userRoleTitle,
  userInitials,
  isAdminUser,
  hasNotification = true,
  onNotificationClick,
  onLogout,
  onRefreshProfile,
  isRefreshingProfile = false,
  className = '',
}) => {
  const location = useLocation()
  const isGisMap = location.pathname.startsWith('/gis-map') || location.pathname === '/'
  const isAssets = location.pathname.startsWith('/assets')
  const isAdminPath = location.pathname.startsWith('/admin')

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Tính toán thông tin hiển thị chính xác từ user (lấy từ GET /auth/me)
  const effectiveName = user?.fullName || userName || 'Cán bộ kỹ thuật'
  const effectiveRole = userRoleTitle || (user ? getRoleName(user.role) : 'Cán bộ vận hành')
  const effectiveAdmin =
    isAdminUser !== undefined ? isAdminUser : user?.role === UserRole.Admin

  const effectiveInitials =
    userInitials ||
    (effectiveName
      ? effectiveName
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((n) => n[0])
          .slice(-2)
          .join('')
          .toUpperCase()
      : 'U')

  // Đóng menu khi click bên ngoài hoặc bấm Esc
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setIsProfileMenuOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileMenuOpen(false)
      }
    }

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isProfileMenuOpen])

  // Tính toán tab đang active để trượt pill chính xác với transform GPU
  let activeIndex = 0
  if (effectiveAdmin) {
    if (isAssets) activeIndex = 1
    else if (isAdminPath) activeIndex = 2
    else activeIndex = 0
  } else {
    activeIndex = isAssets ? 1 : 0
  }

  const tabCount = effectiveAdmin ? 3 : 2

  // Màu sắc badge vai trò
  let badgeClasses = 'bg-blue-50 text-blue-700 border-blue-200'
  if (user?.role === UserRole.Admin) {
    badgeClasses = 'bg-purple-50 text-purple-700 border-purple-200'
  } else if (user?.role === UserRole.ManagementAgency) {
    badgeClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200'
  } else if (user?.role === UserRole.MaintenanceEngineer) {
    badgeClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200'
  } else if (user?.role === UserRole.FieldCrew) {
    badgeClasses = 'bg-amber-50 text-amber-800 border-amber-200'
  }

  const hasAllCommunes =
    effectiveAdmin || (user?.communeIds && user.communeIds.includes('*'))

  return (
    <>
      <header
        className={`h-16 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 select-none z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 text-slate-900 ${className}`}
      >
        {/* Left: Institutional Emblem + System Title + Subtitle */}
        <div className="flex items-center gap-3.5 shrink-0 group cursor-pointer">
          {/* Emblem: Deep sapphire tile with warm golden glowing bulb */}
          <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-blue-600 via-blue-700 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-600/20 ring-4 ring-blue-50 group-hover:ring-blue-100/80 group-hover:scale-105 transition-all duration-300">
            <Lightbulb className="w-5 h-5 text-amber-300 fill-amber-300/90 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wider text-slate-900 uppercase font-sans leading-none">
                {brandTitle}
              </span>
            </div>
            {brandSubtitle && (
              <p className="text-[11px] text-slate-500 font-medium leading-none mt-1 hidden sm:block">
                {brandSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Center: GovTech Enterprise Segmented Navigation with Silky Sliding Pill */}
        <nav
          className={`relative grid ${
            effectiveAdmin ? 'grid-cols-3 w-127.5' : 'grid-cols-2 w-92.5'
          } bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur-sm select-none`}
        >
          {/* Animated Sliding Active Pill */}
          <div
            className="absolute top-1.5 bottom-1.5 left-1.5 rounded-xl bg-white shadow-[0_2px_8px_-1px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.04)] border border-slate-200/80 pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              width: `calc((100% - 12px) / ${tabCount})`,
              transform: `translateX(calc(${activeIndex * 100}%))`,
            }}
          />

          {/* Tab 1: GIS Map */}
          <NavLink
            to="/gis-map"
            className={`relative z-10 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs select-none cursor-pointer transition-all duration-200 group active:scale-[0.98] ${
              isGisMap
                ? 'text-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40 font-medium'
            }`}
          >
            <Map
              className={`w-4 h-4 transition-all duration-300 ${
                isGisMap
                  ? 'scale-110 text-blue-600 drop-shadow-[0_1px_2px_rgba(37,99,235,0.3)]'
                  : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-105'
              }`}
            />
            <span className="tracking-tight">Bản đồ chiếu sáng</span>
            {isGisMap && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.8)] animate-pulse" />
            )}
          </NavLink>

          {/* Tab 2: Asset Management */}
          <NavLink
            to="/assets"
            className={`relative z-10 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs select-none cursor-pointer transition-all duration-200 group active:scale-[0.98] ${
              isAssets
                ? 'text-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40 font-medium'
            }`}
          >
            <Boxes
              className={`w-4 h-4 transition-all duration-300 ${
                isAssets
                  ? 'scale-110 text-blue-600 drop-shadow-[0_1px_2px_rgba(37,99,235,0.3)]'
                  : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-105'
              }`}
            />
            <span className="tracking-tight">Quản lý tài sản</span>
            {isAssets && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.8)] animate-pulse" />
            )}
          </NavLink>

          {/* Tab 3: Admin Management (Chỉ dành cho Admin) */}
          {effectiveAdmin && (
            <NavLink
              to="/admin/system"
              className={`relative z-10 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs select-none cursor-pointer transition-all duration-200 group active:scale-[0.98] ${
                isAdminPath
                  ? 'text-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40 font-medium'
              }`}
            >
              <ShieldCheck
                className={`w-4 h-4 transition-all duration-300 ${
                  isAdminPath
                    ? 'scale-110 text-blue-600 drop-shadow-[0_1px_2px_rgba(37,99,235,0.3)]'
                    : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-105'
                }`}
              />
              <span className="tracking-tight">Quản trị hệ thống</span>
              {isAdminPath && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.8)] animate-pulse" />
              )}
            </NavLink>
          )}
        </nav>

        {/* Right: Notification Bell + Interactive Profile Dropdown + Quick Logout */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Notification Bell with pulse ping */}
          <button
            type="button"
            onClick={onNotificationClick}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100/70 hover:bg-white text-slate-600 hover:text-slate-900 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-slate-200/80 shadow-2xs group"
            title="Thông báo sự cố & vận hành"
          >
            <Bell className="w-4 h-4 text-slate-600 group-hover:rotate-12 transition-transform duration-200" />
            {hasNotification && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 ring-2 ring-white" />
              </span>
            )}
          </button>

          <div className="h-5 w-px bg-slate-200/80" />

          {/* Officer Profile Dropdown Trigger */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2.5 p-1 rounded-2xl hover:bg-slate-100/80 transition-all duration-200 cursor-pointer select-none group border border-transparent hover:border-slate-200/70"
              title="Xem thông tin tài khoản & quyền hạn"
            >
              <div className="hidden md:flex flex-col items-end leading-tight pl-1.5">
                <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                  {effectiveName}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10.5px] text-slate-500 font-medium mt-0.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  {effectiveRole}
                </span>
              </div>

              {/* Avatar with deep sapphire gradient */}
              <div className="w-9 h-9 rounded-2xl bg-linear-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20 ring-2 ring-blue-100 group-hover:scale-105 group-hover:ring-blue-200 transition-all duration-200">
                {effectiveInitials}
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 hidden sm:block ${
                  isProfileMenuOpen ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </button>

            {/* Profile Dropdown Popover */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-76 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                {/* Header Section */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-linear-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                      {effectiveInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-sm text-slate-900 truncate">
                        {effectiveName}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {user?.email || `@${user?.username || 'user'}`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100/80 text-[11px]">
                    <span className="text-slate-400 font-medium">Vai trò:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md border text-[10.5px] ${badgeClasses}`}
                    >
                      {effectiveRole}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Địa bàn GIS:</span>
                    <span className="font-semibold text-slate-700 truncate max-w-[140px] text-right">
                      {hasAllCommunes
                        ? 'Toàn hệ thống'
                        : `${user?.communeIds?.length || 0} xã`}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-1.5 py-1.5 space-y-0.5">
                  {/* Nút Làm mới quyền & hồ sơ (Gọi GET /auth/me từ DB) */}
                  {onRefreshProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        onRefreshProfile()
                        setIsProfileMenuOpen(false)
                      }}
                      disabled={isRefreshingProfile}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer group disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors ${
                          isRefreshingProfile ? 'animate-spin' : ''
                        }`}
                      />
                      <span>
                        {isRefreshingProfile ? 'Đang làm mới...' : 'Làm mới quyền & hồ sơ'}
                      </span>
                    </button>
                  )}

                  {/* Xem chi tiết hồ sơ cá nhân */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false)
                      setIsProfileModalOpen(true)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer group"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    <span>Chi tiết hồ sơ cán bộ</span>
                  </button>
                </div>

                {/* Đăng xuất */}
                {onLogout && (
                  <div className="px-1.5 pt-1.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false)
                        onLogout()
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer group"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500 group-hover:-translate-x-0.5 transition-transform" />
                      <span>Đăng xuất khỏi hệ thống</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100/70 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200/80 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-2xs group"
              title="Đăng xuất nhanh"
            >
              <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
            </button>
          )}
        </div>
      </header>

      {/* Modal chi tiết hồ sơ cán bộ */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onRefresh={onRefreshProfile}
        isRefreshing={isRefreshingProfile}
      />
    </>
  )
}

export default Header
