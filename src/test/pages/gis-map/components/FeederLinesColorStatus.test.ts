import { describe, it, expect } from 'vitest'
import { getFeederTooltipHtml } from '../../../../utils/gis-map/tooltipUtils'

describe('Feeder Lines Two-Color State & Tooltip Test Suite (Task 12)', () => {
  it('TC-01: Đường dây điện hiển thị trạng thái Đang cấp điện (Màu xanh lá) khi không có sự cố', () => {
    const featureProps = {
      feeder_id: 'FDR-001',
      external_ref: 'LỘ 1 - TỦ ĐIỆN 01',
      cabinet_name: 'Tủ điện TĐ-01',
      segment_name: 'Tuyến đường ĐT 782',
      status: 'active',
      from_id: 'CAB-001',
      to_pole_id: 'POL-001',
      branch: 1,
      order: 1,
      feeder_source: 'verified',
    }

    const html = getFeederTooltipHtml({ featureProps })

    // Kiểm tra class và text phản ánh màu xanh lá cây
    expect(html).toContain('Đang cấp điện')
    expect(html).toContain('bg-emerald-500')
    expect(html).toContain('text-emerald-700')
    expect(html).not.toContain('Đã ngắt nguồn')
    expect(html).not.toContain('bg-rose-500')
  })

  it('TC-02: Đường dây điện chuyển sang trạng thái Đã ngắt nguồn (Màu đỏ) khi Tủ điện hoặc Feeder bị sự cố (fault)', () => {
    const featureProps = {
      feeder_id: 'FDR-002',
      external_ref: 'LỘ 2 - TỦ ĐIỆN 02',
      cabinet_name: 'Tủ điện TĐ-02 (Ngắt Aptomat)',
      segment_name: 'Tuyến đường ĐT 784',
      status: 'fault',
      from_id: 'CAB-002',
      to_pole_id: 'POL-010',
      branch: 1,
      order: 1,
      feeder_source: 'verified',
    }

    const html = getFeederTooltipHtml({ featureProps })

    // Kiểm tra class và text phản ánh màu đỏ cảnh báo sự cố
    expect(html).toContain('Đã ngắt nguồn')
    expect(html).toContain('bg-rose-500')
    expect(html).toContain('text-rose-700')
    expect(html).toContain('animate-pulse')
    expect(html).not.toContain('Đang cấp điện')
    expect(html).not.toContain('bg-emerald-500')
  })

  it('TC-03: Kiểm tra format hiển thị thông tin lộ điện, mã liên kết và tuyến đường', () => {
    const featureProps = {
      feeder_id: 'FDR-003',
      external_ref: 'LỘ 3 - TRẠM BIẾN ÁP A',
      cabinet_name: 'Tủ điện Trung tâm',
      segment_name: 'Đường 30/4',
      status: 'active',
      from_id: 'CAB-003',
      to_pole_id: 'POL-025',
      branch: 2,
      order: 3,
      feeder_source: 'survey',
    }

    const html = getFeederTooltipHtml({ featureProps })

    expect(html).toContain('Tuyến điện LỘ 3 - TRẠM BIẾN ÁP A')
    expect(html).toContain('CAB-003')
    expect(html).toContain('POL-025')
    expect(html).toContain('Nhánh 2 • Cạnh thứ 3')
    expect(html).not.toContain('Nguồn dữ liệu:')
  })
})
