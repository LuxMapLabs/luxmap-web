import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import {
  ELECTRICAL_CHUNK_MS,
  ELECTRICAL_PREFETCH_FULL_TRACK_MAX_MS,
  chunkStartOf,
  chunkStartsCovering,
  clampTrackStart,
  localDayStarts,
  pickPreemptibleChunk,
  planElectricalChunks,
  startOfLocalDay,
  type ElectricalChunkState,
} from '../../utils/iot/electricalSeries'
import iotMonitorReducer, {
  ELECTRICAL_POLL_MS,
  electricalChunksAbsorb,
  requestElectricalChunks,
  selectElectricalChunks,
  setElectricalChunkState,
  setElectricalChunksError,
  startElectricalChunks,
  stopElectricalChunks,
} from '../../feature/iot/iotMonitorSlice'
import iotMonitorSaga from '../../feature/iot/iotMonitorSaga'
import iotAPI from '../../feature/iot/iotAPI'
import type { IotFeederHistorySample } from '../../types/iot/feeders'

vi.mock('../../feature/iot/iotAPI', () => ({
  default: {
    getFeederElectricalHistory: vi.fn(),
  },
}))

const api = vi.mocked(iotAPI)

const createMonitorStore = () => {
  const sagaMiddleware = createSagaMiddleware()
  const store = configureStore({
    reducer: { iotMonitor: iotMonitorReducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: false,
        serializableCheck: false,
        immutableCheck: false,
      }).concat(sagaMiddleware),
  })
  sagaMiddleware.run(iotMonitorSaga)
  return store
}

const H = 3_600_000
const C = ELECTRICAL_CHUNK_MS // 6 giờ
const BASE = Date.UTC(2026, 10, 20, 0, 0, 0) // Đúng bội số 6 giờ (00:00Z)

const makeSample = (timeMs: number, power = 500): IotFeederHistorySample => ({
  node_id: 'NODE-001',
  measured_at: new Date(timeMs).toISOString(),
  received_at: new Date(timeMs + 1_000).toISOString(),
  reception_type: 'live',
  voltage: 5,
  current_ma: power / 5,
  power_mw: power,
  lamp_command: 'ON',
})

