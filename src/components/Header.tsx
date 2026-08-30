import React from 'react'
import {
  Lightbulb,
  Bell,
} from 'lucide-react'

export interface HeaderProps {
  brandTitle?: string
  brandSubtitle?: string
  brandBadge?: string
  hasNotification?: boolean
  onNotificationClick?: () => void
  className?: string
}

export const Header: React.FC<HeaderProps> = ({
  brandTitle = 'LUXMAP',
  brandSubtitle = 'Quản lý tài sản & sự cố chiếu sáng giao thông nông thôn',
  brandBadge = 'PROPOSAL SPECS',
  hasNotification = true,
  onNotificationClick,
  className = '',
}) => {
  return (
    <header className={`h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between shrink-0 select-none z-20 ${className}`}>
      
      {/* Left: Brand Logo + Subtitle */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#1f3864] text-white flex items-center justify-center shadow-2xs shrink-0">
          <Lightbulb className="w-5 h-5 text-amber-400 fill-amber-400" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-black text-sm tracking-wider text-slate-900 uppercase font-sans">
              {brandTitle}
            </span>
            {brandBadge && (
              <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-md border border-blue-200/60 uppercase tracking-tight">
                {brandBadge}
              </span>
            )}
          </div>
          {brandSubtitle && (
            <p className="text-[10px] text-slate-500 font-medium leading-none mt-1">
              {brandSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Tools: Notification Bell */}
      <div className="flex items-center gap-2.5">
        
        {/* Notification Bell */}
        <button
          type="button"
          onClick={onNotificationClick}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 transition relative cursor-pointer border border-slate-200/60 shadow-2xs"
          title="Thông báo"
        >
          <Bell className="w-4 h-4 text-slate-700" />
          {hasNotification && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </button>

      </div>

    </header>
  )
}

export default Header
