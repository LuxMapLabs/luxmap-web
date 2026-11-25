import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { SegmentListItem } from '../../types/assets/segments'
import type { WarrantyList } from '../../types/statistics/warranty'
import type { FaultItem } from '../../types/faults/faults'
import type { FixtureStatusRow } from '../../types/statistics/fixture-status'
import type { IotDiagnosticSummaryItem } from '../../types/iot/diagnostics'
import type { IotServerStatus } from '../../types/iot/servers'
import type { IotFeederHistorySample } from '../../types/iot/feeders'

export interface DashboardState {
  loading: boolean
  error: string | null
  segmentsList: SegmentListItem[]
  warrantyList: WarrantyList
  faultsList: FaultItem[]
  /** statistics/fixture-status (group_by=segment): số cột theo trạng thái, tính ở backend */
  fixtureStatusRows: FixtureStatusRow[]
  /** Tổng hợp chẩn đoán IoT từ GET /iot/diagnostics/summary */
  iotSummary: IotDiagnosticSummaryItem[]
  /** Trạng thái gateway IoT từ GET /iot/servers */
  iotServers: IotServerStatus[]
  /** Ánh xạ segment_id -> danh sách feeder_id thuộc tuyến */
  segmentFeederMap: Record<string, string[]>
  /** Danh sách segment_id của từng cột chưa có toạ độ GPS */
  unlocatedPoleSegments: (string | null)[]
  /** True khi danh sách cột tải về chạm giới hạn page_size 200 */
  polesCapped: boolean
  /** Kèm dữ liệu bộ thử (calibration_rig) trong danh sách sự cố */
  includeCalibrationRig: boolean
  /** Lịch sử điện 30s của mạch đang chọn trên biểu đồ IoT */
  selectedFeederHistory: IotFeederHistorySample[]
  selectedFeederHistoryLoading: boolean
  iotLastUpdated: string | null
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
  iotSummary: [],
  iotServers: [],
  segmentFeederMap: {},
  unlocatedPoleSegments: [],
  polesCapped: false,
  includeCalibrationRig: false,
  selectedFeederHistory: [],
  selectedFeederHistoryLoading: false,
  iotLastUpdated: null,
  lastUpdated: null,
}

export interface FetchDashboardSuccessPayload {
  segments: SegmentListItem[]
  warranty: WarrantyList
  faults: FaultItem[]
  fixtureStatusRows: FixtureStatusRow[]
  iotSummary: IotDiagnosticSummaryItem[]
  iotServers: IotServerStatus[]
  segmentFeederMap: Record<string, string[]>
  unlocatedPoleSegments: (string | null)[]
  polesCapped: boolean
}

export interface FetchDashboardIotSuccessPayload {
  iotSummary: IotDiagnosticSummaryItem[]
  iotServers: IotServerStatus[]
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
      state.iotSummary = action.payload.iotSummary
      state.iotServers = action.payload.iotServers
      state.segmentFeederMap = action.payload.segmentFeederMap
      state.unlocatedPoleSegments = action.payload.unlocatedPoleSegments
      state.polesCapped = action.payload.polesCapped
      const nowIso = new Date().toISOString()
      state.iotLastUpdated = nowIso
      state.lastUpdated = nowIso
      state.error = null
    },
    fetchDashboardDataFailure: (state, action: PayloadAction<string>) => {
      state.loading = false
      state.error = action.payload
    },
    fetchDashboardIotRequest: () => {
      // Saga làm mới nhẹ dữ liệu IoT mỗi 30s
    },
    fetchDashboardIotSuccess: (
      state,
      action: PayloadAction<FetchDashboardIotSuccessPayload>
    ) => {
      state.iotSummary = action.payload.iotSummary
      state.iotServers = action.payload.iotServers
      state.iotLastUpdated = new Date().toISOString()
    },
    setIncludeCalibrationRig: (state, action: PayloadAction<boolean>) => {
      state.includeCalibrationRig = action.payload
    },
    updateFaultsListSuccess: (state, action: PayloadAction<FaultItem[]>) => {
      state.faultsList = action.payload
    },
    fetchFeederHistoryRequest: (state, _action: PayloadAction<string>) => {
      state.selectedFeederHistoryLoading = true
    },
    fetchFeederHistorySuccess: (state, action: PayloadAction<IotFeederHistorySample[]>) => {
      state.selectedFeederHistory = action.payload
      state.selectedFeederHistoryLoading = false
    },
    resetDashboardState: () => initialState,
  },
})

export const {
  fetchDashboardDataRequest,
  fetchDashboardDataSuccess,
  fetchDashboardDataFailure,
  fetchDashboardIotRequest,
  fetchDashboardIotSuccess,
  setIncludeCalibrationRig,
  updateFaultsListSuccess,
  fetchFeederHistoryRequest,
  fetchFeederHistorySuccess,
  resetDashboardState,
} = dashboardSlice.actions

export default dashboardSlice.reducer
