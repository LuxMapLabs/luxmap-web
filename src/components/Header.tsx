import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Lightbulb,
  Bell,
  Map,
  Boxes,
} from 'lucide-react'

export interface HeaderProps {
  brandTitle?: string
  brandSubtitle?: string
  userName?: string
  userRoleTitle?: string
  userInitials?: string
  hasNotification?: boolean
  onNotificationClick?: () => void
  className?: string
}

export const Header: React.FC<HeaderProps> = ({
  brandTitle = 'LUXMAP GIS',
  brandSubtitle = 'Hệ thống Giám sát & Quản lý Chiếu sáng Công cộng',
  userName = 'Khang Nguyễn',
  userRoleTitle = 'Kỹ sư Bảo trì • Đội 1',
  userInitials = 'KN',
  hasNotification = true,
  onNotificationClick,
  className = '',
}) => {
  const location = useLocation()
  const isGisMap = location.pathname.startsWith('/gis-map') || location.pathname === '/'

  return (
    <header className={`h-14 bg-[#13223f] border-b border-[#1c325c] px-5 flex items-center justify-between shrink-0 select-none z-30 shadow-md transition-colors duration-200 text-white ${className}`}>
      
      {/* Left: Institutional Logo + System Title + Subtitle */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[#1c325c] hover:bg-[#27467c] text-white flex items-center justify-center shadow-xs shrink-0 border border-[#2b4b84]/50 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer">
          <Lightbulb className="w-5 h-5 text-amber-300 fill-amber-300" />
        </div>

        <div className="flex flex-col">
          <span className="font-extrabold text-sm tracking-wider text-white uppercase font-sans leading-none">
            {brandTitle}
          </span>
          {brandSubtitle && (
            <p className="text-[10.5px] text-blue-200/90 font-medium leading-none mt-1 hidden sm:block">
              {brandSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* Center: GovTech Enterprise Segmented Navigation with Sliding Pill Animation */}
      <nav className="relative grid grid-cols-2 w-[340px] bg-[#0b1322]/90 p-1 rounded-xl border border-[#1c325c] shadow-inner select-none transition-colors duration-200">
        
        {/* Animated Sliding Active Pill (Spring Easing) */}
        <div
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-[#1f3864] shadow-sm border border-[#325696]/60 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${
            isGisMap ? 'left-1' : 'left-[calc(50%+2px)]'
          }`}
        />

        {/* Tab 1: GIS Map */}
        <NavLink
          to="/gis-map"
          className={`relative z-10 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs transition-colors duration-200 select-none cursor-pointer ${
            isGisMap
              ? 'text-white font-bold'
              : 'text-blue-200/80 hover:text-white hover:bg-[#1c325c]/50 font-semibold'
          }`}
        >
          <Map
            className={`w-3.5 h-3.5 transition-all duration-300 ${
              isGisMap
                ? 'scale-110 text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.75)]'
                : 'scale-100 text-amber-400/70 hover:text-amber-300'
            }`}
          />
          <span>Bản đồ chiếu sáng</span>
        </NavLink>

        {/* Tab 2: Asset Management */}
        <NavLink
          to="/assets"
          className={`relative z-10 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs transition-colors duration-200 select-none cursor-pointer ${
            !isGisMap
              ? 'text-white font-bold'
              : 'text-blue-200/80 hover:text-white hover:bg-[#1c325c]/50 font-semibold'
          }`}
        >
          <Boxes
            className={`w-3.5 h-3.5 transition-all duration-300 ${
              !isGisMap
                ? 'scale-110 text-purple-400 drop-shadow-[0_0_6px_rgba(192,132,252,0.75)]'
                : 'scale-100 text-purple-400/70 hover:text-purple-300'
            }`}
          />
          <span>Quản lý tài sản</span>
        </NavLink>
      </nav>

      {/* Right: Theme Toggle + Notification Bell + Officer Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        
        {/* Notification Bell with hover spring */}
        <button
          type="button"
          onClick={onNotificationClick}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-[#0b1322]/80 hover:bg-[#1c325c] text-white hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-[#1c325c] shadow-2xs"
          title="Thông báo sự cố & vận hành"
        >
          <Bell className="w-4 h-4 text-blue-100" />
          {hasNotification && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#13223f]" />
          )}
        </button>

        <div className="h-5 w-px bg-[#1c325c]" />

        {/* Officer Profile: Name/Role (Right-aligned) + Avatar at the Far Right */}
        <div className="flex items-center gap-2.5 pl-0.5">
          <div className="hidden md:block leading-tight text-right">
            <p className="font-bold text-xs text-white">
              {userName}
            </p>
            <p className="text-[10px] text-blue-200/80 font-medium mt-0.5">
              {userRoleTitle}
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#1f3864] hover:bg-[#27467c] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs border border-[#325696]/60 hover:scale-105 transition-transform duration-200 cursor-default">
            {userInitials}
          </div>
        </div>

      </div>

    </header>
  )
}

export default Header
