import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type {
  PublicQrInfo,
  PublicReportReceipt,
  PublicReportSubmitPayload,
} from './citizenReportAPI'

export interface CitizenReportState {
  code: string | null
  currentPole: PublicQrInfo | null
  isValidCode: boolean
  isLookingUp: boolean
  isSubmitting: boolean
  submissionResult: PublicReportReceipt | null
  lookupError: string | null
  submitError: string | null
}

const initialState: CitizenReportState = {
  code: null,
  currentPole: null,
  isValidCode: false,
  isLookingUp: false,
  isSubmitting: false,
  submissionResult: null,
  lookupError: null,
  submitError: null,
}

export const citizenReportSlice = createSlice({
  name: 'citizenReport',
  initialState,
  reducers: {
    // 1. Tra cứu thông tin cột đèn qua mã code từ tem QR
    lookupPublicQrRequest: (state, action: PayloadAction<string>) => {
      state.isLookingUp = true
      state.code = action.payload
      state.lookupError = null
      state.currentPole = null
      state.isValidCode = false
    },
    lookupPublicQrSuccess: (
      state,
      action: PayloadAction<{ code: string; poleInfo: PublicQrInfo }>
    ) => {
      state.isLookingUp = false
      state.code = action.payload.code
      state.currentPole = action.payload.poleInfo
      state.isValidCode = true
      state.lookupError = null
    },
    lookupPublicQrFailure: (state, action: PayloadAction<string>) => {
      state.isLookingUp = false
      state.currentPole = null
      state.isValidCode = false
      state.lookupError = action.payload
    },

    // 2. Gửi phản ánh sự cố công khai
    submitReportRequest: (state, _action: PayloadAction<PublicReportSubmitPayload>) => {
      state.isSubmitting = true
      state.submitError = null
      state.submissionResult = null
    },
    submitReportSuccess: (state, action: PayloadAction<PublicReportReceipt>) => {
      state.isSubmitting = false
      state.submissionResult = action.payload
      state.submitError = null
    },
    submitReportFailure: (state, action: PayloadAction<string>) => {
      state.isSubmitting = false
      state.submitError = action.payload
    },

    // 3. Reset form hoặc gửi lại phản ánh mới
    resetReportState: (state) => {
      state.isSubmitting = false
      state.submissionResult = null
      state.submitError = null
    },
  },
})

export const {
  lookupPublicQrRequest,
  lookupPublicQrSuccess,
  lookupPublicQrFailure,
  submitReportRequest,
  submitReportSuccess,
  submitReportFailure,
  resetReportState,
} = citizenReportSlice.actions

export default citizenReportSlice.reducer
