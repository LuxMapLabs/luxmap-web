import type { Task } from 'redux-saga'
import {
  all,
  call,
  cancel,
  delay,
  fork,
  put,
  select,
  take,
  takeEvery,
  takeLatest,
} from 'redux-saga/effects'
import { toast } from 'sonner'
import iotAPI from './iotAPI'
import { fetchCabinetTopologyRequest } from '../map/mapSlice'
import {
  CABINET_IOT_REFRESH_MS,
  COMMAND_MODE_POLL_MS,
  DIAGNOSTIC_HISTORY_PAGE_SIZE,
  ELECTRICAL_MAX_PAGES,
  ELECTRICAL_POLL_MS,
  HISTORY_PAGE_SIZE,
  clearCommandHistory,
  clearDiagnosticHistory,
  commandModesLoaded,
  electricalSeriesAbsorb,
  feederElectricalLoaded,
  fetchAutoPrefillRequest,
  fetchAutoPrefillSuccess,
  fetchCommandHistoryFailure,
  fetchCommandHistoryRequest,
  fetchCommandHistorySuccess,
  fetchDiagnosticHistoryFailure,
  fetchDiagnosticHistoryRequest,
  fetchDiagnosticHistorySuccess,
  fetchDiagnosticsFailure,
  fetchDiagnosticsRequest,
  fetchDiagnosticsSuccess,
  fetchNodeElectricalFailure,
  fetchNodeElectricalRequest,
  fetchNodeElectricalSuccess,
  fetchNodeSourceFailure,
  fetchNodeSourceRequest,
  fetchNodeSourceSuccess,
  fetchNodesTabFailure,
  fetchNodesTabRequest,
  fetchNodesTabSuccess,
  resetCommandHistory,
  resetDiagnosticHistory,
  sendCommandFailure,
  sendCommandRequest,
  sendCommandSuccess,
  setCabinetStatusResult,
  setElectricalSeriesBackfilling,
  setElectricalSeriesError,
  setElectricalSeriesLoadError,
  setElectricalSeriesLoading,
  startCabinetStatus,
  startCommandModes,
  startElectricalSeries,
  startFeederElectrical,
  stopCabinetStatus,
  stopCommandModes,
  stopElectricalSeries,
  stopFeederElectrical,
  type IotMonitorState,
} from './iotMonitorSlice'
import type {
  IotCommandHistoryItemPagedResult,
  IotDiagnosticResult,
  IotElectricalResult,
  IotNodeSourceDetails,
  IotNodeStatus,
  IotNodeStatusPagedResult,
} from '../../types/iot/nodes'
import type {
  IotDiagnosticHistoryItemPagedResult,
  IotFeederAverage,
  IotFeederElectricalResult,
  IotFeederHistoryResult,
} from '../../types/iot/feeders'
import type { IotServerStatus } from '../../types/iot/servers'
import { apiErrorMessage } from '../../utils/iot/apiError'
import { toElectricalPoint } from '../../utils/iot/electricalSeries'
import {
  latestSuccessAutoSchedule,
  latestSuccessChoice,
  type IotCommandChoice,
} from '../../utils/iot/iotCommand'

type SettledResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown }

const sampleTime = (s: IotFeederAverage) => toElectricalPoint(s)?.time ?? null

// ==========================================
// A. Trạng thái IoT của tủ (useCabinetIotStatus)
// ==========================================
function* fetchAllNodesWorker() {
  const allNodes: IotNodeStatus[] = []
  let page = 1
  while (true) {
    const res: IotNodeStatusPagedResult = yield call(iotAPI.getNodes, {
      page,
      page_size: 200,
    })
    const items = res?.items ?? []
    if (items.length === 0) {
      break
    }
    allNodes.push(...items)
    const total = typeof res?.total === 'number' ? res.total : undefined
    if (total !== undefined ? allNodes.length >= total : items.length < 200) {
      break
    }
    page += 1
  }
  return allNodes
}

