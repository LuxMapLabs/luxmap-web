import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type {
  IotAutoSchedule,
  IotCommandHistoryItem,
  IotCommandRequest,
  IotDiagnosticResult,
  IotElectricalResult,
  IotNodeSourceDetails,
  IotNodeStatus,
} from '../../types/iot/nodes'
import type {
  IotDiagnosticHistoryItem,
  IotFeederHistorySample,
  IotFeederElectricalResult,
  IotFeederRepairPeriod,
} from '../../types/iot/feeders'
import type { IotServerStatus } from '../../types/iot/servers'
import {
  mergeElectricalPoints,
  type ElectricalChunkDirection,
  type ElectricalChunkState,
  type ElectricalPoint,
  type ElectricalTimeSpan,
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

/** Kích thước phân trang lịch sử đợt lỗi của mạch. */
export const DIAGNOSTIC_HISTORY_PAGE_SIZE = 20

export interface CabinetStatusEntry {
  cabinetId: string
  nodes: IotNodeStatus[]
  servers: IotServerStatus[]
  loading: boolean
  error: string | null
  hasLoaded: boolean
}

export type ElectricalTimeBasis = 'measured_at' | 'received_at'

export interface ElectricalSeriesEntry {
  feederId: string
  timeBasis: ElectricalTimeBasis
  points: ElectricalPoint[]
  loading: boolean
  backfilling: boolean
  error: string | null
  maxPoints: number
  windowMs: number | null
}

/** Trạng thái tải dữ liệu điện theo khúc 6 giờ (không cắt số điểm). */
export interface ElectricalChunksEntry {
  feederId: string
  timeBasis: ElectricalTimeBasis
  live: boolean
  points: ElectricalPoint[]
  chunks: Record<number, ElectricalChunkState>
  /** Các khoảng sửa feeder theo phiếu (`repair_periods` của lịch sử điện), xếp theo giờ bắt đầu. */
  repairPeriods: IotFeederRepairPeriod[]
  error: string | null
}

export interface CommandHistoryEntry {
  nodeId: string
  items: IotCommandHistoryItem[]
  total: number
  page: number
  loading: boolean
  error: string | null
}

export interface DiagnosticHistoryEntry {
  feederId: string
  items: IotDiagnosticHistoryItem[]
  total: number
  page: number
  from: string | null
  to: string | null
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
  electricalChunks: Record<string, ElectricalChunksEntry>
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
  nodeSource: Record<
    string,
    {
      loading: boolean
      error: string | null
      data: IotNodeSourceDetails | null
    }
  >
  nodesTab: {
    nodes: IotNodeStatus[]
    diagnosticsByNode: Record<string, IotDiagnosticResult>
    isLoading: boolean
    error: string | null
  }
  commandHistory: Record<string, CommandHistoryEntry>
  diagnosticHistory: Record<string, DiagnosticHistoryEntry>
  commandSend: {
    status: 'idle' | 'sending' | 'succeeded' | 'failed'
  }
  autoPrefill: AutoPrefillState | null
}

const initialState: IotMonitorState = {
  cabinetStatus: {},
  electricalSeries: {},
  electricalChunks: {},
  commandModes: {},
  feederElectrical: {},
  diagnostics: {},
  nodeElectrical: {},
  nodeSource: {},
  nodesTab: {
    nodes: [],
    diagnosticsByNode: {},
    isLoading: true,
    error: null,
  },
  commandHistory: {},
  diagnosticHistory: {},
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
        timeBasis?: ElectricalTimeBasis
        fromTo?: { from: string; to: string }
      }>
    ) => {
      const { key, feederId, maxPoints, windowMs, fromTo, timeBasis = 'measured_at' } = action.payload
      state.electricalSeries[key] = {
        feederId,
        timeBasis,
        points: [],
        loading: true,
        backfilling: true,
        error: null,
        maxPoints,
        windowMs: fromTo ? null : (windowMs ?? null),
      }
    },
    stopElectricalSeries: (state, action: PayloadAction<{ key: string }>) => {
      delete state.electricalSeries[action.payload.key]
    },
    electricalSeriesAbsorb: (
      state,
      action: PayloadAction<{ key: string; samples: IotFeederHistorySample[] }>
    ) => {
      const entry = state.electricalSeries[action.payload.key]
      if (!entry) return
      const samples = action.payload.samples
      if (!samples || samples.length === 0) return
      const merged = mergeElectricalPoints(entry.points, samples, entry.maxPoints, entry.timeBasis)
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

    // B2. Electrical Chunks (tải theo khúc 6 giờ, không giới hạn mẫu)
    startElectricalChunks: (
      state,
      action: PayloadAction<{
        key: string
        feederId: string
        timeBasis: ElectricalTimeBasis
        live: boolean
      }>
    ) => {
      const { key, feederId, timeBasis, live } = action.payload
      state.electricalChunks[key] = {
        feederId,
        timeBasis,
        live,
        points: [],
        chunks: {},
        repairPeriods: [],
        error: null,
      }
    },
    stopElectricalChunks: (state, action: PayloadAction<{ key: string }>) => {
      delete state.electricalChunks[action.payload.key]
    },
    requestElectricalChunks: (
      state,
      action: PayloadAction<{
        key: string
        view: ElectricalTimeSpan
        track: ElectricalTimeSpan
        direction: ElectricalChunkDirection
        bounds?: ElectricalTimeSpan | null
        force?: boolean
      }>
    ) => {
      if (action.payload.force) {
        const entry = state.electricalChunks[action.payload.key]
        if (entry) {
          entry.error = null
        }
      }
    },
    setElectricalChunkState: (
      state,
      action: PayloadAction<{
        key: string
        start: number
        state: ElectricalChunkState | null
      }>
    ) => {
      const entry = state.electricalChunks[action.payload.key]
      if (!entry) return
      if (action.payload.state === null) {
        delete entry.chunks[action.payload.start]
      } else {
        entry.chunks[action.payload.start] = action.payload.state
      }
    },
    electricalChunksAbsorb: (
      state,
      action: PayloadAction<{ key: string; samples: IotFeederHistorySample[] }>
    ) => {
      const entry = state.electricalChunks[action.payload.key]
      if (!entry) return
      const samples = action.payload.samples
      if (!samples || samples.length === 0) return
      entry.points = mergeElectricalPoints(entry.points, samples, Number.MAX_SAFE_INTEGER, entry.timeBasis)
    },
    /** Gộp khoảng sửa theo phiếu + giờ bắt đầu; bản mới ghi đè (khoảng đang mở có `ended_at` khi sửa xong). */
    electricalRepairPeriodsAbsorb: (
      state,
      action: PayloadAction<{ key: string; periods: IotFeederRepairPeriod[] }>
    ) => {
      const entry = state.electricalChunks[action.payload.key]
      if (!entry || action.payload.periods.length === 0) return
      const byKey = new Map(entry.repairPeriods.map((r) => [`${r.work_order_id}|${r.started_at}`, r]))
      action.payload.periods.forEach((r) => {
        if (r.started_at) byKey.set(`${r.work_order_id}|${r.started_at}`, r)
      })
      entry.repairPeriods = [...byKey.values()].sort(
        (a, b) => Date.parse(a.started_at ?? '') - Date.parse(b.started_at ?? '')
      )
    },
    setElectricalChunksError: (
      state,
      action: PayloadAction<{ key: string; error: string | null }>
    ) => {
      const entry = state.electricalChunks[action.payload.key]
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

    // F2. Node Source (Hiệu chuẩn / chỉ số danh định)
    fetchNodeSourceRequest: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload
      const entry = state.nodeSource[nodeId]
      state.nodeSource[nodeId] = {
        data: entry?.data ?? null,
        error: null,
        loading: true,
      }
    },
    fetchNodeSourceSuccess: (
      state,
      action: PayloadAction<{
        nodeId: string
        data: IotNodeSourceDetails | null
      }>
    ) => {
      const { nodeId, data } = action.payload
      state.nodeSource[nodeId] = {
        data,
        error: null,
        loading: false,
      }
    },
    fetchNodeSourceFailure: (
      state,
      action: PayloadAction<{ nodeId: string; error: string }>
    ) => {
      const { nodeId, error } = action.payload
      state.nodeSource[nodeId] = {
        data: null,
        error,
        loading: false,
      }
    },
    clearNodeSource: (state, action: PayloadAction<string>) => {
      delete state.nodeSource[action.payload]
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

    // J. Lịch sử đợt lỗi
    resetDiagnosticHistory: (
      state,
      action: PayloadAction<{ key: string; feederId: string }>
    ) => {
      const { key, feederId } = action.payload
      state.diagnosticHistory[key] = {
        feederId,
        items: [],
        total: 0,
        page: 1,
        from: null,
        to: null,
        loading: false,
        error: null,
      }
    },
    clearDiagnosticHistory: (state, action: PayloadAction<{ key: string }>) => {
      delete state.diagnosticHistory[action.payload.key]
    },
    fetchDiagnosticHistoryRequest: (
      state,
      action: PayloadAction<{
        key: string
        feederId: string
        page: number
        pageSize?: number
        from?: string | null
        to?: string | null
      }>
    ) => {
      const { key, feederId, from = null, to = null } = action.payload
      const entry = state.diagnosticHistory[key]
      if (entry) {
        entry.feederId = feederId
        entry.loading = true
        entry.from = from
        entry.to = to
      } else {
        state.diagnosticHistory[key] = {
          feederId,
          items: [],
          total: 0,
          page: 1,
          from,
          to,
          loading: true,
          error: null,
        }
      }
    },
    fetchDiagnosticHistorySuccess: (
      state,
      action: PayloadAction<{
        key: string
        feederId: string
        items: IotDiagnosticHistoryItem[]
        total: number
        page: number
      }>
    ) => {
      const { key, feederId, items, total, page } = action.payload
      const entry = state.diagnosticHistory[key]
      if (entry && entry.feederId === feederId) {
        entry.items = items
        entry.total = total
        entry.page = page
        entry.loading = false
        entry.error = null
      }
    },
    fetchDiagnosticHistoryFailure: (
      state,
      action: PayloadAction<{
        key: string
        feederId: string
        error: string
      }>
    ) => {
      const { key, feederId, error } = action.payload
      const entry = state.diagnosticHistory[key]
      if (entry && entry.feederId === feederId) {
        entry.loading = false
        entry.error = error
      }
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
  startElectricalChunks,
  stopElectricalChunks,
  requestElectricalChunks,
  setElectricalChunkState,
  electricalChunksAbsorb,
  electricalRepairPeriodsAbsorb,
  setElectricalChunksError,
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
  fetchNodeSourceRequest,
  fetchNodeSourceSuccess,
  fetchNodeSourceFailure,
  clearNodeSource,
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
  resetDiagnosticHistory,
  clearDiagnosticHistory,
  fetchDiagnosticHistoryRequest,
  fetchDiagnosticHistorySuccess,
  fetchDiagnosticHistoryFailure,
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

export const selectElectricalChunks = (
  state: { iotMonitor: IotMonitorState },
  key: string
): ElectricalChunksEntry | undefined => {
  return state.iotMonitor.electricalChunks[key]
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

export const selectNodeSource = (
  state: { iotMonitor: IotMonitorState },
  nodeId: string | null | undefined
): { data: IotNodeSourceDetails | null; error: string | null; loading: boolean } | undefined => {
  if (!nodeId) return undefined
  return state.iotMonitor.nodeSource[nodeId]
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

export const selectDiagnosticHistory = (
  state: { iotMonitor: IotMonitorState },
  key: string
): DiagnosticHistoryEntry | undefined => {
  return state.iotMonitor.diagnosticHistory[key]
}

export default iotMonitorSlice.reducer
