import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Lightbulb,
  Map,
  Boxes,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  FileCheck2,
  MessageSquareWarning,
  LayoutDashboard,
  Compass,
  SlidersHorizontal,
} from 'lucide-react'
import { User } from '../types/auth/web'
import { canAccessTab } from '../utils/roleUtils'
import type { RootState } from '../redux/rootReducer'

export interface SidebarProps {
  brandTitle?: string
  brandSubtitle?: string
  user?: User | null
  isAdminUser?: boolean
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  className?: string
}

export const Sidebar: React.FC<SidebarProps> = ({
  brandTitle = 'LUXMAP',
  brandSubtitle = 'Quản lý Chiếu sáng',
  user = null,
  isAdminUser,
  isCollapsed = false,
  onToggleCollapse,
  className = '',
}) => {
  const location = useLocation()
  const isDashboard = location.pathname.startsWith('/dashboard')
  const isGisMap = location.pathname.startsWith('/gis-map')
  const isWorkSchedule = location.pathname.startsWith('/work-schedule')
  const isAssets = location.pathname.startsWith('/assets')
  const isReports = location.pathname.startsWith('/reports')
  const isCitizenReports = location.pathname.startsWith('/citizen-reports')
  const isDashboardAdmin = location.pathname === '/admin/dashboard' || location.pathname === '/admin'
  const isUsersAdmin = location.pathname === '/admin/system' || location.pathname.startsWith('/admin/users')
  const isCommunesAdmin = location.pathname.startsWith('/admin/communes')
  const isSettingsAdmin = location.pathname.startsWith('/admin/settings')

  // Lấy pendingCount từ store để gắn badge
  const pendingCount = useSelector(
    (state: RootState) => state.citizenReports?.pendingCount || 0
  )

  // Phân quyền hiển thị từng tab theo vai trò người dùng (RBAC)
  const userRole = user?.role
  const showDashboard = canAccessTab('dashboard', userRole)
  const showGisMap = canAccessTab('gis-map', userRole)
  const showWorkSchedule = canAccessTab('work-schedule', userRole)
  const showAssets = canAccessTab('assets', userRole)
  const showReports = canAccessTab('reports', userRole)
  const showCitizenReports = canAccessTab('citizen-reports', userRole)
  const showAdmin = isAdminUser !== undefined ? isAdminUser : canAccessTab('admin-system', userRole)

  return (
    <aside
      className={`h-screen bg-white/95 backdrop-blur-xl border-r border-slate-200/80 flex flex-col shrink-0 select-none z-40 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[1px_0_3px_rgba(0,0,0,0.02)] ${
        isCollapsed ? 'w-18' : 'w-max'
      } ${className}`}
    >
      {/* 1. Header / Logo Area */}
      <div className={`h-16 flex items-center border-b border-slate-200/80 px-4 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3 overflow-hidden cursor-default select-none">
          {/* Emblem: Deep sapphire tile with warm golden glowing bulb */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-700 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-600/25 ring-4 ring-blue-50 shrink-0">
            <Lightbulb className="w-5 h-5 text-amber-300 fill-amber-300/90 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]" />
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0 transition-opacity duration-200 pr-2">
              <span className="font-black text-sm tracking-wider text-slate-900 uppercase font-sans leading-none whitespace-nowrap">
                {brandTitle}
              </span>
              {brandSubtitle && (
                <p className="text-[11px] text-slate-500 font-medium leading-none mt-1 whitespace-nowrap">
                  {brandSubtitle}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Navigation Tab List */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
        {/* Tab 0: Bảng điều khiển / Tổng quan (Dành cho Manager) */}
        {showDashboard && (
          <NavLink
            to="/dashboard"
            title="Tổng quan"
            className={`flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group active:scale-[0.98] ${
              isCollapsed ? 'justify-center w-11 h-11 mx-auto' : 'px-3.5 py-2.5 gap-3 w-full'
            } ${
              isDashboard
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
            }`}
          >
            <LayoutDashboard
              className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 ${
                isDashboard ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-slate-700'
              }`}
            />
            {!isCollapsed && (
              <span className="flex-1 tracking-tight whitespace-nowrap">Tổng quan</span>
            )}
            {!isCollapsed && isDashboard && (
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse ml-2" />
            )}
          </NavLink>
        )}

        {/* Tab 1: Bản đồ GIS Chiếu sáng (Dành cho Manager & Cấp trên Giám sát) */}
        {showGisMap && (
          <NavLink
            to="/gis-map"
            title="Bản đồ GIS"
            className={`flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group active:scale-[0.98] ${
              isCollapsed ? 'justify-center w-11 h-11 mx-auto' : 'px-3.5 py-2.5 gap-3 w-full'
            } ${
              isGisMap
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
            }`}
          >
            <Map
              className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 ${
                isGisMap ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-slate-700'
              }`}
            />
            {!isCollapsed && (
              <span className="flex-1 tracking-tight whitespace-nowrap">Bản đồ GIS</span>
            )}
            {!isCollapsed && isGisMap && (
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse ml-2" />
            )}
          </NavLink>
        )}

        {/* Tab 2: Lịch làm việc / Phân công (Dành riêng cho Manager) */}
        {showWorkSchedule && (
          <NavLink
            to="/work-schedule"
            title="Lịch làm việc"
            className={`flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group active:scale-[0.98] ${
              isCollapsed ? 'justify-center w-11 h-11 mx-auto' : 'px-3.5 py-2.5 gap-3 w-full'
            } ${
              isWorkSchedule
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
            }`}
          >
            <CalendarDays
              className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 ${
                isWorkSchedule ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-slate-700'
              }`}
            />
            {!isCollapsed && (
              <span className="flex-1 tracking-tight whitespace-nowrap">Lịch làm việc</span>
            )}
            {!isCollapsed && isWorkSchedule && (
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse ml-2" />
            )}
          </NavLink>
        )}

        {/* Tab 3: Quản lý tài sản (Dành riêng cho Manager) */}
        {showAssets && (
          <NavLink
            to="/assets"
            title="Quản lý tài sản"
            className={`flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group active:scale-[0.98] ${
              isCollapsed ? 'justify-center w-11 h-11 mx-auto' : 'px-3.5 py-2.5 gap-3 w-full'
            } ${
              isAssets
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
            }`}
          >
            <Boxes
              className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 ${
                isAssets ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-slate-700'
              }`}
            />
            {!isCollapsed && (
              <span className="flex-1 tracking-tight whitespace-nowrap">Quản lý tài sản</span>
            )}
            {!isCollapsed && isAssets && (
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse ml-2" />
            )}
          </NavLink>
        )}

        {/* Tab Báo cáo & Nghiệm thu: CHỈ DÀNH CHO Cấp trên Giám sát (Superior) */}
        {showReports && (
          <NavLink
            to="/reports"
            title="Báo cáo & Nghiệm thu"
            className={`flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group active:scale-[0.98] ${
              isCollapsed ? 'justify-center w-11 h-11 mx-auto' : 'px-3.5 py-2.5 gap-3 w-full'
            } ${
              isReports
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
            }`}
          >
            <FileCheck2
              className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 ${
                isReports ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-slate-700'
              }`}
            />
            {!isCollapsed && (
              <span className="flex-1 tracking-tight whitespace-nowrap">Báo cáo & Nghiệm thu</span>
            )}
            {!isCollapsed && isReports && (
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse ml-2" />
            )}
          </NavLink>
        )}

        {/* Tab 4: Phản ánh người dân (Chỉ dành cho Quản lý / Manager) */}
        {showCitizenReports && (
          <NavLink
            to="/citizen-reports"
            title="Phản ánh người dân"
            className={`flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group active:scale-[0.98] relative ${
              isCollapsed ? 'justify-center w-11 h-11 mx-auto' : 'px-3.5 py-2.5 gap-3 w-full'
            } ${
              isCitizenReports
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
            }`}
          >
            <MessageSquareWarning
              className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 ${
                isCitizenReports ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-slate-700'
              }`}
            />
            {!isCollapsed && (
              <span className="flex-1 tracking-tight whitespace-nowrap">Phản ánh người dân</span>
            )}
            {pendingCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isCitizenReports
                    ? 'bg-white text-blue-700'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                } ${isCollapsed ? 'absolute -top-1 -right-1' : 'ml-auto'}`}
              >
                {pendingCount}
              </span>
            )}
            {!isCollapsed && isCitizenReports && pendingCount === 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse ml-2" />
            )}
          </NavLink>
        )}

                {/* Tab 4.5: Tổng quan quản trị hệ thống (Dành cho Admin) */}
        {showAdmin && (
          <NavLink
            to="/admin/dashboard"
            title="Tổng quan hệ thống"
            className={`flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group active:scale-[0.98] ${
              isCollapsed ? 'justify-center w-11 h-11 mx-auto' : 'px-3.5 py-2.5 gap-3 w-full'
            } ${
              isDashboardAdmin
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
            }`}
          >
            <LayoutDashboard
              className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 ${
                isDashboardAdmin ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-slate-700'
              }`}
            />
            {!isCollapsed && (
              <span className="flex-1 tracking-tight whitespace-nowrap">Tổng quan hệ thống</span>
            )}
            {!isCollapsed && isDashboardAdmin && (
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse ml-2" />
            )}
          </NavLink>
        )}

        {/* Tab 5: Quản lý người dùng (Dành cho Admin) */}
        {showAdmin && (
          <NavLink
            to="/admin/system"
            title="Quản lý tài khoản"
            className={`flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group active:scale-[0.98] ${
              isCollapsed ? 'justify-center w-11 h-11 mx-auto' : 'px-3.5 py-2.5 gap-3 w-full'
            } ${
              isUsersAdmin
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
            }`}
          >
            <ShieldCheck
              className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 ${
                isUsersAdmin ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-slate-700'
              }`}
            />
            {!isCollapsed && (
              <span className="flex-1 tracking-tight whitespace-nowrap">Quản lý tài khoản</span>
            )}
            {!isCollapsed && isUsersAdmin && (
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse ml-2" />
            )}
          </NavLink>
        )}

        {/* Tab 6: Quản lý địa bàn (Trang riêng dành cho Admin) */}
        {showAdmin && (
          <NavLink
            to="/admin/communes"
            title="Địa bàn & Khung BBox"
            className={`flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group active:scale-[0.98] ${
              isCollapsed ? 'justify-center w-11 h-11 mx-auto' : 'px-3.5 py-2.5 gap-3 w-full'
            } ${
              isCommunesAdmin
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
            }`}
          >
            <Compass
              className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 ${
                isCommunesAdmin ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-slate-700'
              }`}
            />
            {!isCollapsed && (
              <span className="flex-1 tracking-tight whitespace-nowrap">Địa bàn & Khung BBox</span>
            )}
            {!isCollapsed && isCommunesAdmin && (
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse ml-2" />
            )}
          </NavLink>
        )}

        {/* Tab 7: Cấu hình hệ thống (Dành cho Admin) */}
        {showAdmin && (
          <NavLink
            to="/admin/settings"
            title="Cấu hình hệ thống"
            className={`flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group active:scale-[0.98] ${
              isCollapsed ? 'justify-center w-11 h-11 mx-auto' : 'px-3.5 py-2.5 gap-3 w-full'
            } ${
              isSettingsAdmin
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
            }`}
          >
            <SlidersHorizontal
              className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 ${
                isSettingsAdmin ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-slate-700'
              }`}
            />
            {!isCollapsed && (
              <span className="flex-1 tracking-tight whitespace-nowrap">Cấu hình hệ thống</span>
            )}
            {!isCollapsed && isSettingsAdmin && (
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse ml-2" />
            )}
          </NavLink>
        )}
      </nav>

      {/* 3. Bottom Collapse Toggle */}
      {onToggleCollapse && (
        <div className="p-3 border-t border-slate-200/80 flex items-center justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 cursor-pointer"
            title={isCollapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-xs font-medium whitespace-nowrap">Thu gọn menu</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
