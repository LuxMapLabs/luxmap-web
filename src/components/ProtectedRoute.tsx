import type { FC, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Loader2 } from 'lucide-react'
import { RootState } from '../redux/rootReducer'
import { UserRole } from '../types/auth'
import { hasAnyRole } from '../utils/roleUtils'

export interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: (UserRole | string | number)[]
}

/**
 * Protected Route Component: Bảo vệ tuyến đường & Phân quyền truy cập (RBAC)
 * - Kiểm tra trạng thái xác thực phiên làm việc (Silent Refresh)
 * - Chuyển hướng người dùng chưa đăng nhập về /login
 * - Chặn và chuyển hướng tài khoản không đủ quyền hạn về /forbidden
 */
export const ProtectedRoute: FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
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

export default ProtectedRoute
