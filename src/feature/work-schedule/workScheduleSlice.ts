import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { WorkOrderItem, WorkOrderDetail, WorkOrderAssignee, WorkOrderItemPagedResult, CreateWorkOrderRequest, PatchWorkOrderRequest, FollowUpWorkOrderRequest, WorkOrderAttachmentItem, WorkOrderPoleLocation } from '../../types/workorders/orders'
import type { SetPoleLocationRequest } from '../../types/assets/poles'
import type { TaskKind } from '../../types/common/enums'
import type { GetWorkOrdersFilter } from './workScheduleAPI'
import {
  mapWorkOrdersToScheduleCases,
  formatSegmentDisplay,
  segmentLabelFromIds,
  type SegmentNameMap,
} from '../../utils/work-schedule/workScheduleUtils'

// ==========================================
// CẤU TRÚC HỒ SƠ SỰ VỤ & THANH TIẾN TRÌNH (UI STATE)
// Backend trả về từng WorkOrderItem độc lập có case_id,
// Frontend gom nhóm và hiển thị dưới dạng Stepper các giai đoạn.
// ==========================================

export interface SchedulePhase {
  phaseType: TaskKind
  name: string
  date: string
  dueDate?: string
  createdAt?: string
  rawStatus?: string
  assigneeId: string
  assigneeName: string
  status: 'pending' | 'reported' | 'ended'
  notes?: string
  returnReason?: string
  materialsNote?: string // Ghi chú vật tư tự do (textarea)
  workOrderId?: string
  segmentId?: string
  poleIds?: string[] // Danh sách các cột đèn cụ thể cần kiểm tra / sửa chữa / cập nhật GPS
  qrPdfFiles?: WorkOrderAttachmentItem[] // File PDF chứa mã QR quản lý gửi xuống cho kỹ sư
  cancellationRequest?: {
    status: 'none' | 'pending' | 'rejected'
    reason: string
    requestedAt?: string
    requestedBy?: string
    rejectReason?: string
    rejectedAt?: string
  }
  report?: {
    submittedAt: string
    summary: string
    videoUrl?: string
    photoEvidence?: string[]
    luxMeasured?: string
    suggestedMaterialsNote?: string // Kỹ sư tự do nhập ghi chú đề xuất
    usedMaterialsNote?: string      // Kỹ sư nhập / Quản lý tự do chỉnh sửa
    poleGpsLocations?: WorkOrderPoleLocation[] // Tọa độ GPS các cột kỹ sư gửi lên
    aiDetections?: Array<{
      poleId: string
      issue: string
      confidence: number
    }>
  }
}

export interface ScheduleCase {
  code: string                  // Ví dụ: SCH-001 (giữ nguyên xuyên suốt)
  title: string
  segment: string
  createdAt?: string            // Ngày giờ tạo của vụ việc
  currentPhaseIndex: number     // 0: Khảo sát, 1: Kiểm tra, 2: Sửa chữa, 3: Cấp trên
  isTerminated: boolean         // True nếu bị từ chối duyệt hoặc đóng sớm
  endReason?: string
  poleIds?: string[]            // Cột đèn liên quan của sự vụ
  hasPendingCancellationRequest?: boolean // Có yêu cầu xin hủy lịch từ kỹ sư hiện trường đang chờ duyệt
  phases: SchedulePhase[]       // Lịch sử các giai đoạn
}

export interface WorkScheduleState {
  // 1. Thực thể API Backend 
  workOrders: WorkOrderItem[]
  totalWorkOrders: number
  selectedWorkOrderId: string | null
  workOrderDetail: WorkOrderDetail | null
  assignees: WorkOrderAssignee[]
  /** segment_id -> tên tuyến (từ API tuyến đường) để hiển thị lịch và chi tiết lệnh */
  segmentNames: SegmentNameMap

  // 2. Loading & Error flags 
  isLoadingWorkOrders: boolean
  workOrdersError: string | null
  isLoadingDetail: boolean
  detailError: string | null
  isLoadingAssignees: boolean
  assigneesError: string | null
  busyGpsPoleIds: string[]
  isLoadingBusyGpsPoles: boolean
  busyGpsPolesError: string | null
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
  filterPhase:
    | 'all'
    | TaskKind
    | 'ended'
    | 'has_report'
    | 'has_cancel'
    | 'overdue'
  /** Tọa độ GPS tạm do Quản lý kéo thả tinh chỉnh trong popup Xem GIS (chỉ lưu thật khi bấm Duyệt báo cáo) */
  editedGpsByWorkOrder: Record<string, Record<string, SetPoleLocationRequest>>
  /** Thứ tự các cột được Quản lý sắp xếp khi cập nhật tuần tự trong popup Xem GIS */
  orderedGpsPolesByWorkOrder: Record<string, string[]>
}

