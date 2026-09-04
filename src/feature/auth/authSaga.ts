import { call, put, takeLatest } from 'redux-saga/effects'
import { PayloadAction } from '@reduxjs/toolkit'
import authAPI from './authAPI'
import { LoginRequest, ApiResponse, AuthResponse } from '../../types/auth'
import tokenStorage from '../../utils/tokenStorage'
import { normalizeUser } from '../../utils/roleUtils'
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
    const { emailOrPhone, password, rememberMe = false } = action.payload

    // Gửi yêu cầu đăng nhập lên API Backend
    const response: ApiResponse<AuthResponse> = yield call(authAPI.login, {
      emailOrPhone,
      password,
    })

    if (response.data) {
      const { accessToken, refreshToken, user } = response.data

      // Chuẩn hóa user object và Role
      const normalizedUser = normalizeUser(user)

      // Lưu trữ cặp Token theo đúng cờ rememberMe (chỉ lưu token, không lưu user profile)
      tokenStorage.setTokens(accessToken, refreshToken, !!rememberMe)

      // Nạp User Profile trực tiếp vào Redux Store (Single Source of Truth)
      yield put(loginSuccess({ user: normalizedUser }))
    } else {
      const msg = response.error?.message || 'Tài khoản hoặc mật khẩu không chính xác.'
      yield put(loginFailure(msg))
    }
  } catch (error: any) {
    let errorMessage = 'Đăng nhập thất bại'

    if (!error.response) {
      errorMessage =
        'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng hoặc đảm bảo Backend đang chạy.'
    } else if (error.response.status === 401) {
      errorMessage =
        error.response.data?.error?.message || 'Tài khoản hoặc mật khẩu không chính xác.'
    } else if (error.response.status === 400) {
      errorMessage =
        error.response.data?.error?.message || 'Dữ liệu đăng nhập không hợp lệ.'
    } else if (error.response.status >= 500) {
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
    // Xóa sạch toàn bộ token ở cả sessionStorage lẫn localStorage
    tokenStorage.clearAll()
  } catch (error) {
    console.error('Lỗi khi xóa token khi đăng xuất:', error)
  }
}

// Saga xử lý khôi phục phiên đăng nhập khi reload trang (checkAuth)
function* handleCheckAuth() {
  try {
    const token = tokenStorage.getAccessToken()
    if (!token) {
      yield put(checkAuthFailure())
      return
    }

    // Gọi API /auth/me để lấy thông tin mới nhất từ JWT context trên CSDL
    const response: ApiResponse<any> = yield call(authAPI.getMe)
    if (response.data) {
      // Chuẩn hóa role và thông tin user (xử lý cả trường hợp role trả về dạng chuỗi "admin", "officer", ...)
      const normalizedUser = normalizeUser(response.data)

      // Nạp thẳng User Profile mới nhất từ server vào Redux Store
      yield put(checkAuthSuccess({ user: normalizedUser }))
    } else {
      tokenStorage.clearAll()
      yield put(checkAuthFailure())
    }
  } catch (error: any) {
    // Nếu token bị từ chối hoặc hết hạn (401), xoá token và chuyển về login
    if (error?.response?.status === 401) {
      tokenStorage.clearAll()
    }
    yield put(checkAuthFailure())
  }
}

export default function* authSaga() {
  yield takeLatest(loginRequest.type, handleLogin)
  yield takeLatest(logout.type, handleLogout)
  yield takeLatest(checkAuth.type, handleCheckAuth)
}