function* loadCabinetStatusOnce(key: string, cabinetId: string) {
  const [nodesRes, serversRes]: [
    SettledResult<IotNodeStatus[]>,
    SettledResult<IotServerStatus[]>
  ] = yield all([
    call(function* () {
      try {
        const value: IotNodeStatus[] = yield call(fetchAllNodesWorker)
        return { status: 'fulfilled' as const, value }
      } catch (reason) {
        return { status: 'rejected' as const, reason }
      }
    }),
    call(function* () {
      try {
        const value: IotServerStatus[] = yield call(iotAPI.getServers)
        return { status: 'fulfilled' as const, value }
      } catch (reason) {
        return { status: 'rejected' as const, reason }
      }
    }),
  ])

  const state: { iotMonitor: IotMonitorState } = yield select()
  const entry = state.iotMonitor.cabinetStatus[key]
  if (!entry) return

  let activeNodes = entry.nodes
  let newNodes: IotNodeStatus[] | undefined = undefined
  let hasLoaded = entry.hasLoaded
  let error: string | null = null

  if (nodesRes.status === 'fulfilled') {
    const filteredNodes = nodesRes.value.filter((n) => n.cabinet_id === cabinetId)
    activeNodes = filteredNodes
    newNodes = filteredNodes
    hasLoaded = true
    error = null
  } else {
    if (!hasLoaded) {
      error = apiErrorMessage(nodesRes.reason, 'Không thể tải trạng thái IoT của tủ.')
    }
  }

  let newServers: IotServerStatus[] | undefined = undefined
  if (serversRes.status === 'fulfilled') {
    const serverIds = new Set(
      activeNodes.map((n) => n.server_id).filter((id): id is string => Boolean(id))
    )
    newServers = serversRes.value.filter(
      (s) => s.server_id && serverIds.has(s.server_id)
    )
  }

  yield put(
    setCabinetStatusResult({
      key,
      nodes: newNodes,
      servers: newServers,
      error,
      hasLoaded,
    })
  )
}

function* cabinetStatusSession({
  key,
  cabinetId,
}: {
  key: string
  cabinetId: string
}) {
  if (!cabinetId) return

  while (true) {
    yield fork(loadCabinetStatusOnce, key, cabinetId)
    yield delay(CABINET_IOT_REFRESH_MS)
  }
}

function* cabinetStatusManager(): Generator<unknown, void, unknown> {
  const tasks = new Map<string, Task>()

  while (true) {
    const action = (yield take([
      startCabinetStatus.type,
      stopCabinetStatus.type,
    ])) as
      | ReturnType<typeof startCabinetStatus>
      | ReturnType<typeof stopCabinetStatus>

    const key = action.payload.key
    const existing = tasks.get(key)
    if (existing && existing.isRunning()) {
      yield cancel(existing)
      tasks.delete(key)
    }

    if (action.type === startCabinetStatus.type) {
      const startAction = action as ReturnType<typeof startCabinetStatus>
      const task = (yield fork(cabinetStatusSession, startAction.payload)) as Task
      tasks.set(key, task)
    }
  }
}

// ==========================================
// B. Chuỗi mẫu điện của mạch (useElectricalSeries)
// ==========================================
const RANGE_MAX_PAGES = 200

