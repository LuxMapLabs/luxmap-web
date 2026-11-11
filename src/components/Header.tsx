import React, { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import {
  Map,
  Boxes,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  ChevronDown,
  CalendarDays,
  MessageSquareWarning,
  ClipboardCheck,
  LayoutDashboard,
  FileDown,
  Compass,
  SlidersHorizontal,
  Cpu,
} from 'lucide-react'
import { openExportModal } from '../feature/assets/assetSlice'
import type { CurrentUserResponse } from '../types/auth/me'
import { getRoleName, isAdmin, isManagementAgency, isMaintenanceEngineer, isFieldCrew } from '../utils/roleUtils'
import { ProfileModal } from './ProfileModal'
import { UserAvatar } from './UserAvatar'
import { NotificationBell } from './NotificationBell'

export interface HeaderProps {
  user?: CurrentUserResponse | null
  userName?: string
  userRoleTitle?: string
  userInitials?: string
  isAdminUser?: boolean
  onLogout?: () => void
  className?: string
}

export const Header: React.FC<HeaderProps> = ({
  user = null,
  userName,
  userRoleTitle,
  userInitials,
  isAdminUser,
  onLogout,
  className = '',
}) => {
  const dispatch = useDispatch()
  const location = useLocation()
  const isDashboard = location.pathname.startsWith('/dashboard')
  const isWorkSchedule = location.pathname.startsWith('/work-schedule')
  const isAssets = location.pathname.startsWith('/assets')
  const isCitizenReports = location.pathname.startsWith('/citizen-reports')
  const isReports = location.pathname.startsWith('/reports')
  const isCommunesAdmin = location.pathname.startsWith('/admin/communes')
  const isFirmwareAdmin = location.pathname.startsWith('/admin/firmware')
  const isSettingsAdmin = location.pathname.startsWith('/admin/settings')
  const isAdminDashboard = location.pathname === '/admin/dashboard' || location.pathname === '/admin'
  const isUsersAdmin = location.pathname === '/admin/system' || location.pathname.startsWith('/admin/users')
  const isAdminPath = location.pathname.startsWith('/admin')

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Tính toán thông tin hiển thị chính xác từ user (lấy từ GET /auth/me)
  const effectiveName = user?.full_name || userName || 'Cán bộ kỹ thuật'
  // Bỏ phần tiếng Anh trong ngoặc, ví dụ "Quản lý (Manager)" thành "Quản lý"
  const effectiveRole = (
    userRoleTitle || (user ? getRoleName(user.role) : 'Cán bộ vận hành')
  ).replace(/\s*\([^)]*\)\s*$/, '')
  const effectiveAdmin =
    isAdminUser !== undefined ? isAdminUser : isAdmin(user?.role)

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

  // Màu sắc badge vai trò
  let badgeClasses = 'bg-blue-50 text-blue-700 border-blue-200'
  if (isAdmin(user?.role)) {
    badgeClasses = 'bg-purple-50 text-purple-700 border-purple-200'
  } else if (isManagementAgency(user?.role)) {
    badgeClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200'
  } else if (isMaintenanceEngineer(user?.role)) {
    badgeClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200'
  } else if (isFieldCrew(user?.role)) {
    badgeClasses = 'bg-amber-50 text-amber-800 border-amber-200'
  }

  const hasAllCommunes =
    effectiveAdmin || (user?.commune_ids && user.commune_ids.includes('*'))

  return (
    <>
      <header
        className={`h-16 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 select-none z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 text-slate-900 ${className}`}
      >
        {/* Left: Current Page Title / Context */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80 flex items-center justify-center shrink-0 shadow-2xs">
            {isDashboard ? (
              <LayoutDashboard className="w-4.5 h-4.5" />
            ) : isWorkSchedule ? (
              <CalendarDays className="w-4.5 h-4.5" />
            ) : isAssets ? (
              <Boxes className="w-4.5 h-4.5" />
            ) : isCitizenReports ? (
              <MessageSquareWarning className="w-4.5 h-4.5" />
            ) : isReports ? (
              <ClipboardCheck className="w-4.5 h-4.5" />
            ) : isCommunesAdmin ? (
              <Compass className="w-4.5 h-4.5" />
            ) : isFirmwareAdmin ? (
              <Cpu className="w-4.5 h-4.5" />
            ) : isSettingsAdmin ? (
              <SlidersHorizontal className="w-4.5 h-4.5" />
            ) : isAdminDashboard ? (
              <LayoutDashboard className="w-4.5 h-4.5" />
            ) : isUsersAdmin || isAdminPath ? (
              <ShieldCheck className="w-4.5 h-4.5" />
            ) : (
              <Map className="w-4.5 h-4.5" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-base font-bold text-slate-900 leading-tight truncate">
              {isDashboard
                ? isManagementAgency(user?.role)
                  ? 'Tổng quan Giám sát Cấp trên'
                  : 'Bảng điều khiển Quản lý'
                : isWorkSchedule
                ? 'Lịch làm việc'
                : isAssets
                ? 'Quản lý tài sản'
                : isCitizenReports
                ? 'Phản ánh người dân'
                : isReports
                ? 'Báo cáo & Nghiệm thu'
                : isCommunesAdmin
                ? 'Quản lý Địa bàn & Khung Bản đồ (BBox)'
                : isFirmwareAdmin
                ? 'Firmware & Mô hình AI'
                : isSettingsAdmin
                ? 'Cấu hình hệ thống'
                : isAdminDashboard
                ? 'Tổng quan hệ thống'
                : isUsersAdmin
                ? 'Quản lý tài khoản'
                : isAdminPath
                ? 'Quản trị hệ thống'
                : 'Bản đồ chiếu sáng'}
            </h1>
          </div>
        </div>
        {/* Right: Notification Bell + Interactive Profile Dropdown + Quick Logout */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Quick Export Asset CSV Button - Chỉ hiển thị khi đang ở phân hệ Quản lý tài sản */}
          {isAssets && (
            <button
              type="button"
              onClick={() => dispatch(openExportModal())}
              className="h-9 px-2.5 lg:px-3 rounded-xl flex items-center justify-center gap-1.5 whitespace-nowrap bg-slate-100/70 hover:bg-white text-slate-600 hover:text-slate-900 active:scale-95 transition-all duration-200 cursor-pointer border border-slate-200/80 shadow-2xs"
              title="Xuất dữ liệu tài sản ra tệp CSV (Excel)"
              aria-label="Xuất dữ liệu tài sản"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden lg:inline text-xs font-semibold">Xuất dữ liệu</span>
            </button>
          )}

          {/* Chuông thông báo (chỉ Cán bộ Quản lý) */}
          {isMaintenanceEngineer(user?.role) && <NotificationBell />}

          <div className="h-5 w-px bg-slate-200/80" />

          {/* Officer Profile Dropdown Trigger */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2.5 p-1 rounded-2xl hover:bg-slate-100/80 transition-all duration-200 cursor-pointer select-none group border border-transparent hover:border-slate-200/70"
              title="Tài khoản"
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
            >
              <div className="hidden md:flex flex-col items-end leading-tight pl-1.5">
                <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                  {effectiveName}
                </span>
                <span className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                  {effectiveRole}
                </span>
              </div>

              {/* Avatar with deep sapphire gradient */}
              <UserAvatar
                avatarUrl={user?.avatar_url}
                initials={effectiveInitials}
                alt={effectiveName}
                className="w-9 h-9 rounded-2xl bg-linear-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20 ring-2 ring-blue-100 group-hover:scale-105 group-hover:ring-blue-200 transition-all duration-200"
              />

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
                    <UserAvatar
                      avatarUrl={user?.avatar_url}
                      initials={effectiveInitials}
                      alt={effectiveName}
                      className="w-11 h-11 rounded-2xl bg-linear-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm"
                    />
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
                    <span
                      className="font-semibold text-slate-700 truncate max-w-[160px] text-right"
                      title={
                        hasAllCommunes
                          ? 'Toàn hệ thống'
                          : user?.communes && user.communes.length > 0
                          ? user.communes.map((c) => c.name || c.commune_id).join(', ')
                          : `${user?.commune_ids?.length || 0} xã`
                      }
                    >
                      {hasAllCommunes
                        ? 'Toàn hệ thống'
                        : user?.communes && user.communes.length > 0
                        ? user.communes.length === 1
                          ? user.communes[0].name || user.communes[0].commune_id
                          : `${user.communes[0].name || user.communes[0].commune_id} (+${user.communes.length - 1})`
                        : `${user?.commune_ids?.length || 0} xã`}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-1.5 py-1.5 space-y-0.5">
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
                    <span>Hồ sơ cá nhân</span>
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
        </div>
      </header>

      {/* Modal chi tiết hồ sơ cán bộ */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
      />
    </>
  )
}

export default Header
