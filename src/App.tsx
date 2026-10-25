import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Toaster } from 'sonner'
import { checkAuth } from './feature/auth/authSlice'
import { UserRole } from './types/auth/web'
import type { RootState } from './redux/rootReducer'
import { isSystemAdmin, isManagementAgency, isManager } from './utils/roleUtils'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DefaultLayout } from './layout/DefaultLayout'

// Import trực tiếp tất cả các trang
import { LoginPage } from './pages/login/LoginPage'
import { CitizenReportPage } from './pages/citizen-report/CitizenReportPage'
import { ForbiddenPage } from './pages/forbidden/ForbiddenPage'
import { GisMapPage } from './pages/gis-map/GisMapPage'
import { ManagerDashboardPage } from './pages/dashboard/ManagerDashboardPage'
import { WorkSchedulePage } from './pages/work-schedule/WorkSchedulePage'
import { AssetManagementPage } from './pages/assets/AssetManagementPage'
import { AdminManagementPage } from './pages/users/UserManagementPage'
import { CommunesManagementPage } from './pages/communes/CommunesManagementPage'
import { NotFoundPage } from './pages/not-found/NotFoundPage'
import { SuperiorReportsPage } from './pages/reports/SuperiorReportsPage'
import { CitizenReviewPage } from './pages/citizen-review/CitizenReviewPage'

/**
 * Điều hướng trang gốc / dựa theo vai trò người dùng (RBAC)
 * - Admin: chuyển sang /admin/system
 * - Superior: chuyển sang /reports
 * - Manager: chuyển sang /dashboard
 */
const RootRedirect: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  if (isSystemAdmin(user?.role)) {
    return <Navigate to="/admin/system" replace />
  }
  if (isManagementAgency(user?.role)) {
    return <Navigate to="/reports" replace />
  }
  if (isManager(user?.role)) {
    return <Navigate to="/dashboard" replace />
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

            {/* Tuyến bản đồ GIS: Dành cho Cán bộ Quản lý (Manager) & Cấp trên Giám sát (Superior) */}
            <Route
              element={
                <ProtectedRoute allowedRoles={[UserRole.MaintenanceEngineer, UserRole.ManagementAgency]} />
              }
            >
              <Route path="/gis-map" element={<GisMapPage />} />
            </Route>

            {/* Tuyến dành riêng cho Cán bộ Quản lý (Manager): Bảng điều khiển (Dashboard), Lịch làm việc, Quản lý tài sản & Phản ánh người dân */}
            <Route element={<ProtectedRoute allowedRoles={[UserRole.MaintenanceEngineer]} />}>
              <Route path="/dashboard" element={<ManagerDashboardPage />} />
              <Route path="/work-schedule" element={<WorkSchedulePage />} />
              <Route path="/assets" element={<AssetManagementPage />} />
              <Route path="/citizen-reports" element={<CitizenReviewPage />} />
            </Route>

            {/* Tuyến Báo cáo & Nghiệm thu: CHỈ DÀNH RIÊNG CHO Cấp trên Giám sát (Superior) */}
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ManagementAgency]} />}>
              <Route path="/reports" element={<SuperiorReportsPage />} />
            </Route>

            {/* Tuyến đường Quản trị: CHỈ CHO PHÉP Quản trị viên (Admin) */}
            <Route element={<ProtectedRoute allowedRoles={[UserRole.Admin]} />}>
              <Route path="/admin/system" element={<AdminManagementPage />} />
              <Route path="/admin/communes" element={<CommunesManagementPage />} />
            </Route>
          </Route>

          {/* 404 Not Found Page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
    </BrowserRouter>
  )
}

export default App