const now = new Date()

const initialState: WorkScheduleState = {
  workOrders: [],
  totalWorkOrders: 0,
  selectedWorkOrderId: null,
  workOrderDetail: null,
  assignees: [],
  segmentNames: {},

  isLoadingWorkOrders: false,
  workOrdersError: null,
  isLoadingDetail: false,
  detailError: null,
  isLoadingAssignees: false,
  assigneesError: null,
  busyGpsPoleIds: [],
  isLoadingBusyGpsPoles: false,
  busyGpsPolesError: null,
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
  editedGpsByWorkOrder: {},
  orderedGpsPolesByWorkOrder: {},
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
      state.cases = mapWorkOrdersToScheduleCases(state.workOrders, state.assignees, state.segmentNames)

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
    fetchSegmentNamesSuccess(state, action: PayloadAction<SegmentNameMap>) {
      state.segmentNames = action.payload
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

      // Tự động gán poleIds, cập nhật báo cáo và segment từ chi tiết vào phase và case tương ứng
      const detail = action.payload
      const faultPoleIds = (detail.faults || []).map((f) => f.pole_id).filter(Boolean) as string[]
      const targetPoleIds = (detail.pole_ids || []).filter(Boolean) as string[]
      const poleIds = Array.from(new Set([...targetPoleIds, ...faultPoleIds]))
      const segmentLabel = segmentLabelFromIds(
        [
          detail.segment_id,
          ...(detail.segment_ids ?? []),
          ...(detail.segment_id || detail.segment_ids?.length ? [] : [detail.faults?.[0]?.segment_id]),
        ],
        state.segmentNames
      )

      state.cases.forEach((c) => {
        c.phases.forEach((p) => {
          if (p.workOrderId === detail.work_order_id) {
            if (poleIds.length > 0) {
              p.poleIds = poleIds
            }
            if (detail.note) {
              p.notes = detail.note
            }
            if (detail.materials_note) {
              p.materialsNote = detail.materials_note
            }
            if (detail.attachments && detail.attachments.length > 0) {
              p.qrPdfFiles = detail.attachments
            }
            if (detail.scheduled_date) {
              p.date = detail.scheduled_date.substring(0, 10)
            }
            if (detail.due_date) {
              p.dueDate = detail.due_date.substring(0, 10)
            }
            if (detail.assigned_to !== undefined) {
              p.assigneeId = detail.assigned_to || ''
              const matchedAssignee = state.assignees.find((a) => a.user_id === detail.assigned_to)
              if (matchedAssignee?.full_name) {
                p.assigneeName = matchedAssignee.full_name
              } else if (!detail.assigned_to) {
                p.assigneeName = 'Chưa phân công'
              }
            }
            if (detail.wo_status) {
              p.rawStatus = detail.wo_status
              if (detail.wo_status === 'done') p.status = 'reported'
              else if (detail.wo_status === 'verified') p.status = 'ended'
            }
            p.returnReason =
              detail.wo_status !== 'done' && detail.wo_status !== 'verified' && detail.review_note
                ? detail.review_note
                : undefined
            if (
              detail.report_note ||
              detail.wo_status === 'done' ||
              detail.wo_status === 'verified' ||
              Boolean(detail.pole_locations && detail.pole_locations.length > 0)
            ) {
              p.report = {
                ...(p.report || {
                  submittedAt: `${p.date} 17:00`,
                  summary: 'Báo cáo kỹ thuật hiện trường',
                }),
                summary: detail.report_note || p.report?.summary || 'Báo cáo kỹ thuật hiện trường',
                submittedAt: detail.completed_at
                  ? new Date(detail.completed_at).toLocaleString('vi-VN')
                  : p.report?.submittedAt || `${p.date} 17:00`,
                usedMaterialsNote: detail.materials_used || p.report?.usedMaterialsNote,
                suggestedMaterialsNote: detail.materials_note || p.report?.suggestedMaterialsNote,
                poleGpsLocations:
                  detail.pole_locations && detail.pole_locations.length > 0
                    ? detail.pole_locations
                    : p.report?.poleGpsLocations,
              }
            }
          }
        })
        if (c.code === (detail.case_id || detail.work_order_id)) {
          if (poleIds.length > 0) {
            c.poleIds = poleIds
          }
          if (segmentLabel) {
            c.segment = formatSegmentDisplay(segmentLabel, detail.title, state.segmentNames)
          } else if (!c.segment || c.segment === '-') {
            const fallbackSeg = formatSegmentDisplay(undefined, detail.title, state.segmentNames)
            if (fallbackSeg !== '-') {
              c.segment = fallbackSeg
            }
          }
        }
      })
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
      state.assignees = action.payload || []
      if (state.workOrders.length > 0) {
        state.cases = mapWorkOrdersToScheduleCases(state.workOrders, state.assignees, state.segmentNames)
      }
    },
    fetchAssigneesFailure(state, action: PayloadAction<string>) {
      state.isLoadingAssignees = false
      state.assigneesError = action.payload
    },

    // -------------------------------------------------------------
    // 4. CÁC TÁC VỤ MUTATION (Nhận trực tiếp 100% Request DTOs từ Backend)
    // -------------------------------------------------------------
    createWorkOrderRequest(
      state,
      _action: PayloadAction<{ request: CreateWorkOrderRequest; attachmentFiles?: File[] }>
    ) {
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
        editedPoleLocations?: Record<string, SetPoleLocationRequest>
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

    rejectCancellationRequest(
      state,
      _action: PayloadAction<{
        workOrderId: string
        rejectReason: string
      }>
    ) {
      state.isSubmitting = true
      state.actionError = null
    },
    rejectCancellationSuccess(state, action: PayloadAction<WorkOrderDetail>) {
      state.isSubmitting = false
      state.actionError = null
      if (state.workOrderDetail && state.workOrderDetail.work_order_id === action.payload.work_order_id) {
        state.workOrderDetail = action.payload
      }
    },
    rejectCancellationFailure(state, action: PayloadAction<string>) {
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

    fetchBusyGpsPolesRequest(state, _action: PayloadAction<string>) {
      state.isLoadingBusyGpsPoles = true
      state.busyGpsPolesError = null
      state.busyGpsPoleIds = []
    },
    fetchBusyGpsPolesSuccess(state, action: PayloadAction<string[]>) {
      state.isLoadingBusyGpsPoles = false
      state.busyGpsPoleIds = action.payload
    },
    fetchBusyGpsPolesFailure(state, action: PayloadAction<string>) {
      state.isLoadingBusyGpsPoles = false
      state.busyGpsPolesError = action.payload
      state.busyGpsPoleIds = []
    },
    clearBusyGpsPoles(state) {
      state.isLoadingBusyGpsPoles = false
      state.busyGpsPolesError = null
      state.busyGpsPoleIds = []
    },
    saveEditedGpsLocations(
      state,
      action: PayloadAction<{
        workOrderId: string
        locations: Record<string, SetPoleLocationRequest>
        orderedPoleIds?: string[]
      }>
    ) {
      const { workOrderId, locations, orderedPoleIds } = action.payload
      if (Object.keys(locations).length === 0) {
        delete state.editedGpsByWorkOrder[workOrderId]
      } else {
        state.editedGpsByWorkOrder[workOrderId] = locations
      }
      if (orderedPoleIds) {
        if (orderedPoleIds.length === 0) {
          delete state.orderedGpsPolesByWorkOrder[workOrderId]
        } else {
          state.orderedGpsPolesByWorkOrder[workOrderId] = orderedPoleIds
        }
      }
    },
    clearEditedGpsLocations(state, action: PayloadAction<string>) {
      delete state.editedGpsByWorkOrder[action.payload]
      delete state.orderedGpsPolesByWorkOrder[action.payload]
    },
  },
})

export const {
  fetchWorkOrdersRequest,
  fetchWorkOrdersSuccess,
  fetchSegmentNamesSuccess,
  fetchWorkOrdersFailure,
  fetchWorkOrderDetailRequest,
  fetchWorkOrderDetailSuccess,
  fetchWorkOrderDetailFailure,
  clearWorkOrderDetail,
  fetchAssigneesRequest,
  fetchAssigneesSuccess,
  fetchAssigneesFailure,
  fetchBusyGpsPolesRequest,
  fetchBusyGpsPolesSuccess,
  fetchBusyGpsPolesFailure,
  clearBusyGpsPoles,
  saveEditedGpsLocations,
  clearEditedGpsLocations,
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
  rejectCancellationRequest,
  rejectCancellationSuccess,
  rejectCancellationFailure,
  setCurrentMonth,
  changeMonth,
  setFilterPhase,
  openCaseDetail,
  closeCaseDetail,
  setViewingPhaseIndex,
  resetScheduleToDefault,
} = workScheduleSlice.actions

export default workScheduleSlice.reducer