function* electricalSeriesSession(
  payload: ReturnType<typeof startElectricalSeries>['payload']
) {
  const { key, feederId, initial, windowMs, live = true, timeBasis = 'measured_at', fromTo } = payload
  if (!feederId) return
  const fetchHistory =
    timeBasis === 'received_at'
      ? iotAPI.getFeederElectricalHistoryReceived
      : iotAPI.getFeederElectricalHistory

  if (fromTo) {
    try {
      const pageSize = 200
      let truncated = false
      for (let page = 1; page <= RANGE_MAX_PAGES; page++) {
        const result: IotFeederHistoryResult = yield call(fetchHistory, feederId, {
          page,
          page_size: pageSize,
          from: fromTo.from,
          to: fromTo.to,
        })
        const items = result.items || []
        yield put(electricalSeriesAbsorb({ key, samples: items }))
        if (page === 1) {
          yield put(setElectricalSeriesLoading({ key, loading: false }))
        }
        if (items.length < pageSize) {
          break
        }
        if (typeof result.total === 'number' && page * pageSize >= result.total) {
          break
        }
        if (page === RANGE_MAX_PAGES && typeof result.total === 'number' && page * pageSize < result.total) {
          truncated = true
        }
      }
      yield put(
        setElectricalSeriesBackfilling({
          key,
          backfilling: false,
          error: truncated
            ? 'Khoảng quá dài, chỉ tải 40.000 khoảng 30 giây gần nhất (≈ 13,9 ngày).'
            : null,
        })
      )
    } catch (err) {
      yield put(
        setElectricalSeriesLoadError({
          key,
          error: apiErrorMessage(err, 'Không đọc được lịch sử điện.'),
        })
      )
    }
    return
  }

  while (true) {
    let loadedOk = false
    let newest: number | null = null
    try {
      for (let page = 1; ; page++) {
        const result: IotFeederHistoryResult = yield call(
          fetchHistory,
          feederId,
          { page, page_size: initial }
        )
        const items = result.items || []
        yield put(electricalSeriesAbsorb({ key, samples: items }))
        if (page === 1) {
          yield put(setElectricalSeriesLoading({ key, loading: false }))
        }
        if (!windowMs || items.length < initial || page >= ELECTRICAL_MAX_PAGES) {
          break
        }
        if (typeof result.total === 'number' && page * initial >= result.total) {
          break
        }
        const times = items.map(sampleTime).filter((t): t is number => t !== null)
        if (times.length === 0) break
        newest ??= Math.max(...times)
        if (newest - Math.min(...times) >= windowMs) break
      }
      yield put(
        setElectricalSeriesBackfilling({
          key,
          backfilling: false,
          error: null,
        })
      )
      loadedOk = true
    } catch (err) {
      yield put(
        setElectricalSeriesLoadError({
          key,
          error: apiErrorMessage(err, 'Không đọc được lịch sử điện.'),
        })
      )
      if (live) {
        yield delay(ELECTRICAL_POLL_MS)
        continue
      } else {
        break
      }
    }

    if (loadedOk) {
      if (!live) break
      while (true) {
        yield delay(ELECTRICAL_POLL_MS)
        try {
          const page: IotFeederHistoryResult = yield call(
            fetchHistory,
            feederId,
            { page: 1, page_size: 20 }
          )
          yield put(electricalSeriesAbsorb({ key, samples: page.items || [] }))
          yield put(setElectricalSeriesError({ key, error: null }))
        } catch (err) {
          yield put(
            setElectricalSeriesError({
              key,
              error: apiErrorMessage(err, 'Không lấy được mẫu điện mới.'),
            })
          )
        }
      }
    }
  }
}

function* electricalSeriesManager(): Generator<unknown, void, unknown> {
  const tasks = new Map<string, Task>()

  while (true) {
    const action = (yield take([
      startElectricalSeries.type,
      stopElectricalSeries.type,
    ])) as
      | ReturnType<typeof startElectricalSeries>
      | ReturnType<typeof stopElectricalSeries>

    const key = action.payload.key
    const existing = tasks.get(key)
    if (existing && existing.isRunning()) {
      yield cancel(existing)
      tasks.delete(key)
    }

    if (action.type === startElectricalSeries.type) {
      const startAction = action as ReturnType<typeof startElectricalSeries>
      const task = (yield fork(electricalSeriesSession, startAction.payload)) as Task
      tasks.set(key, task)
    }
  }
}

// ==========================================
// C. Chế độ lệnh của các node (useFeederCommandModes)
// ==========================================
function* loadCommandModesOnce(key: string, ids: string[]) {
  const entries: Array<readonly [string, IotCommandChoice | null]> = yield all(
    ids.map((id) =>
      call(function* () {
        try {
          const page: IotCommandHistoryItemPagedResult = yield call(
            iotAPI.getCommandHistory,
            id,
            { page: 1, page_size: 20 }
          )
          return [id, latestSuccessChoice(page.items)] as const
        } catch {
          return [id, null] as const
        }
      })
    )
  )
  const modes = Object.fromEntries(entries)
  yield put(commandModesLoaded({ key, modes }))
}

function* commandModesSession({
  key,
  nodeIds,
}: {
  key: string
  nodeIds: string[]
}) {
  const ids = [...new Set(nodeIds)].filter(Boolean)
  if (ids.length === 0) return

  while (true) {
    yield fork(loadCommandModesOnce, key, ids)
    yield delay(COMMAND_MODE_POLL_MS)
  }
}

