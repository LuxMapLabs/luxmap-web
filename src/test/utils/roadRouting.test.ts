import { describe, it, expect } from 'vitest'
import {
  buildRoadGraph,
  joinLegs,
  lineToWkt,
  roadLinesFromFeatures,
  routeAlongRoads,
  snapToRoad,
  type LngLat,
  type RoadRoute,
} from '../../utils/gis-map/roadRouting'
import { calculateDistanceMeters, snapPointToPolyline } from '../../utils/gis-map/routeUtils'

// Toạ độ theo mét quanh một điểm ở Củ Chi, để dựng đường giả dễ đọc
const LAT0 = 10.97
const LNG0 = 106.49
const KY = (6371000 * Math.PI) / 180
const KX = KY * Math.cos((LAT0 * Math.PI) / 180)
const at = (x: number, y: number): LngLat => [LNG0 + x / KX, LAT0 + y / KY]

const ok = (r: RoadRoute | { error: string }): RoadRoute => {
  if ('error' in r) throw new Error(`Không tìm được đường: ${r.error}`)
  return r
}

/** Khoảng cách lớn nhất từ các đỉnh của `line` tới đường `ref` (mét). */
const maxOffset = (line: LngLat[], ref: LngLat[]) => Math.max(...line.map((p) => snapPointToPolyline(p, ref).distMeters))

describe('roadLinesFromFeatures: chỉ lấy đường xe chạy được', () => {
  it('bỏ đường đi bộ, đường sắt; tách MultiLineString thành từng nét', () => {
    const lines = roadLinesFromFeatures([
      { geometry: { type: 'LineString', coordinates: [at(0, 0), at(10, 0)] }, properties: { class: 'minor' } },
      { geometry: { type: 'LineString', coordinates: [at(0, 5), at(10, 5)] }, properties: { class: 'path' } },
      { geometry: { type: 'LineString', coordinates: [at(0, 9), at(10, 9)] }, properties: { class: 'rail' } },
      {
        geometry: { type: 'MultiLineString', coordinates: [[at(0, 20), at(5, 20)], [at(6, 20), at(9, 20)]] },
        properties: { class: 'service' },
      },
      { geometry: { type: 'LineString', coordinates: [at(0, 30)] }, properties: { class: 'track' } },
    ])
    expect(lines).toHaveLength(3)
  })
})

