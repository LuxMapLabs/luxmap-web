import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Map, ShieldCheck } from 'lucide-react'
import { Header } from '../components/Header'
import { Sidebar, SidebarTabItem } from '../components/Sidebar'
import { RootState } from '../redux/rootReducer'
import { logout } from '../feature/auth/authSlice'
import { getRoleName, isAdmin } from '../utils/roleUtils'

export const DefaultLayout: React.FC = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

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

  // Phân quyền danh mục Menu Sidebar theo vai trò
  const navTabs: SidebarTabItem[] = [
    {
      to: '/gis-map',
      label: 'Bản đồ chiếu sáng',
      icon: <Map className="w-4 h-4" />,
    },
  ]

  // Chỉ Quản trị viên (Admin) mới nhìn thấy menu Quản trị hệ thống
  if (isAdmin(user?.role)) {
    navTabs.push({
      to: '/admin/system',
      label: 'Quản trị hệ thống',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: 'Admin',
      badgeColor: 'bg-indigo-50 text-indigo-700',
    })
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100 font-sans antialiased text-slate-900">
      {/* 1. Full-width Top Header (Navbar) with Sidebar Toggle */}
      <Header
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* 2. Main Workspace: Left Sidebar + Right Page Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Sidebar với danh mục tabs phân quyền, dữ liệu người dùng thực tế và nút đăng xuất */}
        <Sidebar
          tabs={navTabs}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
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
