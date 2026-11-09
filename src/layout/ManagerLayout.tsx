import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Lightbulb,
  LayoutDashboard,
  Map,
  CalendarDays,
  Boxes,
  FileCheck2,
  MessageSquareWarning,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { RootState } from '../redux/rootReducer'
import { logout } from '../feature/auth/authSlice'
import { openExportModal } from '../feature/assets/assetSlice'
import { canAccessTab, isMaintenanceEngineer, isManagementAgency } from '../utils/roleUtils'
import { UserMenu } from '../components/UserMenu'
import { NotificationBell } from '../components/NotificationBell'
import { DownloadIcon } from '../components/ops/DownloadIcon'
import { useModalEscape } from '../hooks/useModalEscape'
import { useMediaQuery } from '../hooks/useMediaQuery'

type TabId = 'dashboard' | 'gis-map' | 'work-schedule' | 'assets' | 'reports' | 'citizen-reports'

interface NavItem {
  tab: TabId
  to: string
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { tab: 'dashboard', to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { tab: 'gis-map', to: '/gis-map', label: 'Bản đồ GIS', icon: Map },
  { tab: 'work-schedule', to: '/work-schedule', label: 'Lịch làm việc', icon: CalendarDays },
  { tab: 'assets', to: '/assets', label: 'Quản lý tài sản', icon: Boxes },
  { tab: 'reports', to: '/reports', label: 'Báo cáo & Nghiệm thu', icon: FileCheck2 },
  { tab: 'citizen-reports', to: '/citizen-reports', label: 'Phản ánh người dân', icon: MessageSquareWarning },
]

const formatToday = (): string =>
  new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })

