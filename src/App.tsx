import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Toaster } from 'sonner'
import { Loader2 } from 'lucide-react'
import { RootState } from './redux/rootReducer'
import { checkAuth } from './feature/auth/authSlice'
import { LoginPage } from './pages/login/LoginPage'
import { DefaultLayout } from './layout/DefaultLayout'
import { GisMapPage } from './pages/gis-map/GisMapPage'
import { NotFoundPage } from './pages/not-found/NotFoundPage'
import tokenStorage from './utils/tokenStorage'

// Protected Route Component: Bảo vệ các tuyến đường nội bộ hệ thống
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, user } = useSelector((state: RootState) => state.auth)
  const token = tokenStorage.getAccessToken()

  // 1. Nếu không có token trong bất kỳ storage nào -> Bắt buộc đăng nhập
  if (!token) {
    return <Navigate to="/login" replace />
  }

  // 2. Nếu đang loading checkAuth lần đầu và chưa có thông tin user được khôi phục
  if (loading && !isAuthenticated && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-400 mx-auto" />
          <p className="text-sm text-slate-300 font-medium">Đang xác minh phiên làm việc...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    // Khôi phục phiên làm việc và thẩm định token khi reload (F5) ứng dụng
    dispatch(checkAuth())
  }, [dispatch])

  return (
    <BrowserRouter>
      {/* Global Toast Notifications (Sonner) */}
      <Toaster richColors position="top-right" />

      <Routes>
        {/* Route đăng nhập công khai */}
        <Route path="/login" element={<LoginPage />} />

        {/* Các Route ứng dụng tác nghiệp bên trong DefaultLayout (yêu cầu xác thực) */}
        <Route
          element={
            <ProtectedRoute>
              <DefaultLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/gis-map" replace />} />
          <Route path="/gis-map" element={<GisMapPage />} />
        </Route>

        {/* 404 Not Found Page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
