import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type {
  WorkOrderItem,
  WorkOrderDetail,
  WorkOrderAssignee,
  WorkOrderItemPagedResult,
  CreateWorkOrderRequest,
  PatchWorkOrderRequest,
  FollowUpWorkOrderRequest,
} from '../../types/workorders/orders'
import type { TaskKind } from '../../types/common/enums'
import type { ScheduleCase } from '../../types/workSchedule'
import type { GetWorkOrdersFilter } from './workScheduleAPI'
import { mapWorkOrdersToScheduleCases } from '../../utils/work-schedule/workScheduleUtils'

export interface WorkScheduleState {
  // 1. Thực thể API Backend 
  workOrders: WorkOrderItem[]
  totalWorkOrders: number
  selectedWorkOrderId: string | null
  workOrderDetail: WorkOrderDetail | null
  assignees: WorkOrderAssignee[]

  // 2. Loading & Error flags 
  isLoadingWorkOrders: boolean
  workOrdersError: string | null
  isLoadingDetail: boolean
  detailError: string | null
  isLoadingAssignees: boolean
  assigneesError: string | null
  isSubmitting: boolean
  actionError: string | null

  // Tương thích ngược cho các selector chung
  isLoading: boolean
  error: string | null

  // 3. UI State cho Calendar & Stepper
  cases: ScheduleCase[]
  selectedCaseCode: string | null
  viewingPhaseIndex: number
  currentMonth: number // 0-indexed
  currentYear: number
  filterPhase: 'all' | TaskKind | 'ended'
}

const now = new Date()

const initialState: WorkScheduleState = {
  workOrders: [],
  totalWorkOrders: 0,
  selectedWorkOrderId: null,
  workOrderDetail: null,
  assignees: [
    { user_id: 'USR-004', full_name: 'Khang Lê (Field Crew 1)' },
    { user_id: 'USR-005', full_name: 'Nguyễn Văn Hoàng (Field Crew 2)' },
    { user_id: 'USR-006', full_name: 'Trần Minh Tuấn (Field Crew 3)' },
  ],

  isLoadingWorkOrders: false,
  workOrdersError: null,
  isLoadingDetail: false,
  detailError: null,
  isLoadingAssignees: false,
  assigneesError: null,
  isSubmitting: false,
  actionError: null,

  isLoading: false,
  error: null,

  cases: [],
  selectedCaseCode: null,
  viewingPhaseIndex: 0,
  currentMonth: now.getMonth(),
  currentYear: now.getFullYear(),
  filterPhase: 'all',
}

