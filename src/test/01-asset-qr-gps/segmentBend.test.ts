import { describe, it, expect } from 'vitest'
import {
  autoSortRoute,
  buildSegmentGeometry,
  deriveInitialOrder,
  dropEdgeBends,
  insertBendInRoute,
  isBend,
  isSameLine,
  makeBend,
  polesOf,
  reconcileRoute,
  upsertPoleInRoute,
  type OrderedPole,
} from '../../utils/gis-map/segmentPoleOrder'

// Đường chữ L: đi về phía đông rồi rẽ lên phía bắc. Góc rẽ ở (106.001, 10.0)
const A: OrderedPole = { id: 'A', coord: [106.0, 10.0] }
const B: OrderedPole = { id: 'B', coord: [106.001, 10.001] }
const corner = (): OrderedPole => makeBend([106.001, 10.0])

describe('Điểm uốn trên tuyến', () => {
  it('đặt điểm uốn vào giữa hai cột, hình tuyến đi qua góc rẽ', () => {
    const route = insertBendInRoute([A, B], corner())
    expect(route.map((p) => p.id === 'A' || p.id === 'B' ? p.id : 'bend')).toEqual(['A', 'bend', 'B'])
    const geometry = buildSegmentGeometry(route)
    expect(geometry?.geomWkt).toBe('LINESTRING(106 10, 106.001 10, 106.001 10.001)')
  })

  it('không đặt được khi chưa đủ 2 cột', () => {
    expect(insertBendInRoute([A], corner())).toEqual([A])
    expect(insertBendInRoute([], corner())).toEqual([])
  })

  it('điểm uốn không được tính là cột và không đủ để tạo hình tuyến', () => {
    const route = [A, corner()]
    expect(polesOf(route)).toEqual([A])
    expect(buildSegmentGeometry(route)).toBeNull()
  })

  it('dropEdgeBends bỏ điểm uốn ở đầu và cuối, giữ điểm uốn ở giữa', () => {
    const mid = corner()
    const route = [makeBend([105.9, 10]), A, mid, B, makeBend([106.2, 10.2])]
    expect(dropEdgeBends(route)).toEqual([A, mid, B])
    expect(dropEdgeBends([makeBend([1, 1])])).toEqual([])
  })

  it('autoSortRoute sắp lại cột nhưng giữ điểm uốn giữa hai cột', () => {
    const C: OrderedPole = { id: 'C', coord: [106.001, 10.002] }
    const bend = corner()
    const sorted = autoSortRoute([B, bend, C, A])
    expect(isBend(sorted[0])).toBe(false)
    expect(isBend(sorted[sorted.length - 1])).toBe(false)
    expect(sorted.filter(isBend)).toHaveLength(1)
    expect(polesOf(sorted)).toHaveLength(3)
  })

  describe('deriveInitialOrder với đường đã lưu có điểm uốn', () => {
    it('đỉnh không trùng cột trở thành điểm uốn, đường chính xác', () => {
      const { ordered, exact } = deriveInitialOrder(
        [B, A],
        'LINESTRING(106 10, 106.001 10, 106.001 10.001)'
      )
      expect(exact).toBe(true)
      expect(ordered.map((p) => (isBend(p) ? 'bend' : p.id))).toEqual(['A', 'bend', 'B'])
      expect(ordered[1].coord).toEqual([106.001, 10])
    })

    it('đỉnh thừa ở đầu hoặc cuối đường không thành điểm uốn', () => {
      const { ordered } = deriveInitialOrder(
        [A, B],
        'LINESTRING(105.999 10, 106 10, 106.001 10.001, 106.002 10.002)'
      )
      expect(ordered.map((p) => p.id)).toEqual(['A', 'B'])
    })

    it('bỏ qua đỉnh trùng nhau liên tiếp', () => {
      const { ordered } = deriveInitialOrder(
        [A, B],
        'LINESTRING(106 10, 106.001 10, 106.001 10, 106.001 10.001)'
      )
      expect(ordered.filter(isBend)).toHaveLength(1)
    })
  })
})

