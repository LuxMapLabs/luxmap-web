import { describe, expect, it } from 'vitest'
import { getPoleTooltipHtml } from '../../utils/gis-map/tooltipUtils'
import type { PoleFeature } from '../../pages/gis-map/GisMapPage'
import { FEEDER_LINE_UI, POLE_LAMP_UI, feederLineStyle, poleLampState } from '../../utils/gis-map/poleLampState'

describe('poleLampState', () => {
  it('normal follows the feeder: off → off, on → on, unknown → normal', () => {
    expect(poleLampState('normal', 'off')).toBe('off')
    expect(poleLampState('normal', 'on')).toBe('on')
    expect(poleLampState('normal', 'unknown')).toBe('normal')
    expect(poleLampState('normal', undefined)).toBe('normal')
  })

  it.each(['on', 'off', 'unknown', undefined])('dim / out / unknown ignore power_state %s', (power) => {
    expect(poleLampState('dim', power)).toBe('dim')
    expect(poleLampState('out', power)).toBe('out')
    expect(poleLampState('unknown', power)).toBe('unknown')
  })

  it('a missing status is unknown, never normal', () => {
    expect(poleLampState(undefined, 'on')).toBe('unknown')
    expect(poleLampState(null, 'off')).toBe('unknown')
  })

  it('off and out look different and are labelled apart', () => {
    expect(POLE_LAMP_UI.off.label).toBe('Đang tắt')
    expect(POLE_LAMP_UI.out.label).toBe('Hỏng')
    expect(POLE_LAMP_UI.off.sphere.body).not.toBe(POLE_LAMP_UI.out.sphere.body)
    expect(POLE_LAMP_UI.off.sphere.body).not.toBe(POLE_LAMP_UI.unknown.sphere.body)
  })
})

describe('feederLineStyle', () => {
  it('an OFF feeder is off, not a fault', () => {
    expect(feederLineStyle(false, 'off').status).toBe('off')
    expect(feederLineStyle(false, 'off').color).not.toBe(FEEDER_LINE_UI.fault.color)
  })

  it('a fault wins over any power_state; only on is green', () => {
    expect(feederLineStyle(true, 'on').status).toBe('fault')
    expect(feederLineStyle(true, 'off').status).toBe('fault')
    expect(feederLineStyle(false, 'on').status).toBe('active')
    expect(feederLineStyle(false, 'unknown').status).toBe('unknown')
    expect(feederLineStyle(false, null).status).toBe('unknown')
  })
})

describe('pole tooltip', () => {
  const pole = (fixture_status: string, power_state?: string) =>
    ({ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { pole_id: 'POLE-0001', fixture_status, power_state } }) as unknown as PoleFeature

  it('normal pole on an OFF feeder reads "Đang tắt"; out on an ON feeder still reads "Hỏng"', () => {
    expect(getPoleTooltipHtml({ pole: pole('normal', 'off') })).toContain('Đang tắt')
    const out = getPoleTooltipHtml({ pole: pole('out', 'on') })
    expect(out).toContain('>Hỏng</span>')
    expect(out).not.toContain('>Đang bật</span>')
  })
})
