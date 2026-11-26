import { describe, expect, it } from 'vitest'
import { getPoleTooltipHtml } from '../../utils/gis-map/tooltipUtils'
import type { PoleFeature } from '../../pages/gis-map/GisMapPage'
import { FEEDER_HEALTH_UI, POLE_LAMP_UI, feederHealthUi, feederLampLabel, poleLampState } from '../../utils/gis-map/poleLampState'

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

describe('feeder health / lamp labels', () => {
  it('maps every power_state from the API, missing stays null', () => {
    expect(feederHealthUi('normal')?.label).toBe('Bình thường')
    expect(feederHealthUi('warning')?.label).toBe('Cảnh báo')
    expect(feederHealthUi('incident')?.label).toBe('Sự cố')
    expect(feederHealthUi('offline')?.label).toBe('Mất kết nối IoT')
    expect(feederHealthUi('unknown')?.label).toBe('Chưa có IoT')
    expect(feederHealthUi(undefined)).toBeNull()
    // Giá trị bật/tắt cũ không phải sức khỏe mạch
    expect(feederHealthUi('on')).toBeNull()
  })

  it('five health colours are distinct', () => {
    const colors = Object.values(FEEDER_HEALTH_UI).map((ui) => ui.color)
    expect(new Set(colors).size).toBe(colors.length)
  })

  it('lamp_state labels; missing is "-"', () => {
    expect(feederLampLabel('on')).toBe('Đang bật')
    expect(feederLampLabel('off')).toBe('Đang tắt')
    expect(feederLampLabel('unknown')).toBe('Chưa rõ')
    expect(feederLampLabel(null)).toBe('-')
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