describe('reconcileRoute: hình tuyến sau khi cột đổi', () => {
  const C: OrderedPole = { id: 'C', coord: [106.001, 10.002] }
  const wkt = 'LINESTRING(106 10, 106.001 10, 106.001 10.001)'

  it('cột đổi vị trí: giữ thứ tự và điểm uốn, chỉ dời tọa độ', () => {
    const moved: OrderedPole = { id: 'B', coord: [106.001, 10.0015] }
    const route = reconcileRoute([A, B], wkt, [A, moved])
    expect(route.map((p) => (isBend(p) ? 'bend' : p.id))).toEqual(['A', 'bend', 'B'])
    expect(route[2].coord).toEqual([106.001, 10.0015])
  })

  it('cột mới thêm ở cuối: nối vào cuối, điểm uốn cũ giữ nguyên', () => {
    const route = reconcileRoute([A, B], wkt, [A, B, C])
    expect(route.map((p) => (isBend(p) ? 'bend' : p.id))).toEqual(['A', 'bend', 'B', 'C'])
  })

  it('cột bị bỏ: điểm uốn rơi ra rìa bị bỏ theo', () => {
    const route = reconcileRoute([A, B], wkt, [B])
    expect(route.map((p) => p.id)).toEqual(['B'])
  })

  it('isSameLine so sánh theo tọa độ, không theo chuỗi', () => {
    expect(isSameLine('LINESTRING(106 10, 106.001 10)', 'LINESTRING(106.0 10.0,106.001 10.0)')).toBe(true)
    expect(isSameLine('LINESTRING(106 10, 106.001 10)', 'LINESTRING(106 10, 106.002 10)')).toBe(false)
  })
})

describe('upsertPoleInRoute: cột bên cạnh đường', () => {
  it('chèn vào giữa theo chỗ chiếu xuống đường, không nối vào đầu', () => {
    const route: OrderedPole[] = [
      { id: 'P1', coord: [106.0, 10.0] },
      { id: 'P2', coord: [106.001, 10.0] },
      { id: 'P3', coord: [106.002, 10.0] },
      { id: 'P4', coord: [106.003, 10.0] },
    ]
    const side: OrderedPole = { id: 'X', coord: [106.0025, 9.9995] }
    expect(upsertPoleInRoute(route, side).map((p) => p.id)).toEqual(['P1', 'P2', 'P3', 'X', 'P4'])
  })

  it('vượt ra ngoài đầu thì nối vào đầu', () => {
    const route: OrderedPole[] = [
      { id: 'P1', coord: [106.0, 10.0] },
      { id: 'P2', coord: [106.001, 10.0] },
    ]
    expect(upsertPoleInRoute(route, { id: 'X', coord: [105.999, 10.0] }).map((p) => p.id)).toEqual(['X', 'P1', 'P2'])
  })
})

describe('upsertPoleInRoute: cột lệch hẳn khỏi đường', () => {
  it('cột ở bên hông, gần cuối đường nhưng chiếu vào giữa thì chèn vào giữa', () => {
    const route: OrderedPole[] = [
      { id: 'P1', coord: [106.0, 10.0] },
      { id: 'P2', coord: [106.01, 10.0] },
      { id: 'P3', coord: [106.02, 10.0] },
    ]
    // Lệch xa về phía nam, chiếu xuống giữa P1 và P2: nối vào đầu sẽ rẻ hơn nếu chỉ đo khoảng cách
    const side: OrderedPole = { id: 'X', coord: [106.004, 9.99] }
    expect(upsertPoleInRoute(route, side).map((p) => p.id)).toEqual(['P1', 'X', 'P2', 'P3'])
  })
})

describe('upsertPoleInRoute: cột đã có bị kéo đi chỗ khác', () => {
  it('cột đầu kéo sang bên hông thì chèn vào giữa theo chỗ chiếu, không còn là cột đầu', () => {
    const route: OrderedPole[] = [
      { id: 'P1', coord: [106.0, 10.0] },
      { id: 'P2', coord: [106.01, 10.0] },
      { id: 'P3', coord: [106.02, 10.0] },
    ]
    const moved: OrderedPole = { id: 'P1', coord: [106.012, 9.995] }
    expect(upsertPoleInRoute(route, moved).map((p) => p.id)).toEqual(['P2', 'P1', 'P3'])
  })

  it('cột dời nhẹ thì giữ nguyên thứ tự', () => {
    const route: OrderedPole[] = [
      { id: 'P1', coord: [106.0, 10.0] },
      { id: 'P2', coord: [106.01, 10.0] },
      { id: 'P3', coord: [106.02, 10.0] },
    ]
    const moved: OrderedPole = { id: 'P2', coord: [106.0102, 10.0001] }
    expect(upsertPoleInRoute(route, moved).map((p) => p.id)).toEqual(['P1', 'P2', 'P3'])
  })
})
