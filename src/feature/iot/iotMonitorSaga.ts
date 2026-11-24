import { channel, type Channel, type Task } from 'redux-saga'
import {
  all,
  call,
  cancel,
  cancelled,
  delay,
  fork,
  put,
  race,
  select,
  take,
  takeEvery,
  takeLatest,
} from 'redux-saga/effects'
import { toast } from 'sonner'
import iotAPI from './iotAPI'
import { fetchCabinetTopologyRequest, fetchMapLayersRequest } from '../map/mapSlice'
import { refreshFeedersRequest } from '../assets/assetSlice'
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
  electricalChunksAbsorb,
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
  requestElectricalChunks,
  resetDiagnosticHistory,
  sendCommandFailure,
  sendCommandRequest,
  sendCommandSuccess,
  setCabinetStatusResult,
  setElectricalChunkState,
  setElectricalChunksError,
  setElectricalSeriesBackfilling,
  setElectricalSeriesError,
  setElectricalSeriesLoadError,
  setElectricalSeriesLoading,
  startCabinetStatus,
  startCommandModes,
  startElectricalChunks,
  startElectricalSeries,
  startFeederElectrical,
  stopCabinetStatus,
  stopCommandModes,
  stopElectricalChunks,
  stopElectricalSeries,
  stopFeederElectrical,
  type ElectricalTimeBasis,
  type IotMonitorState,
} from './iotMonitorSlice'
import type {
  IotCommandHistoryItemPagedResult,
  IotCommandStatus,
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
import {
  ELECTRICAL_CHUNK_MS,
  chunkStartsCovering,
  pickPreemptibleChunk,
  planElectricalChunks,
  toElectricalPoint,
  type ElectricalChunkState,
} from '../../utils/iot/electricalSeries'
import {
  currentChoice,
  latestSuccessAutoSchedule,
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
// B2. Tải mẫu điện theo khúc 6 giờ (useElectricalChunks)
// ==========================================
const CHUNK_PAGE_SIZE = 200
const CHUNK_PAGE_CONCURRENCY = 4
const CHUNK_MAX_CONCURRENT = 2
const CHUNK_PREFETCH_DEBOUNCE_MS = 150
/** Thời gian chờ trước khi âm thầm thử tải lại một khúc lỗi khi có request mới (10 giây). */
const CHUNK_ERROR_RETRY_MS = 10_000

type RequestElectricalChunksPayload = ReturnType<typeof requestElectricalChunks>['payload']

function* fetchAndAbsorbChunkPage(
  fetchHistory: typeof iotAPI.getFeederElectricalHistory,
  key: string,
  feederId: string,
  page: number,
  from: string,
  to: string
) {
  const res: IotFeederHistoryResult = yield call(fetchHistory, feederId, {
    page,
    page_size: CHUNK_PAGE_SIZE,
    from,
    to,
  })
  const items = res.items || []
  if (items.length > 0) {
    yield put(electricalChunksAbsorb({ key, samples: items }))
  }
  return res
}

/** Tải trọn vẹn một khúc 6 giờ (trang 1 lấy `total`, các trang sau song song tối đa 4 trang mỗi lượt, không trần trang). */
function* loadSingleElectricalChunk(
  key: string,
  feederId: string,
  timeBasis: ElectricalTimeBasis,
  start: number,
  onFinished: () => void
) {
  const fetchHistory =
    timeBasis === 'received_at'
      ? iotAPI.getFeederElectricalHistoryReceived
      : iotAPI.getFeederElectricalHistory
  const from = new Date(start).toISOString()
  const to = new Date(start + ELECTRICAL_CHUNK_MS).toISOString()

  yield put(setElectricalChunkState({ key, start, state: 'loading' }))
  let completed = false

  try {
    const first: IotFeederHistoryResult = yield call(
      fetchAndAbsorbChunkPage,
      fetchHistory,
      key,
      feederId,
      1,
      from,
      to
    )
    const firstItems = first.items || []

    if (typeof first.total === 'number') {
      const totalPages = Math.ceil(first.total / CHUNK_PAGE_SIZE)
      if (totalPages > 1 && firstItems.length > 0) {
        for (let pageStart = 2; pageStart <= totalPages; pageStart += CHUNK_PAGE_CONCURRENCY) {
          const batchPages: number[] = []
          for (
            let p = pageStart;
            p < pageStart + CHUNK_PAGE_CONCURRENCY && p <= totalPages;
            p++
          ) {
            batchPages.push(p)
          }
          yield all(
            batchPages.map((page) =>
              call(fetchAndAbsorbChunkPage, fetchHistory, key, feederId, page, from, to)
            )
          )
        }
      }
    } else if (firstItems.length >= CHUNK_PAGE_SIZE) {
      // Dự phòng nếu BE không trả `total`: tiếp tục tải tuần tự tới khi hết trang.
      for (let page = 2; ; page++) {
        const res: IotFeederHistoryResult = yield call(
          fetchAndAbsorbChunkPage,
          fetchHistory,
          key,
          feederId,
          page,
          from,
          to
        )
        if ((res.items || []).length < CHUNK_PAGE_SIZE) break
      }
    }

    yield put(setElectricalChunkState({ key, start, state: 'loaded' }))
    completed = true
  } catch (err) {
    yield put(setElectricalChunkState({ key, start, state: 'error' }))
    yield put(
      setElectricalChunksError({
        key,
        error: apiErrorMessage(err, 'Không đọc được lịch sử điện.'),
      })
    )
    completed = true
  } finally {
    const wasCancelled = (yield cancelled()) as boolean
    if (!completed && wasCancelled) {
      // Xóa trạng thái 'loading' khi bị hủy giữa chừng để khúc có thể tải lại sau này.
      yield put(setElectricalChunkState({ key, start, state: null }))
    }
    onFinished()
  }
}

/** Hỏi định kỳ mẫu điện mới nhất (trang 1, 20 mẫu, không from/to) cho phiên đang live. */
function* liveElectricalChunksPoll(
  key: string,
  feederId: string,
  timeBasis: ElectricalTimeBasis
) {
  const fetchHistory =
    timeBasis === 'received_at'
      ? iotAPI.getFeederElectricalHistoryReceived
      : iotAPI.getFeederElectricalHistory

  while (true) {
    yield delay(ELECTRICAL_POLL_MS)
    try {
      const page: IotFeederHistoryResult = yield call(fetchHistory, feederId, {
        page: 1,
        page_size: 20,
      })
      yield put(electricalChunksAbsorb({ key, samples: page.items || [] }))
      yield put(setElectricalChunksError({ key, error: null }))
    } catch (err) {
      yield put(
        setElectricalChunksError({
          key,
          error: apiErrorMessage(err, 'Không lấy được mẫu điện mới.'),
        })
      )
    }
  }
}

function* electricalChunksSession(
  payload: ReturnType<typeof startElectricalChunks>['payload'],
  reqCh: Channel<RequestElectricalChunksPayload>
): Generator<unknown, void, unknown> {
  const { key, feederId, timeBasis, live } = payload
  if (!feederId) return

  const wakeCh = channel<string>()
  const activeTasks = new Map<number, { task: Task; isView: boolean }>()
  /** Ghi nhận mốc thời gian đầu tiên thấy khúc ở trạng thái `'error'` để tự thử lại âm thầm sau 10 giây. */
  const errorSeenAt = new Map<number, number>()
  let immediateQueue: number[] = []
  let deferredQueue: number[] = []
  let debounceTask: Task | null = null
  let requestSeq = 0

  const liveTask: Task | null = live
    ? ((yield fork(liveElectricalChunksPoll, key, feederId, timeBasis)) as Task)
    : null

  function* pumpQueue(): Generator<unknown, void, unknown> {
    // Dọn các task đã xong trước khi cấp slot mới.
    for (const [start, info] of activeTasks.entries()) {
      if (!info.task.isRunning()) {
        activeTasks.delete(start)
      }
    }

    while (activeTasks.size < CHUNK_MAX_CONCURRENT) {
      let nextStart: number | undefined
      let isView = false
      if (immediateQueue.length > 0) {
        nextStart = immediateQueue.shift()
        isView = true
      } else if (deferredQueue.length > 0) {
        nextStart = deferredQueue.shift()
        isView = false
      } else {
        break
      }

      if (nextStart === undefined || activeTasks.has(nextStart)) continue

      const state = (yield select()) as { iotMonitor: IotMonitorState }
      const entry = state.iotMonitor.electricalChunks[key]
      if (!entry) break
      const chunkState = entry.chunks[nextStart]
      if (chunkState === 'loaded' || chunkState === 'loading') continue

      const task = (yield fork(
        loadSingleElectricalChunk,
        key,
        feederId,
        timeBasis,
        nextStart,
        () => {
          activeTasks.delete(nextStart)
          wakeCh.put('slot_free')
        }
      )) as Task
      activeTasks.set(nextStart, { task, isView })
    }
  }

  try {
    while (true) {
      const outcome = (yield race({
        req: take(reqCh),
        wake: take(wakeCh),
      })) as { req?: RequestElectricalChunksPayload; wake?: string }

      if (outcome.req) {
        requestSeq += 1
        const mySeq = requestSeq

        if (debounceTask && debounceTask.isRunning()) {
          yield cancel(debounceTask)
          debounceTask = null
        }

        const state = (yield select()) as { iotMonitor: IotMonitorState }
        const entry = state.iotMonitor.electricalChunks[key]
        if (!entry) continue

        const { view, track, direction, bounds, force } = outcome.req

        // Tự thử lại khúc lỗi âm thầm: lần đầu gặp lỗi ghi nhận mốc; sau quá 10 giây thì coi như chưa tải.
        const now = Date.now()
        const effectiveStates: Record<number, ElectricalChunkState> = { ...entry.chunks }
        for (const start of [...errorSeenAt.keys()]) {
          if (entry.chunks[start] !== 'error') {
            errorSeenAt.delete(start)
          }
        }
        for (const [startKey, chunkState] of Object.entries(entry.chunks)) {
          const start = Number(startKey)
          if (chunkState !== 'error') {
            errorSeenAt.delete(start)
            continue
          }
          const seenAt = errorSeenAt.get(start)
          if (seenAt === undefined) {
            errorSeenAt.set(start, now)
          } else if (now - seenAt >= CHUNK_ERROR_RETRY_MS) {
            errorSeenAt.delete(start)
            delete effectiveStates[start]
          }
        }

        const fullPlan = planElectricalChunks({
          view,
          track,
          direction,
          states: effectiveStates,
          bounds,
          force,
        })
        // Tập toàn bộ khúc thuộc kế hoạch mới (kể cả đang loading) để xác định khúc nào cần hủy.
        const keepSet = new Set(
          planElectricalChunks({
            view,
            track,
            direction,
            states: {},
            bounds,
            force: true,
          })
        )
        const viewSet = new Set(chunkStartsCovering(view.from, view.to))

        // Hủy task của các khúc không còn trong plan mới (trừ khúc đang là nhóm 1).
        for (const [start, info] of activeTasks.entries()) {
          if (viewSet.has(start)) {
            info.isView = true
          }
          if (!info.isView && !keepSet.has(start)) {
            activeTasks.delete(start)
            if (info.task.isRunning()) {
              yield cancel(info.task)
            }
          }
        }

        // Nhóm (1) phủ view: tải ngay; nhóm (2),(3): đợi 150ms nếu chưa có request mới hơn.
        immediateQueue = fullPlan.filter((s) => viewSet.has(s) && !activeTasks.has(s))
        deferredQueue = []
        const pendingDeferred = fullPlan.filter((s) => !viewSet.has(s) && !activeTasks.has(s))

        // Nếu khúc phủ view đang chờ mà slot đã đầy bởi khúc tải trước (isView = false), hủy bớt khúc tải trước xa view nhất.
        if (immediateQueue.length > 0) {
          const toPreempt = pickPreemptibleChunk({
            active: [...activeTasks.entries()].map(([start, info]) => ({
              start,
              isView: info.isView,
            })),
            view,
            needed: immediateQueue.length,
            maxConcurrent: CHUNK_MAX_CONCURRENT,
          })
          for (const start of toPreempt) {
            const info = activeTasks.get(start)
            if (!info) continue
            activeTasks.delete(start)
            if (info.task.isRunning()) {
              yield cancel(info.task)
            }
            // Khúc vừa nhường slot vẫn thuộc kế hoạch mới → đưa lại vào nhóm tải sau để tải tiếp khi trống slot.
            if (keepSet.has(start) && !pendingDeferred.includes(start)) {
              pendingDeferred.push(start)
            }
          }
        }

        yield* pumpQueue()

        if (pendingDeferred.length > 0) {
          debounceTask = (yield fork(function* () {
            yield delay(CHUNK_PREFETCH_DEBOUNCE_MS)
            if (mySeq === requestSeq) {
              deferredQueue = pendingDeferred
              wakeCh.put('debounce_ready')
            }
          })) as Task
        }
      } else if (outcome.wake) {
        yield* pumpQueue()
      }
    }
  } finally {
    if (debounceTask && debounceTask.isRunning()) {
      yield cancel(debounceTask)
    }
    if (liveTask && liveTask.isRunning()) {
      yield cancel(liveTask)
    }
    for (const info of activeTasks.values()) {
      if (info.task.isRunning()) {
        yield cancel(info.task)
      }
    }
    activeTasks.clear()
    errorSeenAt.clear()
    wakeCh.close()
  }
}

function* electricalChunksManager(): Generator<unknown, void, unknown> {
  const sessions = new Map<
    string,
    { task: Task; reqCh: Channel<RequestElectricalChunksPayload> }
  >()

  while (true) {
    const action = (yield take([
      startElectricalChunks.type,
      requestElectricalChunks.type,
      stopElectricalChunks.type,
    ])) as
      | ReturnType<typeof startElectricalChunks>
      | ReturnType<typeof requestElectricalChunks>
      | ReturnType<typeof stopElectricalChunks>

    const key = action.payload.key

    if (action.type === requestElectricalChunks.type) {
      const session = sessions.get(key)
      if (session) {
        session.reqCh.put(
          (action as ReturnType<typeof requestElectricalChunks>).payload
        )
      }
      continue
    }

    const existing = sessions.get(key)
    if (existing) {
      sessions.delete(key)
      existing.reqCh.close()
      if (existing.task.isRunning()) {
        yield cancel(existing.task)
      }
    }

    if (action.type === startElectricalChunks.type) {
      const startAction = action as ReturnType<typeof startElectricalChunks>
      const reqCh = channel<RequestElectricalChunksPayload>()
      const task = (yield fork(
        electricalChunksSession,
        startAction.payload,
        reqCh
      )) as Task
      sessions.set(key, { task, reqCh })
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
          const status: IotCommandStatus = yield call(
            iotAPI.getCommand,
            id
          )
          return [id, currentChoice(status)] as const
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
/** Node xác nhận rơ-le chậm vài giây: làm mới power_state của mạch (màu đường + chấm cột trên GIS) ở các mốc này. */
export const COMMAND_REFRESH_DELAYS_MS = [3000, 8000]

export function* refreshAfterCommand() {
  for (const ms of COMMAND_REFRESH_DELAYS_MS) {
    yield delay(ms)
    yield put(refreshFeedersRequest())
    yield put(fetchMapLayersRequest())
  }
}

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
    yield fork(refreshAfterCommand)
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
    fork(electricalChunksManager),
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
