import { describe, it, expect } from 'vitest'
import { buildFeederDiagnosticLevels, feederDiagnosticLevel } from '../../utils/gis-map/feederDiagnostics'
import { feederLineStyle } from '../../utils/gis-map/poleLampState'
import { getFeederTooltipHtml } from '../../utils/gis-map/tooltipUtils'

describe('feederDiagnosticLevel', () => {
  it('lỗi điện (current_drop / voltage_loss / voltage_deviation) là sự cố', () => {
    for (const code of ['current_drop', 'voltage_loss', 'voltage_deviation']) {
      expect(feederDiagnosticLevel({ feeder_id: 'F', diagnostic_status: 'anomaly', anomaly_codes: [code] })).toBe('fault')
    }
  })

  it('lỗi phần cứng, dữ liệu cũ, node offline là cảnh báo', () => {
    expect(feederDiagnosticLevel({ diagnostic_status: 'anomaly', anomaly_codes: ['ina226_read_failed'] })).toBe('warn')
    expect(feederDiagnosticLevel({ diagnostic_status: 'anomaly', anomaly_codes: ['telemetry_stale'] })).toBe('warn')
    expect(feederDiagnosticLevel({ diagnostic_status: 'stale', anomaly_codes: [] })).toBe('warn')
    expect(feederDiagnosticLevel({ diagnostic_status: 'normal', connection_status: 'offline' })).toBe('warn')
  })

  it('bình thường / chưa có dữ liệu thì không có mức', () => {
    expect(feederDiagnosticLevel({ diagnostic_status: 'normal', anomaly_codes: [] })).toBeNull()
    expect(feederDiagnosticLevel({ diagnostic_status: 'no_data' })).toBeNull()
    expect(feederDiagnosticLevel(undefined)).toBeNull()
  })

  it('mạch nhiều node lấy mức cao nhất', () => {
    const levels = buildFeederDiagnosticLevels([
      { feeder_id: 'F1', diagnostic_status: 'stale' },
      { feeder_id: 'F1', diagnostic_status: 'anomaly', anomaly_codes: ['voltage_loss'] },
      { feeder_id: 'F2', diagnostic_status: 'anomaly', anomaly_codes: ['bh1750_read_failed'] },
      { feeder_id: 'F3', diagnostic_status: 'normal' },
    ])
    expect(levels.get('F1')).toBe('fault')
    expect(levels.get('F2')).toBe('warn')
    expect(levels.has('F3')).toBe(false)
  })
})

describe('feederLineStyle với chẩn đoán', () => {
  it('ưu tiên đỏ > cam > theo power_state', () => {
    expect(feederLineStyle(false, 'on', 'fault').status).toBe('fault')
    expect(feederLineStyle(false, 'on', 'warn').status).toBe('warn')
    expect(feederLineStyle(false, 'off', 'warn').status).toBe('warn')
    expect(feederLineStyle(false, 'on', null).status).toBe('active')
    expect(feederLineStyle(false, 'off').status).toBe('off')
  })

  it('tooltip hiện "Cảnh báo" màu cam', () => {
    const html = getFeederTooltipHtml({ featureProps: { feeder_id: 'F', status: 'warn' } })
    expect(html).toContain('Cảnh báo')
    expect(html).toContain('bg-amber-500')
    expect(html).not.toContain('Đang cấp điện')
  })
})

describe('tooltip nguồn mạch', () => {
  it('lỗi vẫn ghi rõ mạch đang bật hay tắt', () => {
    const on = getFeederTooltipHtml({ featureProps: { feeder_id: 'F', status: 'fault', power_state: 'on' } })
    expect(on).toContain('Sự cố')
    expect(on).toContain('Nguồn mạch: <strong class="text-slate-900 dark:text-white font-semibold">Đang bật')
    const off = getFeederTooltipHtml({ featureProps: { feeder_id: 'F', status: 'warn', power_state: 'off' } })
    expect(off).toContain('Cảnh báo')
    expect(off).toContain('>Đang tắt<')
  })
})
