import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runSaga, type Saga } from 'redux-saga'
import type { Action } from '@reduxjs/toolkit'

vi.mock('sonner', () => ({
  toast: { loading: vi.fn(() => 'id'), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

vi.mock('../../feature/assets/assetAPI', () => ({
  default: {
    getPoles: vi.fn(),
    setPoleLocation: vi.fn(),
    retireFixture: vi.fn(),
    createFixture: vi.fn(),
    updateFixture: vi.fn(),
    getSegmentDetail: vi.fn(),
    updateSegment: vi.fn(),
  },
}))

import assetAPI from '../../feature/assets/assetAPI'
import {
  handleRetireFixture,
  handleCreateFixture,
  handleUpdateFixture,
} from '../../feature/assets/assetSaga'
import {
  retireFixtureRequest,
  createFixtureRequest,
  updateFixtureRequest,
  mutationSuccess,
  mutationFailure,
  fetchAssetsRequest,
} from '../../feature/assets/assetSlice'
import { fetchMapLayersRequest, fetchPoleDetailRequest } from '../../feature/map/mapSlice'

const run = async <A extends Action>(saga: Saga<[A]>, action: A) => {
  const dispatched: Action[] = []
  await runSaga({ dispatch: (a: Action) => dispatched.push(a) }, saga, action).toPromise()
  return dispatched
}

const types = (actions: Action[]) => actions.map((a) => a.type)

beforeEach(() => {
  vi.mocked(assetAPI.setPoleLocation).mockReset()
  vi.mocked(assetAPI.getPoles).mockReset()
  vi.mocked(assetAPI.retireFixture).mockReset()
  vi.mocked(assetAPI.getSegmentDetail).mockReset()
  vi.mocked(assetAPI.updateSegment).mockReset()
})

describe('Tháo bóng (PUT /assets/fixtures/{id}/removal)', () => {
  it('tháo từ Bản đồ GIS: tải lại chi tiết cột đang mở và lớp bản đồ', async () => {
    vi.mocked(assetAPI.retireFixture).mockResolvedValue(undefined)

    const dispatched = await run(
      handleRetireFixture,
      retireFixtureRequest({
        fixtureId: 'FIX-0001',
        data: { removed_date: '2026-11-15' },
        poleId: 'POLE-0061',
      })
    )

    expect(assetAPI.retireFixture).toHaveBeenCalledWith('FIX-0001', { removed_date: '2026-11-15' })
    expect(types(dispatched)).toEqual([
      mutationSuccess.type,
      fetchAssetsRequest.type,
      fetchPoleDetailRequest.type,
      fetchMapLayersRequest.type,
    ])
    expect(dispatched[2]).toEqual(fetchPoleDetailRequest('POLE-0061'))
  })

  it('tháo từ tab tài sản (không có poleId): như cũ, không đụng lớp bản đồ', async () => {
    vi.mocked(assetAPI.retireFixture).mockResolvedValue(undefined)

    const dispatched = await run(
      handleRetireFixture,
      retireFixtureRequest({ fixtureId: 'FIX-0001', data: { removed_date: '2026-11-15' } })
    )

    expect(types(dispatched)).toEqual([mutationSuccess.type, fetchAssetsRequest.type])
  })
})

describe('Gắn bóng từ Bản đồ GIS', () => {
  const data = {
    pole_id: 'POLE-0061',
    fixture_type: 'led_road_lamp',
    power_source: 'grid',
    lamp_watt: 100,
    lamp_count: 1,
    install_date: '2026-11-15',
    data_source: 'field',
  } as const

  it('có mã cột: gắn xong thì tải lại chi tiết cột và lớp bản đồ', async () => {
    vi.mocked(assetAPI.createFixture).mockReset().mockResolvedValue(undefined)
    const out = await run(handleCreateFixture, createFixtureRequest({ data, poleId: 'POLE-0061' }))

    expect(assetAPI.createFixture).toHaveBeenCalledWith(data)
    expect(types(out)).toEqual([
      mutationSuccess.type,
      fetchAssetsRequest.type,
      fetchPoleDetailRequest.type,
      fetchMapLayersRequest.type,
    ])
  })

  it('không có mã cột (tab tài sản): không tải lớp bản đồ', async () => {
    vi.mocked(assetAPI.createFixture).mockReset().mockResolvedValue(undefined)
    const out = await run(handleCreateFixture, createFixtureRequest({ data }))
    expect(types(out)).toEqual([mutationSuccess.type, fetchAssetsRequest.type])
  })
})

describe('Sửa bộ đèn (PATCH /assets/fixtures/{id})', () => {
  const data = {
    fixture_type: 'led_road_lamp',
    power_source: 'grid',
    lamp_watt: 60,
    lamp_count: 2,
    install_date: '2023-01-15',
    warranty_expiry: '2025-01-15',
    note: null,
  } as const

  it('sửa từ Bản đồ GIS: gọi đúng mã bộ đèn, xong tải lại chi tiết cột và lớp bản đồ', async () => {
    vi.mocked(assetAPI.updateFixture).mockReset().mockResolvedValue(undefined)
    const out = await run(handleUpdateFixture, updateFixtureRequest({ fixtureId: 'FIX-0001', data, poleId: 'POLE-0061' }))

    expect(assetAPI.updateFixture).toHaveBeenCalledWith('FIX-0001', data)
    expect(types(out)).toEqual([
      mutationSuccess.type,
      fetchAssetsRequest.type,
      fetchPoleDetailRequest.type,
      fetchMapLayersRequest.type,
    ])
  })

  it('backend từ chối (chưa có endpoint): báo lỗi, không tải lại gì', async () => {
    vi.mocked(assetAPI.updateFixture).mockReset().mockRejectedValue(new Error('Method Not Allowed'))
    const out = await run(handleUpdateFixture, updateFixtureRequest({ fixtureId: 'FIX-0001', data }))
    expect(types(out)).toEqual([mutationFailure.type])
  })
})
