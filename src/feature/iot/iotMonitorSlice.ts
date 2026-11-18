import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type {
  IotAutoSchedule,
  IotCommandHistoryItem,
  IotCommandRequest,
  IotDiagnosticResult,
  IotElectricalResult,
  IotNodeStatus,
} from '../../types/iot/nodes'
import type {
  IotFeederAverage,
  IotFeederElectricalResult,
} from '../../types/iot/feeders'
import type { IotServerStatus } from '../../types/iot/servers'
import {
  mergeElectricalPoints,
  type ElectricalPoint,
} from '../../utils/iot/electricalSeries'
import type { IotCommandChoice } from '../../utils/iot/iotCommand'

/** Chu kỳ đọc lại trạng thái node và gateway của tủ (30 giây). */
export const CABINET_IOT_REFRESH_MS = 30_000

/**
 * Chu kỳ lấy mẫu mới định kỳ cho mạch đang gắn node (trang 1, 20 mẫu gần nhất).
 * Node chỉ ghi một mẫu điện mỗi 10 s (`SAMPLE_INTERVAL` của firmware), hỏi dày hơn chỉ về rỗng.
 */
export const ELECTRICAL_POLL_MS = 10_000

/** Trần số trang tải ngược khi xem theo khoảng thời gian (mỗi trang một request BE → server IoT). */
export const ELECTRICAL_MAX_PAGES = 50

/** Chu kỳ đọc lại lịch sử lệnh: lệnh vừa gửi còn pending, node ACK thì mới thành success. */
export const COMMAND_MODE_POLL_MS = 10_000

/** Kích thước phân trang lịch sử lệnh. */
export const HISTORY_PAGE_SIZE = 10

export interface CabinetStatusEntry {
  cabinetId: string
  nodes: IotNodeStatus[]
  servers: IotServerStatus[]
  loading: boolean
  error: string | null
  hasLoaded: boolean
}

export interface ElectricalSeriesEntry {
  feederId: string
  points: ElectricalPoint[]
  loading: boolean
  backfilling: boolean
  error: string | null
  maxPoints: number
  windowMs: number | null
}

export interface CommandHistoryEntry {
  nodeId: string
  items: IotCommandHistoryItem[]
  total: number
  page: number
  loading: boolean
  error: string | null
}

export interface AutoPrefillState {
  requestId: string
  feederId: string
  nodeId: string
  schedule: IotAutoSchedule | null
  status: 'loading' | 'ready'
}

export interface IotMonitorState {
  cabinetStatus: Record<string, CabinetStatusEntry>
  electricalSeries: Record<string, ElectricalSeriesEntry>
  commandModes: Record<string, Record<string, IotCommandChoice | null>>
  feederElectrical: Record<string, IotFeederElectricalResult | null>
  diagnostics: Record<
    string,
    {
      data: IotDiagnosticResult | null
      error: string | null
      loading: boolean
    }
  >
  nodeElectrical: Record<
    string,
    {
      data: IotElectricalResult | null
      error: string | null
    }
  >
  nodesTab: {
    nodes: IotNodeStatus[]
    diagnosticsByNode: Record<string, IotDiagnosticResult>
    isLoading: boolean
    error: string | null
  }
  commandHistory: Record<string, CommandHistoryEntry>
  commandSend: {
    status: 'idle' | 'sending' | 'succeeded' | 'failed'
  }
  autoPrefill: AutoPrefillState | null
}

const initialState: IotMonitorState = {
  cabinetStatus: {},
  electricalSeries: {},
  commandModes: {},
  feederElectrical: {},
  diagnostics: {},
  nodeElectrical: {},
  nodesTab: {
    nodes: [],
    diagnosticsByNode: {},
    isLoading: true,
    error: null,
  },
  commandHistory: {},
  commandSend: {
    status: 'idle',
  },
  autoPrefill: null,
}

