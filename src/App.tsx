import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Toaster } from 'sonner'
import { checkAuth } from './feature/auth/authSlice'
import { UserRole } from './types/auth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/login/LoginPage'
import { DefaultLayout } from './layout/DefaultLayout'
import { GisMapPage } from './pages/gis-map/GisMapPage'
import { ForbiddenPage } from './pages/forbidden/ForbiddenPage'
import { AdminManagementPage } from './pages/admin/AdminManagementPage'
import { NotFoundPage } from './pages/not-found/NotFoundPage'

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
