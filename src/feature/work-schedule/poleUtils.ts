export interface PoleItem {
  poleId: string
  segmentId: string
  fixtureType: string
  lampWatt: number
  atlas: string
  status: string
}

/**
 * Trích xuất mã tuyến đường từ chuỗi hiển thị, ví dụ:
 * "Tuyến A - Trục chính liên xã Phước Hậu (SEG-001)" -> "SEG-001"
 */
export function extractSegmentId(segmentStr: string): string {
  if (!segmentStr) return 'SEG-001'
  const match = segmentStr.match(/SEG-\d+/)
  if (match) return match[0]
  if (segmentStr.includes('Tuyến A')) return 'SEG-001'
  if (segmentStr.includes('Tuyến B')) return 'SEG-002'
  if (segmentStr.includes('Tuyến C')) return 'SEG-003'
  if (segmentStr.includes('Tuyến D')) return 'SEG-004'
  return 'SEG-001'
}

/**
 * Lấy danh sách cột đèn theo tuyến đường (sinh danh sách động không phụ thuộc mock json)
 */
export function getPolesBySegment(segmentStr: string): PoleItem[] {
  const segmentId = extractSegmentId(segmentStr)

  const prefixMap: Record<string, { count: number; prefix: string; name: string }> = {
    'SEG-001': { count: 20, prefix: 'POLE-00', name: 'Trục chính liên xã Phước Hậu' },
    'SEG-002': { count: 18, prefix: 'POLE-01', name: 'Đường liên ấp 2 - Phước Vĩnh An' },
    'SEG-003': { count: 22, prefix: 'POLE-02', name: 'Trục đường Kênh Đông Củ Chi' },
    'SEG-004': { count: 15, prefix: 'POLE-03', name: 'Tuyến D - Bờ kênh ấp 4' },
  }

  const config = prefixMap[segmentId] || {
    count: 15,
    prefix: `POLE-${segmentId.replace(/\D/g, '').padStart(2, '0')}`,
    name: `Tuyến ${segmentId}`,
  }

  return Array.from({ length: config.count }, (_, i) => {
    const idx = String(i + 1).padStart(2, '0')
    return {
      poleId: `${config.prefix}${idx}`,
      segmentId,
      fixtureType: 'led_road_lamp',
      lampWatt: 100,
      atlas: `Cột đèn số ${i + 1} (${config.name})`,
      status: i % 7 === 0 ? 'dim' : 'normal',
    }
  })
}
