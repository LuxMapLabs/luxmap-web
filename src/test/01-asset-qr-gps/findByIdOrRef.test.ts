import { describe, it, expect } from 'vitest'
import { findByIdOrRef, cabinetOfPole } from '../../utils/assets/findByIdOrRef'

// Đúng dữ liệu dev: "Tuyến C" đứng trước trong danh sách và mang mã hiển thị SEG-003,
// còn mã nội bộ SEG-003 là "Tuyến B".
const SEGMENTS = [
  { segment_id: 'SEG-001', external_ref: 'SEG-003', segment_name: 'Tuyến C - Huỳnh Văn Cọ' },
  { segment_id: 'SEG-002', external_ref: 'SEG-001', segment_name: 'Tuyến A - Tỉnh Lộ 8' },
  { segment_id: 'SEG-003', external_ref: 'SEG-002', segment_name: 'Tuyến B - Nguyễn Văn Ni' },
]
const id = (s: (typeof SEGMENTS)[number]) => s.segment_id

describe('findByIdOrRef', () => {
  it('mã nội bộ thắng mã hiển thị trùng của dòng đứng trước', () => {
    expect(findByIdOrRef(SEGMENTS, id, 'SEG-003')?.segment_name).toBe('Tuyến B - Nguyễn Văn Ni')
    expect(findByIdOrRef(SEGMENTS, id, 'SEG-001')?.segment_name).toBe('Tuyến C - Huỳnh Văn Cọ')
  })

  it('không có mã nội bộ nào khớp thì mới so mã hiển thị, không phân biệt hoa thường', () => {
    const rows = [{ segment_id: 'SEG-009', external_ref: 'TUYEN-X', segment_name: 'X' }]
    expect(findByIdOrRef(rows, (s) => s.segment_id, 'tuyen-x')?.segment_name).toBe('X')
  })

  it('giá trị rỗng không khớp gì', () => {
    expect(findByIdOrRef(SEGMENTS, id, null)).toBeUndefined()
    expect(findByIdOrRef(SEGMENTS, id, '')).toBeUndefined()
  })
})

describe('cabinetOfPole', () => {
  // Tủ đứng trước mang mã hiển thị trùng mã nội bộ của tủ thật
  const CABINETS = [
    { cabinet_id: 'CAB-001', external_ref: 'CAB-002', feeder_ids: ['FDR-001'] },
    { cabinet_id: 'CAB-002', external_ref: 'CAB-NVN-B', feeder_ids: ['FDR-011'] },
  ]

  it('mã tủ của cột thắng mã hiển thị trùng của tủ khác', () => {
    expect(cabinetOfPole(CABINETS, { cabinet_id: 'CAB-002' })?.external_ref).toBe('CAB-NVN-B')
  })

  it('cột chỉ có mạch: lấy tủ chứa mạch đó', () => {
    expect(cabinetOfPole(CABINETS, { feeder_id: 'FDR-011' })?.cabinet_id).toBe('CAB-002')
  })

  it('không khớp mã nội bộ hay mạch: mới so mã hiển thị', () => {
    expect(cabinetOfPole(CABINETS, { cabinet_id: 'cab-nvn-b' })?.cabinet_id).toBe('CAB-002')
    expect(cabinetOfPole(CABINETS, {})).toBeUndefined()
  })
})
