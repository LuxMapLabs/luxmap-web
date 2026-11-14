import { describe, it, expect } from 'vitest'
import {
  validateImportRow,
  wktCoordinateError,
  parsePointWkt,
  type ValidationContext,
} from '../../validations/assetImport.schema'
import type { SegmentListItem } from '../../types/assets/segments'

const segment: SegmentListItem = {
  segment_id: 'seg_01',
  external_ref: 'SEG-01',
  segment_name: 'Tuyến Tỉnh Lộ 8',
  road_class: 'inter_commune',
  length_m: 1500,
  commune_id: 'COM-001',
  commune_name: 'Xã thử nghiệm',
  data_source: 'field',
  pole_count: 3,
  has_geometry: true,
  updated_at: '2026-11-11T00:00:00Z',
}

const context: ValidationContext = { cabinets: [], segments: [segment], poles: [], fixtures: [], feeders: [] }

const poleRow: Record<string, string> = {
  external_ref: 'POLE-IMP-01',
  segment_external_ref: 'SEG-01',
  commune_id: 'COM-001',
  data_source: 'field',
  geom_wkt: 'POINT(106.5101 10.98008)',
}

describe('wktCoordinateError', () => {
  it('chấp nhận toạ độ hợp lệ và giá trị rỗng', () => {
    expect(wktCoordinateError('POINT(106.5101 10.98008)')).toBeNull()
    expect(wktCoordinateError('LINESTRING(106.485 10.972, 106.490 10.975)')).toBeNull()
    expect(wktCoordinateError('')).toBeNull()
    expect(wktCoordinateError(null)).toBeNull()
  })

  it('bắt dòng đảo kinh độ / vĩ độ (vĩ độ > 90)', () => {
    const msg = wktCoordinateError('POINT(10.9807 106.5109)')
    expect(msg).toContain('Vĩ độ 106.5109')
    expect(msg).toContain('đảo')
  })

  it('bắt kinh độ ngoài khoảng -180 đến 180', () => {
    expect(wktCoordinateError('POINT(200 10)')).toContain('Kinh độ 200')
  })

  it('kiểm tra từng điểm của LINESTRING', () => {
    expect(wktCoordinateError('LINESTRING(106.4 10.9, 10.9 106.4)')).toContain('Vĩ độ 106.4')
  })
})

describe('parsePointWkt', () => {
  it('trả về lat/lng theo thứ tự kinh độ vĩ độ của WKT', () => {
    expect(parsePointWkt('POINT(106.5101 10.98008)')).toEqual({ lat: 10.98008, lng: 106.5101 })
  })

  it('trả về null khi không phải POINT hợp lệ', () => {
    expect(parsePointWkt('POINT(abc)')).toBeNull()
    expect(parsePointWkt(null)).toBeNull()
  })
})

describe('validateImportRow - toạ độ và gom lỗi', () => {
  it('cột đúng toạ độ vẫn hợp lệ', () => {
    expect(validateImportRow('poles', poleRow, context, 0).actionType).toBe('new')
  })

  it('cột bị đảo kinh/vĩ độ bị từ chối với lý do rõ', () => {
    const review = validateImportRow('poles', { ...poleRow, geom_wkt: 'POINT(10.9807 106.5109)' }, context, 0)
    expect(review.actionType).toBe('invalid')
    expect(review.errorMsg).toContain('Vĩ độ 106.5109')
  })

  it('tủ điện và tuyến đường cũng bị chặn toạ độ ngoài khoảng', () => {
    const cabinet = validateImportRow(
      'cabinets',
      { external_ref: 'CAB-X', cabinet_name: 'Tủ X', commune_id: 'COM-001', geom_wkt: 'POINT(10.98 106.51)', data_source: 'field' },
      context,
      0
    )
    expect(cabinet.actionType).toBe('invalid')

    const seg = validateImportRow(
      'segments',
      {
        external_ref: 'SEG-X',
        segment_name: 'Tuyến X',
        road_class: 'inter_commune',
        commune_id: 'COM-001',
        length_m: '100',
        geom_wkt: 'LINESTRING(10.9 106.4, 10.91 106.41)',
        data_source: 'field',
      },
      context,
      0
    )
    expect(seg.actionType).toBe('invalid')
  })

  it('cột thiếu cả tuyến lẫn mạch thì báo cả hai lỗi, không chỉ lỗi đầu tiên', () => {
    const review = validateImportRow(
      'poles',
      { ...poleRow, segment_external_ref: 'SEG-NONE', feeder_external_ref: 'FDR-NONE' },
      context,
      0
    )
    expect(review.actionType).toBe('invalid')
    expect(review.errorMsg).toContain('Tuyến đường [SEG-NONE]')
    expect(review.errorMsg).toContain('Mạch/Tủ điện [FDR-NONE]')
  })

  it('toạ độ sai và tuyến thiếu: gộp các lỗi định dạng của cùng dòng', () => {
    const review = validateImportRow('poles', { ...poleRow, geom_wkt: 'POINT(abc)' }, context, 0)
    expect(review.actionType).toBe('invalid')
  })

  it('thiếu nhiều cột bắt buộc thì liệt kê đủ các cột', () => {
    const review = validateImportRow('poles', { external_ref: 'POLE-IMP-02' }, context, 2)
    expect(review.actionType).toBe('invalid')
    expect(review.errorMsg).toBe(
      "Dòng 3: Các cột 'segment_external_ref', 'commune_id', 'data_source' không có dữ liệu (bắt buộc điền đầy đủ)."
    )
  })

  it('thiếu đúng một cột vẫn giữ nguyên câu thông báo cũ', () => {
    const review = validateImportRow('poles', { ...poleRow, commune_id: '' }, context, 2)
    expect(review.errorMsg).toBe("Dòng 3: Cột 'commune_id' không có dữ liệu (bắt buộc điền đầy đủ).")
  })
})

describe('validateImportRow - tiền tố số dòng', () => {
  it('mọi dòng lỗi đều bắt đầu bằng "Dòng N:" (N không tính dòng tiêu đề)', () => {
    const review = validateImportRow('poles', { ...poleRow, geom_wkt: 'POINT(10.9807 106.5109)' }, context, 4)
    expect(review.errorMsg?.startsWith('Dòng 5: ')).toBe(true)
  })

  it('không thêm tiền tố hai lần', () => {
    const review = validateImportRow('poles', { ...poleRow, commune_id: '' }, context, 1)
    expect(review.errorMsg?.match(/Dòng/g)).toHaveLength(1)
  })
})