export const workScheduleSlice = createSlice({
  name: 'workSchedule',
  initialState,
  reducers: {
    // -------------------------------------------------------------
    // 1. TẢI DANH SÁCH LỆNH CÔNG TÁC (Tương đương fetchMapLayers bên mapSlice)
    // -------------------------------------------------------------
    fetchWorkOrdersRequest(state, _action: PayloadAction<GetWorkOrdersFilter | undefined>) {
      state.isLoadingWorkOrders = true
      state.isLoading = true
      state.workOrdersError = null
      state.error = null
    },
    fetchWorkOrdersSuccess(state, action: PayloadAction<WorkOrderItemPagedResult>) {
      state.isLoadingWorkOrders = false
      state.isLoading = false
      state.workOrdersError = null
      state.error = null
      state.workOrders = action.payload.items || []
      state.totalWorkOrders = action.payload.total || 0

      // Ánh xạ an toàn sang cấu trúc Stepper cho giao diện Lịch
      state.cases = mapWorkOrdersToScheduleCases(state.workOrders, state.assignees)

      if (state.selectedCaseCode) {
        const found = state.cases.find((c) => c.code === state.selectedCaseCode)
        if (found) {
          state.viewingPhaseIndex = Math.min(state.viewingPhaseIndex, found.phases.length - 1)
        } else {
          state.selectedCaseCode = null
          state.viewingPhaseIndex = 0
        }
      }
    },
    fetchWorkOrdersFailure(state, action: PayloadAction<string>) {
      state.isLoadingWorkOrders = false
      state.isLoading = false
      state.workOrdersError = action.payload
      state.error = action.payload
    },

    // -------------------------------------------------------------
    // 2. CHI TIẾT LỆNH CÔNG TÁC (Tương đương fetchPoleDetail bên mapSlice)
    // -------------------------------------------------------------
    fetchWorkOrderDetailRequest(state, action: PayloadAction<string>) {
      state.selectedWorkOrderId = action.payload
      state.isLoadingDetail = true
      state.detailError = null
    },
    fetchWorkOrderDetailSuccess(state, action: PayloadAction<WorkOrderDetail>) {
      state.isLoadingDetail = false
      state.workOrderDetail = action.payload
      state.detailError = null
    },
    fetchWorkOrderDetailFailure(state, action: PayloadAction<string>) {
      state.isLoadingDetail = false
      state.detailError = action.payload
    },
    clearWorkOrderDetail(state) {
      state.selectedWorkOrderId = null
      state.workOrderDetail = null
      state.isLoadingDetail = false
      state.detailError = null
    },

    // -------------------------------------------------------------
    // 3. TẢI DANH SÁCH KỸ SƯ HIỆN TRƯỜNG
    // -------------------------------------------------------------
    fetchAssigneesRequest(state, _action: PayloadAction<string | undefined>) {
      state.isLoadingAssignees = true
      state.assigneesError = null
    },
    fetchAssigneesSuccess(state, action: PayloadAction<WorkOrderAssignee[]>) {
      state.isLoadingAssignees = false
      state.assigneesError = null
      if (action.payload && action.payload.length > 0) {
        const hasSpecificEngineers = action.payload.some(
          (a) => a.full_name && a.full_name !== 'Kỹ sư hiện trường'
        )
        if (hasSpecificEngineers) {
          state.assignees = action.payload
        }
      }
      if (state.workOrders.length > 0) {
        state.cases = mapWorkOrdersToScheduleCases(state.workOrders, state.assignees)
      }
    },
    fetchAssigneesFailure(state, action: PayloadAction<string>) {
      state.isLoadingAssignees = false
      state.assigneesError = action.payload
    },

    // -------------------------------------------------------------
    // 4. CÁC TÁC VỤ MUTATION (Nhận trực tiếp 100% Request DTOs từ Backend)
    // -------------------------------------------------------------
    createWorkOrderRequest(state, _action: PayloadAction<CreateWorkOrderRequest>) {
      state.isSubmitting = true
      state.actionError = null
    },
    createWorkOrderSuccess(state) {
      state.isSubmitting = false
      state.actionError = null
    },
    createWorkOrderFailure(state, action: PayloadAction<string>) {
      state.isSubmitting = false
      state.actionError = action.payload
    },

    patchWorkOrderRequest(
      state,
      _action: PayloadAction<{
        workOrderId: string
        payload: PatchWorkOrderRequest
        newAssigneeId?: string
      }>
    ) {
      state.isSubmitting = true
      state.actionError = null
    },
    patchWorkOrderSuccess(state) {
      state.isSubmitting = false
      state.actionError = null
    },
    patchWorkOrderFailure(state, action: PayloadAction<string>) {
      state.isSubmitting = false
      state.actionError = action.payload
    },

    followUpWorkOrderRequest(
      state,
      _action: PayloadAction<{
        parentWorkOrderId: string
        payload: FollowUpWorkOrderRequest
        nextPhaseLabel?: string
      }>
    ) {
      state.isSubmitting = true
      state.actionError = null
    },
    followUpWorkOrderSuccess(state) {
      state.isSubmitting = false
      state.actionError = null
    },
    followUpWorkOrderFailure(state, action: PayloadAction<string>) {
      state.isSubmitting = false
      state.actionError = action.payload
    },

    verifyWorkOrderRequest(
      state,
      _action: PayloadAction<{
        workOrderId: string
        note?: string
        materials_note?: string
      }>
    ) {
      state.isSubmitting = true
      state.actionError = null
    },
    verifyWorkOrderSuccess(state) {
      state.isSubmitting = false
      state.actionError = null
    },
    verifyWorkOrderFailure(state, action: PayloadAction<string>) {
      state.isSubmitting = false
      state.actionError = action.payload
    },

    cancelWorkOrderRequest(
      state,
      _action: PayloadAction<{
        workOrderId: string
        note?: string
        successMessage?: string
      }>
    ) {
      state.isSubmitting = true
      state.actionError = null
    },
    cancelWorkOrderSuccess(state) {
      state.isSubmitting = false
      state.actionError = null
    },
    cancelWorkOrderFailure(state, action: PayloadAction<string>) {
      state.isSubmitting = false
      state.actionError = action.payload
    },

    returnWorkOrderRequest(
      state,
      _action: PayloadAction<{
        workOrderId: string
        note: string
      }>
    ) {
      state.isSubmitting = true
      state.actionError = null
    },
    returnWorkOrderSuccess(state) {
      state.isSubmitting = false
      state.actionError = null
    },
    returnWorkOrderFailure(state, action: PayloadAction<string>) {
      state.isSubmitting = false
      state.actionError = action.payload
    },

    // -------------------------------------------------------------
    // 5. UI STATE REDUCERS (Lịch, Bộ lọc, Stepper modal)
    // -------------------------------------------------------------
    setCurrentMonth(state, action: PayloadAction<{ month: number; year: number }>) {
      state.currentMonth = action.payload.month
      state.currentYear = action.payload.year
    },
    changeMonth(state, action: PayloadAction<number>) {
      let newMonth = state.currentMonth + action.payload
      let newYear = state.currentYear
      if (newMonth < 0) {
        newMonth = 11
        newYear -= 1
      } else if (newMonth > 11) {
        newMonth = 0
        newYear += 1
      }
      state.currentMonth = newMonth
      state.currentYear = newYear
    },
    setFilterPhase(state, action: PayloadAction<WorkScheduleState['filterPhase']>) {
      state.filterPhase = action.payload
    },
    openCaseDetail(state, action: PayloadAction<{ code: string; phaseIndex?: number }>) {
      state.selectedCaseCode = action.payload.code
      const found = state.cases.find((c) => c.code === action.payload.code)
      if (found) {
        state.viewingPhaseIndex =
          action.payload.phaseIndex !== undefined
            ? action.payload.phaseIndex
            : found.currentPhaseIndex
      }
    },
    closeCaseDetail(state) {
      state.selectedCaseCode = null
    },
    setViewingPhaseIndex(state, action: PayloadAction<number>) {
      state.viewingPhaseIndex = action.payload
    },
    resetScheduleToDefault(state) {
      state.cases = []
      state.workOrders = []
      state.totalWorkOrders = 0
    },
  },
})