function* commandModesManager(): Generator<unknown, void, unknown> {
  const tasks = new Map<string, Task>()

  while (true) {
    const action = (yield take([
      startCommandModes.type,
      stopCommandModes.type,
    ])) as
      | ReturnType<typeof startCommandModes>
      | ReturnType<typeof stopCommandModes>

    const key = action.payload.key
    const existing = tasks.get(key)
    if (existing && existing.isRunning()) {
      yield cancel(existing)
      tasks.delete(key)
    }

    if (action.type === startCommandModes.type) {
      const startAction = action as ReturnType<typeof startCommandModes>
      const task = (yield fork(commandModesSession, startAction.payload)) as Task
      tasks.set(key, task)
    }
  }
}

// ==========================================
// D. Điện mới nhất của mạch
// ==========================================
function* feederElectricalSession({
  key,
  feederId,
  repeat,
}: {
  key: string
  feederId: string
  repeat: boolean
}) {
  if (!feederId) return

  while (true) {
    try {
      const res: IotFeederElectricalResult = yield call(
        iotAPI.getFeederElectrical,
        feederId
      )
      yield put(feederElectricalLoaded({ key, data: res }))
    } catch {
      yield put(feederElectricalLoaded({ key, data: null }))
    }
    if (!repeat) break
    yield delay(ELECTRICAL_POLL_MS)
  }
}

function* feederElectricalManager(): Generator<unknown, void, unknown> {
  const tasks = new Map<string, Task>()

  while (true) {
    const action = (yield take([
      startFeederElectrical.type,
      stopFeederElectrical.type,
    ])) as
      | ReturnType<typeof startFeederElectrical>
      | ReturnType<typeof stopFeederElectrical>

    const key = action.payload.key
    const existing = tasks.get(key)
    if (existing && existing.isRunning()) {
      yield cancel(existing)
      tasks.delete(key)
    }

    if (action.type === startFeederElectrical.type) {
      const startAction = action as ReturnType<typeof startFeederElectrical>
      const task = (yield fork(feederElectricalSession, startAction.payload)) as Task
      tasks.set(key, task)
    }
  }
}

// ==========================================
// E. Chẩn đoán node (FeederElectricalSummary, IotNodeDetailModal)
// ==========================================
function* fetchDiagnosticsWorker(
  action: ReturnType<typeof fetchDiagnosticsRequest>
) {
  const nodeId = action.payload
  try {
    if (typeof iotAPI.getDiagnostics !== 'function') {
      yield put(fetchDiagnosticsSuccess({ nodeId, data: null }))
      return
    }
    const data: IotDiagnosticResult = yield call(iotAPI.getDiagnostics, nodeId)
    yield put(fetchDiagnosticsSuccess({ nodeId, data }))
  } catch (err) {
    yield put(
      fetchDiagnosticsFailure({
        nodeId,
        error: apiErrorMessage(err, 'Không đọc được kết quả chẩn đoán.'),
      })
    )
  }
}

function* watchFetchDiagnostics() {
  yield takeEvery(fetchDiagnosticsRequest.type, fetchDiagnosticsWorker)
}

// ==========================================
// F. Mẫu điện mới nhất của node (IotNodeDetailModal)
// ==========================================
function* fetchNodeElectricalWorker(
  action: ReturnType<typeof fetchNodeElectricalRequest>
) {
  const nodeId = action.payload
  try {
    const data: IotElectricalResult = yield call(iotAPI.getElectrical, nodeId)
    yield put(fetchNodeElectricalSuccess({ nodeId, data }))
  } catch (err) {
    yield put(
      fetchNodeElectricalFailure({
        nodeId,
        error: apiErrorMessage(err, 'Không đọc được mẫu điện.'),
      })
    )
  }
}

function* watchFetchNodeElectrical() {
  yield takeEvery(fetchNodeElectricalRequest.type, fetchNodeElectricalWorker)
}

// ==========================================
// F2. Thông tin nguồn đo / hiệu chuẩn của node (IotNodeDetailModal)
// ==========================================
function* fetchNodeSourceWorker(
  action: ReturnType<typeof fetchNodeSourceRequest>
) {
  const nodeId = action.payload
  try {
    if (typeof iotAPI.getNodeSource !== 'function') {
      yield put(fetchNodeSourceSuccess({ nodeId, data: null }))
      return
    }
    const data: IotNodeSourceDetails = yield call(iotAPI.getNodeSource, nodeId)
    yield put(fetchNodeSourceSuccess({ nodeId, data }))
  } catch (err) {
    yield put(
      fetchNodeSourceFailure({
        nodeId,
        error: apiErrorMessage(err, 'Không đọc được thông số danh định.'),
      })
    )
  }
}

