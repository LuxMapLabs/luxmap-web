import { describe, expect, it } from 'vitest'
import {
  buildSegmentGeometry,
  deriveInitialOrder,
  insertPoleInRoute,
  movePole,
  orderPolesAlongLine,
  orderPolesByChain,
  removePole,
  type OrderedPole,
} from '../../utils/gis-map/segmentPoleOrder'

// Các cột dọc một đường thẳng hướng đông, cách nhau ~0.001° kinh độ (~110m)
const pole = (id: string, lngStep: number, lat = 10.8): OrderedPole => ({
  id,
  coord: [106.8 + lngStep * 0.001, lat],
})
const A = pole('POLE-0001', 0)
const B = pole('POLE-0002', 1)
const C = pole('POLE-0003', 2)
const D = pole('POLE-0004', 3)
const ids = (route: OrderedPole[]) => route.map((p) => p.id)

describe('insertPoleInRoute', () => {
  it('thêm cột đầu tiên và thứ hai theo thứ tự thêm', () => {
    expect(ids(insertPoleInRoute([], A))).toEqual(['POLE-0001'])
    expect(ids(insertPoleInRoute([A], C))).toEqual(['POLE-0001', 'POLE-0003'])
  })

  it('chèn cột mới vào giữa hai cột gần nhất', () => {
    expect(ids(insertPoleInRoute([A, C, D], B))).toEqual(['POLE-0001', 'POLE-0002', 'POLE-0003', 'POLE-0004'])
  })

  it('cột nằm ngoài hai đầu thì thành cột đầu hoặc cột cuối', () => {
    expect(ids(insertPoleInRoute([B, C], A))).toEqual(['POLE-0001', 'POLE-0002', 'POLE-0003'])
    expect(ids(insertPoleInRoute([A, B], C))).toEqual(['POLE-0001', 'POLE-0002', 'POLE-0003'])
  })

  it('không thêm trùng cột đã có', () => {
    const route = [A, B]
    expect(insertPoleInRoute(route, B)).toBe(route)
  })
})

describe('movePole', () => {
  it('dời cột lên đầu, xuống cuối và vào giữa, các cột khác giữ thứ tự', () => {
    expect(ids(movePole([A, B, C, D], 2, 0))).toEqual(['POLE-0003', 'POLE-0001', 'POLE-0002', 'POLE-0004'])
    expect(ids(movePole([A, B, C, D], 0, 3))).toEqual(['POLE-0002', 'POLE-0003', 'POLE-0004', 'POLE-0001'])
    expect(ids(movePole([A, B, C, D], 1, 2))).toEqual(['POLE-0001', 'POLE-0003', 'POLE-0002', 'POLE-0004'])
  })

  it('đứng yên khi vị trí không đổi hoặc nằm ngoài danh sách', () => {
    const route = [A, B, C]
    expect(movePole(route, 1, 1)).toBe(route)
    expect(movePole(route, -1, 1)).toBe(route)
    expect(movePole(route, 0, 3)).toBe(route)
  })
})

describe('removePole', () => {
  it('bỏ đúng cột, giữ nguyên thứ tự các cột còn lại', () => {
    expect(ids(removePole([A, B, C], 'POLE-0002'))).toEqual(['POLE-0001', 'POLE-0003'])
  })
})

describe('orderPolesAlongLine', () => {
  it('sắp cột theo vị trí chiếu dọc đường tham chiếu', () => {
    const line: [number, number][] = [A.coord, D.coord]
    expect(ids(orderPolesAlongLine([C, A, D, B], line))).toEqual([
      'POLE-0001', 'POLE-0002', 'POLE-0003', 'POLE-0004',
    ])
  })
})

describe('orderPolesByChain', () => {
  it('đi dọc đường cong thay vì nhảy cóc', () => {
    // L-shape: đi đông 3 cột rồi rẽ bắc 2 cột
    const p1 = pole('POLE-0001', 0)
    const p2 = pole('POLE-0002', 1)
    const p3 = pole('POLE-0003', 2)
    const p4 = pole('POLE-0004', 2, 10.801)
    const p5 = pole('POLE-0005', 2, 10.802)
    const out = ids(orderPolesByChain([p4, p1, p5, p3, p2]))
    expect(out.join()).toMatch(/^(POLE-0001,POLE-0002,POLE-0003,POLE-0004,POLE-0005|POLE-0005,POLE-0004,POLE-0003,POLE-0002,POLE-0001)$/)
  })
})

