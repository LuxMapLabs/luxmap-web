import { describe, expect, it } from 'vitest'
import {
  countVertices,
  geometryToPolygons,
  polygonsToBbox,
  polygonsToGeometry,
  simplifyRing,
} from '../../utils/communeBoundary'
import { parseCommuneSuggestions } from '../../utils/communeSearch'

const square = [
  [106, 11],
  [107, 11],
  [107, 12],
  [106, 12],
  [106, 11],
]

describe('communeBoundary', () => {
  it('bỏ đỉnh đóng vòng khi đọc Polygon và đóng lại khi xuất', () => {
    const polys = geometryToPolygons({ type: 'Polygon', coordinates: [square] })
    expect(polys).toHaveLength(1)
    expect(polys[0][0]).toHaveLength(4)
    expect(polygonsToGeometry(polys)).toEqual({ type: 'Polygon', coordinates: [square] })
  })

  it('MultiPolygon giữ nguyên số vùng, 1 vùng thì xuất Polygon', () => {
    const multi = geometryToPolygons({ type: 'MultiPolygon', coordinates: [[square], [square]] })
    expect(multi).toHaveLength(2)
    expect(polygonsToGeometry(multi)?.type).toBe('MultiPolygon')
    expect(polygonsToGeometry([multi[0]])?.type).toBe('Polygon')
  })

  it('kiểu không phải vùng hoặc rỗng -> không có ranh giới', () => {
    expect(geometryToPolygons({ type: 'Point', coordinates: [106, 11] })).toEqual([])
    expect(geometryToPolygons(null)).toEqual([])
    expect(polygonsToGeometry([])).toBeNull()
  })

  it('tính hộp bao và đếm đỉnh', () => {
    const polys = geometryToPolygons({ type: 'Polygon', coordinates: [square] })
    expect(polygonsToBbox(polys)).toEqual({ min_lng: 106, min_lat: 11, max_lng: 107, max_lat: 12 })
    expect(countVertices(polys)).toBe(4)
    expect(polygonsToBbox([])).toBeNull()
  })

  it('giản lược bỏ đỉnh thẳng hàng nhưng giữ hình dạng', () => {
    const ring: [number, number][] = []
    for (let i = 0; i < 20; i++) ring.push([106 + i * 0.01, 11])
    ring.push([106.2, 11.2], [106, 11.2])
    const simplified = simplifyRing(ring, 0.0001)
    expect(simplified.length).toBeLessThan(ring.length)
    expect(simplified.length).toBeGreaterThanOrEqual(3)
  })
})

describe('parseCommuneSuggestions', () => {
  const base = {
    class: 'boundary',
    addresstype: 'suburb',
    lon: '109.1',
    lat: '12.2',
    display_name: 'Diên Khánh, Khánh Hòa, Việt Nam',
    name: 'Diên Khánh',
  }

  it('giữ ranh giới Polygon, bỏ ranh giới kiểu điểm', () => {
    const polygon = { type: 'Polygon', coordinates: [square] }
    const out = parseCommuneSuggestions([
      { ...base, geojson: polygon },
      { ...base, name: 'Xã B', display_name: 'Xã B, Khánh Hòa, Việt Nam', geojson: { type: 'Point', coordinates: [1, 2] } },
    ])
    expect(out).toHaveLength(2)
    expect(out[0].geometry).toEqual(polygon)
    expect(out[1].geometry).toBeNull()
  })

  it('loại POI và dữ liệu không phải mảng', () => {
    expect(parseCommuneSuggestions({})).toEqual([])
    expect(parseCommuneSuggestions([{ ...base, name: 'UBND xã A', display_name: 'UBND xã A, Việt Nam' }])).toEqual([])
  })
})
