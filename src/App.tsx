import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Toaster } from 'sonner'
import { Loader2 } from 'lucide-react'
import { RootState } from './redux/rootReducer'
import { checkAuth } from './feature/auth/authSlice'
import { UserRole } from './types/auth'
import { hasAnyRole } from './utils/roleUtils'
import { LoginPage } from './pages/login/LoginPage'
import { DefaultLayout } from './layout/DefaultLayout'
import { GisMapPage } from './pages/gis-map/GisMapPage'
import { ForbiddenPage } from './pages/forbidden/ForbiddenPage'
import { AdminManagementPage } from './pages/admin/AdminManagementPage'
import { NotFoundPage } from './pages/not-found/NotFoundPage'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: (UserRole | string | number)[]
}

// Protected Route Component: Bảo vệ tuyến đường & Phân quyền truy cập (RBAC)
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const location = useLocation()
  const { isAuthenticated, loading, user } = useSelector((state: RootState) => state.auth)

  // 1. Đang trong quá trình Silent Refresh thẩm định cookie với backend
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-400 mx-auto" />
          <p className="text-sm text-slate-300 font-medium">Đang xác minh phiên làm việc...</p>
        </div>
      </div>
    )
  }

  // 2. Không có phiên đăng nhập hợp lệ -> Chuyển về màn hình đăng nhập
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 3. Kiểm tra phân quyền vai trò nếu route yêu cầu (RBAC)
  if (allowedRoles && allowedRoles.length > 0) {
    const isAuthorized = hasAnyRole(user.role, allowedRoles)
    if (!isAuthorized) {
      return <Navigate to="/forbidden" replace />
    }
  }

  return <>{children}</>
}

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    // Khởi chạy kiểm tra phiên làm việc qua HttpOnly Cookie ngay khi load app
    dispatch(checkAuth())
  }, [dispatch])

  return (
    <BrowserRouter>
      {/* Global Toast Notifications (Sonner) */}
      <Toaster richColors position="top-right" />

      <Routes>
        {/* Route đăng nhập công khai */}
        <Route path="/login" element={<LoginPage />} />

        {/* Route thông báo từ chối quyền truy cập (403 Forbidden) */}
        <Route path="/forbidden" element={<ForbiddenPage />} />

        {/* Các Route ứng dụng tác nghiệp bên trong DefaultLayout (yêu cầu xác thực) */}
        <Route
          element={
            <ProtectedRoute>
              <DefaultLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/gis-map" replace />} />
          
          {/* Tuyến bản đồ GIS chung cho cả 4 vai trò đã đăng nhập */}
          <Route path="/gis-map" element={<GisMapPage />} />

          {/* Tuyến đường Quản trị: CHỈ CHO PHÉP Quản trị viên (Admin) */}
          <Route
            path="/admin/system"
            element={
              <ProtectedRoute allowedRoles={[UserRole.Admin]}>
                <AdminManagementPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* 404 Not Found Page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
