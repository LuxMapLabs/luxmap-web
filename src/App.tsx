import React, { useEffect, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Toaster } from 'sonner'
import { checkAuth } from './feature/auth/authSlice'
import { UserRole } from './types/auth/web'
import type { RootState } from './redux/rootReducer'
import { isSystemAdmin, isManagementAgency } from './utils/roleUtils'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DefaultLayout } from './layout/DefaultLayout'

// Tải động (Code-Splitting) toàn bộ các trang qua React.lazy
const LoginPage = React.lazy(() =>
  import('./pages/login/LoginPage').then((m) => ({ default: m.LoginPage }))
)
const CitizenReportPage = React.lazy(() =>
  import('./pages/citizen-report/CitizenReportPage').then((m) => ({
    default: m.CitizenReportPage,
  }))
)
const ForbiddenPage = React.lazy(() =>
  import('./pages/forbidden/ForbiddenPage').then((m) => ({ default: m.ForbiddenPage }))
)
const GisMapPage = React.lazy(() =>
  import('./pages/gis-map/GisMapPage').then((m) => ({ default: m.GisMapPage }))
)
const WorkSchedulePage = React.lazy(() =>
  import('./pages/work-schedule/WorkSchedulePage').then((m) => ({
    default: m.WorkSchedulePage,
  }))
)
const AssetManagementPage = React.lazy(() =>
  import('./pages/assets/AssetManagementPage').then((m) => ({
    default: m.AssetManagementPage,
  }))
)
const AdminManagementPage = React.lazy(() =>
  import('./pages/admin/AdminManagementPage').then((m) => ({
    default: m.AdminManagementPage,
  }))
)
const NotFoundPage = React.lazy(() =>
  import('./pages/not-found/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
)
const SuperiorReportsPage = React.lazy(() =>
  import('./pages/reports/SuperiorReportsPage').then((m) => ({
    default: m.SuperiorReportsPage,
  }))
)

/**
 * Hiệu ứng chuyển trang nhẹ nhàng cho React Suspense
 */
const RouteLoadingSpinner: React.FC = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
)

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
  if (isManagementAgency(user?.role)) {
    return <Navigate to="/reports" replace />
  }
  return <Navigate to="/gis-map" replace />
}

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    // Không chạy checkAuth() nếu đang truy cập trang công khai /report (tránh request thừa và lỗi 401 console)
    if (window.location.pathname.startsWith('/report')) {
      return
    }
    // Khởi chạy kiểm tra phiên làm việc qua HttpOnly Cookie ngay khi load app
    dispatch(checkAuth())
  }, [dispatch])

  return (
    <BrowserRouter>
      {/* Global Toast Notifications (Sonner) */}
      <Toaster richColors position="top-right" />

      <Suspense fallback={<RouteLoadingSpinner />}>
        <Routes>
          {/* Route đăng nhập công khai */}
          <Route path="/login" element={<LoginPage />} />

          {/* Route báo cáo sự cố ẩn danh dành cho người dân qua quét mã QR (Public, Không cần đăng nhập) */}
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

            {/* Tuyến bản đồ GIS: Dành cho Cán bộ Quản lý (Manager) & Cấp trên Giám sát (Superior) */}
            <Route
              path="/gis-map"
              element={
                <ProtectedRoute allowedRoles={[UserRole.MaintenanceEngineer, UserRole.ManagementAgency]}>
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

            {/* Tuyến Báo cáo & Nghiệm thu: Dành cho Cấp trên (Superior), Cán bộ Quản lý (Manager) & Admin */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={[UserRole.ManagementAgency, UserRole.MaintenanceEngineer, UserRole.Admin]}>
                  <SuperiorReportsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/superior-reports" element={<Navigate to="/reports" replace />} />

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
      </Suspense>
    </BrowserRouter>
  )
}

export default App
