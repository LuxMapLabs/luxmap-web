import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CitizenReportPayload, CitizenReportResponse } from './citizenReportAPI'
import type { DecryptedPoleInfo } from '../../utils/qrSecurity'

interface CitizenReportState {
  currentPole: DecryptedPoleInfo | null
  rawQrToken: string | null
  isValidToken: boolean
  isVerifyingToken: boolean
  isSubmitting: boolean
  submissionResult: CitizenReportResponse | null
  error: string | null
}

const initialState: CitizenReportState = {
  currentPole: null,
  rawQrToken: null,
  isValidToken: false,
  isVerifyingToken: false,
  isSubmitting: false,
  submissionResult: null,
  error: null,
}

export const citizenReportSlice = createSlice({
  name: 'citizenReport',
  initialState,
  reducers: {
    // 1. Phân giải và xác thực token từ QR
    verifyTokenRequest: (state, action: PayloadAction<string>) => {
      state.isVerifyingToken = true
      state.rawQrToken = action.payload
      state.error = null
    },
    verifyTokenSuccess: (state, action: PayloadAction<DecryptedPoleInfo>) => {
      state.isVerifyingToken = false
      state.currentPole = action.payload
      state.isValidToken = true
      state.error = null
    },
    verifyTokenFailure: (state, action: PayloadAction<string>) => {
      state.isVerifyingToken = false
      state.currentPole = null
      state.isValidToken = false
      state.error = action.payload
    },

    // 2. Gửi phản ánh sự cố
    submitReportRequest: (state, _action: PayloadAction<CitizenReportPayload>) => {
      state.isSubmitting = true
      state.error = null
      state.submissionResult = null
    },
    submitReportSuccess: (state, action: PayloadAction<CitizenReportResponse>) => {
      state.isSubmitting = false
      state.submissionResult = action.payload
      state.error = null
    },
    submitReportFailure: (state, action: PayloadAction<string>) => {
      state.isSubmitting = false
      state.error = action.payload
    },

    // 3. Reset form hoặc gửi lại phản ánh mới
    resetReportState: (state) => {
      state.isSubmitting = false
      state.submissionResult = null
      state.error = null
    },
  },
})

export const {
  verifyTokenRequest,
  verifyTokenSuccess,
  verifyTokenFailure,
  submitReportRequest,
  submitReportSuccess,
  submitReportFailure,
  resetReportState,
} = citizenReportSlice.actions

export default citizenReportSlice.reducer
