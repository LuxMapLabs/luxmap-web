import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type {
  IssueQrCodeRequest,
  QrCodeItem,
  QrCodeItemPagedResult,
} from '../../types/qr-codes/qr-codes'
import type { QrCodeListQuery } from './qrCodeAPI'

export interface QrCodeState {
  currentPoleQr: QrCodeItem | null
  activeCodesByPoleId: Record<string, QrCodeItem | null>
  qrList: QrCodeItem[]
  total: number
  page: number
  pageSize: number
  isFetching: boolean
  isIssuing: boolean
  isRevoking: boolean
  error: string | null
}

const initialState: QrCodeState = {
  currentPoleQr: null,
  activeCodesByPoleId: {},
  qrList: [],
  total: 0,
  page: 1,
  pageSize: 20,
  isFetching: false,
  isIssuing: false,
  isRevoking: false,
  error: null,
}

export const qrCodeSlice = createSlice({
  name: 'qrCode',
  initialState,
  reducers: {
    // 1. Fetch mã QR active của một cột đèn cụ thể
    fetchPoleQrRequest: (state, _action: PayloadAction<string>) => {
      state.isFetching = true
      state.error = null
    },
    fetchPoleQrSuccess: (
      state,
      action: PayloadAction<{ poleId: string; qrItem: QrCodeItem | null }>
    ) => {
      state.isFetching = false
      state.currentPoleQr = action.payload.qrItem
      state.activeCodesByPoleId[action.payload.poleId] = action.payload.qrItem
      state.error = null
    },
    fetchPoleQrFailure: (state, action: PayloadAction<string>) => {
      state.isFetching = false
      state.error = action.payload
    },

    // 2. Cấp mới / sinh mã QR cho cột đèn
    issueQrCodeRequest: (state, _action: PayloadAction<IssueQrCodeRequest>) => {
      state.isIssuing = true
      state.error = null
    },
    issueQrCodeSuccess: (state, action: PayloadAction<QrCodeItem>) => {
      state.isIssuing = false
      const newItem = action.payload
      state.currentPoleQr = newItem
      if (newItem.pole_id) {
        state.activeCodesByPoleId[newItem.pole_id] = newItem
      }

      // Cập nhật danh sách nếu đã tải
      const idx = state.qrList.findIndex((q) => q.qr_id === newItem.qr_id)
      if (idx >= 0) {
        state.qrList[idx] = newItem
      } else {
        state.qrList.unshift(newItem)
      }
      state.error = null
    },
    issueQrCodeFailure: (state, action: PayloadAction<string>) => {
      state.isIssuing = false
      state.error = action.payload
    },

    // 3. Thu hồi mã QR
    revokeQrCodeRequest: (
      state,
      _action: PayloadAction<{ qrId: string; poleId?: string }>
    ) => {
      state.isRevoking = true
      state.error = null
    },
    revokeQrCodeSuccess: (state, action: PayloadAction<QrCodeItem>) => {
      state.isRevoking = false
      const revokedItem = action.payload
      if (state.currentPoleQr && state.currentPoleQr.qr_id === revokedItem.qr_id) {
        state.currentPoleQr = revokedItem
      }
      if (
        revokedItem.pole_id &&
        state.activeCodesByPoleId[revokedItem.pole_id]?.qr_id === revokedItem.qr_id
      ) {
        state.activeCodesByPoleId[revokedItem.pole_id] = revokedItem
      }

      const idx = state.qrList.findIndex((q) => q.qr_id === revokedItem.qr_id)
      if (idx >= 0) {
        state.qrList[idx] = revokedItem
      }
      state.error = null
    },
    revokeQrCodeFailure: (state, action: PayloadAction<string>) => {
      state.isRevoking = false
      state.error = action.payload
    },

    // 4. Lấy danh sách mã QR có phân trang & lọc
    fetchQrCodesRequest: (state, _action: PayloadAction<QrCodeListQuery | undefined>) => {
      state.isFetching = true
      state.error = null
    },
    fetchQrCodesSuccess: (state, action: PayloadAction<QrCodeItemPagedResult>) => {
      state.isFetching = false
      state.qrList = action.payload.items || []
      state.total = action.payload.total || 0
      state.page = action.payload.page || 1
      state.pageSize = action.payload.page_size || 20
      state.error = null
    },
    fetchQrCodesFailure: (state, action: PayloadAction<string>) => {
      state.isFetching = false
      state.error = action.payload
    },

    // 5. Reset mã QR cột đang xem
    clearCurrentPoleQr: (state) => {
      state.currentPoleQr = null
      state.error = null
    },
  },
})

export const {
  fetchPoleQrRequest,
  fetchPoleQrSuccess,
  fetchPoleQrFailure,
  issueQrCodeRequest,
  issueQrCodeSuccess,
  issueQrCodeFailure,
  revokeQrCodeRequest,
  revokeQrCodeSuccess,
  revokeQrCodeFailure,
  fetchQrCodesRequest,
  fetchQrCodesSuccess,
  fetchQrCodesFailure,
  clearCurrentPoleQr,
} = qrCodeSlice.actions

export default qrCodeSlice.reducer
