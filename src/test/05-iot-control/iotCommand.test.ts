import { describe, it, expect } from 'vitest'
import { commandBody, currentChoice, isClock } from '../../utils/iot/iotCommand'
import { IOT_GATEWAY_STATUS, IOT_NODE_STATUS, iotStatusBadge } from '../../constants/iot'

describe('iotCommand', () => {
  it('maps buttons to the bridge body', () => {
    expect(commandBody('on')).toEqual({ mode: 'MANUAL', command: 'ON' })
    expect(commandBody('off')).toEqual({ mode: 'MANUAL', command: 'OFF' })
    expect(commandBody('auto')).toEqual({ mode: 'AUTO', command: null })
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
