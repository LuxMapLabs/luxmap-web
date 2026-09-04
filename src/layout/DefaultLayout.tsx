import React from 'react'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { RootState } from '../redux/rootReducer'
import { logout } from '../feature/auth/authSlice'
import { getRoleName } from '../utils/roleUtils'

export const DefaultLayout: React.FC = () => {
  const dispatch = useDispatch()
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
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100 font-sans antialiased text-slate-900">
      {/* 1. Full-width Top Header (Navbar) */}
      <Header />

      {/* 2. Main Workspace: Left Sidebar + Right Page Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Sidebar với dữ liệu người dùng thực tế và nút đăng xuất */}
        <Sidebar
          userName={user?.fullName || 'Người dùng'}
          userRoleTitle={roleTitle}
          userInitials={initials}
          onLogout={handleLogout}
        />

        {/* Right Page Outlet */}
        <main className="flex-1 overflow-hidden relative w-full h-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DefaultLayout
