import { describe, it, expect } from 'vitest'
import { latestSuccessAutoSchedule } from '../../utils/iot/iotCommand'

describe('latestSuccessAutoSchedule (lịch điền sẵn cho form AUTO)', () => {
  it('takes the schedule of the newest success AUTO, skipping pending AUTO and MANUAL commands', () => {
    expect(
      latestSuccessAutoSchedule([
        { mode: 'AUTO', command: null, status: 'pending', auto_schedule: { day_start: '07:00', night_start: '19:00' } },
        { mode: 'MANUAL', command: 'ON', status: 'success' },
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
