import { describe, it, expect } from 'vitest'
import {
  clipLineBetween,
  edgeMidpoints,
  extendLine,
  insertVertex,
  moveVertex,
  removeVertex,
  simplifyLine,
  trimLineAt,
  type LngLat,
} from '../../utils/gis-map/lineEdit'
import { calculateDistanceMeters, snapPointToPolyline } from '../../utils/gis-map/routeUtils'

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

describe('extendLine', () => {
  it('gần đầu -> thêm vào đầu (start)', () => {
    const nearStart: LngLat = [106.799, 10.8]
    expect(extendLine(L, nearStart)).toEqual({
      line: [nearStart, ...L],
      end: 'start',
    })
  })

  it('gần cuối -> thêm vào cuối (end)', () => {
    const nearEnd: LngLat = [106.803, 10.801]
    expect(extendLine(L, nearEnd)).toEqual({
      line: [...L, nearEnd],
      end: 'end',
    })
  })

  it('khoảng cách bằng nhau -> chọn end', () => {
    const line2: LngLat[] = [
      [106.8, 10.8],
      [106.802, 10.8],
    ]
    const mid: LngLat = [106.801, 10.8]
    expect(extendLine(line2, mid)).toEqual({
      line: [...line2, mid],
      end: 'end',
    })
  })

  it('hình < 2 đỉnh -> giữ nguyên', () => {
    const single: LngLat[] = [[106.8, 10.8]]
    expect(extendLine(single, [106.801, 10.8])).toEqual({
      line: single,
      end: 'end',
    })
    expect(extendLine([], [106.801, 10.8])).toEqual({
      line: [],
      end: 'end',
    })
  })
})

describe('trimLineAt', () => {
  const line4: LngLat[] = [
    [106.8, 10.8],
    [106.801, 10.8],
    [106.802, 10.8],
    [106.803, 10.8],
  ]
  const segLen = calculateDistanceMeters(line4[0], line4[1])

  it('(1) cắt khúc cuối, không có cột trong phần cắt -> bỏ đỉnh sau, end = end', () => {
    expect(trimLineAt(line4, 2, [segLen * 0.5, segLen * 1.5])).toEqual({
      line: [line4[0], line4[1], line4[2]],
      end: 'end',
    })
  })

  it('(2) cắt khúc đầu -> bỏ đỉnh đầu, end = start', () => {
    expect(trimLineAt(line4, 0, [segLen * 1.5, segLen * 2.5])).toEqual({
      line: [line4[1], line4[2], line4[3]],
      end: 'start',
    })
  })

  it('(3) có cột trong phần bị cắt -> has_poles', () => {
    expect(trimLineAt(line4, 0, [segLen * 0.4])).toEqual({
      line: null,
      reason: 'has_poles',
    })
    expect(trimLineAt(line4, 2, [segLen * 2.5])).toEqual({
      line: null,
      reason: 'has_poles',
    })
  })

  it('(4) cột nằm đúng biên 0.2 m trong phần cắt -> has_poles', () => {
    expect(trimLineAt(line4, 0, [segLen - 0.2])).toEqual({
      line: null,
      reason: 'has_poles',
    })
    expect(trimLineAt(line4, 2, [segLen * 2 + 0.2])).toEqual({
      line: null,
      reason: 'has_poles',
    })
  })

  it('(5) edgeIndex sai -> invalid', () => {
    expect(trimLineAt(line4, -1, [])).toEqual({ line: null, reason: 'invalid' })
    expect(trimLineAt(line4, 3, [])).toEqual({ line: null, reason: 'invalid' })
    expect(trimLineAt(line4, 1.5, [])).toEqual({ line: null, reason: 'invalid' })
    expect(trimLineAt([[106.8, 10.8]], 0, [])).toEqual({ line: null, reason: 'invalid' })
  })

  it('(6) cắt xong còn dưới 2 đỉnh (còn 1 đỉnh) -> too_short', () => {
    const line2: LngLat[] = [
      [106.8, 10.8],
      [106.801, 10.8],
    ]
    expect(trimLineAt(line2, 0, [])).toEqual({
      line: null,
      reason: 'too_short',
    })
    // Hình 3 đỉnh có khúc đầu trùng đỉnh (0m) khi cắt khúc 1 về đầu chỉ còn 1 đỉnh cuối
    const line3Collapsed: LngLat[] = [
      [106.8, 10.8],
      [106.8, 10.8],
      [106.801, 10.8],
    ]
    expect(trimLineAt(line3Collapsed, 1, [])).toEqual({
      line: null,
      reason: 'too_short',
    })
  })

  it('(7) cột nằm ở phần giữ lại thì cắt được', () => {
    expect(trimLineAt(line4, 0, [segLen + 5, segLen * 2])).toEqual({
      line: [line4[1], line4[2], line4[3]],
      end: 'start',
    })
    expect(trimLineAt(line4, 2, [10, segLen * 2 - 5])).toEqual({
      line: [line4[0], line4[1], line4[2]],
      end: 'end',
    })
  })
})

describe('clipLineBetween', () => {
  const line4: LngLat[] = [
    [106.8, 10.8],
    [106.801, 10.8],
    [106.802, 10.8],
    [106.803, 10.8],
  ]
  const segLen = calculateDistanceMeters(line4[0], line4[1])

  it('cắt cả hai đầu giữa cạnh, giữ nguyên các đỉnh ở giữa', () => {
    const out = clipLineBetween(line4, segLen * 0.5, segLen * 2.5)
    expect(out).toEqual([
      [106.8005, 10.8],
      [106.801, 10.8],
      [106.802, 10.8],
      [106.8025, 10.8],
    ])
  })

  it('giữ nguyên khi fromAlong >= toAlong hoặc hình < 2 đỉnh', () => {
    expect(clipLineBetween(line4, segLen * 2, segLen)).toBe(line4)
    expect(clipLineBetween(line4, segLen, segLen)).toBe(line4)
    const single: LngLat[] = [[106.8, 10.8]]
    expect(clipLineBetween(single, 0, 10)).toBe(single)
  })

  it('kẹp fromAlong và toAlong ngoài phạm vi [0, tổng chiều dài]', () => {
    expect(clipLineBetween(line4, -20, segLen * 5)).toEqual(line4)
  })
})
