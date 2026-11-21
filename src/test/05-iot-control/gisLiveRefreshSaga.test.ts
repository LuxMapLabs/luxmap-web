import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runSaga } from 'redux-saga'
import type { Action } from '@reduxjs/toolkit'

vi.mock('sonner', () => ({
  toast: { loading: vi.fn(() => 'id'), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

vi.mock('../../feature/assets/assetAPI', () => ({
  default: { getFeeders: vi.fn() },
}))

import assetAPI from '../../feature/assets/assetAPI'
import { handleRefreshFeeders } from '../../feature/assets/assetSaga'
import assetReducer, { refreshFeedersSuccess, fetchAssetsRequest } from '../../feature/assets/assetSlice'
import { fetchMapLayersRequest } from '../../feature/map/mapSlice'
import { refreshAfterCommand, COMMAND_REFRESH_DELAYS_MS } from '../../feature/iot/iotMonitorSaga'

const feeder = (id: string, power_state: string) => ({ feeder_id: id, power_state }) as never

beforeEach(() => {
  vi.mocked(assetAPI.getFeeders).mockReset()
})

describe('Làm mới riêng danh sách mạch (power_state)', () => {
  it('thành công: nạp lại feeders mới', async () => {
    vi.mocked(assetAPI.getFeeders).mockResolvedValue({
      items: [feeder('FDR-1', 'off'), feeder('FDR-2', 'on')],
    } as never)
    const dispatched: Action[] = []
    await runSaga({ dispatch: (a: Action) => dispatched.push(a) }, handleRefreshFeeders).toPromise()
    expect(dispatched).toHaveLength(1)
    expect(dispatched[0].type).toBe(refreshFeedersSuccess.type)
    expect((dispatched[0] as ReturnType<typeof refreshFeedersSuccess>).payload).toHaveLength(2)
  })

  it('lỗi mạng: im lặng, không dispatch lỗi (giữ dữ liệu cũ)', async () => {
    vi.mocked(assetAPI.getFeeders).mockRejectedValue(new Error('network'))
    const dispatched: Action[] = []
    await runSaga({ dispatch: (a: Action) => dispatched.push(a) }, handleRefreshFeeders).toPromise()
    expect(dispatched).toHaveLength(0)
  })

  it('reducer: cập nhật feeders mà không bật cờ loading', () => {
    const state = assetReducer(undefined, { type: '@@init' })
    const next = assetReducer(state, refreshFeedersSuccess([feeder('FDR-1', 'off')]))
    expect(next.feeders).toHaveLength(1)
    expect(next.isLoadingAssets).toBe(false)
    // so sánh: tải toàn bộ thì có bật loading
    expect(assetReducer(state, fetchAssetsRequest()).isLoadingAssets).toBe(true)
  })
})

describe('Sau khi gửi lệnh Bật/Tắt/AUTO', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('làm mới feeder + lớp bản đồ theo từng mốc chờ node xác nhận', async () => {
    const dispatched: Action[] = []
    const done = runSaga({ dispatch: (a: Action) => dispatched.push(a) }, refreshAfterCommand).toPromise()

    expect(dispatched).toHaveLength(0) // chưa tới mốc đầu thì chưa làm mới
    await vi.advanceTimersByTimeAsync(COMMAND_REFRESH_DELAYS_MS[0])
    expect(dispatched.map((a) => a.type)).toEqual(['assets/refreshFeedersRequest', fetchMapLayersRequest.type])

    await vi.advanceTimersByTimeAsync(COMMAND_REFRESH_DELAYS_MS[1])
    await done
    expect(dispatched).toHaveLength(COMMAND_REFRESH_DELAYS_MS.length * 2)
  })
})
