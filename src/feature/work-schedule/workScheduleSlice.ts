import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import {
  ScheduleCase,
  SchedulePhase,
  WorkOrderAssignee,
  TaskKind,
} from '../../types/workSchedule'
import { workScheduleAPI, GetWorkOrdersFilter } from './workScheduleAPI'

// Dọn dẹp triệt để các dữ liệu mock cũ từng lưu trong localStorage trình duyệt
try {
  localStorage.removeItem('luxmap_work_schedule_cases_v5')
  localStorage.removeItem('luxmap_work_schedule_cases_v4')
  localStorage.removeItem('luxmap_work_schedule_cases')
} catch {}

function parseWorkOrderItem(raw: any) {
  return {
    workOrderId: raw.work_order_id || raw.workOrderId || '',
    caseId: raw.case_id || raw.caseId || raw.work_order_id || raw.workOrderId || '',
    parentWorkOrderId: raw.parent_work_order_id || raw.parentWorkOrderId,
    title: raw.title || 'Lệnh công tác',
    segment: raw.segment_name || raw.segment || raw.segment_id || raw.segmentId || 'Tuyến chiếu sáng phụ trách',
    taskKind: String(raw.task_kind || raw.taskKind || 'inspection').toLowerCase(),
    woStatus: String(raw.wo_status || raw.woStatus || 'open').toLowerCase(),
    assignedTo: raw.assigned_to || raw.assignedTo,
    assigneeName: raw.assignee_name || raw.assigneeName,
    scheduledDate: raw.scheduled_date || raw.scheduledDate,
    dueDate: raw.due_date || raw.dueDate,
    createdAt: raw.created_at || raw.createdAt,
    note: raw.note,
    materialsNote: raw.materials_note || raw.materialsNote,
    materialsUsed: raw.materials_used || raw.materialsUsed,
    reportNote: raw.report_note || raw.reportNote,
    reviewNote: raw.review_note || raw.reviewNote,
    videoUrl: raw.video_url || raw.videoUrl,
    aiDetections: raw.ai_detections || raw.aiDetections,
    luxMeasured: raw.lux_measured || raw.luxMeasured,
    endReason: raw.end_reason || raw.endReason,
    allowedActions: raw.allowed_actions || raw.allowedActions || [],
  }
}

const ASSIGNEE_DISPLAY_NAMES: Record<string, string> = {
  'USR-004': 'Khang Lê',
  'USR-005': 'Nguyễn Văn Hoàng',
  'USR-006': 'Trần Minh Tuấn',
  'USR-khang': 'Khang Lê',
}

function mapBackendItemsToScheduleCases(rawItems: any[]): ScheduleCase[] {
  if (!rawItems || rawItems.length === 0) return []

  // Lọc bỏ hoàn toàn các lịch đã bị hủy (wo_status === 'cancelled')
  // Giúp lịch quản lý sạch sẽ và đồng bộ 100% với danh sách công việc của kỹ sư hiện trường
  const activeRawItems = (rawItems || []).filter((raw) => {
    const status = String(raw.wo_status || raw.woStatus || '').toLowerCase()
    return status !== 'cancelled'
  })

  if (activeRawItems.length === 0) return []

  const casesMap: Record<string, ScheduleCase> = {}

  // Sắp xếp các lệnh công tác theo thứ tự thời gian tăng dần để chuỗi tiến trình (Survey -> Inspection -> Repair) đúng thứ tự
  const sortedItems = [...activeRawItems].sort((a, b) => {
    const timeA = new Date(a.created_at || a.createdAt || 0).getTime()
    const timeB = new Date(b.created_at || b.createdAt || 0).getTime()
    return timeA - timeB
  })

  sortedItems.forEach((raw) => {
    const item = parseWorkOrderItem(raw)
    const caseKey = item.caseId

    if (!casesMap[caseKey]) {
      casesMap[caseKey] = {
        code: caseKey,
        title: item.title,
        segment: item.segment,
        createdAt: item.createdAt,
        currentPhaseIndex: 0,
        isTerminated: Boolean(item.endReason),
        endReason: item.endReason,
        phases: [],
      }
    } else {
      if (Boolean(item.endReason)) {
        casesMap[caseKey].isTerminated = true
        if (item.endReason) {
          casesMap[caseKey].endReason = item.endReason
        }
      }
    }

    const isRepair = item.taskKind.includes('repair')
    const isSurvey = item.taskKind.includes('survey')
    const phaseType: TaskKind = isRepair ? 'repair' : isSurvey ? 'survey' : 'inspection'
    const phaseName = isRepair ? '3. Sửa chữa' : isSurvey ? '1. Khảo sát' : '2. Kiểm tra'

    let status: 'pending' | 'reported' | 'ended' = 'pending'
    if (item.woStatus === 'done') status = 'reported'
    else if (item.woStatus === 'verified') status = 'ended'

    const phaseDate = (item.scheduledDate || item.createdAt || '2026-10-01').substring(0, 10)

    casesMap[caseKey].phases.push({
      phaseType,
      name: phaseName,
      date: phaseDate,
      dueDate: item.dueDate,
      createdAt: item.createdAt,
      rawStatus: item.woStatus,
      assigneeId: item.assignedTo || 'USR-004',
      assigneeName:
        item.assigneeName ||
        ASSIGNEE_DISPLAY_NAMES[item.assignedTo] ||
        item.assignedTo ||
        'Kỹ sư hiện trường',
      status,
      notes: item.note || item.title,
      materialsNote: item.materialsNote,
      workOrderId: item.workOrderId,
      report:
        item.reportNote || item.woStatus === 'done' || item.woStatus === 'verified'
          ? {
              submittedAt: item.createdAt || `${phaseDate} 17:00`,
              summary: item.reportNote || 'Báo cáo kỹ thuật hiện trường',
              usedMaterialsNote: item.materialsUsed,
              suggestedMaterialsNote: item.materialsNote,
              luxMeasured: item.luxMeasured,
              videoUrl: item.videoUrl,
              aiDetections: item.aiDetections,
            }
          : undefined,
    })
  })

  const result = Object.values(casesMap)
  result.forEach((c) => {
    c.currentPhaseIndex = Math.max(0, c.phases.length - 1)
  })

  return result
}

