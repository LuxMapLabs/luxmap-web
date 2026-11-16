import { describe, it, expect } from 'vitest'
import {
  MIN_ROAD_ZOOM,
  RESHAPE_MESSAGES,
  addFreehandPoint,
  addReshapePoint,
  polesFarFromLine,
  polesNearLine,
  reshapeLine,
  startReshape,
  undoReshapePoint,
} from '../../utils/gis-map/segmentReshape'
import type { LngLat } from '../../utils/gis-map/roadRouting'
import { calculateDistanceMeters, calculateRouteLengthMeters } from '../../utils/gis-map/routeUtils'

const LAT0 = 10.97
const LNG0 = 106.49
const KY = (6371000 * Math.PI) / 180
const KX = KY * Math.cos((LAT0 * Math.PI) / 180)
const at = (x: number, y: number): LngLat => [LNG0 + x / KX, LAT0 + y / KY]

// Đường chữ L 200 m + 150 m, và một đường rời không nối vào
const ROADS: LngLat[][] = [
  [at(0, 0), at(200, 0), at(200, 150)],
  [at(0, 400), at(100, 400)],
]
const Z = MIN_ROAD_ZOOM + 1

describe('khung xã: không cho bấm điểm ngoài địa bàn xã', () => {
  // Khung 300 m x 300 m quanh đường chữ L
  const FRAME: [[number, number], [number, number]] = [at(-50, -50), at(250, 200)]

  it('lấy theo đường: điểm ngoài khung bị từ chối, trong khung vẫn nhận', () => {
    const start = startReshape('SEG-1', 'Tuyến 1', 300)
    const out = addReshapePoint(start, ROADS, at(10, 0), Z, [at(500, 500), at(600, 600)])
    expect(out.points).toHaveLength(0)
    expect(out.error).toBe(RESHAPE_MESSAGES.outsideCommune)

    const inside = addReshapePoint(start, ROADS, at(10, 0), Z, FRAME)
    expect(inside.error).toBeNull()
    expect(inside.points).toHaveLength(1)
  })

  it('vẽ tay: điểm ngoài khung bị từ chối và không đổi các điểm đã có', () => {
    const first = addFreehandPoint(startReshape('SEG-1', 'Tuyến 1', 300), at(50, 60), FRAME)
    const out = addFreehandPoint(first, at(900, 60), FRAME)
    expect(out.points).toEqual(first.points)
    expect(out.error).toBe(RESHAPE_MESSAGES.outsideCommune)
  })

  it('không có khung (xã chưa khai khung) thì không chặn', () => {
    const r = addFreehandPoint(startReshape('SEG-1', 'Tuyến 1', 300), at(9000, 9000), null)
    expect(r.error).toBeNull()
    expect(r.points).toHaveLength(1)
  })
})

describe('addReshapePoint: lấy hình tuyến từng điểm bấm', () => {
  it('chưa phóng đủ gần: không lấy, nhắc phóng to', () => {
    const next = addReshapePoint(startReshape('SEG-1', 'Tuyến 1', 300), ROADS, at(0, 0), MIN_ROAD_ZOOM - 0.5)
    expect(next.points).toHaveLength(0)
    expect(next.error).toBe(RESHAPE_MESSAGES.zoom)
  })

  it('điểm đầu chiếu xuống đường; bấm xa đường thì báo', () => {
    const start = startReshape('SEG-1', 'Tuyến 1', 300)
    const off = addReshapePoint(start, ROADS, at(50, 60), Z)
    expect(off.points).toHaveLength(0)
    expect(off.error).toBe(RESHAPE_MESSAGES.offRoad)

    const first = addReshapePoint(off, ROADS, at(10, 6), Z)
    expect(first.error).toBeNull()
    expect(first.points).toHaveLength(1)
    expect(calculateDistanceMeters(first.points[0], at(10, 0))).toBeLessThan(0.1)
    expect(first.legs).toHaveLength(0)
    expect(reshapeLine(first)).toEqual([])
  })

  it('điểm sau nối từ điểm trước dọc theo đường, qua cả khúc cua', () => {
    let r = addReshapePoint(startReshape('SEG-1', 'Tuyến 1', 300), ROADS, at(0, 0), Z)
    r = addReshapePoint(r, ROADS, at(200, 150), Z)
    expect(r.points).toHaveLength(2)
    expect(r.legs).toHaveLength(1)
    expect(calculateRouteLengthMeters(reshapeLine(r))).toBe(350)
  })

  it('không có đường nối tới chỗ bấm: giữ nguyên các điểm cũ, báo lý do', () => {
    const first = addReshapePoint(startReshape('SEG-1', 'Tuyến 1', 300), ROADS, at(0, 0), Z)
    const next = addReshapePoint(first, ROADS, at(50, 400), Z)
    expect(next.points).toEqual(first.points)
    expect(next.error).toBe(RESHAPE_MESSAGES.noPath)
  })

  it('điểm trước đã ra khỏi vùng bản đồ đang tải: nhắc kéo bản đồ', () => {
    const first = addReshapePoint(startReshape('SEG-1', 'Tuyến 1', 300), ROADS, at(0, 0), Z)
    // Chỉ còn đường rời trong vùng xem
    const next = addReshapePoint(first, [ROADS[1]], at(50, 400), Z)
    expect(next.error).toBe(RESHAPE_MESSAGES.previousOutOfView)
  })

  it('bỏ điểm cuối: bỏ luôn đoạn dẫn tới nó', () => {
    let r = addReshapePoint(startReshape('SEG-1', 'Tuyến 1', 300), ROADS, at(0, 0), Z)
    r = addReshapePoint(r, ROADS, at(200, 0), Z)
    r = addReshapePoint(r, ROADS, at(200, 150), Z)
    expect(r.legs).toHaveLength(2)

    r = undoReshapePoint(r)
    expect(r.points).toHaveLength(2)
    expect(r.legs).toHaveLength(1)
    r = undoReshapePoint(r)
    expect(r.points).toHaveLength(1)
    expect(r.legs).toHaveLength(0)
    r = undoReshapePoint(r)
    expect(r.points).toHaveLength(0)
    expect(r.legs).toHaveLength(0)
  })
})