export const iotMonitorSlice = createSlice({
  name: 'iotMonitor',
  initialState,
  reducers: {
    // A. Cabinet Status
    startCabinetStatus: (
      state,
      action: PayloadAction<{ key: string; cabinetId: string }>
    ) => {
      const { key, cabinetId } = action.payload
      state.cabinetStatus[key] = {
        cabinetId,
        nodes: [],
        servers: [],
        loading: true,
        error: null,
        hasLoaded: false,
      }
    },
    stopCabinetStatus: (state, action: PayloadAction<{ key: string }>) => {
      delete state.cabinetStatus[action.payload.key]
    },
    setCabinetStatusResult: (
      state,
      action: PayloadAction<{
        key: string
        nodes?: IotNodeStatus[]
        servers?: IotServerStatus[]
        error?: string | null
        hasLoaded?: boolean
      }>
    ) => {
      const entry = state.cabinetStatus[action.payload.key]
      if (!entry) return
      if (action.payload.nodes !== undefined) {
        entry.nodes = action.payload.nodes
      }
      if (action.payload.servers !== undefined) {
        entry.servers = action.payload.servers
      }
      if (action.payload.hasLoaded !== undefined) {
        entry.hasLoaded = action.payload.hasLoaded
      }
      if (action.payload.error !== undefined) {
        entry.error = action.payload.error
      }
      entry.loading = false
    },

    // B. Electrical Series
    startElectricalSeries: (
      state,
      action: PayloadAction<{
        key: string
        feederId: string
        initial: number
        maxPoints: number
        windowMs?: number
        live?: boolean
      }>
    ) => {
      const { key, feederId, maxPoints, windowMs } = action.payload
      state.electricalSeries[key] = {
        feederId,
        points: [],
        loading: true,
        backfilling: true,
        error: null,
        maxPoints,
        windowMs: windowMs ?? null,
      }
    },
    stopElectricalSeries: (state, action: PayloadAction<{ key: string }>) => {
      delete state.electricalSeries[action.payload.key]
    },
    electricalSeriesAbsorb: (
      state,
      action: PayloadAction<{ key: string; samples: IotFeederAverage[] }>
    ) => {
      const entry = state.electricalSeries[action.payload.key]
      if (!entry) return
      const samples = action.payload.samples
      if (!samples || samples.length === 0) return
      const merged = mergeElectricalPoints(entry.points, samples, entry.maxPoints)
      if (!entry.windowMs || merged.length === 0) {
        entry.points = merged
      } else {
        const from = merged[merged.length - 1].time - entry.windowMs
        entry.points = merged.filter((p) => p.time >= from)
      }
    },
    setElectricalSeriesLoading: (
      state,
      action: PayloadAction<{ key: string; loading: boolean }>
    ) => {
      const entry = state.electricalSeries[action.payload.key]
      if (entry) {
        entry.loading = action.payload.loading
      }
    },
    setElectricalSeriesBackfilling: (
      state,
      action: PayloadAction<{ key: string; backfilling: boolean; error: string | null }>
    ) => {
      const entry = state.electricalSeries[action.payload.key]
      if (entry) {
        entry.backfilling = action.payload.backfilling
        entry.error = action.payload.error
      }
    },
    setElectricalSeriesLoadError: (
      state,
      action: PayloadAction<{ key: string; error: string }>
    ) => {
      const entry = state.electricalSeries[action.payload.key]
      if (entry) {
        entry.loading = false
        entry.backfilling = false
        entry.error = action.payload.error
      }
    },
    setElectricalSeriesError: (
      state,
      action: PayloadAction<{ key: string; error: string | null }>
    ) => {
      const entry = state.electricalSeries[action.payload.key]
      if (entry) {
        entry.error = action.payload.error
      }
    },

    // C. Command Modes
    startCommandModes: (
      state,
      action: PayloadAction<{ key: string; nodeIds: string[] }>
    ) => {
      const { key } = action.payload
      if (!state.commandModes[key]) {
        state.commandModes[key] = {}
      }
    },
    stopCommandModes: (state, action: PayloadAction<{ key: string }>) => {
      delete state.commandModes[action.payload.key]
    },
    commandModesLoaded: (
      state,
      action: PayloadAction<{
        key: string
        modes: Record<string, IotCommandChoice | null>
      }>
    ) => {
      const { key, modes } = action.payload
      if (state.commandModes[key]) {
        state.commandModes[key] = modes
      }
    },

    // D. Feeder Electrical
    startFeederElectrical: (
      state,
      action: PayloadAction<{ key: string; feederId: string; repeat: boolean }>
    ) => {
      state.feederElectrical[action.payload.key] = null
    },
    stopFeederElectrical: (state, action: PayloadAction<{ key: string }>) => {
      delete state.feederElectrical[action.payload.key]
    },
    feederElectricalLoaded: (
      state,
      action: PayloadAction<{
        key: string
        data: IotFeederElectricalResult | null
      }>
    ) => {
      const { key, data } = action.payload
      if (key in state.feederElectrical) {
        state.feederElectrical[key] = data
      }
    },

    // E. Node Diagnostics
    fetchDiagnosticsRequest: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload
      const entry = state.diagnostics[nodeId]
      state.diagnostics[nodeId] = {
        data: entry?.data ?? null,
        error: null,
        loading: true,
      }
    },
    fetchDiagnosticsSuccess: (
      state,
      action: PayloadAction<{
        nodeId: string
        data: IotDiagnosticResult | null
      }>
    ) => {
      const { nodeId, data } = action.payload
      state.diagnostics[nodeId] = {
        data,
        error: null,
        loading: false,
      }
    },
    fetchDiagnosticsFailure: (
      state,
      action: PayloadAction<{ nodeId: string; error: string }>
    ) => {
      const { nodeId, error } = action.payload
      state.diagnostics[nodeId] = {
        data: null,
        error,
        loading: false,
      }
    },

    // F. Node Electrical
    fetchNodeElectricalRequest: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload
      state.nodeElectrical[nodeId] = {
        data: null,
        error: null,
      }
    },
    fetchNodeElectricalSuccess: (
      state,
      action: PayloadAction<{
        nodeId: string
        data: IotElectricalResult
      }>
    ) => {
      const { nodeId, data } = action.payload
      state.nodeElectrical[nodeId] = {
        data,
        error: null,
      }
    },
    fetchNodeElectricalFailure: (
      state,
      action: PayloadAction<{ nodeId: string; error: string }>
    ) => {
      const { nodeId, error } = action.payload
      state.nodeElectrical[nodeId] = {
        data: null,
        error,
      }
    },

    // G. Nodes Tab
    fetchNodesTabRequest: (state) => {
      state.nodesTab.isLoading = true
      state.nodesTab.error = null
    },
    fetchNodesTabSuccess: (
      state,
      action: PayloadAction<{
        nodes: IotNodeStatus[]
        diagnosticsByNode: Record<string, IotDiagnosticResult>
      }>
    ) => {
      state.nodesTab.isLoading = false
      state.nodesTab.nodes = action.payload.nodes
      state.nodesTab.diagnosticsByNode = action.payload.diagnosticsByNode
      state.nodesTab.error = null
    },
    fetchNodesTabFailure: (
      state,
      action: PayloadAction<{ error: string }>
    ) => {
      state.nodesTab.isLoading = false
      state.nodesTab.error = action.payload.error
    },

    // H. Command History
    resetCommandHistory: (
      state,
      action: PayloadAction<{ key: string; nodeId: string }>
    ) => {
      const { key, nodeId } = action.payload
      state.commandHistory[key] = {
        nodeId,
        items: [],
        total: 0,
        page: 1,
        loading: false,
        error: null,
      }
    },
    clearCommandHistory: (state, action: PayloadAction<{ key: string }>) => {
      delete state.commandHistory[action.payload.key]
    },
    fetchCommandHistoryRequest: (
      state,
      action: PayloadAction<{
        key: string
        nodeId: string
        page: number
        pageSize?: number
      }>
    ) => {
      const entry = state.commandHistory[action.payload.key]
      if (entry) {
        entry.loading = true
      }
    },
    fetchCommandHistorySuccess: (
      state,
      action: PayloadAction<{
        key: string
        nodeId: string
        items: IotCommandHistoryItem[]
        total: number
        page: number
      }>
    ) => {
      const { key, nodeId, items, total, page } = action.payload
      const entry = state.commandHistory[key]
      if (entry && entry.nodeId === nodeId) {
        entry.items = items
        entry.total = total
        entry.page = page
        entry.loading = false
        entry.error = null
      }
    },
    fetchCommandHistoryFailure: (
      state,
      action: PayloadAction<{
        key: string
        nodeId: string
        error: string
      }>
    ) => {
      const { key, nodeId, error } = action.payload
      const entry = state.commandHistory[key]
      if (entry && entry.nodeId === nodeId) {
        entry.loading = false
        entry.error = error
      }
    },

    // I. Send Command & Auto Prefill
    sendCommandRequest: (
      state,
      _action: PayloadAction<{
        feederId: string
        nodeId: string
        mode: IotCommandChoice
        body: IotCommandRequest
        cabinetId: string | null
      }>
    ) => {
      state.commandSend.status = 'sending'
    },
    sendCommandSuccess: (state) => {
      state.commandSend.status = 'succeeded'
    },
    sendCommandFailure: (state) => {
      state.commandSend.status = 'failed'
    },
    resetCommandSend: (state) => {
      state.commandSend.status = 'idle'
    },
    fetchAutoPrefillRequest: (
      state,
      action: PayloadAction<{
        requestId: string
        feederId: string
        nodeId: string
      }>
    ) => {
      const { requestId, feederId, nodeId } = action.payload
      state.autoPrefill = {
        requestId,
        feederId,
        nodeId,
        schedule: null,
        status: 'loading',
      }
    },
    fetchAutoPrefillSuccess: (
      state,
      action: PayloadAction<{
        requestId: string
        feederId: string
        nodeId: string
        schedule: IotAutoSchedule | null
      }>
    ) => {
      const { requestId, schedule } = action.payload
      if (state.autoPrefill && state.autoPrefill.requestId === requestId) {
        state.autoPrefill.schedule = schedule
        state.autoPrefill.status = 'ready'
      }
    },
    clearAutoPrefill: (state) => {
      state.autoPrefill = null
    },
  },
})