// Layout riêng cho Manager và Superior: sidebar nổi, tiêu đề trang, nền sáng có lưới chấm mờ
export const ManagerLayout: React.FC = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const { user } = useSelector((state: RootState) => state.auth)
  const [userCollapsed, setUserCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(max-width: 1023px)')
  // Máy tính bảng luôn dùng thanh icon thu gọn; điện thoại dùng ngăn kéo đầy đủ
  const collapsed = !isMobile && (userCollapsed || isTablet)
  useModalEscape()

  // Gắn bảng màu teal cho cả modal được render qua portal
  useEffect(() => {
    document.documentElement.classList.add('ops-theme')
    return () => document.documentElement.classList.remove('ops-theme')
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isMobile) setMobileOpen(false)
  }, [isMobile])

  const pendingCount = useSelector((state: RootState) => state.citizenReports?.pendingCount || 0)
  const role = user?.role
  const items = NAV_ITEMS.filter((item) => canAccessTab(item.tab, role))
  const path = location.pathname

  const isGis = path.startsWith('/gis-map')
  const isAssets = path.startsWith('/assets')
  const displayName = user?.full_name || user?.username || 'bạn'

  let title = ''
  let subtitle = ''
  if (isGis) {
    title = 'Bản đồ GIS'
  } else if (path.startsWith('/dashboard')) {
    title = isManagementAgency(role) ? 'Tổng quan giám sát cấp trên' : `Xin chào, ${displayName}`
    subtitle = formatToday()
  } else if (path.startsWith('/work-schedule')) {
    title = 'Lịch làm việc'
    subtitle = 'Lập lịch, giao việc và duyệt báo cáo của kỹ sư hiện trường'
  } else if (isAssets) {
    title = 'Quản lý tài sản'
    subtitle = 'Tuyến đường, tủ điện, mạch điện, thiết bị IoT, cột và bộ đèn'
  } else if (path.startsWith('/citizen-reports')) {
    title = 'Phản ánh người dân'
    subtitle = 'Đối soát phản ánh quét QR trước khi tạo sự cố'
  } else if (path.startsWith('/reports')) {
    title = 'Báo cáo & Nghiệm thu'
    subtitle = 'Theo dõi tiến độ và hồ sơ nghiệm thu bảo trì'
  }

  return (
    <div className="ops-bg h-dvh w-screen flex gap-4 p-2 md:p-4 overflow-hidden font-ops antialiased text-slate-900">
      {isMobile && mobileOpen && (
        <div
          aria-hidden
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs animate-in fade-in"
        />
      )}
      <aside
        className={`flex flex-col bg-white rounded-3xl shadow-ops p-3.5 select-none transition-[width,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isMobile
            ? `fixed inset-y-2 left-2 z-50 w-64 max-w-[85vw] ${mobileOpen ? 'translate-x-0' : '-translate-x-[110%]'}`
            : `h-full shrink-0 z-40 ${collapsed ? 'w-[76px]' : 'w-58'}`
        }`}
      >
        <div className={`flex items-center gap-3 pb-4 pt-1 ${collapsed ? 'justify-center' : 'px-2'}`}>
          <div className="w-10 h-10 rounded-[14px] bg-linear-to-br from-teal-400 to-teal-600 flex items-center justify-center shrink-0 shadow-[0_8px_16px_-6px_rgba(13,148,136,0.55)]">
            <Lightbulb className="w-5 h-5 text-amber-200 fill-amber-200 drop-shadow-[0_0_6px_rgba(245,165,36,0.9)]" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <span className="block text-[15px] font-extrabold tracking-wide text-slate-900">LUXMAP</span>
              <span className="block text-[11px] font-medium text-slate-400 whitespace-nowrap">Quản lý Chiếu sáng</span>
            </div>
          )}
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Đóng menu"
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {!collapsed && <p className="px-3 pb-1.5 text-[11px] font-bold text-slate-400">Vận hành</p>}

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar -mx-1 px-1 py-1">
          {items.map((item) => {
            const Icon = item.icon
            const badge = item.tab === 'citizen-reports' ? pendingCount : 0
            return (
              <NavLink
                key={item.tab}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center rounded-2xl text-[13px] font-semibold transition-all duration-200 active:scale-[0.98] ${
                    collapsed ? 'justify-center h-12 w-12 mx-auto' : 'gap-3 px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-linear-to-br from-teal-500 to-teal-700 text-white shadow-[0_10px_20px_-10px_rgba(13,148,136,0.75)]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-0.5'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200 ${
                        isActive ? 'bg-white/20' : 'bg-slate-50 group-hover:bg-white'
                      }`}
                    >
                      <Icon className="h-[17px] w-[17px]" />
                    </span>
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {badge > 0 && (
                      <span
                        className={`rounded-full px-2 text-[11px] font-bold ${
                          collapsed ? 'absolute -top-0.5 -right-0.5' : ''
                        } ${isActive ? 'bg-white/25 text-white' : 'bg-teal-50 text-teal-800'}`}
                      >
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={() => setUserCollapsed((v) => !v)}
          title={collapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
          className="mb-2 hidden lg:flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" />Thu gọn</>}
        </button>

        <UserMenu user={user ?? null} variant="sidebar" collapsed={collapsed} onLogout={() => dispatch(logout())} />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {(!isGis || isMobile) && (
          <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-x-3 gap-y-2 px-1 pt-1 shrink-0">
            {isMobile && (
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Mở menu"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-ops active:scale-95 transition cursor-pointer"
              >
                <Menu className="h-5 w-5 text-slate-700" />
              </button>
            )}
            <div className="min-w-[8rem] flex-1">
              <h1 className="text-lg md:text-[23px] font-extrabold tracking-tight text-slate-900 truncate">{title}</h1>
              {subtitle && <p className="text-[13px] text-slate-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
            <div className="ml-auto flex items-center gap-2.5 shrink-0">
              <div id="ops-topbar-slot" className="flex items-center gap-2.5" />
              {isAssets && (
                <button
                  type="button"
                  onClick={() => dispatch(openExportModal())}
                  title="Xuất dữ liệu tài sản ra tệp CSV (Excel)"
                  aria-label="Xuất dữ liệu"
                  className="download-trigger w-10 h-10 rounded-2xl bg-white shadow-ops hover:shadow-ops-hover hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center text-slate-600 hover:text-teal-700 cursor-pointer"
                >
                  <DownloadIcon className="w-[18px] h-[18px]" />
                </button>
              )}
              {isMaintenanceEngineer(role) && <NotificationBell />}
            </div>
          </div>
        )}

        <main className="flex-1 min-h-0 relative">
          <div
            key={path}
            className={`w-full h-full animate-tab-view ${isGis ? 'rounded-2xl md:rounded-3xl overflow-hidden shadow-ops' : ''}`}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default ManagerLayout
