import { call, put, takeLatest } from 'redux-saga/effects'
import { PayloadAction } from '@reduxjs/toolkit'
import authAPI from './authAPI'
import { LoginRequest, ApiResponse, AuthResponse, User } from '../../types/auth'
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
      
      // Lưu trữ token vào sessionStorage theo yêu cầu
      sessionStorage.setItem('accessToken', accessToken)
      sessionStorage.setItem('refreshToken', refreshToken)
      
      yield put(loginSuccess({ user }))
    } else {
      yield put(loginFailure(response.error?.message || 'Đăng nhập thất bại'))
    }
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.error?.message || 
      error.response?.data?.message || 
      error.message || 
      'Đăng nhập thất bại do lỗi kết nối';
    yield put(loginFailure(errorMessage))
  }
}

// Saga xử lý đăng xuất
function* handleLogout() {
  try {
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('refreshToken')
  } catch (error) {
    console.error('Lỗi khi xóa token khi đăng xuất:', error)
  }
}

// Saga xử lý khôi phục phiên đăng nhập (checkAuth)
function* handleCheckAuth() {
  try {
    const token = sessionStorage.getItem('accessToken')
    if (!token) {
      yield put(checkAuthFailure())
      return
    }

    const response: ApiResponse<User> = yield call(authAPI.getMe)
    if (response.data) {
      yield put(checkAuthSuccess({ user: response.data }))
    } else {
      yield put(checkAuthFailure())
    }
  } catch (error) {
    // Nếu bị lỗi 401 thì apiClient interceptor đã tự xử lý hoặc chuyển hướng,
    // Ở đây ta dispatch failure để reset state loading về false.
    yield put(checkAuthFailure())
  }
}

export default function* authSaga() {
  yield takeLatest(loginRequest.type, handleLogin)
  yield takeLatest(logout.type, handleLogout)
  yield takeLatest(checkAuth.type, handleCheckAuth)
}
