import { describe, it, expect } from 'vitest'
import { latestSuccessAutoSchedule, latestSuccessChoice } from '../../utils/iot/iotCommand'

describe('latestSuccessAutoSchedule (lịch điền sẵn cho form AUTO)', () => {
  it('takes the schedule of the newest success AUTO, skipping pending / expired AUTO and MANUAL commands', () => {
    expect(
      latestSuccessAutoSchedule([
        { mode: 'AUTO', command: null, status: 'pending', auto_schedule: { day_start: '07:00', night_start: '19:00' } },
        { mode: 'MANUAL', command: 'ON', status: 'success' },
        { mode: 'AUTO', command: null, status: 'expired', auto_schedule: { day_start: '08:00', night_start: '20:00' } },
        { mode: 'AUTO', command: null, status: 'success', auto_schedule: { day_start: '05:30', night_start: '18:15' } },
        { mode: 'AUTO', command: null, status: 'success', auto_schedule: { day_start: '06:00', night_start: '18:00' } },
      ])
    ).toEqual({ day_start: '05:30', night_start: '18:15' })
  })

  it('no success AUTO with a full schedule → null (form uses the default)', () => {
    expect(latestSuccessAutoSchedule([{ mode: 'AUTO', command: null, status: 'success' }])).toBeNull()
    expect(latestSuccessAutoSchedule([])).toBeNull()
    expect(latestSuccessAutoSchedule(undefined)).toBeNull()
  })
})

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
