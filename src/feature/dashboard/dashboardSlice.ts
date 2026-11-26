import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { SegmentListItem } from '../../types/assets/segments'
import type { WarrantyList } from '../../types/statistics/warranty'
import type { FaultItem } from '../../types/faults/faults'
import type { FixtureStatusRow } from '../../types/statistics/fixture-status'
import type { IotDiagnosticSummaryItem } from '../../types/iot/diagnostics'
import type { IotServerStatus } from '../../types/iot/servers'
import type { IotFeederHistorySample } from '../../types/iot/feeders'
import type { CitizenScreeningStatistics } from '../../types/statistics/citizen-screening'

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
  /** Mã mạch đang chọn để hiển thị lịch sử điện trên biểu đồ IoT */
  selectedFeederId: string | null
  /** Lịch sử điện của mạch đang chọn trên biểu đồ IoT */
  selectedFeederHistory: IotFeederHistorySample[]
  selectedFeederHistoryLoading: boolean
  iotLastUpdated: string | null
  lastUpdated: string | null
  /** statistics/citizen-screening (ST-14): báo cáo QR và kết luận CV, 30 đêm gần nhất; null khi chưa tải được */
  citizenScreening: CitizenScreeningStatistics | null
  citizenScreeningLoading: boolean
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
  selectedFeederId: null,
  selectedFeederHistory: [],
  selectedFeederHistoryLoading: false,
  iotLastUpdated: null,
  lastUpdated: null,
  citizenScreening: null,
  citizenScreeningLoading: false,
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
    fetchFeederHistoryRequest: (state, action: PayloadAction<string>) => {
      const nextFeederId = action.payload
      if (state.selectedFeederId !== nextFeederId) {
        state.selectedFeederId = nextFeederId
        state.selectedFeederHistory = []
        state.selectedFeederHistoryLoading = true
      } else if (state.selectedFeederHistory.length === 0) {
        state.selectedFeederHistoryLoading = true
      }
    },
    fetchFeederHistorySuccess: (state, action: PayloadAction<IotFeederHistorySample[]>) => {
      const incoming = action.payload
      const current = state.selectedFeederHistory
      const isSameSeries =
        current.length > 0 &&
        current.length === incoming.length &&
        current[0]?.measured_at === incoming[0]?.measured_at &&
        current[0]?.received_at === incoming[0]?.received_at &&
        current[current.length - 1]?.measured_at === incoming[incoming.length - 1]?.measured_at &&
        current[current.length - 1]?.received_at === incoming[incoming.length - 1]?.received_at &&
        current[current.length - 1]?.power_mw === incoming[incoming.length - 1]?.power_mw &&
        current[current.length - 1]?.current_ma === incoming[incoming.length - 1]?.current_ma &&
        current[current.length - 1]?.voltage === incoming[incoming.length - 1]?.voltage

      if (!isSameSeries) {
        state.selectedFeederHistory = incoming
        state.iotLastUpdated = new Date().toISOString()
      }
      state.selectedFeederHistoryLoading = false
    },
    /** payload: segment_id đang lọc, `null` = toàn địa bàn */
    fetchCitizenScreeningRequest: (state, _action: PayloadAction<string | null>) => {
      state.citizenScreeningLoading = true
    },
    fetchCitizenScreeningSuccess: (state, action: PayloadAction<CitizenScreeningStatistics | null>) => {
      state.citizenScreening = action.payload
      state.citizenScreeningLoading = false
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
  fetchCitizenScreeningRequest,
  fetchCitizenScreeningSuccess,
  resetDashboardState,
} = dashboardSlice.actions

export default dashboardSlice.reducer
