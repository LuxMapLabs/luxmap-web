import { call, put, takeLatest, takeLeading } from 'redux-saga/effects'
import { PayloadAction } from '@reduxjs/toolkit'
import authAPI from './authAPI'
import { LoginRequest, WebAuthTokenResponse, User } from '../../types/auth'
import tokenStorage from '../../utils/tokenStorage'
import { createUserFromToken } from '../../utils/roleUtils'
import {
  loginRequest,
  loginSuccess,
  loginFailure,
  logout,
  checkAuth,
  checkAuthSuccess,
  checkAuthFailure,
} from './authSlice'

// Saga xử lý đăng nhập Web
function* handleLogin(action: PayloadAction<LoginRequest>) {
  try {
    const { emailOrPhone, password, rememberMe = false } = action.payload

    // Gửi yêu cầu đăng nhập lên API Web Backend
    const response: WebAuthTokenResponse = yield call(authAPI.login, {
      username: emailOrPhone.trim(),
      password,
      rememberMe: !!rememberMe,
    })

    const accessToken = response?.access_token || response?.accessToken

    if (accessToken) {
      // Lưu Access Token theo tuỳ chọn rememberMe (Cookie HttpOnly __Secure-luxmap_rt do browser tự giữ)
      tokenStorage.setAccessToken(accessToken, !!rememberMe)

      // Giải mã JWT để trích xuất User Profile (sub, role, commune_ids)
      const user: User | null = createUserFromToken(accessToken, emailOrPhone.trim())
      if (!user) {
        throw new Error('Dữ liệu Token không hợp lệ')
      }

      // Nạp thông tin User vào Redux Store
      yield put(loginSuccess({ user }))
    } else {
      yield put(loginFailure('Không nhận được phản hồi xác thực từ máy chủ.'))
    }
  } catch (error: any) {
    let errorMessage = 'Đăng nhập thất bại'

    if (!error.response) {
      errorMessage =
        'Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra API hoặc cấu hình HTTPS/CORS.'
    } else if (error.response.status === 401) {
      errorMessage =
        error.response.data?.error?.message ||
        error.response.data?.message ||
        'Tên đăng nhập hoặc mật khẩu không chính xác.'
    } else if (error.response.status === 403) {
      errorMessage =
        error.response.data?.error?.message ||
        'Truy cập bị từ chối: Origin hoặc quyền hạn không hợp lệ.'
    } else if (error.response.status === 400) {
      errorMessage =
        error.response.data?.error?.message ||
        error.response.data?.message ||
        'Dữ liệu đăng nhập không hợp lệ.'
    } else if (error.response.status >= 500) {
      errorMessage = 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
    } else {
      errorMessage =
        error.response.data?.error?.message || error.message || 'Đăng nhập thất bại'
    }

    yield put(loginFailure(errorMessage))
  }
}

// Saga xử lý khôi phục phiên đăng nhập bằng HttpOnly Cookie (Silent Refresh)
function* handleCheckAuth() {
  try {
    // Gọi API Web Refresh: browser tự động đính kèm cookie __Secure-luxmap_rt
    const response: WebAuthTokenResponse = yield call(authAPI.refresh)
    const accessToken = response?.access_token || response?.accessToken

    if (accessToken) {
      tokenStorage.updateAccessToken(accessToken)

      const user: User | null = createUserFromToken(accessToken)
      if (user) {
        yield put(checkAuthSuccess({ user }))
        return
      }
    }

    tokenStorage.clearAll()
    yield put(checkAuthFailure())
  } catch (error: any) {
    // Không có cookie, cookie hết hạn hoặc bị từ chối
    tokenStorage.clearAll()
    yield put(checkAuthFailure())
  }
}

// Saga xử lý đăng xuất Web
function* handleLogout() {
  try {
    // Gọi Backend để hủy Refresh Token trong CSDL và xóa cookie __Secure-luxmap_rt
    yield call(authAPI.logout)
  } catch (error) {
    console.error('Lỗi khi gọi API logout:', error)
  } finally {
    // Xóa Access Token trên client
    tokenStorage.clearAll()
  }
}

export default function* authSaga() {
  yield takeLatest(loginRequest.type, handleLogin)
  yield takeLatest(logout.type, handleLogout)
  yield takeLeading(checkAuth.type, handleCheckAuth)
}
