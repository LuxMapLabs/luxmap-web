import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import {
  ScheduleCase,
  SchedulePhase,
  WorkOrderAssignee,
  TaskKind,
} from '../../types/workSchedule'
import { workScheduleAPI, GetWorkOrdersFilter } from './workScheduleAPI'

import mockWorkOrdersData from '../../data/mock-work-orders.json'

function parseWorkOrderItem(raw: any) {
  return {
    workOrderId: raw.work_order_id || raw.workOrderId || '',
    caseId: raw.case_id || raw.caseId || raw.work_order_id || raw.workOrderId || '',
    parentWorkOrderId: raw.parent_work_order_id || raw.parentWorkOrderId,
    title: raw.title || 'Lệnh công tác',
    segment: raw.segment_name || raw.segment || raw.segment_id || 'Tuyến chiếu sáng phụ trách',
    taskKind: String(raw.task_kind || raw.taskKind || 'inspection').toLowerCase(),
    woStatus: String(raw.wo_status || raw.woStatus || 'open').toLowerCase(),
    assignedTo: raw.assigned_to || raw.assignedTo,
    assigneeName: raw.assignee_name || raw.assigneeName,
    scheduledDate: raw.scheduled_date || raw.scheduledDate,
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

  const casesMap: Record<string, ScheduleCase> = {}

  rawItems.forEach((raw) => {
    const item = parseWorkOrderItem(raw)
    const caseKey = item.caseId

    if (!casesMap[caseKey]) {
      casesMap[caseKey] = {
        code: caseKey,
        title: item.title,
        segment: item.segment,
        currentPhaseIndex: 0,
        isTerminated: item.woStatus === 'cancelled' || Boolean(item.endReason),
        endReason: item.endReason,
        phases: [],
      }
    }

    const isRepair = item.taskKind.includes('repair')
    const isSurvey = item.taskKind.includes('survey')
    const phaseType: TaskKind = isRepair ? 'repair' : isSurvey ? 'survey' : 'inspection'
    const phaseName = isRepair ? '3. Sửa chữa' : isSurvey ? '1. Khảo sát' : '2. Kiểm tra'

    let status: 'pending' | 'reported' | 'ended' = 'pending'
    if (item.woStatus === 'done') status = 'reported'
    else if (item.woStatus === 'verified' || item.woStatus === 'cancelled') status = 'ended'

    casesMap[caseKey].phases.push({
      phaseType,
      name: phaseName,
      date: item.scheduledDate || item.createdAt?.substring(0, 10) || '2026-10-01',
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
              submittedAt: item.createdAt || `${item.scheduledDate} 17:00`,
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

// Khởi tạo dữ liệu mẫu chuẩn từ file src/data/mock-work-orders.json
const INITIAL_DEMO_CASES: ScheduleCase[] = mapBackendItemsToScheduleCases(mockWorkOrdersData.items)

const STORAGE_KEY = 'luxmap_work_schedule_cases_v4'

function loadSavedCases(): ScheduleCase[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    console.warn('Lỗi đọc dữ liệu lịch làm việc từ localStorage:', e)
  }
  return INITIAL_DEMO_CASES
}

function saveCasesToStorage(cases: ScheduleCase[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases))
  } catch (e) {
    console.warn('Lỗi lưu dữ liệu lịch làm việc vào localStorage:', e)
  }
}

export interface WorkScheduleState {
  cases: ScheduleCase[]
  selectedCaseCode: string | null
  viewingPhaseIndex: number
  currentMonth: number // 0-indexed (9 là Tháng 10)
  currentYear: number
  filterPhase: 'all' | 'survey' | 'inspection' | 'repair' | 'ended'
  assignees: WorkOrderAssignee[]
  isLoading: boolean
  error: string | null
}

const initialState: WorkScheduleState = {
  cases: loadSavedCases(),
  selectedCaseCode: null,
  viewingPhaseIndex: 0,
  currentMonth: 9, // Tháng 10/2026
  currentYear: 2026,
  filterPhase: 'all',
  assignees: [
    { user_id: 'USR-004', full_name: 'Khang Lê (Field Crew 1)' },
    { user_id: 'USR-005', full_name: 'Nguyễn Văn Hoàng (Field Crew 2)' },
    { user_id: 'USR-006', full_name: 'Trần Minh Tuấn (Field Crew 3)' },
  ],
  isLoading: false,
  error: null,
}

export const fetchWorkOrdersThunk = createAsyncThunk(
  'workSchedule/fetchWorkOrders',
  async (filter: GetWorkOrdersFilter | undefined, { rejectWithValue }) => {
    try {
      const data = await workScheduleAPI.getWorkOrders(filter)
      return data
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Không thể tải lịch làm việc từ máy chủ')
    }
  }
)

export const fetchAssigneesThunk = createAsyncThunk(
  'workSchedule/fetchAssignees',
  async (communeId: string, { rejectWithValue }) => {
    try {
      const data = await workScheduleAPI.getAssignees(communeId)
      return data.items
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Không thể tải danh sách kỹ sư')
    }
  }
)

export const createWorkOrderBackendThunk = createAsyncThunk(
  'workSchedule/createWorkOrderBackend',
  async (payload: any, { dispatch, rejectWithValue }) => {
    try {
      const result = await workScheduleAPI.createWorkOrder(payload)
      dispatch(fetchWorkOrdersThunk(undefined))
      return result
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Không thể tạo lệnh công tác trên máy chủ')
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
      dispatch(fetchWorkOrdersThunk(undefined))
      return result
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Không thể mở bước tiếp theo trên máy chủ')
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
      dispatch(fetchWorkOrdersThunk(undefined))
      return result
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Không thể duyệt nghiệm thu trên máy chủ')
    }
  }
)

export const cancelWorkOrderBackendThunk = createAsyncThunk(
  'workSchedule/cancelWorkOrderBackend',
  async ({ workOrderId, note }: { workOrderId: string; note?: string }, { dispatch, rejectWithValue }) => {
    try {
      const result = await workScheduleAPI.cancelWorkOrder(workOrderId, { note })
      dispatch(fetchWorkOrdersThunk(undefined))
      return result
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Không thể hủy sự vụ trên máy chủ')
    }
  }
)

export const returnWorkOrderBackendThunk = createAsyncThunk(
  'workSchedule/returnWorkOrderBackend',
  async ({ workOrderId, note }: { workOrderId: string; note: string }, { dispatch, rejectWithValue }) => {
    try {
      const result = await workScheduleAPI.returnWorkOrder(workOrderId, { note })
      dispatch(fetchWorkOrdersThunk(undefined))
      return result
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Không thể yêu cầu làm lại trên máy chủ')
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
      saveCasesToStorage(state.cases)
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
      saveCasesToStorage(state.cases)
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
      saveCasesToStorage(state.cases)
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
      saveCasesToStorage(state.cases)
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
      saveCasesToStorage(state.cases)
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
      saveCasesToStorage(state.cases)
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
      saveCasesToStorage(state.cases)
    },

    // -------------------------------------------------------------
    // KHÔI PHỤC LẠI DỮ LIỆU GỐC BAN ĐẦU
    // -------------------------------------------------------------
    resetScheduleToDefault(state) {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {}
      state.cases = INITIAL_DEMO_CASES
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
        const mapped = mapBackendItemsToScheduleCases(items)
        if (mapped.length > 0) {
          state.cases = mapped
          saveCasesToStorage(state.cases)
        }
      })
      .addCase(fetchWorkOrdersThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(fetchAssigneesThunk.fulfilled, (state, action) => {
        if (action.payload && action.payload.length > 0) {
          state.assignees = action.payload
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
