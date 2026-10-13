import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Toaster } from 'sonner'
import { checkAuth } from './feature/auth/authSlice'
import { UserRole } from './types/auth/web'
import type { RootState } from './redux/rootReducer'
import { isSystemAdmin } from './utils/roleUtils'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DefaultLayout } from './layout/DefaultLayout'

// Import trực tiếp tất cả các trang theo yêu cầu refactor
import { LoginPage } from './pages/login/LoginPage'
import { CitizenReportPage } from './pages/citizen-report/CitizenReportPage'
import { ForbiddenPage } from './pages/forbidden/ForbiddenPage'
import { GisMapPage } from './pages/gis-map/GisMapPage'
import { WorkSchedulePage } from './pages/work-schedule/WorkSchedulePage'
import { AssetManagementPage } from './pages/assets/AssetManagementPage'
import { AdminManagementPage } from './pages/admin/AdminManagementPage'
import { NotFoundPage } from './pages/not-found/NotFoundPage'

/**
 * Điều hướng trang gốc / dựa theo vai trò người dùng (RBAC)
 * - Admin: chuyển sang /admin/system
 * - Manager: chuyển sang /gis-map
 */
const RootRedirect: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  if (isSystemAdmin(user?.role)) {
    return <Navigate to="/admin/system" replace />
  }
  return <Navigate to="/gis-map" replace />
}

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    // Không chạy checkAuth() nếu đang truy cập trang công khai /r/ hoặc /report (tránh request thừa và lỗi 401 console)
    if (window.location.pathname.startsWith('/report') || window.location.pathname.startsWith('/r/')) {
      return
    }
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

          {/* Route báo cáo sự cố ẩn danh dành cho người dân qua quét mã QR (Public, Không cần đăng nhập) */}
          <Route path="/r/:code" element={<CitizenReportPage />} />
          <Route path="/report" element={<CitizenReportPage />} />

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
            {/* Điều hướng thông minh theo vai trò */}
            <Route path="/" element={<RootRedirect />} />

            {/* Tuyến bản đồ GIS: Dành cho Cán bộ Quản lý (Manager) */}
            <Route
              path="/gis-map"
              element={
                <ProtectedRoute allowedRoles={[UserRole.MaintenanceEngineer]}>
                  <GisMapPage />
                </ProtectedRoute>
              }
            />

            {/* Tuyến Quản lý Lịch làm việc: Dành cho Cán bộ Quản lý (Manager) */}
            <Route
              path="/work-schedule"
              element={
                <ProtectedRoute allowedRoles={[UserRole.MaintenanceEngineer]}>
                  <WorkSchedulePage />
                </ProtectedRoute>
              }
            />
            <Route path="/work%20schedule" element={<Navigate to="/work-schedule" replace />} />
            <Route path="/work schedule" element={<Navigate to="/work-schedule" replace />} />
            <Route path="/work_schedule" element={<Navigate to="/work-schedule" replace />} />
            <Route path="/schedule" element={<Navigate to="/work-schedule" replace />} />

            {/* Tuyến Quản lý tài sản: Dành cho Cán bộ Quản lý (Manager) */}
            <Route
              path="/assets"
              element={
                <ProtectedRoute allowedRoles={[UserRole.MaintenanceEngineer]}>
                  <AssetManagementPage />
                </ProtectedRoute>
              }
            />

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