const now = new Date()

export interface WorkScheduleState {
  cases: ScheduleCase[]
  selectedCaseCode: string | null
  viewingPhaseIndex: number
  currentMonth: number // 0-indexed
  currentYear: number
  filterPhase: 'all' | 'survey' | 'inspection' | 'repair' | 'ended'
  assignees: WorkOrderAssignee[]
  isLoading: boolean
  error: string | null
}

const initialState: WorkScheduleState = {
  cases: [], // Ban đầu rỗng, chỉ lấy dữ liệu thực tế từ cơ sở dữ liệu máy chủ
  selectedCaseCode: null,
  viewingPhaseIndex: 0,
  currentMonth: now.getMonth(),
  currentYear: now.getFullYear(),
  filterPhase: 'all',
  assignees: [
    { user_id: 'USR-004', full_name: 'Khang Lê (Field Crew 1)' },
    { user_id: 'USR-005', full_name: 'Nguyễn Văn Hoàng (Field Crew 2)' },
    { user_id: 'USR-006', full_name: 'Trần Minh Tuấn (Field Crew 3)' },
  ],
  isLoading: false,
  error: null,
}

function extractApiErrorMessage(err: any, fallbackMessage: string): string {
  const errData = err?.response?.data
  const apiError = errData?.error
  if (typeof apiError === 'string') return apiError
  if (apiError?.message) {
    if (apiError.details && typeof apiError.details === 'object') {
      const detailEntries = Object.entries(apiError.details).filter(([k]) => k !== 'correlation_id')
      if (detailEntries.length > 0) {
        const detailStr = detailEntries
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('; ')
        return `${apiError.message} (${detailStr})`
      }
    }
    return apiError.message
  }
  if (apiError?.code) return apiError.code
  if (errData?.message) return errData.message
  if (errData?.title) return errData.title
  if (err?.message) return err.message
  return fallbackMessage
}

