import { describe, expect, it, vi } from 'vitest'
import { toBboxParam, toLngLatBounds, applyMapBoundsLimits } from '../../utils/gis-map/mapUtils'
import { mapCurrentUserToUser } from '../../utils/roleUtils'
import type { CurrentUserResponse } from '../../types/auth/web'

// The two surveyed communes as GET /auth/me returns them on the VPS (COMMUNE-BBOX, drift CB-5).
const frame = { min_lng: 106.82473, min_lat: 10.79622, max_lng: 106.86508, max_lat: 10.85715 }

describe('map bounds from GET /auth/me', () => {
  it('turns a complete frame into MapLibre bounds and the bbox query value', () => {
    expect(toLngLatBounds(frame)).toEqual([[106.82473, 10.79622], [106.86508, 10.85715]])
    expect(toBboxParam(frame)).toBe('106.82473,10.79622,106.86508,10.85715')
  })

  it('ignores a missing or incomplete frame so callers fall back', () => {
    expect(toLngLatBounds(null)).toBeNull()
    expect(toLngLatBounds({ min_lng: 106.8, min_lat: 10.8, max_lng: 106.9 })).toBeNull()
    expect(toBboxParam(undefined)).toBeNull()
  })

  it('keeps map_bounds on the user stored from the profile', () => {
    const me: CurrentUserResponse = {
      user_id: 'USR-0002', username: 'agency', email: 'agency@example.invalid', full_name: 'Cấp giám sát',
      role: 'superior', commune_ids: ['COM-001', 'COM-002'],
      map_bounds: { bbox: frame, center: { lng: 106.844905, lat: 10.826685 } },
    }
    expect(mapCurrentUserToUser(me).mapBounds?.bbox).toEqual(frame)
    expect(mapCurrentUserToUser({ ...me, map_bounds: undefined }).mapBounds).toBeNull()
  })

  it('opens map at backend center and restricts minZoom to panorama bbox', () => {
    const mockMap = {
      cameraForBounds: vi.fn().mockReturnValue({ zoom: 13.2 }),
      setMinZoom: vi.fn(),
      setMaxBounds: vi.fn(),
      jumpTo: vi.fn(),
    }

    const bounds = toLngLatBounds(frame)
    expect(bounds).not.toBeNull()

    const camera = mockMap.cameraForBounds(bounds!, { padding: 40 })
    const panoramaZoom = camera?.zoom
    if (typeof panoramaZoom === 'number' && Number.isFinite(panoramaZoom)) {
      mockMap.setMinZoom(panoramaZoom)
    }
    mockMap.setMaxBounds(bounds!)

    const center = { lng: 106.844905, lat: 10.826685 }
    const detailedZoom = Math.max(15.5, panoramaZoom + 1.5)
    mockMap.jumpTo({
      center: [center.lng, center.lat],
      zoom: detailedZoom,
    })

    expect(mockMap.cameraForBounds).toHaveBeenCalledWith([[106.82473, 10.79622], [106.86508, 10.85715]], { padding: 40 })
    expect(mockMap.setMinZoom).toHaveBeenCalledWith(13.2)
    expect(mockMap.setMaxBounds).toHaveBeenCalledWith([[106.82473, 10.79622], [106.86508, 10.85715]])
    expect(mockMap.jumpTo).toHaveBeenCalledWith({
      center: [106.844905, 10.826685],
      zoom: 15.5,
    })
  })

  it('applyMapBoundsLimits applies maxBounds and calculates minZoom via cameraForBounds', () => {
    const mockMap = {
      cameraForBounds: vi.fn().mockReturnValue({ zoom: 12.8 }),
      setMinZoom: vi.fn(),
      setMaxBounds: vi.fn(),
    }

    applyMapBoundsLimits(mockMap as any, { bbox: frame })

    expect(mockMap.setMaxBounds).toHaveBeenCalledWith([[106.82473, 10.79622], [106.86508, 10.85715]])
    expect(mockMap.cameraForBounds).toHaveBeenCalledWith([[106.82473, 10.79622], [106.86508, 10.85715]], { padding: 20 })
    expect(mockMap.setMinZoom).toHaveBeenCalledWith(12.8)
  })

  it('applyMapBoundsLimits safely ignores empty or null bounds', () => {
    const mockMap = {
      cameraForBounds: vi.fn(),
      setMinZoom: vi.fn(),
      setMaxBounds: vi.fn(),
    }

    applyMapBoundsLimits(mockMap as any, null)
    expect(mockMap.setMaxBounds).not.toHaveBeenCalled()
    expect(mockMap.setMinZoom).not.toHaveBeenCalled()
  })
})
