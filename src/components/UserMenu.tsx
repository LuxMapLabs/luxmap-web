import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react'
import type { CurrentUserResponse } from '../types/auth/me'
import { getRoleName, isAdmin, isManagementAgency, isMaintenanceEngineer, isFieldCrew } from '../utils/roleUtils'
import { ProfileModal } from './ProfileModal'

interface UserMenuProps {
  user: CurrentUserResponse | null
  onLogout?: () => void
  /** admin: nút ở header; sidebar: thẻ người dùng ở chân sidebar Manager */
  variant: 'admin' | 'sidebar'
  collapsed?: boolean
}

const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(-2)
    .join('')
    .toUpperCase() || 'U'

// Menu tài khoản (hồ sơ cá nhân + đăng xuất) dùng chung cho layout Admin và Manager
export const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout, variant, collapsed = false }) => {
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const name = user?.full_name || user?.username || 'Người dùng'
  const role = (user ? getRoleName(user.role) : '').replace(/\s*\([^)]*\)\s*$/, '')
  const initials = getInitials(name)
  const isSidebar = variant === 'sidebar'

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  let badge = 'bg-blue-50 text-blue-700 border-blue-200'
  if (isAdmin(user?.role)) badge = 'bg-purple-50 text-purple-700 border-purple-200'
  else if (isManagementAgency(user?.role)) badge = 'bg-indigo-50 text-indigo-700 border-indigo-200'
  else if (isMaintenanceEngineer(user?.role)) badge = 'bg-emerald-50 text-emerald-700 border-emerald-200'
  else if (isFieldCrew(user?.role)) badge = 'bg-amber-50 text-amber-800 border-amber-200'

  const hasAllCommunes = isAdmin(user?.role) || (user?.commune_ids && user.commune_ids.includes('*'))
  const communeText: string = hasAllCommunes
    ? 'Toàn hệ thống'
    : user?.communes && user.communes.length > 0
      ? user.communes.length === 1
        ? user.communes[0].name || user.communes[0].commune_id || ''
        : `${user.communes[0].name || user.communes[0].commune_id || ''} (+${user.communes.length - 1})`
      : `${user?.commune_ids?.length || 0} xã`

  const avatarCls = isSidebar
    ? 'w-9 h-9 rounded-xl bg-linear-to-br from-teal-500 to-teal-700 text-white font-extrabold text-xs'
    : 'w-9 h-9 rounded-2xl bg-linear-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white font-black text-xs shadow-sm shadow-blue-500/20 ring-2 ring-blue-100'

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title="Tài khoản"
          aria-haspopup="menu"
          aria-expanded={open}
          className={
            isSidebar
              ? `group w-full flex items-center gap-2.5 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-ops p-2.5 transition-all duration-200 cursor-pointer ${collapsed ? 'justify-center' : ''}`
              : 'flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100/80 transition-all duration-200 cursor-pointer group border border-transparent hover:border-slate-200/70'
          }
        >
          {!isSidebar && (
            <div className="hidden md:flex flex-col items-end leading-tight pl-1.5">
              <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">{name}</span>
              <span className="text-[10.5px] text-slate-500 font-medium mt-0.5">{role}</span>
            </div>
          )}
          <div className={`${avatarCls} flex items-center justify-center shrink-0`}>{initials}</div>
          {isSidebar && !collapsed && (
            <div className="min-w-0 flex-1 text-left leading-tight">
              <span className="block truncate text-xs font-bold text-slate-900">{name}</span>
              <span className="block truncate text-[11px] text-slate-500">{role}</span>
            </div>
          )}
          {!collapsed && (
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${isSidebar ? '-rotate-90' : 'hidden sm:block'}`}
            />
          )}
        </button>

        {open && (
          <div
            className={`absolute z-50 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2.5 animate-in fade-in zoom-in-95 duration-150 ${
              isSidebar ? 'left-full bottom-0 ml-3 origin-bottom-left' : 'right-0 mt-2 origin-top-right'
            }`}
          >
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`${avatarCls} !w-11 !h-11 flex items-center justify-center shrink-0 text-sm`}>{initials}</div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-sm text-slate-900 truncate">{name}</h4>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{user?.email || `@${user?.username || 'user'}`}</p>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100/80 text-[11px]">
                <span className="text-slate-400 font-medium">Vai trò:</span>
                <span className={`font-bold px-2 py-0.5 rounded-md border text-[10.5px] ${badge}`}>{role}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Địa bàn GIS:</span>
                <span className="font-semibold text-slate-700 truncate max-w-[160px] text-right" title={communeText}>
                  {communeText}
                </span>
              </div>
            </div>

            <div className="px-1.5 py-1.5">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setProfileOpen(true)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer group"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                <span>Hồ sơ cá nhân</span>
              </button>
            </div>

            {onLogout && (
              <div className="px-1.5 pt-1.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
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

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} user={user} />
    </>
  )
}
