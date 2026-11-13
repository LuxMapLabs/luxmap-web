export interface PoleItem {
  poleId: string
  segmentId: string
  fixtureType: string
  lampWatt: number | null
  atlas: string
  status: string
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
