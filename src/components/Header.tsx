import React, { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import {
  Bell,
  Map,
  Boxes,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  RefreshCw,
  ChevronDown,
  CalendarDays,
  MessageSquareWarning,
  ClipboardCheck,
  LayoutDashboard,
  FileDown,
  Compass,
  SlidersHorizontal,
} from 'lucide-react'
import { openExportModal } from '../feature/assets/assetSlice'
import { User, UserRole } from '../types/auth/web'
import { getRoleName } from '../utils/roleUtils'
import { ProfileModal } from './ProfileModal'

export interface HeaderProps {
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
  const dispatch = useDispatch()
  const location = useLocation()
  const isDashboard = location.pathname.startsWith('/dashboard')
  const isWorkSchedule = location.pathname.startsWith('/work-schedule')
  const isAssets = location.pathname.startsWith('/assets')
  const isCitizenReports = location.pathname.startsWith('/citizen-reports')
  const isReports = location.pathname.startsWith('/reports')
  const isCommunesAdmin = location.pathname.startsWith('/admin/communes')
  const isSettingsAdmin = location.pathname.startsWith('/admin/settings')
  const isAdminDashboard = location.pathname === '/admin/dashboard' || location.pathname === '/admin'
  const isUsersAdmin = location.pathname === '/admin/system' || location.pathname.startsWith('/admin/users')
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
        {/* Left: Current Page Title / Context */}
        <div className="flex items-center gap-2.5 shrink-0">
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
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-slate-900 leading-tight">
              {isDashboard
                ? 'Bảng điều khiển Quản lý'
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
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5 hidden sm:block">
              {isDashboard
                ? 'Giám sát chỉ số vận hành, sự cố & tình trạng bảo hành bóng đèn'
                : isWorkSchedule
                ? 'Lập lịch khảo sát, kiểm tra & điều phối sửa chữa'
                : isAssets
                ? 'Danh mục Cột đèn, Tủ điện & Tuyến đường'
                : isCitizenReports
                ? 'Thẩm định và xử lý báo cáo sự cố chiếu sáng từ mã QR'
                : isReports
                ? 'Tổng hợp số liệu vận hành & chất lượng chiếu sáng'
                : isCommunesAdmin
                ? 'Khai báo đơn vị hành chính xã/thị trấn và thiết lập khung bao bản đồ định vị'
                : isSettingsAdmin
                ? 'Thiết lập ngưỡng phát hiện đèn mờ & thời gian cảnh báo mất kết nối IoT'
                : isAdminDashboard
                ? 'Giám sát hạ tầng máy chủ, tiến trình nền, lưu trữ & tổng quan vận hành'
                : isUsersAdmin
                ? 'Cấu hình và phân quyền người dùng'
                : isAdminPath
                ? 'Cấu hình và phân quyền người dùng'
                : 'Giám sát lưới điện & hiện trạng tài sản theo thời gian thực'}
            </p>
          </div>
        </div>
        {/* Right: Notification Bell + Interactive Profile Dropdown + Quick Logout */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Quick Export Asset CSV Button - Chỉ hiển thị khi đang ở phân hệ Quản lý tài sản */}
          {isAssets && (
            <button
              type="button"
              onClick={() => dispatch(openExportModal())}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-600 hover:text-emerald-700 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-emerald-200/90 shadow-2xs group"
              title="Xuất dữ liệu tài sản ra tệp CSV (Excel)"
              aria-label="Xuất dữ liệu tài sản"
            >
              <FileDown className="w-4 h-4 text-emerald-600 group-hover:-translate-y-0.5 transition-transform duration-200" />
            </button>
          )}

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
