// 3 Tuyến đường tác nghiệp chính (Đồng bộ 100% với Bản đồ GIS & Lịch làm việc)
export interface OperationSegment {
  id: string
  name: string
  road: string
  poleCount: number
  normal: number
  dim: number
  out: number
}

export const PRIMARY_SEGMENTS: OperationSegment[] = [
  {
    id: 'SEG-001',
    name: 'Tuyến A - Tỉnh Lộ 8',
    road: 'Tỉnh Lộ 8',
    poleCount: 46,
    normal: 36,
    dim: 5,
    out: 5,
  },
  {
    id: 'SEG-002',
    name: 'Tuyến B - Nguyễn Văn Ni',
    road: 'Nguyễn Văn Ni',
    poleCount: 31,
    normal: 23,
    dim: 5,
    out: 3,
  },
  {
    id: 'SEG-003',
    name: 'Tuyến C - Huỳnh Văn Cọ',
    road: 'Huỳnh Văn Cọ',
    poleCount: 26,
    normal: 16,
    dim: 1,
    out: 9,
  },
]
