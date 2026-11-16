import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runSaga } from 'redux-saga'
import type { Action } from '@reduxjs/toolkit'

vi.mock('sonner', () => ({
  toast: { loading: vi.fn(() => 'id'), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

vi.mock('../../feature/assets/assetAPI', () => ({
  default: {
    updatePole: vi.fn(),
    setPoleLocation: vi.fn(),
    getPoles: vi.fn(),
    getSegmentDetail: vi.fn(),
    updateSegment: vi.fn(),
  },
}))

import { toast } from 'sonner'
import assetAPI from '../../feature/assets/assetAPI'
import { handleUpdatePole } from '../../feature/assets/assetSaga'
import {
  updatePoleRequest,
  mutationSuccess,
  mutationFailure,
  fetchAssetsRequest,
} from '../../feature/assets/assetSlice'
import type { PoleListItem } from '../../types/assets/poles'
import { fetchMapLayersRequest, fetchPoleDetailRequest } from '../../feature/map/mapSlice'

const pole = (id: string, lng: number, lat = 10.8): PoleListItem => ({
  pole_id: id,
  external_ref: id,
  segment_id: 'SEG-003',
  commune_id: 'COM-001',
  commune_name: 'Phước Thiện',
  data_source: 'field',
  near_sensitive_poi: false,
  location: { lat, lng },
  updated_at: '2026-11-15T00:00:00Z',
})

// Ba cột cách nhau ~110 m; cột giữa dời ~5 m về phía bắc
const before = [pole('POLE-0001', 106.8), pole('POLE-0002', 106.801), pole('POLE-0003', 106.802)]
const after = [before[0], pole('POLE-0002', 106.801, 10.80005), before[2]]

const detail = (geomWkt: string) => ({
  segment: {
    segment_id: 'SEG-003',
    external_ref: 'osm-way-1',
    segment_name: 'Tuyến B',
    road_class: 'inter_village',
    length_m: 330,
    commune_id: 'COM-001',
    commune_name: 'Phước Thiện',
    data_source: 'field',
  },
  geom_wkt: geomWkt,
  created_at: null,
})

const move = updatePoleRequest({
  poleId: 'POLE-0002',
  data: {
    external_ref: 'POLE-0002',
    segment_id: 'SEG-003',
    geom_wkt: 'POINT(106.801 10.80005)',
  } as never,
})

const run = async () => {
  const dispatched: Action[] = []
  await runSaga(
    {
      dispatch: (a: Action) => dispatched.push(a),
      getState: () => ({ assets: { poles: before } }),
    },
    handleUpdatePole,
    move
  ).toPromise()
  return dispatched.map((a) => a.type)
}

beforeEach(() => {
  vi.mocked(assetAPI.updatePole)
    .mockReset()
    .mockResolvedValue(undefined as never)
  vi.mocked(assetAPI.setPoleLocation)
    .mockReset()
    .mockResolvedValue({ pole_id: 'POLE-0002' } as never)
  vi.mocked(assetAPI.getPoles)
    .mockReset()
    .mockResolvedValue({ items: after } as never)
  vi.mocked(assetAPI.getSegmentDetail).mockReset()
  vi.mocked(assetAPI.updateSegment).mockReset().mockResolvedValue(undefined)
  vi.mocked(toast.warning).mockReset()
})

describe('Sửa cột ở tab tài sản: hình tuyến đi theo cột hay giữ nguyên', () => {
  it('tuyến đã có hình theo con đường: không gửi lại hình tuyến', async () => {
    vi.mocked(assetAPI.getSegmentDetail).mockResolvedValue(
      detail(
        'LINESTRING(106.7995 10.80009, 106.8005 10.80009, 106.8015 10.80009, 106.8025 10.80009)'
      ) as never
    )

    const types = await run()

    expect(assetAPI.updatePole).toHaveBeenCalledTimes(1)
    expect(assetAPI.updateSegment).not.toHaveBeenCalled()
    expect(toast.warning).not.toHaveBeenCalled()
    expect(types).toEqual([mutationSuccess.type, fetchAssetsRequest.type])
  })

  it('tuyến chỉ là bản nháp nối cột: dựng lại đường qua vị trí mới của cột', async () => {
    vi.mocked(assetAPI.getSegmentDetail).mockResolvedValue(
      detail('LINESTRING(106.8 10.8, 106.801 10.8, 106.802 10.8)') as never
    )

    await run()

    expect(assetAPI.updateSegment).toHaveBeenCalledTimes(1)
    const [id, body] = vi.mocked(assetAPI.updateSegment).mock.calls[0]
    expect(id).toBe('SEG-003')
    expect(body.geom_wkt).toBe('LINESTRING(106.8 10.8, 106.801 10.80005, 106.802 10.8)')
    expect(body.segment_name).toBe('Tuyến B')
  })
})

const runWith = async (action: ReturnType<typeof updatePoleRequest>) => {
  const dispatched: Action[] = []
  await runSaga(
    {
      dispatch: (a: Action) => dispatched.push(a),
      getState: () => ({ assets: { poles: before } }),
    },
    handleUpdatePole,
    action
  ).toPromise()
  return dispatched
}

describe('Sửa cột ở tab tài sản: đổi vị trí đi qua /location như Bản đồ GIS', () => {
  beforeEach(() => {
    vi.mocked(assetAPI.getSegmentDetail).mockResolvedValue(
      detail('LINESTRING(106.8 10.8, 106.801 10.8, 106.802 10.8)') as never
    )
  })

  it('cùng tuyến, dời cột: gọi /location với vị trí mới trước khi lưu thông tin cột', async () => {
    await run()

    expect(assetAPI.setPoleLocation).toHaveBeenCalledWith('POLE-0002', {
      lat: 10.80005,
      lng: 106.801,
    })
    expect(vi.mocked(assetAPI.setPoleLocation).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(assetAPI.updatePole).mock.invocationCallOrder[0]
    )
  })

  it('backend từ chối 409 POLE_OFF_SEGMENT: không lưu gì thêm, báo số đo của backend', async () => {
    vi.mocked(assetAPI.setPoleLocation).mockRejectedValue({
      response: {
        status: 409,
        data: {
          error: { code: 'POLE_OFF_SEGMENT', details: { distance_m: 40.2, corridor_m: 25 } },
        },
      },
    })
    const dispatched = await runWith(move)

    expect(assetAPI.updatePole).not.toHaveBeenCalled()
    expect(assetAPI.updateSegment).not.toHaveBeenCalled()
    expect(dispatched[0].type).toBe(mutationFailure.type)
    expect((dispatched[0] as unknown as { payload: string }).payload).toMatch(/cách tuyến 40,2 m/)
  })

  it('không dời (chỉ sửa thông tin khác): không gọi /location', async () => {
    await runWith(
      updatePoleRequest({
        poleId: 'POLE-0002',
        data: {
          external_ref: 'KS-02',
          segment_id: 'SEG-003',
          geom_wkt: 'POINT(106.801 10.8)',
        } as never,
      })
    )
    expect(assetAPI.setPoleLocation).not.toHaveBeenCalled()
    expect(assetAPI.updatePole).toHaveBeenCalledTimes(1)
  })

  it('đổi sang tuyến khác: không gọi /location (nó đo theo tuyến cũ)', async () => {
    await runWith(
      updatePoleRequest({
        poleId: 'POLE-0002',
        data: {
          external_ref: 'POLE-0002',
          segment_id: 'SEG-009',
          geom_wkt: 'POINT(106.801 10.80005)',
        } as never,
      })
    )
    expect(assetAPI.setPoleLocation).not.toHaveBeenCalled()
    expect(assetAPI.updatePole).toHaveBeenCalledTimes(1)
  })
})

describe('Danh sách cột dài hơn một trang (backend giới hạn 200 dòng mỗi trang)', () => {
  it('đọc hết các trang: cột của tuyến ở trang 2 vẫn nằm trong hình nháp', async () => {
    vi.mocked(assetAPI.getSegmentDetail).mockResolvedValue(
      detail('LINESTRING(106.8 10.8, 106.801 10.8, 106.802 10.8)') as never
    )
    const filler = Array.from({ length: 200 }, (_, i) => ({
      ...pole(`POLE-9${String(i).padStart(3, '0')}`, 106.9),
      segment_id: null,
    }))
    vi.mocked(assetAPI.getPoles)
      .mockReset()
      .mockResolvedValueOnce({ items: filler, total: 203 } as never)
      .mockResolvedValueOnce({ items: after, total: 203 } as never)

    await run()

    expect(assetAPI.getPoles).toHaveBeenNthCalledWith(1, { page: 1, page_size: 200 })
    expect(assetAPI.getPoles).toHaveBeenNthCalledWith(2, { page: 2, page_size: 200 })
    expect(vi.mocked(assetAPI.updateSegment).mock.calls[0][1].geom_wkt).toBe(
      'LINESTRING(106.8 10.8, 106.801 10.80005, 106.802 10.8)'
    )
  })
})

describe('Sửa cột từ Bản đồ GIS: lưu xong tải lại bản đồ', () => {
  beforeEach(() => {
    vi.mocked(assetAPI.getSegmentDetail).mockResolvedValue(
      detail('LINESTRING(106.8 10.8, 106.801 10.8, 106.802 10.8)') as never
    )
  })

  it('refreshMap: tải lại chi tiết cột và lớp bản đồ sau khi lưu', async () => {
    const out = await runWith(updatePoleRequest({ ...move.payload, refreshMap: true }))
    const types = out.map((a) => a.type)
    expect(types).toContain(fetchPoleDetailRequest.type)
    expect(types).toContain(fetchMapLayersRequest.type)
    expect(types.indexOf(fetchPoleDetailRequest.type)).toBeGreaterThan(types.indexOf(mutationSuccess.type))
  })

  it('tab tài sản (không refreshMap): không tải lớp bản đồ', async () => {
    const out = await runWith(move)
    expect(out.map((a) => a.type)).not.toContain(fetchMapLayersRequest.type)
  })
})
