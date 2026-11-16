import { describe, it, expect } from 'vitest'
import { segmentLabelFromIds, mapWorkOrdersToScheduleCases } from '../../utils/work-schedule/workScheduleUtils'
import type { WorkOrderItem } from '../../types/workorders/orders'

const names = { 'SEG-001': 'Tuyến C', 'SEG-004': 'Tuyến K' }

describe('segmentLabelFromIds', () => {
  it('tra tên tuyến theo mã', () => {
    expect(segmentLabelFromIds(['SEG-004'], names)).toBe('Tuyến K')
  })

  it('ghép nhiều tuyến, bỏ mã trùng và giá trị rỗng', () => {
    expect(segmentLabelFromIds(['SEG-001', null, 'SEG-004', 'SEG-001', undefined], names)).toBe('Tuyến C, Tuyến K')
  })

  it('mã chưa có tên thì giữ nguyên mã, không bịa tên', () => {
    expect(segmentLabelFromIds(['SEG-999'], names)).toBe('SEG-999')
  })

  it('không có mã nào thì trả null', () => {
    expect(segmentLabelFromIds([null, undefined], names)).toBeNull()
  })
})

describe('mapWorkOrdersToScheduleCases - tên tuyến', () => {
  const order = (extra: Partial<WorkOrderItem>) =>
    ({
      work_order_id: 'WO-1',
      case_id: 'WO-1',
      title: 'Lệnh thử',
      task_kind: 'survey',
      wo_status: 'assigned',
      scheduled_date: '2026-11-14',
      created_at: '2026-11-14T00:00:00Z',
      ...extra,
    }) as WorkOrderItem

  it('hiện tên tuyến lấy từ danh sách tuyến', () => {
    const [c] = mapWorkOrdersToScheduleCases([order({ segment_id: 'SEG-004' })], [], names)
    expect(c.segment).toBe('Tuyến K')
  })

  it('không có tuyến nào thì hiện dấu gạch, không bịa tên', () => {
    const [c] = mapWorkOrdersToScheduleCases([order({})], [], names)
    expect(c.segment).toBe('-')
  })
})
