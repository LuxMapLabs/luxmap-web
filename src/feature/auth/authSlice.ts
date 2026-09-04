import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { AuthState, User, LoginRequest } from '../../types/auth'
import tokenStorage from '../../utils/tokenStorage'

// Tự động khôi phục thông tin User và trạng thái xác thực từ Storage ngay khi khởi động
const initialUser = tokenStorage.getUser()
const initialToken = tokenStorage.getAccessToken()

const initialState: AuthState = {
  user: initialUser,
  isAuthenticated: !!initialToken && !!initialUser,
  loading: !!initialToken, // Có token -> chờ saga checkAuth thẩm định với backend
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginRequest: (state, _action: PayloadAction<LoginRequest>) => {
      state.loading = true
      state.error = null
    },
    loginSuccess: (state, action: PayloadAction<{ user: User }>) => {
      state.loading = false
      state.isAuthenticated = true
      state.user = action.payload.user
      state.error = null
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false
      state.isAuthenticated = false
      state.user = null
      state.error = action.payload
    },
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.loading = false
      state.error = null
    },
    checkAuth: (state) => {
      // Giữ nguyên trạng thái user hiện tại nếu có, chỉ bật loading
      state.loading = true
      state.error = null
    },
    checkAuthSuccess: (state, action: PayloadAction<{ user: User }>) => {
      state.loading = false
      state.isAuthenticated = true
      state.user = action.payload.user
      state.error = null
    },
    checkAuthFailure: (state) => {
      state.loading = false
      state.isAuthenticated = false
      state.user = null
    },
  },
})

export const {
  loginRequest,
  loginSuccess,
  loginFailure,
  logout,
  checkAuth,
  checkAuthSuccess,
  checkAuthFailure,
} = authSlice.actions

export default authSlice.reducer
