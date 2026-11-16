import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../config/apiClient', () => ({
  default: { put: vi.fn().mockResolvedValue({ status: 204 }), patch: vi.fn() },
}))

import apiClient from '../../../config/apiClient'
import { assetAPI } from '../../../feature/assets/assetAPI'

describe('assetAPI.updateFixture', () => {
  it('gửi PUT /assets/fixtures/{id} với đủ thông số (BE thay toàn bộ)', async () => {
    const data = {
      fixture_type: 'led_road_lamp' as const,
      power_source: 'grid' as const,
      lamp_watt: 100,
      lamp_count: 2,
      install_date: '2023-01-15',
      warranty_expiry: null,
      note: null,
    }
    await assetAPI.updateFixture('FIX-0001', data)
    expect(apiClient.put).toHaveBeenCalledWith('/assets/fixtures/FIX-0001', data)
    expect(apiClient.patch).not.toHaveBeenCalled()
  })
})
