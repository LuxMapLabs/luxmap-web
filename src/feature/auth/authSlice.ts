import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { AuthState, LoginRequest, GoogleLoginRequest } from '../../types/auth/web'
import type { CurrentUserResponse } from '../../types/auth/me'
import type { UserAccountItem } from '../../types/admin/users'

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
    googleLoginRequest: (state, _action: PayloadAction<GoogleLoginRequest>) => {
      state.loading = true
      state.error = null
    },
    loginSuccess: (state, action: PayloadAction<{ user: CurrentUserResponse }>) => {
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
    checkAuthSuccess: (state, action: PayloadAction<{ user: CurrentUserResponse }>) => {
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
    refreshProfileSuccess: (state, action: PayloadAction<{ user: CurrentUserResponse }>) => {
      state.isRefreshingProfile = false
      state.user = action.payload.user
    },
    refreshProfileFailure: (state) => {
      state.isRefreshingProfile = false
    },
    setAvatarUrl: (state, action: PayloadAction<string | null>) => {
      if (state.user) state.user.avatar_url = action.payload
    },
    updateCurrentUserProfile: (state, action: PayloadAction<UserAccountItem>) => {
      if (!state.user) return
      const payload = action.payload
      if (payload.email !== undefined) state.user.email = payload.email
      if (payload.full_name !== undefined) state.user.full_name = payload.full_name
      if (payload.date_of_birth !== undefined) state.user.date_of_birth = payload.date_of_birth
      if (payload.gender !== undefined) state.user.gender = payload.gender
      if (payload.address !== undefined) state.user.address = payload.address
      if (payload.phone_number !== undefined) state.user.phone_number = payload.phone_number
      if (payload.identity_type !== undefined) state.user.identity_type = payload.identity_type
      if (payload.identity_number !== undefined) state.user.identity_number = payload.identity_number
    },
  },
})

export const {
  loginRequest,
  googleLoginRequest,
  loginSuccess,
  loginFailure,
  logout,
  checkAuth,
  checkAuthSuccess,
  checkAuthFailure,
  refreshProfileRequest,
  refreshProfileSuccess,
  refreshProfileFailure,
  setAvatarUrl,
  updateCurrentUserProfile,
} = authSlice.actions

export default authSlice.reducer