describe('electricalChunks — hàm thuần (electricalSeries)', () => {
  describe('chunkStartOf', () => {
    it('căn mốc thời gian về đầu khúc 6 giờ theo epoch ms', () => {
      expect(ELECTRICAL_CHUNK_MS).toBe(6 * H)
      expect(chunkStartOf(BASE)).toBe(BASE)
      expect(chunkStartOf(BASE + 1)).toBe(BASE)
      expect(chunkStartOf(BASE + C - 1)).toBe(BASE)
      expect(chunkStartOf(BASE + C)).toBe(BASE + C)
      expect(chunkStartOf(BASE + C + 2 * H)).toBe(BASE + C)
    })
  })

  describe('chunkStartsCovering', () => {
    it('trả mảng tăng dần các mốc đầu khúc phủ [from, to], không kéo dư khi to đúng biên khúc', () => {
      expect(chunkStartsCovering(BASE, BASE + C)).toEqual([BASE])
      expect(chunkStartsCovering(BASE, BASE + C + 1)).toEqual([BASE, BASE + C])
      expect(chunkStartsCovering(BASE + 2 * H, BASE + 10 * H)).toEqual([BASE, BASE + C])
      expect(chunkStartsCovering(BASE, BASE + 4 * C)).toEqual([
        BASE,
        BASE + C,
        BASE + 2 * C,
        BASE + 3 * C,
      ])
    })

    it('xử lý trường hợp biên: from === to trả 1 khúc, to < from trả rỗng', () => {
      expect(chunkStartsCovering(BASE + H, BASE + H)).toEqual([BASE])
      expect(chunkStartsCovering(BASE + 2 * H, BASE + H)).toEqual([])
    })
  })

  describe('planElectricalChunks', () => {
    it('ưu tiên: (1) view -> (2) hướng kéo -1 (2 khúc) -> (3) phần còn lại của track gần view trước', () => {
      // Dải 30h (5 khúc: 0, 1C, 2C, 3C, 4C), view ở khúc 3C, kéo sang trái (-1)
      const track = { from: BASE, to: BASE + 5 * C }
      const view = { from: BASE + 3 * C, to: BASE + 4 * C }
      const plan = planElectricalChunks({ view, track, direction: -1, states: {} })
      expect(plan).toEqual([
        BASE + 3 * C, // nhóm 1: view
        BASE + 2 * C, // nhóm 2: kế bên trái 1
        BASE + 1 * C, // nhóm 2: thêm 1 khúc cùng hướng trái
        BASE + 4 * C, // nhóm 3: còn lại của track, 4C gần 3C hơn 0
        BASE,         // nhóm 3: xa nhất
      ])
    })

    it('hướng kéo +1 ưu tiên 2 khúc tương lai trước phần quá khứ', () => {
      const track = { from: BASE, to: BASE + 5 * C }
      const view = { from: BASE + 1 * C, to: BASE + 2 * C }
      const plan = planElectricalChunks({ view, track, direction: 1, states: {} })
      expect(plan).toEqual([
        BASE + 1 * C, // view
        BASE + 2 * C, // kế bên phải 1
        BASE + 3 * C, // thêm 1 khúc cùng hướng phải
        BASE,         // còn lại của track: 0 gần 1C hơn 4C
        BASE + 4 * C, // xa nhất
      ])
    })

    it('direction = 0 ưu tiên mỗi bên 1 khúc trước rồi thêm 1 khúc mỗi bên', () => {
      const track = { from: BASE, to: BASE + 6 * C }
      const view = { from: BASE + 2 * C, to: BASE + 3 * C }
      const plan = planElectricalChunks({ view, track, direction: 0, states: {} })
      expect(plan).toEqual([
        BASE + 2 * C, // view
        BASE + 1 * C, // trái 1
        BASE + 3 * C, // phải 1
        BASE,         // trái 2
        BASE + 4 * C, // phải 2
        BASE + 5 * C, // phần còn lại của track
      ])
    })

    it('bỏ qua khúc loaded và loading; khúc error chỉ đưa vào khi force = true', () => {
      const track = { from: BASE, to: BASE + 4 * C }
      const view = { from: BASE + 2 * C, to: BASE + 3 * C }
      const states: Record<number, ElectricalChunkState> = {
        [BASE + 2 * C]: 'loaded',
        [BASE + 1 * C]: 'loading',
        [BASE + 3 * C]: 'error',
      }

      expect(planElectricalChunks({ view, track, direction: 0, states })).toEqual([BASE])
      expect(planElectricalChunks({ view, track, direction: 0, states, force: true })).toEqual([
        BASE + 3 * C,
        BASE,
      ])
    })

    it('kẹp mọi khúc theo bounds (chế độ Theo ngày), không lập khúc nằm hoàn toàn ngoài bounds', () => {
      // bounds chỉ từ 1C đến 3C (2 khúc: 1C và 2C), dù track rộng hơn (0..4C)
      const track = { from: BASE, to: BASE + 4 * C }
      const view = { from: BASE + 1 * C, to: BASE + 2 * C }
      const bounds = { from: BASE + 1 * C, to: BASE + 3 * C }

      const plan = planElectricalChunks({ view, track, direction: 0, states: {}, bounds })
      expect(plan).toEqual([BASE + 1 * C, BASE + 2 * C])
    })

    it('không lập khúc ngoài track khi không truyền bounds', () => {
      const track = { from: BASE + C, to: BASE + 3 * C }
      const view = { from: BASE + 2 * C, to: BASE + 3 * C }
      const plan = planElectricalChunks({ view, track, direction: 1, states: {} })
      expect(plan).toEqual([BASE + 2 * C, BASE + C])
    })

    it('track dài 30 ngày (> 48 giờ): nhóm (3) chỉ tải quanh khung đang xem ±12 giờ, không tải cả 30 ngày', () => {
      expect(ELECTRICAL_PREFETCH_FULL_TRACK_MAX_MS).toBe(48 * H)
      const track = { from: BASE, to: BASE + 30 * 24 * H } // 30 ngày = 120 khúc
      const viewStart = BASE + 15 * 24 * H // Giữa tháng (khúc 60)
      const view = { from: viewStart, to: viewStart + C }

      const plan = planElectricalChunks({ view, track, direction: 0, states: {} })
      // Chỉ phủ view (1 khúc) + ±12h mỗi bên (4 khúc) = 5 khúc, tuyệt đối không có khúc ở đầu/cuối 30 ngày
      expect(plan).toEqual([
        viewStart,
        viewStart - C,
        viewStart + C,
        viewStart - 2 * C,
        viewStart + 2 * C,
      ])
      expect(plan).not.toContain(BASE)
      expect(plan).not.toContain(BASE + 29 * 24 * H)
    })

    it('track 24 giờ (<= 48 giờ): vẫn tải hết cả 4 khúc của track', () => {
      const track = { from: BASE, to: BASE + 24 * H }
      const view = { from: BASE + 3 * C, to: BASE + 4 * C }

      const plan = planElectricalChunks({ view, track, direction: 1, states: {} })
      expect(plan).toHaveLength(4)
      expect(new Set(plan)).toEqual(new Set([BASE, BASE + C, BASE + 2 * C, BASE + 3 * C]))
    })
  })

  describe('pickPreemptibleChunk', () => {
    it('không hủy khi còn đủ slot trống hoặc needed = 0', () => {
      const view = { from: BASE, to: BASE + C }
      expect(
        pickPreemptibleChunk({
          active: [{ start: BASE + 2 * C, isView: false }],
          view,
          needed: 1,
          maxConcurrent: 2,
        })
      ).toEqual([])
      expect(
        pickPreemptibleChunk({
          active: [
            { start: BASE + C, isView: false },
            { start: BASE + 2 * C, isView: false },
          ],
          view,
          needed: 0,
          maxConcurrent: 2,
        })
      ).toEqual([])
    })

    it('không bao giờ hủy khúc đang là isView = true', () => {
      const view = { from: BASE, to: BASE + C }
      expect(
        pickPreemptibleChunk({
          active: [
            { start: BASE + 3 * C, isView: true },
            { start: BASE + 2 * C, isView: true },
          ],
          view,
          needed: 2,
          maxConcurrent: 2,
        })
      ).toEqual([])

      // Chỉ hủy khúc isView = false duy nhất, giữ nguyên khúc isView = true dù xa hơn
      expect(
        pickPreemptibleChunk({
          active: [
            { start: BASE + 4 * C, isView: true },
            { start: BASE + 1 * C, isView: false },
          ],
          view,
          needed: 2,
          maxConcurrent: 2,
        })
      ).toEqual([BASE + 1 * C])
    })

    it('chọn khúc tải trước xa view nhất và hủy đúng đủ số slot cần', () => {
      const view = { from: BASE, to: BASE + C }
      // 2 khúc tải trước đang chiếm đủ 2 slot, cần 1 slot -> hủy khúc xa nhất (BASE + 3C)
      expect(
        pickPreemptibleChunk({
          active: [
            { start: BASE + 1 * C, isView: false },
            { start: BASE + 3 * C, isView: false },
          ],
          view,
          needed: 1,
          maxConcurrent: 2,
        })
      ).toEqual([BASE + 3 * C])

      // Cần 2 slot -> hủy cả 2, thứ tự xa view nhất trước
      expect(
        pickPreemptibleChunk({
          active: [
            { start: BASE + 1 * C, isView: false },
            { start: BASE + 3 * C, isView: false },
          ],
          view,
          needed: 2,
          maxConcurrent: 2,
        })
      ).toEqual([BASE + 3 * C, BASE + 1 * C])
    })

    it('hòa khoảng cách thì ưu tiên hủy khúc bắt đầu sớm nhất (đứng trước trong active)', () => {
      const view = { from: BASE + 2 * C, to: BASE + 3 * C }
      // BASE + 1C và BASE + 3C cách đều view; BASE + 3C bắt đầu trước -> hủy BASE + 3C
      expect(
        pickPreemptibleChunk({
          active: [
            { start: BASE + 3 * C, isView: false },
            { start: BASE + 1 * C, isView: false },
          ],
          view,
          needed: 1,
          maxConcurrent: 2,
        })
      ).toEqual([BASE + 3 * C])
    })
  })

  describe('startOfLocalDay, localDayStarts, clampTrackStart', () => {
    it('startOfLocalDay đưa mọi thời điểm trong ngày về đúng 00:00:00.000 giờ địa phương', () => {
      const noon = new Date(2026, 10, 24, 12, 34, 56, 789).getTime()
      const midnight = new Date(2026, 10, 24, 0, 0, 0, 0).getTime()
      const endOfDay = new Date(2026, 10, 24, 23, 59, 59, 999).getTime()

      expect(startOfLocalDay(noon)).toBe(midnight)
      expect(startOfLocalDay(midnight)).toBe(midnight)
      expect(startOfLocalDay(endOfDay)).toBe(midnight)
    })

    it('localDayStarts trả đúng các ngày giao [from, to) qua cuối tháng, năm nhuận và cuối năm; khoảng rỗng trả []', () => {
      const d = (y: number, m: number, dayNum: number, h = 0) => new Date(y, m, dayNum, h, 0, 0, 0).getTime()

      // Khoảng rỗng / ngược
      expect(localDayStarts(d(2026, 10, 24), d(2026, 10, 24))).toEqual([])
      expect(localDayStarts(d(2026, 10, 25), d(2026, 10, 24))).toEqual([])

      // Đúng 1 ngày [24/11 00:00, 25/11 00:00) không kéo thêm ngày 25
      expect(localDayStarts(d(2026, 10, 24, 0), d(2026, 10, 25, 0))).toEqual([d(2026, 10, 24)])

      // Qua cuối tháng 1 -> đầu tháng 2
      expect(localDayStarts(d(2026, 0, 30, 15), d(2026, 1, 2, 1))).toEqual([
        d(2026, 0, 30),
        d(2026, 0, 31),
        d(2026, 1, 1),
        d(2026, 1, 2),
      ])

      // Năm nhuận 2024: có 29/02
      expect(localDayStarts(d(2024, 1, 28, 0), d(2024, 2, 2, 0))).toEqual([
        d(2024, 1, 28),
        d(2024, 1, 29),
        d(2024, 2, 1),
      ])

      // Qua giao thừa 31/12 -> 01/01 năm sau
      expect(localDayStarts(d(2026, 11, 31, 6), d(2027, 0, 2, 0))).toEqual([
        d(2026, 11, 31),
        d(2027, 0, 1),
      ])
    })

    it('clampTrackStart kẹp trong [limitFrom, limitTo - spanMs] và trả limitFrom khi phạm vi hẹp hơn spanMs', () => {
      const span = 24 * H
      const limitFrom = BASE
      const limitTo = BASE + 72 * H // 3 ngày

      // Nằm trong phạm vi -> giữ nguyên
      expect(
        clampTrackStart({ trackStart: BASE + 12 * H, spanMs: span, limitFrom, limitTo })
      ).toBe(BASE + 12 * H)

      // Vượt trái -> kẹp lên limitFrom
      expect(
        clampTrackStart({ trackStart: BASE - 5 * H, spanMs: span, limitFrom, limitTo })
      ).toBe(limitFrom)

      // Vượt phải -> kẹp xuống limitTo - spanMs
      expect(
        clampTrackStart({ trackStart: BASE + 60 * H, spanMs: span, limitFrom, limitTo })
      ).toBe(BASE + 48 * H)

      // Phạm vi hẹp hơn spanMs (chỉ 10 giờ < 24 giờ) -> trả limitFrom
      expect(
        clampTrackStart({
          trackStart: BASE + 5 * H,
          spanMs: span,
          limitFrom: BASE,
          limitTo: BASE + 10 * H,
        })
      ).toBe(BASE)
    })
  })
})

