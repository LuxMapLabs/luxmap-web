import { call, put, takeLatest } from 'redux-saga/effects'
import { PayloadAction } from '@reduxjs/toolkit'
import authAPI from './authAPI'
import { LoginRequest, ApiResponse, AuthResponse, User } from '../../types/auth'
import { setRefreshToken, clearTokens } from '../../config/apiClient'
import {
  loginRequest,
  loginSuccess,
  loginFailure,
  logout,
  checkAuth,
  checkAuthSuccess,
  checkAuthFailure,
} from './authSlice'

// Saga xử lý đăng nhập
function* handleLogin(action: PayloadAction<LoginRequest>) {
  try {
    const response: ApiResponse<AuthResponse> = yield call(authAPI.login, action.payload)

    if (response.data) {
      const { accessToken, refreshToken, user } = response.data

      // 1. Lưu accessToken vào sessionStorage
      sessionStorage.setItem('accessToken', accessToken)

      // 2. Lưu refreshToken vào biến in-memory (KHÔNG lưu trong sessionStorage)
      setRefreshToken(refreshToken)

      // Chuẩn hóa user object nếu cần
      const normalizedUser: User = {
        id: user.id || (user as any).userId || '',
        fullName: user.fullName || '',
        email: user.email || null,
        phoneNumber: user.phoneNumber || null,
        role: user.role,
        administrativeUnitId: user.administrativeUnitId || '',
      }

      yield put(loginSuccess({ user: normalizedUser }))
    } else {
      const msg = response.error?.message || 'Tài khoản hoặc mật khẩu không chính xác.'
      yield put(loginFailure(msg))
    }
  } catch (error: any) {
    let errorMessage = 'Đăng nhập thất bại'

    if (!error.response) {
      // Lỗi mất kết nối mạng hoặc Backend không bật
      errorMessage =
        'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng hoặc đảm bảo Backend đang chạy.'
    } else if (error.response.status === 401) {
      // 401: Sai email/số điện thoại hoặc mật khẩu
      errorMessage =
        error.response.data?.error?.message || 'Tài khoản hoặc mật khẩu không chính xác.'
    } else if (error.response.status === 400) {
      // 400: Dữ liệu gửi lên không đúng định dạng
      errorMessage =
        error.response.data?.error?.message || 'Dữ liệu đăng nhập không hợp lệ.'
    } else if (error.response.status >= 500) {
      // 500+: Lỗi hệ thống backend
      errorMessage = 'Hệ thống máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
    } else {
      errorMessage =
        error.response.data?.error?.message || error.message || 'Đăng nhập thất bại'
    }

    yield put(loginFailure(errorMessage))
  }
}

// Saga xử lý đăng xuất
function* handleLogout() {
  try {
    // Xóa access token trong sessionStorage và refresh token trong memory
    clearTokens()
  } catch (error) {
    console.error('Lỗi khi xóa token khi đăng xuất:', error)
  }
}

// Saga xử lý khôi phục phiên đăng nhập khi reload trang (checkAuth)
function* handleCheckAuth() {
  try {
    const token = sessionStorage.getItem('accessToken')
    if (!token) {
      yield put(checkAuthFailure())
      return
    }

    const response: ApiResponse<any> = yield call(authAPI.getMe)
    if (response.data) {
      const raw = response.data
      const user: User = {
        id: raw.id || raw.userId || '',
        fullName: raw.fullName || '',
        email: raw.email || null,
        phoneNumber: raw.phoneNumber || null,
        role: raw.role,
        administrativeUnitId: raw.administrativeUnitId || '',
      }
      yield put(checkAuthSuccess({ user }))
    } else {
      yield put(checkAuthFailure())
    }
  } catch (error) {
    // Nếu token hết hạn hoặc lỗi xác thực, reset state
    yield put(checkAuthFailure())
  }
}

export default function* authSaga() {
  yield takeLatest(loginRequest.type, handleLogin)
  yield takeLatest(logout.type, handleLogout)
  yield takeLatest(checkAuth.type, handleCheckAuth)
}
