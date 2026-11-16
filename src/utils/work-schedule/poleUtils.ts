import type { FaultType } from '../../types/common/enums'

export interface PoleItem {
  poleId: string
  segmentId: string
  /** Loại sự cố đang mở trên cột (từ API sự cố) */
  faultType?: FaultType
  /** Công suất bóng đang dùng (W), null nếu chưa có dữ liệu */
  lampWatt: number | null
  /** Ghi chú của sự cố hoặc của cột, thiếu thì mã cột kèm tên tuyến */
  atlas: string
}

/**
 * Trích xuất mã tuyến đường từ chuỗi hiển thị, ví dụ:
 * "Tên tuyến (SEG-001)" -> "SEG-001"
 */
export function extractSegmentId(segmentStr: string): string {
  const trimmed = (segmentStr || '').trim()
  if (!trimmed) return ''

  const parenMatch = trimmed.match(/\(([^()]+)\)\s*$/)
  if (parenMatch && parenMatch[1]) {
    return parenMatch[1].trim()
  }

  const segMatch = trimmed.match(/SEG-[A-Za-z0-9_-]+/i)
  if (segMatch) {
    return segMatch[0].toUpperCase()
  }

  if (!/\s/.test(trimmed)) {
    return trimmed
  }

  return ''
}
