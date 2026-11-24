import { describe, expect, it } from 'vitest'
import { distanceKm, isWithinCoverage, serverCoverage } from '../../utils/iot/serverCoverage'

const server = { location: { lat: 10.85, lng: 106.8 }, radius_km: 2 }

describe('distanceKm', () => {
  it('is about 111 km per degree of latitude', () => {
    expect(distanceKm({ lat: 10, lng: 106 }, { lat: 11, lng: 106 })).toBeCloseTo(111.19, 1)
  })
})

describe('serverCoverage', () => {
  it('needs both a location and a radius above zero', () => {
    expect(serverCoverage(server)).toEqual({ center: { lat: 10.85, lng: 106.8 }, radiusKm: 2 })
    expect(serverCoverage({ ...server, radius_km: 0 })).toBeNull()
    expect(serverCoverage({ radius_km: 2 })).toBeNull()
    expect(serverCoverage(null)).toBeNull()
  })
})

describe('isWithinCoverage', () => {
  it('says whether a point is inside the radius', () => {
    expect(isWithinCoverage(server, { lat: 10.855, lng: 106.8 })).toBe(true)
    expect(isWithinCoverage(server, { lat: 10.95, lng: 106.8 })).toBe(false)
  })

  it('returns null (unknown) when there is no coverage or no point', () => {
    expect(isWithinCoverage(null, { lat: 10.85, lng: 106.8 })).toBeNull()
    expect(isWithinCoverage({ ...server, radius_km: 0 }, { lat: 10.85, lng: 106.8 })).toBeNull()
    expect(isWithinCoverage(server, undefined)).toBeNull()
  })
})
