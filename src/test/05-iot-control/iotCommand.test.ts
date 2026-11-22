import { describe, it, expect } from 'vitest'
import { autoBody, autoTypeOf, commandBody, currentChoice, isClock } from '../../utils/iot/iotCommand'
import { IOT_GATEWAY_STATUS, IOT_NODE_STATUS, iotStatusBadge } from '../../constants/iot'

describe('iotCommand', () => {
  it('maps buttons to the bridge body', () => {
    expect(commandBody('on')).toEqual({ mode: 'MANUAL', command: 'ON' })
    expect(commandBody('off')).toEqual({ mode: 'MANUAL', command: 'OFF' })
    expect(commandBody('auto')).toEqual({ mode: 'AUTO', command: null })
  })

  it('builds AUTO command body for scheduled and full_time', () => {
    expect(autoBody('scheduled', { day_start: '06:00', night_start: '18:00' })).toEqual({
      mode: 'AUTO',
      command: null,
      auto_type: 'scheduled',
      auto_schedule: { day_start: '06:00', night_start: '18:00' },
    })
    expect(autoBody('scheduled')).toEqual({
      mode: 'AUTO',
      command: null,
      auto_type: 'scheduled',
    })
    expect('auto_schedule' in autoBody('scheduled')).toBe(false)

    const fullTimeBody = autoBody('full_time', { day_start: '06:00', night_start: '18:00' })
    expect(fullTimeBody).toEqual({
      mode: 'AUTO',
      command: null,
      auto_type: 'full_time',
    })
    expect('auto_schedule' in fullTimeBody).toBe(false)
  })

  it('extracts autoTypeOf from command status', () => {
    expect(autoTypeOf({ mode: 'AUTO', auto_type: 'full_time' })).toBe('full_time')
    expect(autoTypeOf({ mode: 'AUTO', auto_type: 'scheduled' })).toBe('scheduled')
    expect(autoTypeOf({ mode: 'AUTO', auto_type: null })).toBe('scheduled')
    expect(autoTypeOf({ mode: 'AUTO' })).toBe('scheduled')
    expect(autoTypeOf({ mode: 'auto', auto_type: 'full_time' })).toBe('full_time')
    expect(autoTypeOf({ mode: 'auto' })).toBe('scheduled')
    expect(autoTypeOf({ mode: 'MANUAL', auto_type: 'full_time' })).toBeNull()
    expect(autoTypeOf(null)).toBeNull()
    expect(autoTypeOf(undefined)).toBeNull()
  })

  it('reads the current command back', () => {
    expect(currentChoice({ mode: 'AUTO', command: null })).toBe('auto')
    expect(currentChoice({ mode: 'MANUAL', command: 'OFF' })).toBe('off')
    expect(currentChoice({ mode: 'MANUAL', command: 'ON' })).toBe('on')
    expect(currentChoice(null)).toBeNull()
  })

  it('accepts only 24-hour HH:mm', () => {
    expect(isClock('07:00')).toBe(true)
    expect(isClock('23:59')).toBe(true)
    expect(isClock('24:00')).toBe(false)
    expect(isClock('7:00')).toBe(false)
  })

  it('falls back to an unknown badge for values the table does not know', () => {
    expect(iotStatusBadge(IOT_GATEWAY_STATUS, 'broker_down').tone).toBe('bad')
    expect(iotStatusBadge(IOT_NODE_STATUS, 'something_new').label).toBe('Không xác định')
    expect(iotStatusBadge(IOT_NODE_STATUS, null).tone).toBe('muted')
  })
})