export const {
  fetchWorkOrdersRequest,
  fetchWorkOrdersSuccess,
  fetchWorkOrdersFailure,
  fetchWorkOrderDetailRequest,
  fetchWorkOrderDetailSuccess,
  fetchWorkOrderDetailFailure,
  clearWorkOrderDetail,
  fetchAssigneesRequest,
  fetchAssigneesSuccess,
  fetchAssigneesFailure,
  createWorkOrderRequest,
  createWorkOrderSuccess,
  createWorkOrderFailure,
  patchWorkOrderRequest,
  patchWorkOrderSuccess,
  patchWorkOrderFailure,
  followUpWorkOrderRequest,
  followUpWorkOrderSuccess,
  followUpWorkOrderFailure,
  verifyWorkOrderRequest,
  verifyWorkOrderSuccess,
  verifyWorkOrderFailure,
  cancelWorkOrderRequest,
  cancelWorkOrderSuccess,
  cancelWorkOrderFailure,
  returnWorkOrderRequest,
  returnWorkOrderSuccess,
  returnWorkOrderFailure,
  setCurrentMonth,
  changeMonth,
  setFilterPhase,
  openCaseDetail,
  closeCaseDetail,
  setViewingPhaseIndex,
  resetScheduleToDefault,
} = workScheduleSlice.actions

export default workScheduleSlice.reducer