describe('deriveInitialOrder', () => {
  it('đường dựng từ cột: lấy đúng thứ tự đỉnh và đánh dấu exact', () => {
    const wkt = `LINESTRING(${[A, B, C].map((p) => p.coord.join(' ')).join(', ')})`
    const result = deriveInitialOrder([C, A, B], wkt)
    expect(ids(result.ordered)).toEqual(['POLE-0001', 'POLE-0002', 'POLE-0003'])
    expect(result.exact).toBe(true)
  })

  it('đường vẽ tự do (đỉnh không trùng cột): suy ra thứ tự theo hình chiếu, exact = false', () => {
    const wkt = `LINESTRING(${A.coord.join(' ')}, ${D.coord.join(' ')})`
    const result = deriveInitialOrder([C, B, A], wkt)
    expect(ids(result.ordered)).toEqual(['POLE-0001', 'POLE-0002', 'POLE-0003'])
    expect(result.exact).toBe(false)
  })

  it('không có hình học: sắp theo chuỗi gần nhất, exact = false; dưới 2 cột luôn exact', () => {
    const result = deriveInitialOrder([C, A, D, B], null)
    expect(ids(result.ordered).join()).toMatch(/^(POLE-0001,POLE-0002,POLE-0003,POLE-0004|POLE-0004,POLE-0003,POLE-0002,POLE-0001)$/)
    expect(result.exact).toBe(false)
    expect(deriveInitialOrder([A], null).exact).toBe(true)
    expect(deriveInitialOrder([], null).ordered).toEqual([])
  })
})

describe('buildSegmentGeometry', () => {
  it('dưới 2 cột thì không dựng được', () => {
    expect(buildSegmentGeometry([])).toBeNull()
    expect(buildSegmentGeometry([A])).toBeNull()
  })

  it('nối tọa độ theo thứ tự, kinh độ trước, và tính length_m', () => {
    const result = buildSegmentGeometry([A, B])
    expect(result?.geomWkt).toBe('LINESTRING(106.8 10.8, 106.801 10.8)')
    // 0.001° kinh độ ở vĩ độ 10.8° ≈ 109m
    expect(result?.lengthM).toBeGreaterThan(105)
    expect(result?.lengthM).toBeLessThan(113)
  })
})

// ── Chèn lại cột trên đường có góc rẽ: bỏ k cột rồi chọn lại theo mọi thứ tự phải ra đúng thứ tự gốc ──
const layout = (pts: [number, number][]): OrderedPole[] =>
  pts.map(([x, y], i) => ({ id: `Q${i}`, coord: [106.8 + x * 0.001, 10.8 + y * 0.001] as [number, number] }))

const subsetsOf = (n: number, k: number): number[][] => {
  const out: number[][] = []
  const rec = (start: number, cur: number[]) => {
    if (cur.length === k) return void out.push([...cur])
    for (let i = start; i < n; i++) rec(i + 1, [...cur, i])
  }
  rec(0, [])
  return out
}
const permutations = <T,>(a: T[]): T[][] =>
  a.length <= 1 ? [a] : a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]))

/** Mọi cách bỏ 1–3 cột (lọc bằng `allow`) rồi chọn lại theo mọi thứ tự; trả các ca ra sai thứ tự. */
const reinsertFailures = (all: OrderedPole[], allow: (removed: number[]) => boolean) => {
  const failures: string[] = []
  for (const k of [1, 2, 3]) {
    for (const removed of subsetsOf(all.length, k)) {
      if (!allow(removed)) continue
      const remaining = all.filter((_, i) => !removed.includes(i))
      if (remaining.length < 2) continue
      for (const order of permutations(removed)) {
        const route = order.reduce((r, i) => insertPoleInRoute(r, all[i]), remaining)
        if (ids(route).join() !== ids(all).join()) failures.push(`bỏ [${removed}] chọn lại [${order}]`)
      }
    }
  }
  return failures
}

describe('insertPoleInRoute trên đường có góc rẽ', () => {
  const straight = layout(Array.from({ length: 9 }, (_, i) => [i, 0] as [number, number]))
  const lShape = layout([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4]])
  const uShape = layout([[0, 4], [0, 3], [0, 2], [0, 1], [0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4]])

  it('đường thẳng: bỏ bất kỳ 1–3 cột (kể cả hai đầu) rồi chọn lại theo mọi thứ tự đều ra đúng thứ tự gốc', () => {
    expect(reinsertFailures(straight, () => true)).toEqual([])
  })

  it('đường chữ L: bỏ bất kỳ 1–3 cột (kể cả cột ở góc và hai đầu) đều ra đúng thứ tự gốc', () => {
    expect(reinsertFailures(lShape, () => true)).toEqual([])
  })

  it('đường chữ U: bỏ cột ở giữa (không đụng hai đầu) đều ra đúng thứ tự gốc', () => {
    const interiorOnly = (removed: number[]) => !removed.includes(0) && !removed.includes(uShape.length - 1)
    expect(reinsertFailures(uShape, interiorOnly)).toEqual([])
  })
})
