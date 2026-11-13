import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Toaster } from 'sonner'
import { checkAuth, checkAuthFailure } from './feature/auth/authSlice'
import { UserRole } from './types/auth/web'

import type { RootState } from './redux/rootReducer'
import { isSystemAdmin, isManagementAgency, isManager } from './utils/roleUtils'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ManagerLayout } from './layout/ManagerLayout'
import { SuperiorLayout } from './layout/SuperiorLayout'
import { AdminLayout } from './layout/AdminLayout'

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
import { SystemSettingsPage } from './pages/settings/SystemSettingsPage'
import { FirmwareManagementPage } from './pages/firmware/FirmwareManagementPage'
import { IotBridgeAdminPage } from './pages/iot-bridge/IotBridgeAdminPage'
import { NotFoundPage } from './pages/not-found/NotFoundPage'
import { SuperiorReportsPage } from './pages/reports/SuperiorReportsPage'
import { SuperiorDashboardPage } from './pages/superior-dashboard/SuperiorDashboardPage'
import { CitizenReviewPage } from './pages/citizen-review/CitizenReviewPage'
import { AdminDashboardPage } from './pages/admin-dashboard/AdminDashboardPage'
import { PrivacyPolicyPage } from './pages/privacy/PrivacyPolicyPage'
import { SetPasswordPage } from './pages/set-password/SetPasswordPage'

/**
 * Điều hướng trang gốc / dựa theo vai trò người dùng (RBAC)
 * - Admin: chuyển sang /admin/dashboard
 * - Superior: chuyển sang /dashboard (Tổng quan cấp trên)
 * - Manager: chuyển sang /dashboard (Tổng quan quản lý)
 */
const RootRedirect: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  if (isSystemAdmin(user?.role)) {
    return <Navigate to="/admin/dashboard" replace />
  }
  if (isManagementAgency(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }
  if (isManager(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return <Navigate to="/gis-map" replace />
}

/**
 * Hiển thị Dashboard phù hợp theo vai trò (Manager Dashboard vs Superior Dashboard)
 */
// Quản lý (Manager) dùng ManagerLayout, Cấp trên Giám sát (Superior) dùng SuperiorLayout riêng
const OpsShell: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  return isManagementAgency(user?.role) ? <SuperiorLayout /> : <ManagerLayout />
}

const DashboardRoute: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  if (isManagementAgency(user?.role)) {
    return <SuperiorDashboardPage />
  }
  return <ManagerDashboardPage />
}

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    // Không chạy checkAuth() nếu đang truy cập trang công khai /r/, /report hoặc /privacy (tránh request thừa và lỗi 401 console)
    const path = window.location.pathname
    if (path.startsWith('/report') || path.startsWith('/r/') || path.startsWith('/privacy')) {
      return
    }
    // /set-password bỏ qua kiểm tra phiên nhưng người dùng sẽ chuyển sang /login ngay sau đó,
    // nên phải tắt cờ loading mặc định (true), nếu không form đăng nhập bị khóa cứng
    if (path.startsWith('/set-password')) {
      dispatch(checkAuthFailure())
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

          {/* Chính sách quyền riêng tư (Public, dùng cho Google OAuth consent screen) */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />

          {/* Đặt mật khẩu từ link mời / đặt lại trong email (Public, token trên URL) */}
          <Route path="/set-password" element={<SetPasswordPage />} />

          {/* Route thông báo từ chối quyền truy cập (403 Forbidden) */}
          <Route path="/forbidden" element={<ForbiddenPage />} />

          {/* Điều hướng thông minh theo vai trò (cần đăng nhập, chưa thuộc layout nào) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RootRedirect />
              </ProtectedRoute>
            }
          />

          {/* Layout Manager: Cán bộ Quản lý (Manager) & Cấp trên Giám sát (Superior) */}
          <Route
            element={
              <ProtectedRoute allowedRoles={[UserRole.MaintenanceEngineer, UserRole.ManagementAgency]}>
                <OpsShell />
              </ProtectedRoute>
            }
          >
            <Route path="/gis-map" element={<GisMapPage />} />
            <Route path="/dashboard" element={<DashboardRoute />} />

            {/* Dành riêng cho Cán bộ Quản lý (Manager): Lịch làm việc, Quản lý tài sản & Phản ánh người dân */}
            <Route element={<ProtectedRoute allowedRoles={[UserRole.MaintenanceEngineer]} />}>
              <Route path="/work-schedule" element={<WorkSchedulePage />} />
              <Route path="/assets" element={<AssetManagementPage />} />
              <Route path="/citizen-reports" element={<CitizenReviewPage />} />
            </Route>

            {/* Báo cáo & Nghiệm thu: CHỈ DÀNH RIÊNG CHO Cấp trên Giám sát (Superior) */}
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ManagementAgency]} />}>
              <Route path="/reports" element={<SuperiorReportsPage />} />
            </Route>
          </Route>

          {/* Layout Admin: CHỈ CHO PHÉP Quản trị viên (Admin) */}
          <Route
            element={
              <ProtectedRoute allowedRoles={[UserRole.Admin]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/system" element={<AdminManagementPage />} />
            <Route path="/admin/communes" element={<CommunesManagementPage />} />
            <Route path="/admin/firmware" element={<FirmwareManagementPage />} />
            <Route path="/admin/settings" element={<SystemSettingsPage />} />
            <Route path="/admin/iot-bridge" element={<IotBridgeAdminPage />} />
          </Route>

          {/* 404 Not Found Page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
    </BrowserRouter>
  )
}

export default App
