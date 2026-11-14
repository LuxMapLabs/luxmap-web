import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { SegmentListItem } from '../../types/assets/segments'
import type { FixtureStatusStatistics } from '../../types/statistics/fixture-status'
import type { RepairTimelinessStatistics } from '../../types/statistics/repair-timeliness'
import type { WarrantyList } from '../../types/statistics/warranty'
import type { FaultItem } from '../../types/faults/faults'
import type { CitizenFeedbackStatistics } from '../../types/statistics/citizen-feedback'
import type { WorkOrderStatusStatistics } from '../../types/statistics/work-orders'

export type SuperiorPeriodDays = 7 | 30 | 90

export type StatisticsCsvType =
  | 'fixture-status'
  | 'repair-timeliness'
  | 'warranty'
  | 'citizen-feedback'
  | 'work-orders'

/** Bộ lọc của dashboard Cấp giám sát: xã, tuyến (null = tất cả) và chu kỳ thống kê */
export interface SuperiorDashboardFilter {
  communeId: string
  segmentId: string | null
  periodDays: SuperiorPeriodDays
}

export interface SuperiorDashboardRequest extends SuperiorDashboardFilter {
  /** true = làm mới ngầm (nút Làm mới), không che KPI bằng skeleton */
  silent?: boolean
}

export interface SuperiorCsvExportRequest extends SuperiorDashboardFilter {
  types: StatisticsCsvType[]
  communeCode: string
}

export interface SuperiorDashboardData {
  segments: SegmentListItem[]
  fixtureStats: FixtureStatusStatistics
  slaStats: RepairTimelinessStatistics
  warrantyData: WarrantyList
  faults: FaultItem[]
  citizenFeedbackStats: CitizenFeedbackStatistics
  workOrderStats: WorkOrderStatusStatistics
}

export interface SuperiorDashboardState {
  loading: boolean
  refreshing: boolean
  error: string | null
  segments: SegmentListItem[]
  fixtureStats: FixtureStatusStatistics | null
  slaStats: RepairTimelinessStatistics | null
  warrantyData: WarrantyList | null
  faults: FaultItem[]
  citizenFeedbackStats: CitizenFeedbackStatistics | null
  workOrderStats: WorkOrderStatusStatistics | null
}

const initialState: SuperiorDashboardState = {
  // true ngay từ đầu để KPI hiện skeleton thay vì số 0 trước lần tải đầu tiên
  loading: true,
  refreshing: false,
  error: null,
  segments: [],
  fixtureStats: null,
  slaStats: null,
  warrantyData: null,
  faults: [],
  citizenFeedbackStats: null,
  workOrderStats: null,
}

const superiorDashboardSlice = createSlice({
  name: 'superiorDashboard',
  initialState,
  reducers: {
    fetchSuperiorDashboardRequest: (state, action: PayloadAction<SuperiorDashboardRequest>) => {
      if (action.payload.silent) state.refreshing = true
      else state.loading = true
      state.error = null
    },
    fetchSuperiorDashboardSuccess: (state, action: PayloadAction<SuperiorDashboardData>) => {
      state.loading = false
      state.refreshing = false
      state.error = null
      state.segments = action.payload.segments
      state.fixtureStats = action.payload.fixtureStats
      state.slaStats = action.payload.slaStats
      state.warrantyData = action.payload.warrantyData
      state.faults = action.payload.faults
      state.citizenFeedbackStats = action.payload.citizenFeedbackStats
      state.workOrderStats = action.payload.workOrderStats
    },
    fetchSuperiorDashboardFailure: (state, action: PayloadAction<string>) => {
      state.loading = false
      state.refreshing = false
      state.error = action.payload
    },
    exportSuperiorCsvRequest: (_state, _action: PayloadAction<SuperiorCsvExportRequest>) => {},
  },
})

export const {
  fetchSuperiorDashboardRequest,
  fetchSuperiorDashboardSuccess,
  fetchSuperiorDashboardFailure,
  exportSuperiorCsvRequest,
} = superiorDashboardSlice.actions

export default superiorDashboardSlice.reducer
