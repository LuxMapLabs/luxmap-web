import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeSagaStore, type SagaStore } from '../utils/sagaStore'
import iotMonitorReducer from '../../feature/iot/iotMonitorSlice'
import iotMonitorSaga from '../../feature/iot/iotMonitorSaga'
import { useCabinetIotStatus, CABINET_IOT_REFRESH_MS } from '../../hooks/iot/useCabinetIotStatus'
import iotAPI from '../../feature/iot/iotAPI'

vi.mock('../../feature/iot/iotAPI', () => ({
  default: {
    getNodes: vi.fn(),
    getServers: vi.fn(),
  },
}))

describe('useCabinetIotStatus', () => {
  let store: SagaStore

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    store = makeSagaStore({
      reducers: { iotMonitor: iotMonitorReducer },
      sagas: [iotMonitorSaga],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store, children })

  it('null không gọi API', async () => {
    const { result } = renderHook(() => useCabinetIotStatus(null), { wrapper })
    expect(result.current.loading).toBe(false)
    expect(result.current.nodes).toEqual([])
    expect(result.current.servers).toEqual([])
    expect(result.current.error).toBeNull()
    expect(iotAPI.getNodes).not.toHaveBeenCalled()
    expect(iotAPI.getServers).not.toHaveBeenCalled()
  })

  it('lọc theo cabinet', async () => {
    vi.mocked(iotAPI.getNodes).mockResolvedValueOnce({
      total: 3,
      items: [
        { node_id: 'N-1', cabinet_id: 'CAB-1', server_id: 'SRV-1', status: 'online' },
        { node_id: 'N-2', cabinet_id: 'CAB-2', server_id: 'SRV-1', status: 'online' },
        { node_id: 'N-3', cabinet_id: 'CAB-1', server_id: 'SRV-2', status: 'offline' },
      ],
    })
    vi.mocked(iotAPI.getServers).mockResolvedValueOnce([
      { server_id: 'SRV-1', status: 'online' },
      { server_id: 'SRV-2', status: 'offline' },
    ])

    const { result } = renderHook(() => useCabinetIotStatus('CAB-1'), { wrapper })

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.nodes).toHaveLength(2)
    expect(result.current.nodes.map((n) => n.node_id)).toEqual(['N-1', 'N-3'])
  })

  it('lặp đủ trang', async () => {
    vi.mocked(iotAPI.getNodes)
      .mockResolvedValueOnce({
        total: 3,
        items: [
          { node_id: 'N-1', cabinet_id: 'CAB-1', server_id: 'SRV-1', status: 'online' },
          { node_id: 'N-2', cabinet_id: 'CAB-1', server_id: 'SRV-1', status: 'online' },
        ],
      })
      .mockResolvedValueOnce({
        total: 3,
        items: [
          { node_id: 'N-3', cabinet_id: 'CAB-1', server_id: 'SRV-1', status: 'offline' },
        ],
      })
    vi.mocked(iotAPI.getServers).mockResolvedValueOnce([
      { server_id: 'SRV-1', status: 'online' },
    ])

    const { result } = renderHook(() => useCabinetIotStatus('CAB-1'), { wrapper })

    await act(async () => {
      await Promise.resolve()
    })

    expect(iotAPI.getNodes).toHaveBeenCalledTimes(2)
    expect(iotAPI.getNodes).toHaveBeenNthCalledWith(1, { page: 1, page_size: 200 })
    expect(iotAPI.getNodes).toHaveBeenNthCalledWith(2, { page: 2, page_size: 200 })
    expect(result.current.nodes).toHaveLength(3)
  })

  it('gateway chỉ gồm server của node trong tủ', async () => {
    vi.mocked(iotAPI.getNodes).mockResolvedValueOnce({
      total: 2,
      items: [
        { node_id: 'N-1', cabinet_id: 'CAB-1', server_id: 'SRV-1', status: 'online' },
        { node_id: 'N-2', cabinet_id: 'CAB-2', server_id: 'SRV-2', status: 'online' },
      ],
    })
    vi.mocked(iotAPI.getServers).mockResolvedValueOnce([
      { server_id: 'SRV-1', status: 'online' },
      { server_id: 'SRV-2', status: 'online' },
      { server_id: 'SRV-3', status: 'offline' },
    ])

    const { result } = renderHook(() => useCabinetIotStatus('CAB-1'), { wrapper })

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.servers).toHaveLength(1)
    expect(result.current.servers[0].server_id).toBe('SRV-1')
  })

  it('30s gọi lại', async () => {
    vi.mocked(iotAPI.getNodes).mockResolvedValue({
      total: 1,
      items: [{ node_id: 'N-1', cabinet_id: 'CAB-1', server_id: 'SRV-1', status: 'online' }],
    })
    vi.mocked(iotAPI.getServers).mockResolvedValue([
      { server_id: 'SRV-1', status: 'online' },
    ])

    renderHook(() => useCabinetIotStatus('CAB-1'), { wrapper })

    await act(async () => {
      await Promise.resolve()
    })
    expect(iotAPI.getNodes).toHaveBeenCalledTimes(1)
    expect(iotAPI.getServers).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(CABINET_IOT_REFRESH_MS)
    })

    expect(iotAPI.getNodes).toHaveBeenCalledTimes(2)
    expect(iotAPI.getServers).toHaveBeenCalledTimes(2)
  })

  it('getNodes lỗi sau khi đã có dữ liệu thì giữ dữ liệu cũ', async () => {
    vi.mocked(iotAPI.getNodes).mockResolvedValueOnce({
      total: 1,
      items: [{ node_id: 'N-1', cabinet_id: 'CAB-1', server_id: 'SRV-1', status: 'online' }],
    })
    vi.mocked(iotAPI.getServers).mockResolvedValueOnce([
      { server_id: 'SRV-1', status: 'online' },
    ])

    const { result } = renderHook(() => useCabinetIotStatus('CAB-1'), { wrapper })

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.nodes).toHaveLength(1)
    expect(result.current.nodes[0].node_id).toBe('N-1')
    expect(result.current.error).toBeNull()

    // 30s sau: getNodes bị lỗi
    vi.mocked(iotAPI.getNodes).mockRejectedValueOnce(new Error('Network error'))
    vi.mocked(iotAPI.getServers).mockResolvedValueOnce([
      { server_id: 'SRV-1', status: 'online' },
    ])

    await act(async () => {
      await vi.advanceTimersByTimeAsync(CABINET_IOT_REFRESH_MS)
    })

    expect(result.current.nodes).toHaveLength(1)
    expect(result.current.nodes[0].node_id).toBe('N-1')
    expect(result.current.error).toBeNull()
  })

  it('getNodes lỗi khi chưa có dữ liệu thì trả về error', async () => {
    vi.mocked(iotAPI.getNodes).mockRejectedValueOnce(new Error('API failure'))
    vi.mocked(iotAPI.getServers).mockResolvedValueOnce([])

    const { result } = renderHook(() => useCabinetIotStatus('CAB-1'), { wrapper })

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.nodes).toEqual([])
    expect(result.current.error).toBe('Không thể tải trạng thái IoT của tủ.')
  })

  it('unmount thì không gọi nữa', async () => {
    vi.mocked(iotAPI.getNodes).mockResolvedValue({
      total: 1,
      items: [{ node_id: 'N-1', cabinet_id: 'CAB-1', server_id: 'SRV-1', status: 'online' }],
    })
    vi.mocked(iotAPI.getServers).mockResolvedValue([
      { server_id: 'SRV-1', status: 'online' },
    ])

    const { unmount } = renderHook(() => useCabinetIotStatus('CAB-1'), { wrapper })

    await act(async () => {
      await Promise.resolve()
    })
    expect(iotAPI.getNodes).toHaveBeenCalledTimes(1)

    unmount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(CABINET_IOT_REFRESH_MS * 2)
    })

    expect(iotAPI.getNodes).toHaveBeenCalledTimes(1)
    expect(iotAPI.getServers).toHaveBeenCalledTimes(1)
  })
})
