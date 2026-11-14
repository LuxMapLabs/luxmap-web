import type { FaultType } from '../../types/common/enums'

export interface PoleItem {
  poleId: string
  segmentId: string
  /** Loại sự cố đang mở trên cột (từ API sự cố) */
  faultType?: FaultType
  /** Ghi chú của sự cố, hoặc mã sự cố nếu không có ghi chú */
  atlas: string
}

/**
 * Trích xuất mã tuyến đường từ chuỗi hiển thị, ví dụ:
 * "Tuyến A - Tỉnh Lộ 8 (SEG-001)" -> "SEG-001". Không tìm thấy thì trả về chuỗi rỗng.
 */
export function extractSegmentId(segmentStr: string): string {
  const match = segmentStr?.match(/SEG-\d+/)
  return match ? match[0] : ''
}
