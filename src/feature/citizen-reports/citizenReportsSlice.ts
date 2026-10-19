import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type {
  CitizenReportItem,
  CitizenReportDetail,
  AcceptCitizenReportRequest,
  MergeCitizenReportRequest,
  RejectCitizenReportRequest,
} from '../../types/citizen-reports/citizen-reports'
import type { CitizenReportStatus } from '../../types/common/enums'
import type { CitizenReportsListParams } from './citizenReportsAPI'

export interface CitizenReportsState {
  // Danh sách hàng đợi
  items: CitizenReportItem[]
  total: number
  page: number
  pageSize: number
  isFetchingList: boolean
  listError: string | null

  // Bộ lọc hiện tại
  statusFilter: CitizenReportStatus[]
  communeFilter: string[]
  poleFilter: string | null

  // Chi tiết phản ánh đang mở
  selectedReportId: string | null
  selectedDetail: CitizenReportDetail | null
  isFetchingDetail: boolean
  detailError: string | null

  // Trạng thái ra quyết định (accept / merge / reject)
  isSubmittingDecision: boolean
  decisionError: string | null

  // Đếm nhanh số lượng pending (cho Badge Sidebar)
  pendingCount: number
}

const initialState: CitizenReportsState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  isFetchingList: false,
  listError: null,

  statusFilter: [],
  communeFilter: [],
  poleFilter: null,

  selectedReportId: null,
  selectedDetail: null,
  isFetchingDetail: false,
  detailError: null,

  isSubmittingDecision: false,
  decisionError: null,

  pendingCount: 0,
}

export const citizenReportsSlice = createSlice({
  name: 'citizenReports',
  initialState,
  reducers: {
    // 1. Fetch danh sách hàng đợi
    fetchReportsRequest: (state, _action: PayloadAction<CitizenReportsListParams | void | undefined>) => {
      state.isFetchingList = true
      state.listError = null
      void _action
    },
    fetchReportsSuccess: (
      state,
      action: PayloadAction<{ items: CitizenReportItem[]; total: number; page: number; pageSize: number }>
    ) => {
      state.isFetchingList = false
      state.items = action.payload.items
      state.total = action.payload.total
      state.page = action.payload.page
      state.pageSize = action.payload.pageSize
      // Nếu đang xem tab pending, cập nhật pendingCount
      if (state.statusFilter.length === 1 && state.statusFilter[0] === 'pending') {
        state.pendingCount = action.payload.total
      }
    },
    fetchReportsFailure: (state, action: PayloadAction<string>) => {
      state.isFetchingList = false
      state.listError = action.payload
    },

    // 2. Fetch đếm số lượng pending riêng (cho Badge Sidebar)
    fetchPendingCountRequest: () => {},
    fetchPendingCountSuccess: (state, action: PayloadAction<number>) => {
      state.pendingCount = action.payload
    },

    // 3. Fetch chi tiết phản ánh
    fetchReportDetailRequest: (state, action: PayloadAction<string>) => {
      state.selectedReportId = action.payload
      state.isFetchingDetail = true
      state.detailError = null
    },
    fetchReportDetailSuccess: (state, action: PayloadAction<CitizenReportDetail>) => {
      state.isFetchingDetail = false
      state.selectedDetail = action.payload
    },
    fetchReportDetailFailure: (state, action: PayloadAction<string>) => {
      state.isFetchingDetail = false
      state.detailError = action.payload
    },
    clearReportDetail: (state) => {
      state.selectedReportId = null
      state.selectedDetail = null
      state.isFetchingDetail = false
      state.detailError = null
      state.decisionError = null
    },

    // 4. Cập nhật bộ lọc
    setStatusFilter: (state, action: PayloadAction<CitizenReportStatus[]>) => {
      state.statusFilter = action.payload
      state.page = 1
    },
    setCommuneFilter: (state, action: PayloadAction<string[]>) => {
      state.communeFilter = action.payload
      state.page = 1
    },
    setPoleFilter: (state, action: PayloadAction<string | null>) => {
      state.poleFilter = action.payload
      state.page = 1
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pageSize = action.payload
      state.page = 1
    },

    // 5. Thao tác Chấp thuận (Accept)
    acceptReportRequest: (
      state,
      _action: PayloadAction<{ reportId: string; data: AcceptCitizenReportRequest }>
    ) => {
      state.isSubmittingDecision = true
      state.decisionError = null
      void _action
    },
    acceptReportSuccess: (state, action: PayloadAction<CitizenReportDetail>) => {
      state.isSubmittingDecision = false
      state.selectedDetail = action.payload
    },
    acceptReportFailure: (state, action: PayloadAction<string>) => {
      state.isSubmittingDecision = false
      state.decisionError = action.payload
    },

    // 6. Thao tác Gộp (Merge)
    mergeReportRequest: (
      state,
      _action: PayloadAction<{ reportId: string; data: MergeCitizenReportRequest }>
    ) => {
      state.isSubmittingDecision = true
      state.decisionError = null
      void _action
    },
    mergeReportSuccess: (state, action: PayloadAction<CitizenReportDetail>) => {
      state.isSubmittingDecision = false
      state.selectedDetail = action.payload
    },
    mergeReportFailure: (state, action: PayloadAction<string>) => {
      state.isSubmittingDecision = false
      state.decisionError = action.payload
    },

    // 7. Thao tác Từ chối (Reject)
    rejectReportRequest: (
      state,
      _action: PayloadAction<{ reportId: string; data: RejectCitizenReportRequest }>
    ) => {
      state.isSubmittingDecision = true
      state.decisionError = null
      void _action
    },
    rejectReportSuccess: (state, action: PayloadAction<CitizenReportDetail>) => {
      state.isSubmittingDecision = false
      state.selectedDetail = action.payload
    },
    rejectReportFailure: (state, action: PayloadAction<string>) => {
      state.isSubmittingDecision = false
      state.decisionError = action.payload
    },
  },
})

export const {
  fetchReportsRequest,
  fetchReportsSuccess,
  fetchReportsFailure,
  fetchPendingCountRequest,
  fetchPendingCountSuccess,
  fetchReportDetailRequest,
  fetchReportDetailSuccess,
  fetchReportDetailFailure,
  clearReportDetail,
  setStatusFilter,
  setCommuneFilter,
  setPoleFilter,
  setPage,
  setPageSize,
  acceptReportRequest,
  acceptReportSuccess,
  acceptReportFailure,
  mergeReportRequest,
  mergeReportSuccess,
  mergeReportFailure,
  rejectReportRequest,
  rejectReportSuccess,
  rejectReportFailure,
} = citizenReportsSlice.actions

export default citizenReportsSlice.reducer
