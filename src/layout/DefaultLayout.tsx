import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Header } from '../components/Header'
import { RootState } from '../redux/rootReducer'
import { logout } from '../feature/auth/authSlice'
import { getRoleName, isAdmin } from '../utils/roleUtils'

export const DefaultLayout: React.FC = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const { user } = useSelector((state: RootState) => state.auth)

  const handleLogout = () => {
    dispatch(logout())
  }

  const roleTitle = getRoleName(user?.role)
  const initials = user?.fullName
    ? user.fullName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : 'U'

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 font-sans antialiased text-slate-900">
      {/* 1. Full-width Institutional Top Navbar */}
      <Header
        userName={user?.fullName || 'Người dùng'}
        userRoleTitle={roleTitle}
        userInitials={initials}
        isAdminUser={isAdmin(user?.role)}
        onLogout={handleLogout}
      />

      {/* 2. Full-width Main Workspace with Smooth Route Transitions */}
      <main className="flex-1 overflow-hidden relative w-full h-full">
        <div key={location.pathname} className="w-full h-full animate-tab-view">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default DefaultLayout