export const {
  startCabinetStatus,
  stopCabinetStatus,
  setCabinetStatusResult,
  startElectricalSeries,
  stopElectricalSeries,
  electricalSeriesAbsorb,
  setElectricalSeriesLoading,
  setElectricalSeriesBackfilling,
  setElectricalSeriesLoadError,
  setElectricalSeriesError,
  startCommandModes,
  stopCommandModes,
  commandModesLoaded,
  startFeederElectrical,
  stopFeederElectrical,
  feederElectricalLoaded,
  fetchDiagnosticsRequest,
  fetchDiagnosticsSuccess,
  fetchDiagnosticsFailure,
  fetchNodeElectricalRequest,
  fetchNodeElectricalSuccess,
  fetchNodeElectricalFailure,
  fetchNodesTabRequest,
  fetchNodesTabSuccess,
  fetchNodesTabFailure,
  resetCommandHistory,
  clearCommandHistory,
  fetchCommandHistoryRequest,
  fetchCommandHistorySuccess,
  fetchCommandHistoryFailure,
  sendCommandRequest,
  sendCommandSuccess,
  sendCommandFailure,
  resetCommandSend,
  fetchAutoPrefillRequest,
  fetchAutoPrefillSuccess,
  clearAutoPrefill,
} = iotMonitorSlice.actions

