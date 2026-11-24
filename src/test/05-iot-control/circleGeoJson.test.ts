import { describe, expect, it } from 'vitest'
import { circleRing, isDrawableRadiusKm } from '../../utils/gis-map/circleGeoJson'

const haversineKm = (a: [number, number], b: [number, number]) => {
  const rad = (d: number) => (d * Math.PI) / 180
  const h =
    Math.sin(rad(b[1] - a[1]) / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2
  return 2 * 6371.0088 * Math.asin(Math.sqrt(h))
}

describe('circleRing', () => {
  it('closes the ring and keeps every point at the requested radius from the center', () => {
    const ring = circleRing(106.5, 10.97, 0.75)
    expect(ring[0]).toEqual(ring[ring.length - 1])
    ring.forEach((pt) => expect(haversineKm([106.5, 10.97], pt)).toBeCloseTo(0.75, 3))
  })
})

describe('isDrawableRadiusKm', () => {
  it('draws only a finite radius above zero', () => {
    expect(isDrawableRadiusKm(0.2)).toBe(true)
    expect(isDrawableRadiusKm(0)).toBe(false)
    expect(isDrawableRadiusKm(undefined)).toBe(false)
    expect(isDrawableRadiusKm(Number.NaN)).toBe(false)
    expect(isDrawableRadiusKm(-1)).toBe(false)
  })
})
