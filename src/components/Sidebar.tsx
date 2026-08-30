import React from 'react'
import { NavLink } from 'react-router-dom'
import { Map } from 'lucide-react'

export interface SidebarTabItem {
  to: string
  label: string
  icon: React.ReactNode
  badge?: string | number
  badgeColor?: string
  disabled?: boolean
}

export interface SidebarProps {
  tabs?: SidebarTabItem[]
  userName?: string
  userRoleTitle?: string
  userInitials?: string
  className?: string
}

export const Sidebar: React.FC<SidebarProps> = ({
  tabs,
  userName = 'Khang Nguyễn',
  userRoleTitle = 'Kỹ sư Bảo trì',
  userInitials = 'KN',
  className = '',
}) => {
  const defaultTabs: SidebarTabItem[] = [
    {
      to: '/gis-map',
      label: 'Bản đồ chiếu sáng',
      icon: <Map className="w-4 h-4" />,
    },
  ]



  const navTabs = tabs || defaultTabs

  return (
    <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-3.5 shrink-0 select-none z-20 h-full ${className}`}>
      
      {/* Top Navigation Menu List */}
      <nav className="space-y-1.5 flex-1 pt-1 overflow-y-auto">
        {navTabs.map((tab) => {
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all select-none cursor-pointer ${
                  isActive
                    ? 'bg-[#1f3864] text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-semibold'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <span className={`shrink-0 ${isActive ? 'text-white' : ''}`}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </div>

                  {tab.badge !== undefined && (
                    <span
                      className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : tab.badgeColor || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom Section: User Profile */}
      <div className="pt-3 border-t border-slate-200/80">
        <div className="p-2.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1f3864] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-xs text-slate-900 leading-tight truncate">
              {userName}
            </p>
            <p className="text-[10px] text-slate-500 font-medium leading-tight truncate mt-0.5">
              {userRoleTitle}
            </p>
          </div>
        </div>
      </div>

    </aside>
  )
}

export default Sidebar
