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
  handleReshapeSegment,
  handleCreateFixture,
  handleUpdateFixture,
} from '../../feature/assets/assetSaga'
import {
  retireFixtureRequest,
  reshapeSegmentRequest,
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

describe('Lấy hình tuyến theo đường trên bản đồ nền (PUT /assets/segments/{id})', () => {
  const reshape = reshapeSegmentRequest({
    segmentId: 'SEG-003',
    label: 'Tuyến B',
    geomWkt: 'LINESTRING(106.49 10.97, 106.5 10.98)',
    lengthM: 1214,
  })
  const detail = {
    segment: {
      segment_id: 'SEG-003',
      external_ref: 'osm-way-1',
      segment_name: 'Tuyến B',
      road_class: 'inter_village',
      length_m: 1213,
      commune_id: 'COM-001',
      commune_name: 'Phước Thiện',
      data_source: 'field',
    },
    geom_wkt: 'LINESTRING(0 0, 1 1)',
    created_at: null,
  }

  it('giữ nguyên thông tin tuyến, chỉ thay hình và chiều dài; không gửi danh sách cột', async () => {
    vi.mocked(assetAPI.getSegmentDetail).mockResolvedValue(detail as never)
    vi.mocked(assetAPI.updateSegment).mockResolvedValue(undefined)

    const dispatched = await run(handleReshapeSegment, reshape)

    expect(assetAPI.updateSegment).toHaveBeenCalledWith('SEG-003', {
      external_ref: 'osm-way-1',
      segment_name: 'Tuyến B',
      road_class: 'inter_village',
      length_m: 1214,
      geom_wkt: 'LINESTRING(106.49 10.97, 106.5 10.98)',
      data_source: 'field',
    })
    expect(types(dispatched)).toEqual([
      mutationSuccess.type,
      fetchMapLayersRequest.type,
      fetchAssetsRequest.type,
    ])
  })

  it('409 POLE_OFF_SEGMENT: báo số cột, mã cột và hành lang do backend gửi', async () => {
    vi.mocked(assetAPI.getSegmentDetail).mockResolvedValue(detail as never)
    vi.mocked(assetAPI.updateSegment).mockRejectedValue({
      response: {
        status: 409,
        data: {
          error: {
            code: 'POLE_OFF_SEGMENT',
            message: 'That line leaves 2 pole(s) of the segment more than 25 m away…',
            details: {
              segment_id: 'SEG-003',
              pole_ids: ['POLE-0041', 'POLE-0042'],
              pole_count: 2,
              corridor_m: 25,
            },
          },
        },
      },
    })

    const dispatched = await run(handleReshapeSegment, reshape)

    expect(types(dispatched)).toEqual([mutationFailure.type])
    const message = (dispatched[0] as ReturnType<typeof mutationFailure>).payload
    expect(message).toContain('2 cột')
    expect(message).toContain('POLE-0041, POLE-0042')
    expect(message).toContain('25 m')
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
