import { describe, it, expect } from 'vitest'
import { searchAllCategories } from '../../utils/gis-map/gisSearchUtils'
import type { PoleFeature, SegmentInfo } from '../../pages/gis-map/GisMapPage'

// Mã nội bộ và mã hiển thị trùng dạng nhau nhưng chỉ vào hai thứ khác nhau, như trong DB thật
const pole = (poleId: string, externalRef: string, segmentId: string): PoleFeature =>
  ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [106.5, 10.97] },
    properties: {
      pole_id: poleId,
      external_ref: externalRef,
      segment_id: segmentId,
      fixture_status: 'unknown',
    },
  }) as unknown as PoleFeature

const segment = (id: string, externalRef: string, name: string): SegmentInfo => ({
  id,
  externalRef,
  name,
  fullName: name,
  cabinet: '',
  road: name,
  poleCount: 1,
  lengthM: 100,
})

const segmentsList = [
  segment('SEG-002', 'SEG-001', 'Tuyến A'),
  segment('SEG-003', 'SEG-002', 'Tuyến B'),
]
const poles = [pole('POLE-0012', 'POLE-0056', 'SEG-003'), pole('POLE-0056', 'POLE-0002', 'SEG-002')]
const cabinets = [
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [106.5, 10.97] },
    properties: {
      cabinet_id: 'CAB-007',
      external_ref: 'CAB-NVN-A',
      cabinet_name: 'Tủ Nguyễn Văn Ni A',
    },
  },
]

const search = (query: string) => searchAllCategories({ query, segmentsList, cabinets, poles })

describe('Tìm kiếm Bản đồ GIS: khớp theo mã người dùng thấy, không theo mã nội bộ', () => {
  it('gõ mã cột hiển thị: ra đúng cột đó, tiêu đề là mã hiển thị', () => {
    const poleHits = search('POLE-0056').filter((r) => r.category === 'pole')
    expect(poleHits).toHaveLength(1)
    expect(poleHits[0].id).toBe('POLE-0012')
    expect(poleHits[0].title).toBe('POLE-0056')
    expect(poleHits[0].subtitle).toBe('Tuyến B')
  })

  it('gõ mã tuyến hiển thị: ra đúng tuyến; cột của tuyến đó khớp theo mã tuyến hiển thị', () => {
    const hits = search('SEG-002')
    expect(hits.filter((r) => r.category === 'segment').map((r) => r.id)).toEqual(['SEG-003'])
    expect(hits.filter((r) => r.category === 'pole').map((r) => r.id)).toEqual(['POLE-0012'])
  })

  it('tủ điện: khớp mã hiển thị, không khớp mã nội bộ', () => {
    expect(search('CAB-NVN-A').filter((r) => r.category === 'cabinet')).toHaveLength(1)
    expect(search('CAB-007').filter((r) => r.category === 'cabinet')).toHaveLength(0)
  })

  it('chưa có mã hiển thị: dùng mã nội bộ', () => {
    const bare = pole('POLE-0099', '', 'SEG-003')
    const hits = searchAllCategories({
      query: 'POLE-0099',
      segmentsList,
      cabinets: [],
      poles: [bare],
    })
    expect(hits.map((r) => r.title)).toEqual(['POLE-0099'])
  })
})
