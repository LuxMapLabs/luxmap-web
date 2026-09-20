import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { AuthState, User, LoginRequest } from '../../types/auth'

// Khi ứng dụng khởi chạy, mặc định loading = true để thực hiện Silent Refresh kiểm tra phiên cookie
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  isRefreshingProfile: false,
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
      state.isRefreshingProfile = false
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
    refreshProfileRequest: (state) => {
      state.isRefreshingProfile = true
    },
    refreshProfileSuccess: (state, action: PayloadAction<{ user: User }>) => {
      state.isRefreshingProfile = false
      state.user = action.payload.user
    },
    refreshProfileFailure: (state) => {
      state.isRefreshingProfile = false
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
  refreshProfileRequest,
  refreshProfileSuccess,
  refreshProfileFailure,
} = authSlice.actions

export default authSlice.reducer
