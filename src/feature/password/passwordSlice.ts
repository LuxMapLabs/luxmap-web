import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ChangePasswordRequest, SetPasswordRequest } from '../../types/auth/password'

interface PasswordState {
  isSubmitting: boolean
  isSuccess: boolean
  error: string | null
  isChanging: boolean
  changeSuccess: boolean
  changeError: string | null
}

const initialState: PasswordState = {
  isSubmitting: false,
  isSuccess: false,
  error: null,
  isChanging: false,
  changeSuccess: false,
  changeError: null,
}

const passwordSlice = createSlice({
  name: 'password',
  initialState,
  reducers: {
    setPasswordRequest: (state, _action: PayloadAction<SetPasswordRequest>) => {
      state.isSubmitting = true
      state.isSuccess = false
      state.error = null
    },
    setPasswordSuccess: (state) => {
      state.isSubmitting = false
      state.isSuccess = true
      state.error = null
    },
    setPasswordFailure: (state, action: PayloadAction<string>) => {
      state.isSubmitting = false
      state.isSuccess = false
      state.error = action.payload
    },
    changePasswordRequest: (state, _action: PayloadAction<ChangePasswordRequest>) => {
      state.isChanging = true
      state.changeSuccess = false
      state.changeError = null
    },
    changePasswordSuccess: (state) => {
      state.isChanging = false
      state.changeSuccess = true
      state.changeError = null
    },
    changePasswordFailure: (state, action: PayloadAction<string>) => {
      state.isChanging = false
      state.changeSuccess = false
      state.changeError = action.payload
    },
    resetPasswordState: () => initialState,
  },
})

export const {
  setPasswordRequest,
  setPasswordSuccess,
  setPasswordFailure,
  changePasswordRequest,
  changePasswordSuccess,
  changePasswordFailure,
  resetPasswordState,
} = passwordSlice.actions
export default passwordSlice.reducer
