import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { SetPasswordRequest } from '../../types/auth/password'

interface PasswordState {
  isSubmitting: boolean
  isSuccess: boolean
  error: string | null
}

const initialState: PasswordState = {
  isSubmitting: false,
  isSuccess: false,
  error: null,
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
    resetPasswordState: () => initialState,
  },
})

export const { setPasswordRequest, setPasswordSuccess, setPasswordFailure, resetPasswordState } =
  passwordSlice.actions
export default passwordSlice.reducer
