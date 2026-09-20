import { call, put, takeLatest, takeLeading } from 'redux-saga/effects'
import { PayloadAction } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import authAPI from './authAPI'
import {
  LoginRequest,
  WebAuthTokenResponse,
  CurrentUserResponse,
  User,
} from '../../types/auth'
import tokenStorage from '../../utils/tokenStorage'
import { createUserFromToken, mapCurrentUserToUser } from '../../utils/roleUtils'
import {
  loginRequest,
  loginSuccess,
  loginFailure,
  logout,
  checkAuth,
  checkAuthSuccess,
  checkAuthFailure,
  refreshProfileRequest,
  refreshProfileSuccess,
  refreshProfileFailure,
} from './authSlice'

// Saga xử lý đăng nhập Web
function* handleLogin(action: PayloadAction<LoginRequest>) {
  try {
    const { emailOrPhone, password, rememberMe = false } = action.payload

    // 1. Gửi yêu cầu đăng nhập lên API Web Backend
    const response: WebAuthTokenResponse = yield call(authAPI.login, {
      username: emailOrPhone.trim(),
      password,
      rememberMe: !!rememberMe,
    })

    const accessToken = response?.access_token || response?.accessToken

    if (!accessToken) {
      yield put(loginFailure('Không nhận được phản hồi xác thực từ máy chủ.'))
      return
    }

    // 2. Lưu Access Token theo tuỳ chọn rememberMe (Cookie HttpOnly __Secure-luxmap_rt do browser tự giữ)
    tokenStorage.setAccessToken(accessToken, !!rememberMe)

    // 3. Gọi trực tiếp API GET /api/v1/auth/me để lấy hồ sơ đầy đủ từ Database (Contract v1.5)
    let user: User | null = null
    try {
      const meResponse: CurrentUserResponse = yield call(authAPI.getMe)
      user = mapCurrentUserToUser(meResponse)
    } catch (meError) {
      console.warn('Không thể tải profile từ /auth/me, kích hoạt fallback từ JWT:', meError)
      user = createUserFromToken(accessToken, emailOrPhone.trim())
    }

    if (!user) {
      throw new Error('Dữ liệu hồ sơ người dùng không hợp lệ')
    }

    // 4. Nạp thông tin User chính xác vào Redux Store
    yield put(loginSuccess({ user }))
  } catch (error: any) {
    tokenStorage.clearAll()
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

// Saga xử lý khôi phục phiên đăng nhập bằng Access Token hoặc HttpOnly Cookie (Silent Refresh)
function* handleCheckAuth() {
  try {
    const existingToken = tokenStorage.getAccessToken()

    // 1. Nếu đã có token trong sessionStorage, kiểm tra trực tiếp qua GET /api/v1/auth/me
    if (existingToken) {
      try {
        const meResponse: CurrentUserResponse = yield call(authAPI.getMe)
        const user: User = mapCurrentUserToUser(meResponse)
        yield put(checkAuthSuccess({ user }))
        return
      } catch (err: any) {
        // Nếu token hết hạn (401), tiếp tục rơi xuống bước Refresh bằng Cookie bên dưới
      }
    }

    // 2. Gọi API Web Refresh: browser tự động đính kèm HttpOnly cookie __Secure-luxmap_rt
    const response: WebAuthTokenResponse = yield call(authAPI.refresh)
    const accessToken = response?.access_token || response?.accessToken

    if (accessToken) {
      tokenStorage.updateAccessToken(accessToken)

      // Lấy hồ sơ người dùng từ Database qua GET /auth/me
      try {
        const meResponse: CurrentUserResponse = yield call(authAPI.getMe)
        const user: User = mapCurrentUserToUser(meResponse)
        yield put(checkAuthSuccess({ user }))
        return
      } catch (meError) {
        console.warn('Lỗi khi gọi /auth/me sau refresh, fallback sang token:', meError)
        const user: User | null = createUserFromToken(accessToken)
        if (user) {
          yield put(checkAuthSuccess({ user }))
          return
        }
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

// Saga xử lý làm mới hồ sơ cá nhân và phân quyền tại chỗ
function* handleRefreshProfile() {
  try {
    const meResponse: CurrentUserResponse = yield call(authAPI.getMe)
    const user: User = mapCurrentUserToUser(meResponse)
    yield put(refreshProfileSuccess({ user }))
    toast.success('Đã làm mới hồ sơ & phân quyền từ máy chủ!')
  } catch (error) {
    console.error('Lỗi khi làm mới hồ sơ qua GET /auth/me:', error)
    yield put(refreshProfileFailure())
    toast.error('Không thể làm mới hồ sơ. Vui lòng kiểm tra lại kết nối.')
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
  yield takeLatest(refreshProfileRequest.type, handleRefreshProfile)
}
