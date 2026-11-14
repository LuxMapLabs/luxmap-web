import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { SuperiorReportItem } from '../../types/reports/report'

export interface FetchReportsRequest {
  month: number // 0-indexed
  year: number
  searchQuery: string
  /** commune_id -> tên xã, lấy từ hồ sơ tài khoản */
  communeNames: Record<string, string>
}

export interface ReportsState {
  reports: SuperiorReportItem[]
  /** true ngay từ đầu để bảng hiện skeleton trước lần tải đầu tiên */
  loading: boolean
  loadFailed: boolean
  /** Báo cáo đang mở trong modal: ban đầu là dòng tóm tắt, sau đó được thay bằng bản chi tiết */
  selectedReport: SuperiorReportItem | null
}

const initialState: ReportsState = {
  reports: [],
  loading: true,
  loadFailed: false,
  selectedReport: null,
}

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    fetchReportsRequest: (state, _action: PayloadAction<FetchReportsRequest>) => {
      state.loading = true
      state.loadFailed = false
    },
    fetchReportsSuccess: (state, action: PayloadAction<SuperiorReportItem[]>) => {
      state.loading = false
      state.loadFailed = false
      state.reports = action.payload
    },
    fetchReportsFailure: (state) => {
      state.loading = false
      state.loadFailed = true
      state.reports = []
    },
    /** Mở modal ngay bằng dòng tóm tắt; saga tải thêm chi tiết rồi thay vào */
    openReportRequest: (state, action: PayloadAction<SuperiorReportItem>) => {
      state.selectedReport = action.payload
    },
    openReportDetailSuccess: (state, action: PayloadAction<SuperiorReportItem>) => {
      // Bỏ qua kết quả muộn của một báo cáo đã bị đóng / thay bằng báo cáo khác
      if (state.selectedReport?.workOrderId === action.payload.workOrderId) {
        state.selectedReport = action.payload
      }
    },
    closeReport: (state) => {
      state.selectedReport = null
    },
  },
})

export const {
  fetchReportsRequest,
  fetchReportsSuccess,
  fetchReportsFailure,
  openReportRequest,
  openReportDetailSuccess,
  closeReport,
} = reportsSlice.actions

export default reportsSlice.reducer
