import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { RootState } from '../redux/rootReducer'
import { logout, refreshProfileRequest } from '../feature/auth/authSlice'
import { getRoleName, isAdmin } from '../utils/roleUtils'

export const DefaultLayout: React.FC = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const { user, isRefreshingProfile } = useSelector((state: RootState) => state.auth)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const handleLogout = () => {
    dispatch(logout())
  }

  const handleRefreshProfile = () => {
    dispatch(refreshProfileRequest())
  }

  const roleTitle = getRoleName(user?.role)
  const displayName = user?.full_name || user?.username || 'Người dùng'
  const initials = displayName
    ? displayName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((n: string) => n[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : 'U'

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-50 font-sans antialiased text-slate-900">
      {/* 1. Left Vertical Navigation Sidebar (With Logo & Main Tabs) */}
      <Sidebar
        user={user}
        isAdminUser={isAdmin(user?.role)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* 2. Main Workspace Column: Top Header + Page Outlet */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          user={user}
          userName={displayName}
          userRoleTitle={roleTitle}
          userInitials={initials}
          isAdminUser={isAdmin(user?.role)}
          onLogout={handleLogout}
          onRefreshProfile={handleRefreshProfile}
          isRefreshingProfile={isRefreshingProfile}
        />

        {/* Full-width Main Workspace with Smooth Route Transitions */}
        <main className="flex-1 overflow-hidden relative w-full h-full">
          <div key={location.pathname} className="w-full h-full animate-tab-view">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default DefaultLayout
