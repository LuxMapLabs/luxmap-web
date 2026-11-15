import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { SegmentListItem } from '../../types/assets/segments'
import type { WarrantyList } from '../../types/statistics/warranty'
import type { FaultItem } from '../../types/faults/faults'
import type { FixtureStatusRow } from '../../types/statistics/fixture-status'

export interface DashboardState {
  loading: boolean
  error: string | null
  segmentsList: SegmentListItem[]
  warrantyList: WarrantyList
  faultsList: FaultItem[]
  /** statistics/fixture-status (group_by=segment): số cột theo trạng thái, tính ở backend */
  fixtureStatusRows: FixtureStatusRow[]
  lastUpdated: string | null
}

const initialState: DashboardState = {
  loading: false,
  error: null,
  segmentsList: [],
  warrantyList: {
    today: new Date().toISOString().split('T')[0],
    expiring_within_days: 30,
    page: 1,
    page_size: 100,
    total: 0,
    items: [],
  },
  faultsList: [],
  fixtureStatusRows: [],
  lastUpdated: null,
}

export interface FetchDashboardSuccessPayload {
  segments: SegmentListItem[]
  warranty: WarrantyList
  faults: FaultItem[]
  fixtureStatusRows: FixtureStatusRow[]
}

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    fetchDashboardDataRequest: (state) => {
      state.loading = true
      state.error = null
    },
    fetchDashboardDataSuccess: (
      state,
      action: PayloadAction<FetchDashboardSuccessPayload>
    ) => {
      state.loading = false
      state.segmentsList = action.payload.segments
      state.warrantyList = action.payload.warranty
      state.faultsList = action.payload.faults
      state.fixtureStatusRows = action.payload.fixtureStatusRows
      state.lastUpdated = new Date().toISOString()
      state.error = null
    },
    fetchDashboardDataFailure: (state, action: PayloadAction<string>) => {
      state.loading = false
      state.error = action.payload
    },
    resetDashboardState: () => initialState,
  },
})

export const {
  fetchDashboardDataRequest,
  fetchDashboardDataSuccess,
  fetchDashboardDataFailure,
  resetDashboardState,
} = dashboardSlice.actions

export default dashboardSlice.reducer
