import { describe, expect, it } from 'vitest'
import {
  isRoadShape,
  offRoadShapeMessage,
  polesOffRoadShape,
  roadShapeDetourMessage,
  segmentLineAfter,
} from '../../utils/gis-map/segmentRoadShape'
import type { OrderedPole } from '../../utils/gis-map/segmentPoleOrder'

// Ba cột dọc một đường hướng đông, cách nhau ~110 m
const pole = (id: string, lngStep: number, lat = 10.8): OrderedPole => ({ id, coord: [106.8 + lngStep * 0.001, lat] })
const A = pole('POLE-0001', 0)
const B = pole('POLE-0002', 1)
const C = pole('POLE-0003', 2)

// Đường nối thẳng các cột (bản nháp)
const JOINED = 'LINESTRING(106.8 10.8, 106.801 10.8, 106.802 10.8)'
// Hình theo con đường: chạy song song cách cột ~10 m, đỉnh không trùng cột nào
const ROAD = 'LINESTRING(106.7995 10.80009, 106.8005 10.80009, 106.8015 10.80009, 106.8025 10.80009)'

describe('isRoadShape', () => {
  it('tuyến chưa có hình thì không phải hình theo đường', () => {
    expect(isRoadShape([A, B, C], null)).toBe(false)
    expect(isRoadShape([A, B, C], 'LINESTRING(106.8 10.8)')).toBe(false)
  })

  it('đường nối đúng qua các cột là bản nháp', () => {
    expect(isRoadShape([A, B, C], JOINED)).toBe(false)
  })

  it('đường có đỉnh không trùng cột là hình theo con đường', () => {
    expect(isRoadShape([A, B, C], ROAD)).toBe(true)
  })

  it('nối cột nhưng kéo hai đầu ra ngoài cột đầu / cuối (đoạn không có cột) là hình thật', () => {
    expect(isRoadShape([A, B, C], 'LINESTRING(106.799 10.8, 106.8 10.8, 106.801 10.8, 106.802 10.8)')).toBe(true)
    expect(isRoadShape([A, B, C], 'LINESTRING(106.8 10.8, 106.801 10.8, 106.802 10.8, 106.803 10.8)')).toBe(true)
  })

  it('nối cột có điểm uốn ở giữa vẫn là bản nháp', () => {
    expect(isRoadShape([A, B, C], 'LINESTRING(106.8 10.8, 106.8005 10.8003, 106.801 10.8, 106.802 10.8)')).toBe(false)
  })

  it('đã có hình mà chưa đủ 2 cột thì hình không thể dựng từ cột: coi là hình theo đường', () => {
    expect(isRoadShape([], ROAD)).toBe(true)
    expect(isRoadShape([A], ROAD)).toBe(true)
  })
})

describe('segmentLineAfter', () => {
  const movedB = pole('POLE-0002', 1, 10.8005)

  it('hình theo đường giữ nguyên dù cột dời', () => {
    const after = segmentLineAfter([A, B, C], ROAD, [A, movedB, C])
    expect(after.roadShape).toBe(true)
    expect(after.line).toEqual([
      [106.7995, 10.80009],
      [106.8005, 10.80009],
      [106.8015, 10.80009],
      [106.8025, 10.80009],
    ])
  })

  it('bản nháp nối cột thì đi theo cột vừa dời', () => {
    const after = segmentLineAfter([A, B, C], JOINED, [A, movedB, C])
    expect(after.roadShape).toBe(false)
    expect(after.line).toEqual([A.coord, movedB.coord, C.coord])
  })
})

describe('polesOffRoadShape', () => {
  const line: [number, number][] = [
    [106.7995, 10.80009],
    [106.8025, 10.80009],
  ]

  it('cột cách đường ~10 m nằm trong hành lang 25 m', () => {
    expect(polesOffRoadShape([{ label: 'KS-01', coord: A.coord }], line)).toEqual([])
  })

  it('cột cách đường ~45 m bị nêu tên', () => {
    expect(
      polesOffRoadShape(
        [
          { label: 'KS-01', coord: A.coord },
          { label: 'KS-02', coord: [106.801, 10.8005] },
        ],
        line
      )
    ).toEqual(['KS-02'])
  })
})

describe('offRoadShapeMessage', () => {
  it('nêu số cột, hành lang 25 m và cách sửa', () => {
    const message = offRoadShapeMessage(['KS-01', 'KS-02'])
    expect(message).toMatch(/^2 cột nằm cách hình tuyến quá 25 m \(KS-01, KS-02\)\./)
    expect(message).toContain('form "Sửa tuyến"')
    expect(message).not.toContain('Bản đồ GIS')
  })

  it('nhiều hơn 5 cột thì chỉ nêu 5 mã đầu', () => {
    const message = offRoadShapeMessage(['A1', 'A2', 'A3', 'A4', 'A5', 'A6'])
    expect(message).toMatch(/^6 cột .* \(A1, A2, A3, A4, A5…\)\./)
  })
})

describe('roadShapeDetourMessage', () => {
  const poles = [A, B, C]
  // Hình đi thẳng qua ba cột
  const STRAIGHT: [number, number][] = [A.coord, B.coord, C.coord]
  // Hình đi qua cột A rồi vọt ra xa ~220 m về phía bắc, quay lại qua B, C: đi vòng
  const SPUR: [number, number][] = [A.coord, [106.8005, 10.802], B.coord, C.coord]

  it('hình đi dọc các cột: không cảnh báo', () => {
    expect(roadShapeDetourMessage(STRAIGHT, poles)).toBeNull()
  })

  it('hình có mũi nhọn quay ngược: cảnh báo, nêu chiều dài hình và chuỗi cột', () => {
    const message = roadShapeDetourMessage(SPUR, poles)
    expect(message).toMatch(/^Hình dài .* m nhưng các cột của tuyến nối nhau chỉ dài .* m\./)
    expect(message).toContain('đi vòng hoặc quay ngược')
  })

  it('dư ít mét thì bỏ qua dù tỉ lệ cao; chưa đủ 2 cột thì không so', () => {
    const slight: [number, number][] = [A.coord, [106.8005, 10.80035], B.coord, C.coord]
    expect(roadShapeDetourMessage(slight, poles)).toBeNull()
    expect(roadShapeDetourMessage(SPUR, [A])).toBeNull()
  })
})