export const fetchWorkOrdersThunk = createAsyncThunk(
  'workSchedule/fetchWorkOrders',
  async (filter: GetWorkOrdersFilter | undefined, { getState, rejectWithValue }) => {
    try {
      let effectiveFilter = filter
      if (!effectiveFilter) {
        const state = (getState() as any)?.workSchedule
        if (state) {
          const { currentMonth, currentYear } = state
          const startOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
          const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate()
          const endOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
            lastDay
          ).padStart(2, '0')}`
          effectiveFilter = {
            scheduled_from: startOfMonth,
            scheduled_to: endOfMonth,
          }
        }
      }
      const data = await workScheduleAPI.getWorkOrders(effectiveFilter)
      return data
    } catch (err: any) {
      return rejectWithValue(extractApiErrorMessage(err, 'Không thể tải lịch làm việc từ máy chủ'))
    }
  }
)

export const fetchAssigneesThunk = createAsyncThunk(
  'workSchedule/fetchAssignees',
  async (communeId: string = 'COM-001', { rejectWithValue }) => {
    try {
      const data = await workScheduleAPI.getAssignees(communeId)
      return data.items
    } catch (err: any) {
      return rejectWithValue(extractApiErrorMessage(err, 'Không thể tải danh sách kỹ sư'))
    }
  }
)

export const createWorkOrderBackendThunk = createAsyncThunk(
  'workSchedule/createWorkOrderBackend',
  async (payload: any, { dispatch, rejectWithValue }) => {
    try {
      const result = await workScheduleAPI.createWorkOrder(payload)
      await dispatch(fetchWorkOrdersThunk(undefined))
      return result
    } catch (err: any) {
      return rejectWithValue(extractApiErrorMessage(err, 'Không thể tạo lệnh công tác trên máy chủ'))
    }
  }
)

export const patchWorkOrderBackendThunk = createAsyncThunk(
  'workSchedule/patchWorkOrderBackend',
  async (
    {
      workOrderId,
      payload,
      newAssigneeId,
      currentAssigneeId,
    }: {
      workOrderId: string
      payload: {
        title?: string
        scheduled_date?: string
        due_date?: string
        materials_note?: string
      }
      newAssigneeId?: string
      currentAssigneeId?: string
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const result = await workScheduleAPI.patchWorkOrder(workOrderId, payload)
      if (newAssigneeId && newAssigneeId !== currentAssigneeId) {
        await workScheduleAPI.assignWorkOrder(workOrderId, { assigned_to: newAssigneeId })
      }
      await dispatch(fetchWorkOrdersThunk(undefined))
      return result
    } catch (err: any) {
      return rejectWithValue(extractApiErrorMessage(err, 'Không thể cập nhật lịch làm việc trên máy chủ'))
    }
  }
)

export const followUpWorkOrderBackendThunk = createAsyncThunk(
  'workSchedule/followUpWorkOrderBackend',
  async (
    {
      parentWorkOrderId,
      payload,
    }: {
      parentWorkOrderId: string
      payload: any
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const result = await workScheduleAPI.followUpWorkOrder(parentWorkOrderId, payload)
      await dispatch(fetchWorkOrdersThunk(undefined))
      return result
    } catch (err: any) {
      return rejectWithValue(extractApiErrorMessage(err, 'Không thể mở bước tiếp theo trên máy chủ'))
    }
  }
)

export const verifyWorkOrderBackendThunk = createAsyncThunk(
  'workSchedule/verifyWorkOrderBackend',
  async (
    { workOrderId, note, materialsNote }: { workOrderId: string; note?: string; materialsNote?: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const result = await workScheduleAPI.verifyWorkOrder(workOrderId, { note, materials_note: materialsNote })
      await dispatch(fetchWorkOrdersThunk(undefined))
      return result
    } catch (err: any) {
      return rejectWithValue(extractApiErrorMessage(err, 'Không thể duyệt nghiệm thu trên máy chủ'))
    }
  }
)

export const cancelWorkOrderBackendThunk = createAsyncThunk(
  'workSchedule/cancelWorkOrderBackend',
  async ({ workOrderId, note }: { workOrderId: string; note?: string }, { dispatch, rejectWithValue }) => {
    try {
      const result = await workScheduleAPI.cancelWorkOrder(workOrderId, { note })
      await dispatch(fetchWorkOrdersThunk(undefined))
      return result
    } catch (err: any) {
      return rejectWithValue(extractApiErrorMessage(err, 'Không thể hủy sự vụ trên máy chủ'))
    }
  }
)

export const returnWorkOrderBackendThunk = createAsyncThunk(
  'workSchedule/returnWorkOrderBackend',
  async ({ workOrderId, note }: { workOrderId: string; note: string }, { dispatch, rejectWithValue }) => {
    try {
      const result = await workScheduleAPI.returnWorkOrder(workOrderId, { note })
      await dispatch(fetchWorkOrdersThunk(undefined))
      return result
    } catch (err: any) {
      return rejectWithValue(extractApiErrorMessage(err, 'Không thể yêu cầu làm lại trên máy chủ'))
    }
  }
)

const workScheduleSlice = createSlice({
  name: 'workSchedule',
  initialState,
  reducers: {
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

    // -------------------------------------------------------------
    // TẠO MỚI SỰ VỤ BAN ĐẦU
    // -------------------------------------------------------------
    createNewCase(
      state,
      action: PayloadAction<{
        title: string
        segment: string
        initPhase: TaskKind
        assigneeId: string
        assigneeName: string
        date: string
        notes?: string
        poleIds?: string[]
      }>
    ) {
      const newCode = `SCH-${String(state.cases.length + 1).padStart(3, '0')}`
      let phaseName = '1. Khảo sát'
      if (action.payload.initPhase === 'inspection') phaseName = '2. Kiểm tra'
      if (action.payload.initPhase === 'repair') phaseName = '3. Sửa chữa'

      const newCase: ScheduleCase = {
        code: newCode,
        title: action.payload.title,
        segment: action.payload.segment,
        currentPhaseIndex: 0,
        isTerminated: false,
        poleIds: action.payload.poleIds,
        phases: [
          {
            phaseType: action.payload.initPhase,
            name: phaseName,
            date: action.payload.date,
            assigneeId: action.payload.assigneeId,
            assigneeName: action.payload.assigneeName,
            status: 'pending',
            notes: action.payload.notes || 'Khởi tạo bởi Quản lý',
            poleIds: action.payload.poleIds,
          },
        ],
      }
      state.cases.unshift(newCase)
    },

    // -------------------------------------------------------------
    // CHUYỂN TIẾN TRÌNH: TỰ ĐỘNG ĐÓNG (END) BƯỚC CŨ, MỞ TIẾP BƯỚC MỚI CÙNG MÃ
    // -------------------------------------------------------------
    advanceNextPhase(
      state,
      action: PayloadAction<{
        code: string
        nextPhaseType: TaskKind
        date: string
        assigneeId: string
        assigneeName: string
        materialsNote?: string
        notes?: string
        poleIds?: string[]
      }>
    ) {
      const c = state.cases.find((item) => item.code === action.payload.code)
      if (!c) return

      // 1. Tự động đóng (END) giai đoạn trước
      const previousPhase = c.phases[c.currentPhaseIndex]
      if (previousPhase) {
        previousPhase.status = 'ended'
      }

      // 2. Mở giai đoạn mới cùng mã SCH
      let nextName = '2. Kiểm tra'
      if (action.payload.nextPhaseType === 'repair') nextName = '3. Sửa chữa'

      if (action.payload.poleIds && action.payload.poleIds.length > 0) {
        c.poleIds = action.payload.poleIds
      }

      const newPhase: SchedulePhase = {
        phaseType: action.payload.nextPhaseType,
        name: nextName,
        date: action.payload.date,
        assigneeId: action.payload.assigneeId,
        assigneeName: action.payload.assigneeName,
        status: 'pending',
        notes: action.payload.notes || 'Thực hiện theo chỉ đạo của Quản lý',
        materialsNote: action.payload.materialsNote,
        poleIds: action.payload.poleIds || c.poleIds,
      }

      c.phases.push(newPhase)
      c.currentPhaseIndex = c.phases.length - 1
      state.viewingPhaseIndex = c.currentPhaseIndex
    },

    // -------------------------------------------------------------
    // KỸ SƯ NỘP BÁO CÁO HIỆN TRƯỜNG
    // -------------------------------------------------------------
    submitEngineerReport(
      state,
      action: PayloadAction<{
        code: string
        summary: string
        suggestedMaterialsNote?: string
        usedMaterialsNote?: string
        luxMeasured?: string
      }>
    ) {
      const c = state.cases.find((item) => item.code === action.payload.code)
      if (!c) return
      const currentPhase = c.phases[c.currentPhaseIndex]
      if (!currentPhase) return

      currentPhase.status = 'reported'
      currentPhase.report = {
        submittedAt: `2026-10-05 ${new Date().toTimeString().substring(0, 5)}`,
        summary: action.payload.summary,
        suggestedMaterialsNote: action.payload.suggestedMaterialsNote,
        usedMaterialsNote: action.payload.usedMaterialsNote,
        luxMeasured: action.payload.luxMeasured,
        aiDetections:
          currentPhase.phaseType === 'survey'
            ? [
                { poleId: 'POLE-0019', issue: 'Đèn tắt hoàn toàn', confidence: 0.95 },
                { poleId: 'POLE-0022', issue: 'Đèn mờ quang thông thấp', confidence: 0.88 },
              ]
            : undefined,
      }
    },

    // -------------------------------------------------------------
    // QUẢN LÝ KHÔNG DUYỆT BÁO CÁO -> TỰ ĐỘNG END (LƯU VẾT)
    // -------------------------------------------------------------
    rejectAndEndCase(state, action: PayloadAction<{ code: string; reason?: string }>) {
      const c = state.cases.find((item) => item.code === action.payload.code)
      if (!c) return

      c.isTerminated = true
      c.endReason = action.payload.reason || 'Quản lý KHÔNG DUYỆT báo cáo giai đoạn này.'
      const currP = c.phases[c.currentPhaseIndex]
      if (currP) {
        currP.status = 'ended'
      }
    },

    // -------------------------------------------------------------
    // ĐÓNG SỰ VỤ BÌNH THƯỜNG (KHI KHÔNG CÓ LỖI)
    // -------------------------------------------------------------
    endCaseNormally(state, action: PayloadAction<{ code: string; reason: string }>) {
      const c = state.cases.find((item) => item.code === action.payload.code)
      if (!c) return

      c.isTerminated = true
      c.endReason = action.payload.reason
      const currP = c.phases[c.currentPhaseIndex]
      if (currP) {
        currP.status = 'ended'
      }
    },

    // -------------------------------------------------------------
    // QUẢN LÝ DUYỆT SỬA CHỮA & GỬI BÁO CÁO LÊN SUPERIOR
    // -------------------------------------------------------------
    approveRepairAndSubmitSuperior(
      state,
      action: PayloadAction<{ code: string; editedMaterialsNote?: string }>
    ) {
      const c = state.cases.find((item) => item.code === action.payload.code)
      if (!c) return

      const currP = c.phases[c.currentPhaseIndex]
      if (currP && currP.report) {
        if (action.payload.editedMaterialsNote !== undefined) {
          currP.report.usedMaterialsNote = action.payload.editedMaterialsNote
        }
        currP.status = 'ended'
      }
      c.isTerminated = true
      c.endReason = 'Đã hoàn tất sửa chữa và gửi hồ sơ nghiệm thu lên Superior.'
    },

    // -------------------------------------------------------------
    // QUẢN LÝ YÊU CẦU LÀM LẠI (TRẢ VỀ CHO KỸ SƯ BỔ SUNG BÁO CÁO)
    // -------------------------------------------------------------
    returnPhaseToEngineer(
      state,
      action: PayloadAction<{ code: string; reviewNote: string }>
    ) {
      const c = state.cases.find((item) => item.code === action.payload.code)
      if (!c) return

      const currP = c.phases[c.currentPhaseIndex]
      if (currP) {
        currP.status = 'pending'
        currP.notes = `Yêu cầu làm lại: ${action.payload.reviewNote}`
        if (currP.report) {
          currP.report.summary = `[CẦN BỔ SUNG / SỬA LẠI]: ${action.payload.reviewNote} (Báo cáo trước: ${currP.report.summary})`
        }
      }
    },

    // -------------------------------------------------------------
    // KHÔI PHỤC LẠI DỮ LIỆU
    // -------------------------------------------------------------
    resetScheduleToDefault(state) {
      state.cases = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkOrdersThunk.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchWorkOrdersThunk.fulfilled, (state, action) => {
        state.isLoading = false
        const items = (action.payload as any)?.items || []
        state.cases = mapBackendItemsToScheduleCases(items)
        if (state.selectedCaseCode) {
          const found = state.cases.find((c) => c.code === state.selectedCaseCode)
          if (found) {
            state.viewingPhaseIndex = Math.min(state.viewingPhaseIndex, found.phases.length - 1)
          } else {
            state.selectedCaseCode = null
            state.viewingPhaseIndex = 0
          }
        }
      })
      .addCase(fetchWorkOrdersThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchAssigneesThunk.fulfilled, (state, action) => {
        if (action.payload && action.payload.length > 0) {
          const hasSpecificEngineers = action.payload.some(
            (a) => a.full_name && a.full_name !== 'Kỹ sư hiện trường'
          )
          if (hasSpecificEngineers) {
            state.assignees = action.payload
          } else {
            state.assignees = [
              { user_id: 'USR-004', full_name: 'Khang Lê (Field Crew 1)' },
              { user_id: 'USR-005', full_name: 'Nguyễn Văn Hoàng (Field Crew 2)' },
              { user_id: 'USR-006', full_name: 'Trần Minh Tuấn (Field Crew 3)' },
            ]
          }
        }
      })
  },
})

export const {
  setCurrentMonth,
  changeMonth,
  setFilterPhase,
  openCaseDetail,
  closeCaseDetail,
  setViewingPhaseIndex,
  createNewCase,
  advanceNextPhase,
  submitEngineerReport,
  rejectAndEndCase,
  endCaseNormally,
  approveRepairAndSubmitSuperior,
  returnPhaseToEngineer,
  resetScheduleToDefault,
} = workScheduleSlice.actions

export default workScheduleSlice.reducer
