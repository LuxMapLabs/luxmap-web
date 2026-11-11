import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Lightbulb,
  LayoutDashboard,
  ShieldCheck,
  Compass,
  Cpu,
  SlidersHorizontal,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from 'lucide-react'
import type { RootState } from '../redux/rootReducer'
import { logout } from '../feature/auth/authSlice'
import { SidebarAccount } from '../components/SidebarAccount'
import { useModalEscape } from '../hooks/useModalEscape'

interface AdminNavItem {
  to: string
  label: string
  title: string
  icon: LucideIcon
  isActive: (path: string) => boolean
}

const NAV_ITEMS: AdminNavItem[] = [
  {
    to: '/admin/dashboard',
    label: 'Tổng quan hệ thống',
    title: 'Tổng quan hệ thống',
    icon: LayoutDashboard,
    isActive: (p) => p === '/admin/dashboard' || p === '/admin',
  },
  {
    to: '/admin/system',
    label: 'Quản lý tài khoản',
    title: 'Quản lý tài khoản',
    icon: ShieldCheck,
    isActive: (p) => p === '/admin/system' || p.startsWith('/admin/users'),
  },
  {
    to: '/admin/communes',
    label: 'Địa bàn & Khung BBox',
    title: 'Quản lý Địa bàn & Khung Bản đồ (BBox)',
    icon: Compass,
    isActive: (p) => p.startsWith('/admin/communes'),
  },
  {
    to: '/admin/firmware',
    label: 'Firmware & AI',
    title: 'Firmware & Mô hình AI',
    icon: Cpu,
    isActive: (p) => p.startsWith('/admin/firmware'),
  },
  {
    to: '/admin/settings',
    label: 'Cấu hình hệ thống',
    title: 'Cấu hình hệ thống',
    icon: SlidersHorizontal,
    isActive: (p) => p.startsWith('/admin/settings'),
  },
]

const formatToday = (): string =>
  new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })

// Layout riêng cho Quản trị viên: sidebar + header kiểu kính mờ
export const AdminLayout: React.FC = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const { user } = useSelector((state: RootState) => state.auth)
  const [collapsed, setCollapsed] = useState(false)
  useModalEscape()

  // admin-theme đổi dải màu sang slate-tím than, gắn lên html để cả modal render qua portal cũng nhận
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('admin-theme')
    return () => root.classList.remove('admin-theme')
  }, [])

  const current = NAV_ITEMS.find((item) => item.isActive(location.pathname))
  const displayName = user?.full_name || user?.username || 'bạn'
  const headerTitle =
    current?.to === '/admin/dashboard' ? `Xin chào, ${displayName}` : (current?.title ?? 'Quản trị hệ thống')

  return (
    <div className="admin-shell h-screen w-screen flex overflow-hidden font-sans antialiased text-slate-900">
      <aside
        className={`h-screen flex flex-col shrink-0 select-none z-40 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] bg-white/95 backdrop-blur-xl border-r border-slate-200/80 shadow-[1px_0_3px_rgba(0,0,0,0.02)] ${
          collapsed ? 'w-18' : 'w-60'
        }`}
      >
        <div className={`flex items-center gap-2.5 pb-5 pt-5 ${collapsed ? 'justify-center' : 'px-5'}`}>
          <div className={`flex items-center gap-2.5 overflow-hidden cursor-default flex-1 ${collapsed ? 'justify-center' : ''}`}>
            <div className="h-9 w-9 text-white flex items-center justify-center shrink-0 rounded-[12px] bg-linear-to-tr from-blue-600 via-blue-700 to-indigo-700 shadow-md shadow-blue-600/25">
              <Lightbulb className="h-[18px] w-[18px] fill-white text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
            </div>
            {!collapsed && <span className="flex-1 text-[15px] font-extrabold tracking-wide text-slate-900">LUXMAP</span>}
          </div>
        </div>

        {!collapsed && <p className="px-6 pb-1.5 text-[11px] font-bold text-slate-500">Quản trị</p>}

        <nav className={`flex-1 pb-4 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar ${collapsed ? 'px-3' : 'px-3.5'}`}>
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(location.pathname)
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={`relative flex items-center rounded-2xl text-[13px] font-semibold transition-all duration-200 group active:scale-[0.98] ${
                  collapsed ? 'justify-center w-12 h-12 mx-auto' : 'px-3 py-2.5 gap-3 w-full'
                } ${
                  active
                    ? 'bg-white text-blue-700 shadow-[0_6px_16px_-8px_rgba(59,63,107,0.4)]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                  <Icon
                    className={`w-[18px] h-[18px] transition-transform duration-200 ${
                      active ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-800'
                    }`}
                  />
                </span>
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        <div className="mx-3.5 mb-3.5 mt-2 border-t border-slate-200/80 pt-3 space-y-1">
          <SidebarAccount
            user={user ?? null}
            collapsed={collapsed}
            onLogout={() => dispatch(logout())}
            avatarClassName="bg-linear-to-br from-blue-500 to-blue-700 text-white"
            logoutHoverClassName="hover:text-rose-600"
          />
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 cursor-pointer"
            title={collapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
          >
            {collapsed ? (
              <ChevronsRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronsLeft className="w-4 h-4" />
                Thu gọn
              </>
            )}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="px-5 py-3 flex items-center gap-3 shrink-0 select-none z-30 text-slate-900 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="min-w-0">
            <h1 className="text-lg md:text-[23px] font-extrabold tracking-tight text-slate-900 leading-tight truncate">
              {headerTitle}
            </h1>
            <p className="text-[13px] text-slate-500 mt-0.5 truncate">{formatToday()}</p>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative w-full h-full">
          <div key={location.pathname} className="w-full h-full animate-tab-view">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
