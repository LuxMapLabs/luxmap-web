import { describe, it, expect } from 'vitest'
import { getFeederTooltipHtml } from '../../utils/gis-map/tooltipUtils'
import { FEEDER_HEALTH_UI, FEEDER_OFF_LINE, feederLineColors } from '../../utils/gis-map/poleLampState'

describe('Màu đường mạch', () => {
  it('bình thường: bật xanh, tắt trắng', () => {
    expect(feederLineColors('normal', 'on')).toBe(FEEDER_HEALTH_UI.normal)
    expect(feederLineColors('normal', 'off')).toBe(FEEDER_OFF_LINE)
  })

  it('cảnh báo / sự cố đang tắt vẫn giữ màu theo backend', () => {
    expect(feederLineColors('warning', 'off')).toBe(FEEDER_HEALTH_UI.warning)
    expect(feederLineColors('incident', 'off')).toBe(FEEDER_HEALTH_UI.incident)
    expect(feederLineColors(undefined, 'off')).toBe(FEEDER_HEALTH_UI.unknown)
  })

  it('đang sửa: tô màu "Đang sửa", không xám như chưa có IoT', () => {
    expect(feederLineColors('repairing', 'unknown')).toBe(FEEDER_HEALTH_UI.repairing)
    expect(feederLineColors('repairing', 'off')).toBe(FEEDER_HEALTH_UI.repairing)
  })
})

// Tooltip mạch đọc nguyên power_state (sức khỏe) và lamp_state (bật/tắt) của GET /assets/feeders (FEEDER-HEALTH-1)
describe('Tooltip mạch: sức khỏe và bật/tắt tách riêng', () => {
  it('normal + on: "Bình thường", đèn "Đang bật"', () => {
    const html = getFeederTooltipHtml({ featureProps: { feeder_id: 'FDR-001', power_state: 'normal', lamp_state: 'on', from_id: 'CAB-001' } })
    expect(html).toContain('Bình thường')
    expect(html).toContain('Đang bật')
    expect(html).toContain(FEEDER_HEALTH_UI.normal.color)
  })

  it('warning + on: cảnh báo nhưng đèn vẫn đang bật', () => {
    const html = getFeederTooltipHtml({ featureProps: { feeder_id: 'FDR-009', power_state: 'warning', lamp_state: 'on' } })
    expect(html).toContain('Cảnh báo')
    expect(html).toContain('Đang bật')
    expect(html).not.toContain('Đang tắt')
  })

  it('normal + off: tắt chủ động không phải sự cố', () => {
    const html = getFeederTooltipHtml({ featureProps: { feeder_id: 'FDR-005', power_state: 'normal', lamp_state: 'off', from_id: 'CAB-005' } })
    expect(html).toContain('Bình thường')
    expect(html).toContain('Đang tắt')
    expect(html).not.toContain('Sự cố')
  })

  it('incident: "Sự cố", chấm đỏ nhấp nháy', () => {
    const html = getFeederTooltipHtml({ featureProps: { feeder_id: 'FDR-002', power_state: 'incident', lamp_state: 'on' } })
    expect(html).toContain('Sự cố')
    expect(html).toContain(FEEDER_HEALTH_UI.incident.color)
    expect(html).toContain('animate-pulse')
  })

  it.each([
    ['offline', 'Sự cố'],
    ['unknown', 'Chưa có IoT'],
    ['repairing', 'Đang sửa'],
  ])('%s: nhãn "%s"', (power_state, label) => {
    expect(getFeederTooltipHtml({ featureProps: { feeder_id: 'F', power_state, lamp_state: 'unknown' } })).toContain(label)
  })

  it('API chưa trả hai trường: ghi "-", không tự đoán, không dùng mã cột làm tên tủ', () => {
    const html = getFeederTooltipHtml({ featureProps: { feeder_id: 'FDR-009', from_id: 'POLE-0026', to_pole_id: 'POLE-0056' } })
    expect(html).toContain('Mạch: <strong class="text-slate-900 dark:text-white font-semibold">-</strong>')
    Object.values(FEEDER_HEALTH_UI).forEach((ui) => expect(html).not.toContain(`>${ui.label}<`))
    expect(html).toContain('Tủ cấp nguồn: <strong class="text-slate-900 dark:text-white font-semibold">Chưa liên kết tủ')
  })

  it('hiện mã lộ, liên kết và nhánh/cạnh', () => {
    const html = getFeederTooltipHtml({
      featureProps: { feeder_id: 'FDR-003', external_ref: 'LỘ 3', from_id: 'CAB-003', to_pole_id: 'POL-025', branch: 2, order: 3 },
    })
    expect(html).toContain('Tuyến điện LỘ 3')
    expect(html).toContain('CAB-003')
    expect(html).toContain('POL-025')
    expect(html).toContain('Nhánh 2 • Cạnh thứ 3')
  })
})