function* watchFetchNodeSource() {
  yield takeEvery(fetchNodeSourceRequest.type, fetchNodeSourceWorker)
}

// ==========================================
// G. Tab thiết bị IoT (IotNodesTab)
// ==========================================
function* fetchNodesTabWorker() {
  try {
    const result: IotNodeStatusPagedResult = yield call(iotAPI.getNodes, {
      page: 1,
      page_size: 200,
    })
    const items = result.items || []
    const configuredIds = items
      .filter((n) => n.node_id && n.status !== 'unconfigured')
      .map((n) => n.node_id as string)

    const map: Record<string, IotDiagnosticResult> = {}
    if (configuredIds.length > 0 && typeof iotAPI.getDiagnostics === 'function') {
      const settled: Array<SettledResult<IotDiagnosticResult>> = yield all(
        configuredIds.map((id) =>
          call(function* () {
            try {
              const val: IotDiagnosticResult = yield call(iotAPI.getDiagnostics, id)
              return { status: 'fulfilled' as const, value: val }
            } catch (reason) {
              return { status: 'rejected' as const, reason }
            }
          })
        )
      )
      settled.forEach((res, idx) => {
        if (res.status === 'fulfilled' && res.value) {
          map[configuredIds[idx]] = res.value
        }
      })
    }
    yield put(fetchNodesTabSuccess({ nodes: items, diagnosticsByNode: map }))
  } catch (err) {
    yield put(
      fetchNodesTabFailure({
        error: apiErrorMessage(err, 'Không đọc được danh sách thiết bị IoT.'),
      })
    )
  }
}

function* watchFetchNodesTab() {
  yield takeLatest(fetchNodesTabRequest.type, fetchNodesTabWorker)
}

// ==========================================
// H. Lịch sử lệnh (IotCommandHistoryList)
// ==========================================
function* loadCommandHistoryWorker({
  key,
  nodeId,
  page,
  pageSize = HISTORY_PAGE_SIZE,
}: {
  key: string
  nodeId: string
  page: number
  pageSize?: number
}) {
  try {
    const result: IotCommandHistoryItemPagedResult = yield call(
      iotAPI.getCommandHistory,
      nodeId,
      { page, page_size: pageSize }
    )
    const items = result.items || []
    const total = result.total ?? items.length
    yield put(fetchCommandHistorySuccess({ key, nodeId, items, total, page }))
  } catch (err) {
    yield put(
      fetchCommandHistoryFailure({
        key,
        nodeId,
        error: apiErrorMessage(err, 'Không đọc được lịch sử lệnh.'),
      })
    )
  }
}

function* commandHistoryManager(): Generator<unknown, void, unknown> {
  const tasks = new Map<string, Task>()

  while (true) {
    const action = (yield take([
      resetCommandHistory.type,
      fetchCommandHistoryRequest.type,
      clearCommandHistory.type,
    ])) as
      | ReturnType<typeof resetCommandHistory>
      | ReturnType<typeof fetchCommandHistoryRequest>
      | ReturnType<typeof clearCommandHistory>

    const key = action.payload.key
    const existing = tasks.get(key)
    if (existing && existing.isRunning()) {
      yield cancel(existing)
      tasks.delete(key)
    }

    if (action.type === fetchCommandHistoryRequest.type) {
      const fetchAction = action as ReturnType<typeof fetchCommandHistoryRequest>
      const task = (yield fork(loadCommandHistoryWorker, fetchAction.payload)) as Task
      tasks.set(key, task)
    }
  }
}

