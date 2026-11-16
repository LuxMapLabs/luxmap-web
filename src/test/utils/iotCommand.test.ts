import { describe, it, expect } from 'vitest'
import { commandBody, commandProgress, currentChoice, isClock } from '../../utils/iot/iotCommand'
import { IOT_GATEWAY_STATUS, IOT_NODE_STATUS, iotStatusBadge } from '../../constants/iot'

const tracked = { command_id: 'abc', expires_at: '2026-11-13T10:05:00Z' }
const before = Date.parse('2026-11-13T10:01:00Z')
const after = Date.parse('2026-11-13T10:06:00Z')

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

  it('waits while the same command is not acknowledged yet', () => {
    expect(commandProgress(tracked, null, before)).toBe('pending')
    expect(commandProgress(tracked, { command_id: 'abc', command_acknowledged: false }, before)).toBe('pending')
  })

  it('is acknowledged only for the same command id', () => {
    expect(commandProgress(tracked, { command_id: 'abc', command_acknowledged: true }, after)).toBe('acknowledged')
  })

  it('reports a newer command as superseding the tracked one', () => {
    expect(commandProgress(tracked, { command_id: 'xyz', command_acknowledged: true }, before)).toBe('superseded')
  })

  it('expires once expires_at passes without an ACK', () => {
    expect(commandProgress(tracked, { command_id: 'abc', command_acknowledged: false }, after)).toBe('expired')
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