export const EMPTY_COMMAND_MODES: Record<string, IotCommandChoice | null> =
  Object.freeze({})

// Selectors
export const selectCabinetStatus = (
  state: { iotMonitor: IotMonitorState },
  key: string
): CabinetStatusEntry | undefined => {
  return state.iotMonitor.cabinetStatus[key]
}

export const selectElectricalSeries = (
  state: { iotMonitor: IotMonitorState },
  key: string
): ElectricalSeriesEntry | undefined => {
  return state.iotMonitor.electricalSeries[key]
}

export const selectCommandModes = (
  state: { iotMonitor: IotMonitorState },
  key: string
): Record<string, IotCommandChoice | null> => {
  return state.iotMonitor.commandModes[key] || EMPTY_COMMAND_MODES
}

export const selectFeederElectrical = (
  state: { iotMonitor: IotMonitorState },
  key: string
): IotFeederElectricalResult | null | undefined => {
  return state.iotMonitor.feederElectrical[key]
}

export const selectNodeDiagnostics = (
  state: { iotMonitor: IotMonitorState },
  nodeId: string | null | undefined
): { data: IotDiagnosticResult | null; error: string | null; loading: boolean } | undefined => {
  if (!nodeId) return undefined
  return state.iotMonitor.diagnostics[nodeId]
}

export const selectNodeElectrical = (
  state: { iotMonitor: IotMonitorState },
  nodeId: string | null | undefined
): { data: IotElectricalResult | null; error: string | null } | undefined => {
  if (!nodeId) return undefined
  return state.iotMonitor.nodeElectrical[nodeId]
}

export const selectNodesTab = (state: { iotMonitor: IotMonitorState }) => {
  return state.iotMonitor.nodesTab
}

export const selectCommandHistory = (
  state: { iotMonitor: IotMonitorState },
  key: string
): CommandHistoryEntry | undefined => {
  return state.iotMonitor.commandHistory[key]
}

export const selectCommandSend = (state: { iotMonitor: IotMonitorState }) => {
  return state.iotMonitor.commandSend
}

export const selectAutoPrefill = (state: { iotMonitor: IotMonitorState }) => {
  return state.iotMonitor.autoPrefill
}

export default iotMonitorSlice.reducer
