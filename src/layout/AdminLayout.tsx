import React, { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Lightbulb,
  LayoutDashboard,
  ShieldCheck,
  Compass,
  Cpu,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import type { RootState } from '../redux/rootReducer'
import { logout } from '../feature/auth/authSlice'
import { UserMenu } from '../components/UserMenu'
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

// Layout riêng cho Quản trị viên: sidebar + header kiểu kính mờ
export const AdminLayout: React.FC = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const { user } = useSelector((state: RootState) => state.auth)
  const [collapsed, setCollapsed] = useState(false)
  useModalEscape()

  const current = NAV_ITEMS.find((item) => item.isActive(location.pathname))
  const CurrentIcon = current?.icon ?? ShieldCheck

  return (
    <div className="admin-shell h-screen w-screen flex overflow-hidden font-sans antialiased text-slate-900">
      <aside
        className={`h-screen flex flex-col shrink-0 select-none z-40 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] bg-white/95 backdrop-blur-xl border-r border-slate-200/80 shadow-[1px_0_3px_rgba(0,0,0,0.02)] ${
          collapsed ? 'w-18' : 'w-60'
        }`}
      >
        <div
          className={`h-16 flex items-center border-b border-slate-200/80 px-4 ${collapsed ? 'justify-center' : ''}`}
        >
          <div className="flex items-center gap-3 overflow-hidden cursor-default">
            <div className="w-10 h-10 text-white flex items-center justify-center shrink-0 rounded-2xl bg-linear-to-tr from-blue-600 via-blue-700 to-indigo-700 shadow-md shadow-blue-600/25 ring-4 ring-blue-50">
              <Lightbulb className="w-5 h-5 text-amber-300 fill-amber-300/90 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0 pr-2">
                <span className="font-black text-sm tracking-wider text-slate-900 uppercase leading-none whitespace-nowrap">
                  LUXMAP
                </span>
                <p className="text-[11px] text-slate-500 font-medium leading-none mt-1 whitespace-nowrap">
                  Quản lý Chiếu sáng
                </p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(location.pathname)
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={`relative flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group active:scale-[0.98] ${
                  collapsed ? 'justify-center w-11 h-11 mx-auto' : 'px-3.5 py-2.5 gap-3 w-full'
                } ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 ${
                    active ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                />
                {!collapsed && <span className="flex-1 tracking-tight whitespace-nowrap">{item.label}</span>}
                {!collapsed && active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse ml-2" />
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-200/80 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 cursor-pointer"
            title={collapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-xs font-medium whitespace-nowrap">Thu gọn menu</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-16 px-6 flex items-center justify-between shrink-0 select-none z-30 text-slate-900 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80 shadow-2xs">
              <CurrentIcon className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-base font-bold text-slate-900 leading-tight truncate">
              {current?.title ?? 'Quản trị hệ thống'}
            </h1>
          </div>
          <UserMenu user={user ?? null} variant="admin" onLogout={() => dispatch(logout())} />
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