describe('electricalChunks — reducer của iotMonitorSlice', () => {
  it('start/stop khởi tạo và xóa entry, selector trả đúng entry', () => {
    let state = iotMonitorReducer(
      undefined,
      startElectricalChunks({
        key: 'k1',
        feederId: 'FDR-001',
        timeBasis: 'measured_at',
        live: true,
      })
    )
    expect(selectElectricalChunks({ iotMonitor: state }, 'k1')).toEqual({
      feederId: 'FDR-001',
      timeBasis: 'measured_at',
      live: true,
      points: [],
      chunks: {},
      error: null,
    })

    state = iotMonitorReducer(state, stopElectricalChunks({ key: 'k1' }))
    expect(selectElectricalChunks({ iotMonitor: state }, 'k1')).toBeUndefined()
  })

  it('electricalChunksAbsorb gộp trùng key, sắp tăng dần theo thời gian và không cắt số điểm', () => {
    let state = iotMonitorReducer(
      undefined,
      startElectricalChunks({
        key: 'k1',
        feederId: 'FDR-001',
        timeBasis: 'measured_at',
        live: false,
      })
    )

    // Tạo 10.000 mẫu (> trần 9.000 cũ của electricalSeries) ở thứ tự đảo ngược + 1 mẫu trùng
    const batch1: IotFeederHistorySample[] = []
    for (let i = 5000; i >= 1; i--) {
      batch1.push(makeSample(BASE + i * 10_000, i))
    }
    const batch2: IotFeederHistorySample[] = []
    for (let i = 5000; i <= 10_000; i++) {
      batch2.push(makeSample(BASE + i * 10_000, i))
    }

    state = iotMonitorReducer(state, electricalChunksAbsorb({ key: 'k1', samples: batch1 }))
    state = iotMonitorReducer(state, electricalChunksAbsorb({ key: 'k1', samples: batch2 }))

    const entry = selectElectricalChunks({ iotMonitor: state }, 'k1')!
    expect(entry.points).toHaveLength(10_000)
    expect(entry.points[0].time).toBe(BASE + 10_000)
    expect(entry.points[9_999].time).toBe(BASE + 10_000 * 10_000)
  })

  it('setElectricalChunkState đổi trạng thái từng khúc và xóa khi truyền null; force xóa lỗi', () => {
    let state = iotMonitorReducer(
      undefined,
      startElectricalChunks({
        key: 'k1',
        feederId: 'FDR-001',
        timeBasis: 'received_at',
        live: false,
      })
    )
    state = iotMonitorReducer(state, setElectricalChunkState({ key: 'k1', start: BASE, state: 'loading' }))
    expect(state.electricalChunks.k1.chunks[BASE]).toBe('loading')

    state = iotMonitorReducer(state, setElectricalChunkState({ key: 'k1', start: BASE, state: 'error' }))
    state = iotMonitorReducer(state, setElectricalChunksError({ key: 'k1', error: 'Lỗi mạng' }))
    expect(state.electricalChunks.k1.chunks[BASE]).toBe('error')
    expect(state.electricalChunks.k1.error).toBe('Lỗi mạng')

    state = iotMonitorReducer(
      state,
      requestElectricalChunks({
        key: 'k1',
        view: { from: BASE, to: BASE + C },
        track: { from: BASE, to: BASE + 4 * C },
        direction: 0,
        force: true,
      })
    )
    expect(state.electricalChunks.k1.error).toBeNull()

    state = iotMonitorReducer(state, setElectricalChunkState({ key: 'k1', start: BASE, state: null }))
    expect(state.electricalChunks.k1.chunks[BASE]).toBeUndefined()
  })
})