// ==========================================
// I. Gửi lệnh Bật / Tắt / AUTO (GisDrawerPanel)
// ==========================================
function* sendCommandWorker(action: ReturnType<typeof sendCommandRequest>) {
  const { feederId, nodeId, mode, body, cabinetId } = action.payload
  try {
    yield call(iotAPI.sendCommand, nodeId, body)
    const modeLabel = mode === 'on' ? 'Bật' : mode === 'off' ? 'Tắt' : 'AUTO'
    toast.success(`Đã gửi lệnh ${modeLabel} tới ${nodeId}, chờ node xác nhận.`)
    if (cabinetId) {
      yield put(fetchCabinetTopologyRequest(cabinetId))
    }
    yield put(sendCommandSuccess())
  } catch (err) {
    toast.error(
      apiErrorMessage(err, `Không gửi được lệnh tới IoT bridge (mạch ${feederId}).`)
    )
    yield put(sendCommandFailure())
  }
}

function* watchSendCommand() {
  yield takeEvery(sendCommandRequest.type, sendCommandWorker)
}

function* fetchAutoPrefillWorker(
  action: ReturnType<typeof fetchAutoPrefillRequest>
) {
  const { requestId, feederId, nodeId } = action.payload
  try {
    const history: IotCommandHistoryItemPagedResult = yield call(
      iotAPI.getCommandHistory,
      nodeId,
      { page: 1, page_size: 20 }
    )
    const schedule = latestSuccessAutoSchedule(history?.items)
    yield put(fetchAutoPrefillSuccess({ requestId, feederId, nodeId, schedule }))
  } catch {
    yield put(
      fetchAutoPrefillSuccess({
        requestId,
        feederId,
        nodeId,
        schedule: null,
      })
    )
  }
}

function* watchFetchAutoPrefill() {
  yield takeLatest(fetchAutoPrefillRequest.type, fetchAutoPrefillWorker)
}

// ==========================================
// J. Lịch sử đợt lỗi (chi tiết node ở Tài sản)
// ==========================================
function* loadDiagnosticHistoryWorker({
  key,
  feederId,
  page,
  pageSize = DIAGNOSTIC_HISTORY_PAGE_SIZE,
  from,
  to,
}: {
  key: string
  feederId: string
  page: number
  pageSize?: number
  from?: string | null
  to?: string | null
}) {
  try {
    const result: IotDiagnosticHistoryItemPagedResult = yield call(
      iotAPI.getFeederDiagnosticHistory,
      feederId,
      {
        page,
        page_size: pageSize,
        from: from || undefined,
        to: to || undefined,
      }
    )
    const items = result.items || []
    const total = result.total ?? items.length
    yield put(fetchDiagnosticHistorySuccess({ key, feederId, items, total, page }))
  } catch (err) {
    yield put(
      fetchDiagnosticHistoryFailure({
        key,
        feederId,
        error: apiErrorMessage(err, 'Không đọc được lịch sử sự cố của mạch.'),
      })
    )
  }
}

function* diagnosticHistoryManager(): Generator<unknown, void, unknown> {
  const tasks = new Map<string, Task>()

  while (true) {
    const action = (yield take([
      resetDiagnosticHistory.type,
      fetchDiagnosticHistoryRequest.type,
      clearDiagnosticHistory.type,
    ])) as
      | ReturnType<typeof resetDiagnosticHistory>
      | ReturnType<typeof fetchDiagnosticHistoryRequest>
      | ReturnType<typeof clearDiagnosticHistory>

    const key = action.payload.key
    const existing = tasks.get(key)
    if (existing && existing.isRunning()) {
      yield cancel(existing)
      tasks.delete(key)
    }

    if (action.type === fetchDiagnosticHistoryRequest.type) {
      const fetchAction = action as ReturnType<typeof fetchDiagnosticHistoryRequest>
      const task = (yield fork(loadDiagnosticHistoryWorker, fetchAction.payload)) as Task
      tasks.set(key, task)
    }
  }
}

// ==========================================
// Root Saga
// ==========================================
export default function* iotMonitorSaga() {
  yield all([
    fork(cabinetStatusManager),
    fork(electricalSeriesManager),
    fork(commandModesManager),
    fork(feederElectricalManager),
    fork(watchFetchDiagnostics),
    fork(watchFetchNodeElectrical),
    fork(watchFetchNodeSource),
    fork(watchFetchNodesTab),
    fork(commandHistoryManager),
    fork(watchSendCommand),
    fork(watchFetchAutoPrefill),
    fork(diagnosticHistoryManager),
  ])
}