describe('routeAlongRoads: tìm đoạn dọc theo đường giữa hai điểm bấm', () => {
  it('đi theo khúc cua, không cắt thẳng', () => {
    // Đường chữ L: 200 m về phía Đông rồi 150 m về phía Bắc
    const road = [at(0, 0), at(200, 0), at(200, 150)]
    const g = buildRoadGraph([road])
    const r = ok(routeAlongRoads(g, at(0, 3), at(197, 150)))
    expect(r.lengthM).toBeGreaterThanOrEqual(349)
    expect(r.lengthM).toBeLessThanOrEqual(351)
    expect(maxOffset(r.line, road)).toBeLessThan(0.5)
    // Hai đầu là chỗ bấm chiếu xuống đường
    expect(calculateDistanceMeters(r.line[0], at(0, 0))).toBeLessThan(0.5)
    expect(calculateDistanceMeters(r.line[r.line.length - 1], at(200, 150))).toBeLessThan(0.5)
  })

  it('ghép được con đường bị cắt ở mép ô bản đồ (mẩu này lấn sang ô kia)', () => {
    // Một con đường thẳng 400 m, bị cắt tại x = 200: mẩu trái kéo tới 203, mẩu phải bắt đầu từ 197
    const g = buildRoadGraph([
      [at(0, 0), at(203, 0)],
      [at(197, 0.3), at(400, 0.3)],
    ])
    const r = ok(routeAlongRoads(g, at(10, 0), at(390, 0)))
    expect(r.lengthM).toBeGreaterThanOrEqual(379)
    expect(r.lengthM).toBeLessThanOrEqual(381)
  })

  it('ghép được vết cắt mà hai mẩu chỉ chạm nhau, lệch nhau dưới 1 m', () => {
    const g = buildRoadGraph([
      [at(0, 0), at(150, 40), at(200, 40)],
      [at(200.6, 40.4), at(260, 40), at(300, 0)],
    ])
    const r = ok(routeAlongRoads(g, at(0, 0), at(300, 0)))
    expect(r.lengthM).toBeLessThan(330)
  })

  it('đi vòng theo đường chữ U dù hai điểm đứng gần nhau', () => {
    const road = [at(0, 0), at(0, 300), at(40, 300), at(40, 0)]
    const g = buildRoadGraph([road])
    const r = ok(routeAlongRoads(g, at(0, 0), at(40, 0)))
    expect(r.lengthM).toBeGreaterThan(630)
    expect(maxOffset(r.line, road)).toBeLessThan(0.5)
  })

  it('ở ngã ba chọn đường ngắn nhất', () => {
    const g = buildRoadGraph([
      [at(0, 0), at(100, 0), at(200, 0)],
      [at(100, 0), at(100, 100)],
      // Đường vòng dài hơn từ (0,0) lên (100,100)
      [at(0, 0), at(0, 300), at(100, 300), at(100, 100)],
    ])
    const r = ok(routeAlongRoads(g, at(0, 0), at(100, 100)))
    expect(r.lengthM).toBeGreaterThanOrEqual(199)
    expect(r.lengthM).toBeLessThanOrEqual(201)
  })

  it('ngã tư mất đỉnh chung (ô zoom thấp đã giản lược): rẽ ngay tại giao điểm, không đi vòng', () => {
    const g = buildRoadGraph([
      // Đường chính chạy Đông - Tây, không có đỉnh nào ở x = 100
      [at(0, 0), at(200, 0)],
      // Đường ngang cắt qua đường chính, cũng không có đỉnh ở y = 0
      [at(100, -50), at(100, 100)],
      // Đường vòng dài nối hai đầu, là lối duy nhất nếu ngã tư không được nối
      [at(0, 0), at(0, 300), at(100, 300), at(100, 100)],
    ])
    const r = ok(routeAlongRoads(g, at(0, 0), at(100, 100)))
    expect(r.lengthM).toBeGreaterThanOrEqual(199)
    expect(r.lengthM).toBeLessThanOrEqual(201)
  })

  it('nhiều đường cắt cùng một đoạn: nối đủ từng giao điểm', () => {
    const g = buildRoadGraph([
      [at(0, 0), at(300, 0)],
      [at(100, -50), at(100, 50)],
      [at(200, -50), at(200, 50)],
    ])
    const r = ok(routeAlongRoads(g, at(100, 50), at(200, -50)))
    expect(r.lengthM).toBeGreaterThanOrEqual(199)
    expect(r.lengthM).toBeLessThanOrEqual(201)
  })

  it('hai điểm trên cùng một đoạn: đi thẳng giữa hai điểm', () => {
    const g = buildRoadGraph([[at(0, 0), at(500, 0)]])
    const r = ok(routeAlongRoads(g, at(100, 2), at(300, -2)))
    expect(r.line).toHaveLength(2)
    expect(r.lengthM).toBe(200)
  })

  it('bấm xa đường quá 30 m: báo điểm nào không nằm trên đường', () => {
    const g = buildRoadGraph([[at(0, 0), at(500, 0)]])
    expect(routeAlongRoads(g, at(100, 45), at(300, 0))).toEqual({ error: 'start_off_road' })
    expect(routeAlongRoads(g, at(100, 0), at(300, -45))).toEqual({ error: 'end_off_road' })
  })

  it('hai con đường không nối với nhau: không tìm được đường', () => {
    const g = buildRoadGraph([
      [at(0, 0), at(100, 0)],
      [at(0, 60), at(100, 60)],
    ])
    expect(routeAlongRoads(g, at(10, 0), at(90, 60))).toEqual({ error: 'no_path' })
  })

  it('đầu cụt nằm cách đường khác hơn 2 m thì không tự nối (không đi tắt qua nhà dân)', () => {
    const g = buildRoadGraph([
      [at(0, 0), at(100, 0)],
      [at(50, 5), at(50, 100)],
    ])
    expect(routeAlongRoads(g, at(10, 0), at(50, 90))).toEqual({ error: 'no_path' })
  })
})

describe('snapToRoad, joinLegs, lineToWkt', () => {
  it('chỗ bấm chiếu xuống đường; xa quá thì null', () => {
    const g = buildRoadGraph([[at(0, 0), at(100, 0)]])
    expect(calculateDistanceMeters(snapToRoad(g, at(40, 7)) as LngLat, at(40, 0))).toBeLessThan(0.1)
    expect(snapToRoad(g, at(40, 31))).toBeNull()
  })

  it('nối các chặng, điểm nối chỉ giữ một lần; WKT theo thứ tự lng lat', () => {
    const line = joinLegs([
      [[1, 2], [3, 4]],
      [[3, 4], [5, 6]],
    ])
    expect(line).toEqual([[1, 2], [3, 4], [5, 6]])
    expect(lineToWkt(line)).toBe('LINESTRING(1 2, 3 4, 5 6)')
  })
})
