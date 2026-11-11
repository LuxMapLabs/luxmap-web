import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Lightbulb,
  LayoutDashboard,
  Map,
  FileCheck2,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { RootState } from '../redux/rootReducer'
import { logout } from '../feature/auth/authSlice'
import { SidebarAccount } from '../components/SidebarAccount'
import { useModalEscape } from '../hooks/useModalEscape'
import { useMediaQuery } from '../hooks/useMediaQuery'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

// Superior chỉ xem: tổng quan, bản đồ và hồ sơ nghiệm thu
const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/gis-map', label: 'Bản đồ GIS', icon: Map },
  { to: '/reports', label: 'Báo cáo & Nghiệm thu', icon: FileCheck2 },
]

const formatToday = (): string =>
  new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })

// Layout riêng cho Superior: nền xanh nhạt, sidebar và thanh tiêu đề nổi bằng kính mờ sáng
export const SuperiorLayout: React.FC = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const { user } = useSelector((state: RootState) => state.auth)
  const [userCollapsed, setUserCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  // Chế độ trình chiếu (toàn màn hình): ẩn sidebar, chỉ giữ header và nội dung trang
  const [presenting, setPresenting] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(max-width: 1023px)')
  // Máy tính bảng luôn dùng thanh icon thu gọn; điện thoại dùng ngăn kéo đầy đủ
  const collapsed = !isMobile && (userCollapsed || isTablet)
  useModalEscape()

  // ops-theme giữ thang chữ chung; superior-theme đổi dải màu sang xanh sương, áp cả cho modal render qua portal
  useEffect(() => {
    const onFullscreenChange = () => setPresenting(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('ops-theme', 'superior-theme')
    return () => root.classList.remove('ops-theme', 'superior-theme')
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isMobile) setMobileOpen(false)
  }, [isMobile])

  const path = location.pathname
  const isGis = path.startsWith('/gis-map')


  const displayName = user?.full_name || user?.username || 'bạn'
  let title = ''
  let subtitle = ''
  if (isGis) {
    title = 'Bản đồ GIS'
  } else if (path.startsWith('/dashboard')) {
    if (presenting) {
      // Đang trình chiếu cho người khác xem: bỏ lời chào cá nhân, ghi tên xã và ngày
      title = 'Tổng quan giám sát'
      subtitle = [user?.communes?.[0]?.name, formatToday()].filter(Boolean).join(' · ')
    } else {
      title = `Xin chào, ${displayName}`
      subtitle = formatToday()
    }
  } else if (path.startsWith('/reports')) {
    title = 'Báo cáo & Nghiệm thu'
    subtitle = 'Theo dõi tiến độ và hồ sơ nghiệm thu bảo trì'
  }

  return (
    <div className="superior-bg h-dvh w-screen flex gap-4 p-2 md:p-4 overflow-hidden font-ops antialiased text-slate-900">
      {isMobile && mobileOpen && (
        <div
          aria-hidden
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs animate-in fade-in"
        />
      )}
      {!presenting && (
      <aside
        className={`flex flex-col rounded-3xl bg-linear-to-b from-[#D6E6F4] via-[#E8F1F9] to-white shadow-[0_12px_32px_-16px_rgba(59,99,133,0.35)] p-3.5 select-none transition-[width,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isMobile
            ? `fixed inset-y-2 left-2 z-50 w-64 max-w-[85vw] bg-[#F3F8FC] ${mobileOpen ? 'translate-x-0' : '-translate-x-[110%]'}`
            : `h-full shrink-0 z-40 ${collapsed ? 'w-[76px]' : 'w-60'}`
        }`}
      >
        <div className={`flex items-center gap-2.5 pb-5 pt-1 ${collapsed ? 'justify-center' : 'px-2'}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-linear-to-br from-[#8FB8DA] to-[#4A7AA3] shadow-[0_8px_16px_-6px_rgba(74,122,163,0.6)]">
            <Lightbulb className="h-[18px] w-[18px] fill-white text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
          </div>
          {!collapsed && <span className="flex-1 text-[15px] font-extrabold tracking-wide text-slate-900">LUXMAP</span>}
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Đóng menu"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-white/70 hover:text-slate-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {!collapsed && <p className="px-3 pb-1.5 text-[11px] font-bold text-slate-500">Giám sát</p>}

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar -mx-1 px-1 py-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center rounded-2xl text-[13px] font-semibold transition-all duration-200 active:scale-[0.98] ${
                    collapsed ? 'justify-center h-12 w-12 mx-auto' : 'gap-3 px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-white text-[#3B6385] shadow-[0_6px_16px_-8px_rgba(59,99,133,0.4)]'
                      : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                      <Icon
                        className={`h-[18px] w-[18px] transition-colors duration-200 ${
                          isActive ? 'text-[#4A7AA3]' : 'text-slate-500 group-hover:text-slate-800'
                        }`}
                      />
                    </span>
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="mt-2 space-y-1 border-t border-[#B8D4EA]/60 pt-3">
          <SidebarAccount
            user={user ?? null}
            collapsed={collapsed}
            onLogout={() => dispatch(logout())}
            avatarClassName="bg-linear-to-br from-[#B8D4EA] to-[#8FB8DA] text-slate-800"
            logoutHoverClassName="hover:text-rose-500"
          />
          <button
            type="button"
            onClick={() => setUserCollapsed((v) => !v)}
            title={collapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
            className="hidden w-full lg:flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-slate-500 hover:bg-white/60 hover:text-slate-800 transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" />Thu gọn</>}
          </button>
        </div>
      </aside>
      )}


      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {(!isGis || isMobile) && (
          <div className="relative z-30 flex flex-wrap md:flex-nowrap items-center justify-between gap-x-3 gap-y-2 rounded-3xl bg-linear-to-r from-[#D6E6F4] via-[#E8F1F9] to-[#F3F8FC] px-5 py-3 shadow-[0_12px_32px_-16px_rgba(59,99,133,0.25)] shrink-0">
            {isMobile && (
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Mở menu"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white active:scale-95 transition cursor-pointer"
              >
                <Menu className="h-5 w-5 text-slate-800" />
              </button>
            )}
            <div className="min-w-[8rem] flex-1">
              <h1 className="text-lg md:text-[23px] font-extrabold tracking-tight text-slate-900 truncate">{title}</h1>
              {subtitle && <p className="text-[13px] text-slate-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
            <div className="ml-auto flex items-center gap-2.5 shrink-0">
              <div id="ops-topbar-slot" className="flex items-center gap-2.5" />
            </div>
          </div>
        )}

        <main
          className="flex-1 min-h-0 relative"
          style={isGis ? undefined : { maskImage: 'linear-gradient(to bottom, transparent 0, #000 14px)' }}
        >
          <div
            key={path}
            className={`w-full h-full animate-tab-view ${
              isGis ? 'overflow-hidden rounded-2xl md:rounded-3xl shadow-[0_12px_32px_-16px_rgba(59,99,133,0.4)]' : ''
            }`}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default SuperiorLayout
