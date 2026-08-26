import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Toaster } from 'sonner'
import { RootState } from './redux/rootReducer'
import { checkAuth, logout } from './feature/auth/authSlice'
import LoginPage from './pages/login/LoginPage'
import { LogOut, User as UserIcon, Shield, MapPin, Loader2 } from 'lucide-react'
import { UserRole } from './types/auth'

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth)
  const token = sessionStorage.getItem('accessToken')

  // Nếu đang loading để checkAuth (khi có token)
  if (loading && !isAuthenticated && token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-gray-500">Đang xác minh phiên làm việc...</p>
        </div>
      </div>
    )
  }

  // Nếu không có token trong sessionStorage, buộc chuyển hướng về trang login
  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Temporary Dashboard Component
const Dashboard: React.FC = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)

  const handleLogout = () => {
    dispatch(logout())
  }

  const getRoleText = (role?: UserRole) => {
    switch (role) {
      case UserRole.Admin:
        return 'Quản trị hệ thống'
      case UserRole.Leader:
        return 'Lãnh đạo đơn vị'
      case UserRole.Officer:
        return 'Cán bộ quản lý'
      case UserRole.Citizen:
        return 'Người dân phản ánh'
      default:
        return 'Không xác định'
    }
  }

  return (
    <div className="min-h-screen bg-surface font-sans">
      {/* Header bar */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="text-2xl font-black text-primary tracking-tight">LuxMap</span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
              GIS Platform
            </span>
          </div>
          
          <button
            onClick={handleLogout}
            className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:text-danger hover:border-danger/30 hover:bg-red-50/30 transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 border border-gray-100 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 pb-6 border-b border-gray-100">
            <div className="h-20 w-20 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
              <UserIcon className="h-10 w-10" />
            </div>
            <div className="text-center sm:text-left space-y-1">
              <h1 className="text-2xl font-bold text-gray-800">Xin chào, {user?.fullName}!</h1>
              <p className="text-sm text-gray-500">{user?.email || user?.phoneNumber}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                  <Shield className="h-3.5 w-3.5 mr-1" />
                  {getRoleText(user?.role)}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
                  <MapPin className="h-3.5 w-3.5 mr-1" />
                  Đơn vị: {user?.administrativeUnitId}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Thông tin xác thực & Phiên làm việc</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-surface rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase">Access Token</p>
                <p className="text-xs font-mono text-gray-700 truncate mt-1">
                  {sessionStorage.getItem('accessToken') || 'Không tìm thấy'}
                </p>
              </div>
              <div className="p-4 bg-surface rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase">Refresh Token</p>
                <p className="text-xs font-mono text-gray-700 truncate mt-1">
                  {sessionStorage.getItem('refreshToken') || 'Không tìm thấy'}
                </p>
              </div>
            </div>
            
            <div className="rounded-xl bg-blue-50 p-4 border border-blue-100 text-sm text-blue-800 leading-relaxed">
              <strong>🎉 Xác thực thành công!</strong> Đây là trang chính của LuxMap sau khi đăng nhập. Token của bạn được lưu trong <code>sessionStorage</code> và đính kèm tự động vào mỗi API gửi đi. Cơ chế làm mới token tự động (Token Rotation) sẽ chạy ngầm khi Access Token hết hạn.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    // Khôi phục phiên làm việc khi reload ứng dụng
    dispatch(checkAuth())
  }, [dispatch])

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Route đăng nhập */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Route chính được bảo vệ */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Redirect tất cả các đường dẫn khác về / */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
