import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { AuthState, User, LoginRequest } from '../../types/auth'
import tokenStorage from '../../utils/tokenStorage'

// Kiểm tra token để xác định trạng thái loading ban đầu khi khởi động ứng dụng
const initialToken = tokenStorage.getAccessToken()

const initialState: AuthState = {
  user: null, // Toàn bộ thông tin User Profile chỉ lưu trong Redux, nạp qua API /auth/me
  isAuthenticated: false,
  loading: !!initialToken, // Có token -> bật loading chờ saga checkAuth thẩm định và nạp profile
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
      state.error = null
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
