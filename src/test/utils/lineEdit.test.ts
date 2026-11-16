import { describe, it, expect } from 'vitest'
import {
  edgeMidpoints,
  insertVertex,
  moveVertex,
  removeVertex,
  simplifyLine,
  type LngLat,
} from '../../utils/gis-map/lineEdit'
import { snapPointToPolyline } from '../../utils/gis-map/routeUtils'

const L: LngLat[] = [
  [106.8, 10.8],
  [106.801, 10.8],
  [106.802, 10.801],
]

describe('Sửa hình tuyến bằng kéo thả', () => {
  it('kéo đỉnh: chỉ đỉnh đó đổi chỗ', () => {
    expect(moveVertex(L, 1, [106.801, 10.8005])).toEqual([L[0], [106.801, 10.8005], L[2]])
  })

  it('kéo chấm giữa: chèn đỉnh mới đúng giữa hai đỉnh', () => {
    expect(insertVertex(L, 1, [106.8005, 10.8002])).toEqual([L[0], [106.8005, 10.8002], L[1], L[2]])
    // Không chèn trước đỉnh đầu hay sau đỉnh cuối
    expect(insertVertex(L, 0, [0, 0])).toBe(L)
    expect(insertVertex(L, 3, [0, 0])).toBe(L)
  })

  it('xoá đỉnh; còn 2 đỉnh thì không xoá nữa', () => {
    expect(removeVertex(L, 1)).toEqual([L[0], L[2]])
    expect(removeVertex([L[0], L[1]], 0)).toEqual([L[0], L[1]])
  })

  it('chấm giữa nằm giữa từng cạnh', () => {
    expect(edgeMidpoints(L)).toEqual([
      [106.8005, 10.8],
      [106.8015, 10.8005],
    ])
  })
})

describe('simplifyLine', () => {
  it('đường thẳng nhiều đỉnh còn 2 đầu', () => {
    const straight: LngLat[] = Array.from({ length: 20 }, (_, i) => [106.8 + i * 0.0001, 10.8])
    expect(simplifyLine(straight)).toEqual([straight[0], straight[19]])
  })

  it('giữ khúc cua, hình lược lệch không quá dung sai', () => {
    const bend: LngLat[] = [
      ...Array.from({ length: 10 }, (_, i) => [106.8 + i * 0.0001, 10.8] as LngLat),
      ...Array.from({ length: 10 }, (_, i) => [106.8009, 10.8 + (i + 1) * 0.0001] as LngLat),
    ]
    const out = simplifyLine(bend, 1)
    expect(out).toEqual([bend[0], bend[9], bend[19]])
    for (const p of bend) expect(snapPointToPolyline(p, out).distMeters).toBeLessThanOrEqual(1)
  })
})