describe('polesFarFromLine: cột của tuyến ngoài hành lang 25 m quanh hình mới', () => {
  const line = [at(0, 0), at(300, 0)]

  it('liệt kê cột xa quá 25 m, bỏ qua cột trong hành lang', () => {
    const far = polesFarFromLine(
      [
        { label: 'KS-01', coord: at(50, 8) },
        { label: 'KS-02', coord: at(150, -30) },
        { label: 'KS-03', coord: at(400, 0) },
      ],
      line
    )
    expect(far).toEqual(['KS-02', 'KS-03'])
  })

  it('chưa có đoạn nào thì chưa đo', () => {
    expect(polesFarFromLine([{ label: 'KS-01', coord: at(500, 500) }], [at(0, 0)])).toEqual([])
  })
})

describe('polesNearLine', () => {
  it('chỉ lấy cột nằm trong hành lang 25 m quanh hình', () => {
    const line: [number, number][] = [
      [106.7995, 10.80009],
      [106.8025, 10.80009],
    ]
    const ids = polesNearLine(
      [
        { id: 'gan', coord: [106.8, 10.8] },
        { id: 'xa', coord: [106.801, 10.8005] },
        { id: 'sat-nguong', coord: [106.801, 10.80009 + 24 / 111195] },
      ],
      line
    )
    expect(ids).toEqual(['gan', 'sat-nguong'])
  })

  it('chưa có hình (dưới 2 điểm) thì không gợi ý gì', () => {
    expect(polesNearLine([{ id: 'a', coord: [106.8, 10.8] }], [[106.8, 10.8]])).toEqual([])
  })
})

describe('addFreehandPoint: vẽ tay cho đường không có trên bản đồ nền', () => {
  it('bấm chỗ không có đường: vẫn nhận, nối thẳng các điểm, không đòi phóng to', () => {
    let r = addFreehandPoint(startReshape('SEG-1', 'Tuyến 1', 300), at(50, 60))
    expect(r.error).toBeNull()
    r = addFreehandPoint(r, at(50, 160))
    r = addFreehandPoint(r, at(150, 160))
    expect(r.points).toEqual([at(50, 60), at(50, 160), at(150, 160)])
    expect(reshapeLine(r)).toEqual([at(50, 60), at(50, 160), at(150, 160)])
    expect(r.freehand).toEqual([true, true, true])
  })

  it('vẽ tay xong bấm lại trên đường: điểm hút vào đường, nối thẳng từ điểm vẽ tay', () => {
    let r = addFreehandPoint(startReshape('SEG-1', 'Tuyến 1', 300), at(50, 60))
    r = addReshapePoint(r, ROADS, at(50, 5), Z)
    expect(r.error).toBeNull()
    expect(r.legs[r.legs.length - 1]).toHaveLength(2)
    expect(calculateDistanceMeters(r.points[1], at(50, 0))).toBeLessThan(0.1)
    expect(r.freehand).toEqual([true, false])
    // Từ điểm trên đường đi tiếp theo đường
    r = addReshapePoint(r, ROADS, at(200, 150), Z)
    expect(calculateRouteLengthMeters(r.legs[1])).toBeCloseTo(300, 0)
  })

  it('bỏ điểm cuối: bỏ cả cờ vẽ tay của nó', () => {
    let r = addReshapePoint(startReshape('SEG-1', 'Tuyến 1', 300), ROADS, at(0, 0), Z)
    r = addFreehandPoint(r, at(0, 80))
    r = undoReshapePoint(r)
    expect(r.points).toHaveLength(1)
    expect(r.freehand).toEqual([false])
  })
})
