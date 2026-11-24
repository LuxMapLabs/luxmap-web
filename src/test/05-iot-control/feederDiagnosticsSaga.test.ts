import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runSaga } from 'redux-saga'
import type { Action } from '@reduxjs/toolkit'

vi.mock('../../feature/iot/iotAPI', () => ({
  default: { getDiagnosticsSummary: vi.fn() },
}))

import iotAPI from '../../feature/iot/iotAPI'
import { handleRefreshFeederDiagnostics } from '../../feature/map/mapSaga'
import mapReducer, { refreshFeederDiagnosticsSuccess } from '../../feature/map/mapSlice'

const rows = (n: number, from = 0) =>
  Array.from({ length: n }, (_, i) => ({ node_id: `N${from + i}`, feeder_id: `F${from + i}` }))

const run = async () => {
  const dispatched: Action[] = []
  await runSaga({ dispatch: (a: Action) => dispatched.push(a) }, handleRefreshFeederDiagnostics).toPromise()
  return dispatched
}

beforeEach(() => {
  vi.mocked(iotAPI.getDiagnosticsSummary).mockReset()
})

describe('Làm mới chẩn đoán IoT theo mạch', () => {
  it('một trang: gọi 1 lần và lưu toàn bộ', async () => {
    vi.mocked(iotAPI.getDiagnosticsSummary).mockResolvedValue({ total: 3, items: rows(3) } as never)
    const d = await run()
    expect(iotAPI.getDiagnosticsSummary).toHaveBeenCalledTimes(1)
    expect((d[0] as ReturnType<typeof refreshFeederDiagnosticsSuccess>).payload).toHaveLength(3)
  })

  it('nhiều trang: duyệt hết rồi mới lưu', async () => {
    vi.mocked(iotAPI.getDiagnosticsSummary)
      .mockResolvedValueOnce({ total: 250, items: rows(200) } as never)
      .mockResolvedValueOnce({ total: 250, items: rows(50, 200) } as never)
    const d = await run()
    expect(iotAPI.getDiagnosticsSummary).toHaveBeenCalledTimes(2)
    expect(vi.mocked(iotAPI.getDiagnosticsSummary).mock.calls[1][0]).toMatchObject({ page: 2 })
    expect(d).toHaveLength(1)
    expect((d[0] as ReturnType<typeof refreshFeederDiagnosticsSuccess>).payload).toHaveLength(250)
  })

  it('lỗi mạng: im lặng, không dispatch (giữ dữ liệu cũ)', async () => {
    vi.mocked(iotAPI.getDiagnosticsSummary).mockRejectedValue(new Error('network'))
    expect(await run()).toHaveLength(0)
  })

  it('reducer: lưu danh sách, không bật loading', () => {
    const state = mapReducer(undefined, refreshFeederDiagnosticsSuccess([{ feeder_id: 'F1' }]))
    expect(state.feederDiagnostics).toHaveLength(1)
    expect(state.isLoadingMap).toBe(false)
  })
})
