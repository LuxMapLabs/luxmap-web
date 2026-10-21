import { describe, expect, it } from 'vitest'
import { toBboxParam, toLngLatBounds } from '../../utils/gis-map/mapUtils'
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
})