describe('electricalChunks — saga (tải nhiều trang song song, debounce prefetch, live poll)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('tải ngay khúc phủ view nhiều trang (song song tối đa 4 trang), đợi 150ms mới tải khúc kế bên', async () => {
    vi.useFakeTimers()

    const pageItems = (chunkStart: number, page: number, count: number) =>
      Array.from({ length: count }, (_, idx) =>
        makeSample(chunkStart + ((page - 1) * 200 + idx) * 10_000, 100 + page)
      )

    api.getFeederElectricalHistory.mockImplementation(async (_feederId, params) => {
      const fromMs = params?.from ? Date.parse(params.from) : BASE
      const page = params?.page ?? 1
      if (fromMs === BASE + C) {
        // Khúc view có 450 mẫu -> 3 trang (trang 1 lấy total, trang 2 & 3 gọi song song)
        const count = page === 3 ? 50 : 200
        return { page, page_size: 200, total: 450, items: pageItems(fromMs, page, count) }
      }
      // Khúc prefetch chỉ có 2 mẫu
      return { page, page_size: 200, total: 2, items: pageItems(fromMs, page, 2) }
    })

    const store = createMonitorStore()

    store.dispatch(
      startElectricalChunks({
        key: 's1',
        feederId: 'FDR-009',
        timeBasis: 'measured_at',
        live: false,
      })
    )
    store.dispatch(
      requestElectricalChunks({
        key: 's1',
        view: { from: BASE + C, to: BASE + 2 * C },
        track: { from: BASE, to: BASE + 2 * C },
        direction: -1,
      })
    )

    // Trước 150ms: khúc view (BASE + C) đã tải xong cả 3 trang, khúc prefetch (BASE) chưa gọi
    await vi.advanceTimersByTimeAsync(50)
    let entry = selectElectricalChunks(store.getState(), 's1')!
    expect(entry.chunks[BASE + C]).toBe('loaded')
    expect(entry.chunks[BASE]).toBeUndefined()
    expect(entry.points).toHaveLength(450)

    // Sau đủ 150ms: khúc prefetch (BASE) bắt đầu tải và hoàn tất
    await vi.advanceTimersByTimeAsync(150)
    entry = selectElectricalChunks(store.getState(), 's1')!
    expect(entry.chunks[BASE]).toBe('loaded')
    expect(entry.points).toHaveLength(452)

    store.dispatch(stopElectricalChunks({ key: 's1' }))
    expect(selectElectricalChunks(store.getState(), 's1')).toBeUndefined()
  })

  it('chế độ live = true định kỳ gọi trang 1 page_size 20 (không from/to) và dừng khi stop', async () => {
    vi.useFakeTimers()
    api.getFeederElectricalHistory.mockResolvedValue({
      page: 1,
      page_size: 20,
      total: 1,
      items: [makeSample(BASE + 10_000, 321)],
    })

    const store = createMonitorStore()

    store.dispatch(
      startElectricalChunks({
        key: 'live1',
        feederId: 'FDR-009',
        timeBasis: 'measured_at',
        live: true,
      })
    )

    await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS)
    expect(api.getFeederElectricalHistory).toHaveBeenCalledWith('FDR-009', {
      page: 1,
      page_size: 20,
      sort_by: 'measured_at',
    })
    expect(selectElectricalChunks(store.getState(), 'live1')?.points).toHaveLength(1)

    store.dispatch(stopElectricalChunks({ key: 'live1' }))
    const callsAfterStop = api.getFeederElectricalHistory.mock.calls.length
    await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS * 2)
    expect(api.getFeederElectricalHistory).toHaveBeenCalledTimes(callsAfterStop)
  })

  it('khúc phủ view giành slot của khúc tải trước xa nhất khi cả 2 slot đã đầy', async () => {
    vi.useFakeTimers()

    const pending = new Map<
      number,
      Array<(res: { page: number; page_size: number; total: number; items: IotFeederHistorySample[] }) => void>
    >()
    const enqueuePending = (start: number) =>
      new Promise<{ page: number; page_size: number; total: number; items: IotFeederHistorySample[] }>(
        (resolve) => {
          const list = pending.get(start) ?? []
          list.push(resolve)
          pending.set(start, list)
        }
      )
    const resolveChunk = (start: number) => {
      const list = pending.get(start)
      const fn = list?.pop()
      fn?.({ page: 1, page_size: 200, total: 1, items: [makeSample(start + 10_000, 200)] })
    }

    api.getFeederElectricalHistory.mockImplementation((_feederId, params) => {
      const fromMs = params?.from ? Date.parse(params.from) : BASE
      if (fromMs === BASE + 3 * C) {
        return Promise.resolve({
          page: 1,
          page_size: 200,
          total: 1,
          items: [makeSample(fromMs + 10_000, 200)],
        })
      }
      return enqueuePending(fromMs)
    })

    const store = createMonitorStore()
    store.dispatch(
      startElectricalChunks({
        key: 'p1',
        feederId: 'FDR-009',
        timeBasis: 'measured_at',
        live: false,
      })
    )

    // Lượt 1: xem khúc 3C -> tải xong ngay; sau 150ms prefetch chiếm cả 2 slot với 2C và 1C
    store.dispatch(
      requestElectricalChunks({
        key: 'p1',
        view: { from: BASE + 3 * C, to: BASE + 4 * C },
        track: { from: BASE, to: BASE + 4 * C },
        direction: -1,
      })
    )
    await vi.advanceTimersByTimeAsync(200)
    let entry = selectElectricalChunks(store.getState(), 'p1')!
    expect(entry.chunks[BASE + 3 * C]).toBe('loaded')
    expect(entry.chunks[BASE + 2 * C]).toBe('loading')
    expect(entry.chunks[BASE + 1 * C]).toBe('loading')

    // Lượt 2: kéo nhanh sang khúc 0 (cả 1C và 2C vẫn nằm trong track nên thuộc keepSet)
    // Khúc 2C xa view [0, 1C] hơn 1C -> 2C bị hủy (reset trống), khúc 0 được tải ngay!
    store.dispatch(
      requestElectricalChunks({
        key: 'p1',
        view: { from: BASE, to: BASE + C },
        track: { from: BASE, to: BASE + 4 * C },
        direction: -1,
      })
    )
    await vi.advanceTimersByTimeAsync(10)
    entry = selectElectricalChunks(store.getState(), 'p1')!
    expect(entry.chunks).toEqual({
      [BASE + 3 * C]: 'loaded',
      [BASE + 1 * C]: 'loading',
      [BASE]: 'loading',
    })

    // Khúc 0 hoàn tất ngay cả khi khúc 1C vẫn chưa xong
    resolveChunk(BASE)
    await vi.advanceTimersByTimeAsync(10)
    entry = selectElectricalChunks(store.getState(), 'p1')!
    expect(entry.chunks[BASE]).toBe('loaded')
    expect(entry.chunks[BASE + 1 * C]).toBe('loading')

    // Sau khi 150ms debounce trôi qua và có slot trống, 2C tự được tải lại
    await vi.advanceTimersByTimeAsync(150)
    entry = selectElectricalChunks(store.getState(), 'p1')!
    expect(entry.chunks[BASE + 2 * C]).toBe('loading')

    resolveChunk(BASE + 1 * C)
    resolveChunk(BASE + 2 * C)
    await vi.advanceTimersByTimeAsync(10)
    entry = selectElectricalChunks(store.getState(), 'p1')!
    expect(entry.chunks[BASE + 1 * C]).toBe('loaded')
    expect(entry.chunks[BASE + 2 * C]).toBe('loaded')

    store.dispatch(stopElectricalChunks({ key: 'p1' }))
  })
})
