import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import iotMonitorReducer, {
  DIAGNOSTIC_HISTORY_PAGE_SIZE,
  clearDiagnosticHistory,
  fetchDiagnosticHistoryRequest,
  fetchDiagnosticHistorySuccess,
  resetDiagnosticHistory,
  selectDiagnosticHistory,
  type IotMonitorState,
} from '../../feature/iot/iotMonitorSlice'
import iotMonitorSaga from '../../feature/iot/iotMonitorSaga'
import iotAPI from '../../feature/iot/iotAPI'
import { makeSagaStore } from '../utils/sagaStore'
import type { IotDiagnosticHistoryItem } from '../../types/iot/feeders'

vi.mock('../../feature/iot/iotAPI', () => ({
  default: {
    getFeederDiagnosticHistory: vi.fn(),
  },
}))

const api = vi.mocked(iotAPI)

const sampleItems: IotDiagnosticHistoryItem[] = [
  {
    history_id: 101,
    feeder_id: 'FDR-001',
    node_id: 'NODE-001',
    code: 'current_drop',
    status: 'active',
    started_at: '2026-11-18T12:00:00Z',
    ended_at: null,
  },
  {
    history_id: 100,
    feeder_id: 'FDR-001',
    node_id: 'NODE-001',
    code: 'voltage_loss',
    status: 'resolved',
    started_at: '2026-11-17T20:00:00Z',
    ended_at: '2026-11-17T21:30:00Z',
  },
]

const createStore = () =>
  makeSagaStore({
    reducers: { iotMonitor: iotMonitorReducer },
    sagas: [iotMonitorSaga],
  })

const getEntry = (store: ReturnType<typeof createStore>, key: string) =>
  selectDiagnosticHistory(store.getState() as unknown as { iotMonitor: IotMonitorState }, key)

describe('iotMonitor diagnosticHistory (saga + reducer)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches diagnostic history successfully and omits from/to when null', async () => {
    api.getFeederDiagnosticHistory.mockResolvedValue({
      page: 1,
      page_size: DIAGNOSTIC_HISTORY_PAGE_SIZE,
      total: 2,
      items: sampleItems,
    })

    const store = createStore()
    store.dispatch(resetDiagnosticHistory({ key: 'modal-1', feederId: 'FDR-001' }))
    store.dispatch(
      fetchDiagnosticHistoryRequest({
        key: 'modal-1',
        feederId: 'FDR-001',
        page: 1,
        from: null,
        to: null,
      })
    )

    await waitFor(() => {
      const entry = getEntry(store, 'modal-1')
      expect(entry?.loading).toBe(false)
      expect(entry?.items).toEqual(sampleItems)
      expect(entry?.total).toBe(2)
      expect(entry?.page).toBe(1)
      expect(entry?.error).toBeNull()
    })

    expect(api.getFeederDiagnosticHistory).toHaveBeenCalledWith('FDR-001', {
      page: 1,
      page_size: 20,
      from: undefined,
      to: undefined,
    })
  })

  it('passes from and to UTC filters to API and stores them in entry', async () => {
    api.getFeederDiagnosticHistory.mockResolvedValue({
      page: 2,
      page_size: 20,
      total: 25,
      items: [sampleItems[1]],
    })

    const from = '2026-11-01T00:00:00Z'
    const to = '2026-11-19T00:00:00Z'
    const store = createStore()
    store.dispatch(resetDiagnosticHistory({ key: 'modal-1', feederId: 'FDR-001' }))
    store.dispatch(
      fetchDiagnosticHistoryRequest({
        key: 'modal-1',
        feederId: 'FDR-001',
        page: 2,
        from,
        to,
      })
    )

    await waitFor(() => {
      const entry = getEntry(store, 'modal-1')
      expect(entry?.loading).toBe(false)
      expect(entry?.page).toBe(2)
      expect(entry?.total).toBe(25)
      expect(entry?.from).toBe(from)
      expect(entry?.to).toBe(to)
    })

    expect(api.getFeederDiagnosticHistory).toHaveBeenCalledWith('FDR-001', {
      page: 2,
      page_size: 20,
      from,
      to,
    })
  })

  it('records error message and clears loading when API fails', async () => {
    api.getFeederDiagnosticHistory.mockRejectedValue({
      response: { data: { error: { message: 'Khoảng thời gian không hợp lệ.' } } },
    })

    const store = createStore()
    store.dispatch(resetDiagnosticHistory({ key: 'modal-1', feederId: 'FDR-001' }))
    store.dispatch(
      fetchDiagnosticHistoryRequest({
        key: 'modal-1',
        feederId: 'FDR-001',
        page: 1,
      })
    )

    await waitFor(() => {
      const entry = getEntry(store, 'modal-1')
      expect(entry?.loading).toBe(false)
      expect(entry?.error).toBe('Khoảng thời gian không hợp lệ.')
    })
  })

  it('ignores success action for a stale feederId after reset to another feeder', () => {
    const store = createStore()
    store.dispatch(resetDiagnosticHistory({ key: 'modal-1', feederId: 'FDR-001' }))
    store.dispatch(resetDiagnosticHistory({ key: 'modal-1', feederId: 'FDR-002' }))

    store.dispatch(
      fetchDiagnosticHistorySuccess({
        key: 'modal-1',
        feederId: 'FDR-001',
        items: sampleItems,
        total: 2,
        page: 1,
      })
    )

    const entry = getEntry(store, 'modal-1')
    expect(entry?.feederId).toBe('FDR-002')
    expect(entry?.items).toEqual([])
    expect(entry?.total).toBe(0)

    store.dispatch(clearDiagnosticHistory({ key: 'modal-1' }))
    expect(getEntry(store, 'modal-1')).toBeUndefined()
  })
})
