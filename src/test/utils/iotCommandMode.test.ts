import { describe, it, expect } from 'vitest'
import { latestSuccessChoice } from '../../utils/iot/iotCommand'

describe('latestSuccessChoice (chế độ mạch từ lịch sử lệnh, mới nhất trước)', () => {
  it('takes the newest success command and skips newer pending / expired ones', () => {
    expect(
      latestSuccessChoice([
        { command_id: 'c3', mode: 'MANUAL', command: 'ON', status: 'pending' },
        { command_id: 'c2', mode: 'AUTO', command: null, status: 'expired' },
        { command_id: 'c1', mode: 'MANUAL', command: 'OFF', status: 'success' },
        { command_id: 'c0', mode: 'AUTO', command: null, status: 'success' },
      ])
    ).toBe('off')
  })

  it('maps AUTO and MANUAL ON', () => {
    expect(latestSuccessChoice([{ mode: 'AUTO', command: null, status: 'success' }])).toBe('auto')
    expect(latestSuccessChoice([{ mode: 'MANUAL', command: 'ON', status: 'success' }])).toBe('on')
  })

  it('no success command → no mode shown', () => {
    expect(latestSuccessChoice([{ mode: 'MANUAL', command: 'ON', status: 'pending' }])).toBeNull()
    expect(latestSuccessChoice([])).toBeNull()
    expect(latestSuccessChoice(undefined)).toBeNull()
  })
})
