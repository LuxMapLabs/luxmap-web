import type { WorkOrderItem, WorkOrderDetail, WorkOrderAssignee } from '../../types/workorders/orders'
import type { TaskKind } from '../../types/common/enums'
import type { ScheduleCase, SchedulePhase } from '../../types/workSchedule'

type WorkOrderRawItem = WorkOrderItem & Partial<WorkOrderDetail> & {
  segment_name?: string | null
  assignee_name?: string | null
  end_reason?: string | null
  lux_measured?: string | null
  video_url?: string | null
  ai_detections?: any
}

export const SEGMENT_NAME_MAP: Record<string, string> = {
  'SEG-001': 'Tuyến A - Tỉnh Lộ 8 (SEG-001)',
  'SEG-002': 'Tuyến B - Nguyễn Văn Ni (SEG-002)',
  'SEG-003': 'Tuyến C - Huỳnh Văn Cọ (SEG-003)',
  'SEG-004': 'Phước Thiện (SEG-004)',
  'SEG-005': 'Hẻm 190 Nguyễn Xiển (SEG-005)',
  'SEG-006': 'Đường không tên 898251247 (SEG-006)',
  'SEG-007': 'Phước Thiện (SEG-007)',
  'SEG-008': 'Cầu Vồng (SEG-008)',
  'SEG-009': 'Hẻm 275/30 Đường Phước Thiện (SEG-009)',
  'SEG-010': 'Đường không tên 608514662 (SEG-010)',
  'SEG-011': 'Nguyễn Xiển (SEG-011)',
  'SEG-012': 'Phước Thiện (SEG-012)',
  'SEG-013': 'Nguyễn Xiển (SEG-013)',
  'SEG-014': 'Cầu Gò Công (SEG-014)',
  'SEG-015': 'Nguyễn Xiển (SEG-015)',
  'SEG-016': 'Đường không tên 607194281 (SEG-016)',
  'SEG-017': 'Cầu Vồng (SEG-017)',
  'SEG-018': 'Hẻm 230 (SEG-018)',
  'SEG-019': 'Đường số 1 (SEG-019)',
  'SEG-020': 'Hẻm 275 (SEG-020)',
  'SEG-021': 'Long Phước – đoạn 2 (SEG-021)',
  'SEG-022': 'Đường không tên 838404715 (SEG-022)',
  'SEG-023': 'Long Phước – đoạn 4 (SEG-023)',
  'SEG-024': 'Long Phước – đoạn 3 (SEG-024)',
  'SEG-025': 'Long Phước – đoạn 1 (SEG-025)',
  'SEG-026': 'Đường không tên 848726664 (SEG-026)',
  'SEG-027': 'Phước Thiện (SEG-027)',
  'SEG-028': 'Đường Hoa Giấy (SEG-028)',
  'SEG-029': 'Đường N2 (SEG-029)',
  'SEG-030': 'Long Phước – đoạn 5 (SEG-030)',
}

/**
 * Định dạng tên hiển thị đầy đủ và thân thiện của tuyến đường
 */
export function formatSegmentDisplay(
  segIdOrName?: string | null,
  fallbackTitle?: string | null
): string {
  if (!segIdOrName || segIdOrName === 'Tuyến chiếu sáng phụ trách') {
    if (fallbackTitle) {
      const match = fallbackTitle.match(/SEG-\d+/i)
      if (match) {
        const id = match[0].toUpperCase()
        return SEGMENT_NAME_MAP[id] || `${id} - Tuyến đường phụ trách`
      }
    }
    return 'Tuyến đường phụ trách'
  }

  const segMatch = segIdOrName.match(/SEG-\d+/i)
  if (segMatch) {
    const id = segMatch[0].toUpperCase()
    if (SEGMENT_NAME_MAP[id]) {
      return SEGMENT_NAME_MAP[id]
    }
  }

  return segIdOrName
}


/**
 * Tiện ích chuyển đổi danh sách lệnh công tác (WorkOrderItem[]) từ Backend API
 * thành danh sách hồ sơ sự vụ (ScheduleCase[]) gom nhóm theo chuỗi tiến trình Stepper cho giao diện Calendar.
 */
export function mapWorkOrdersToScheduleCases(
  rawItems: WorkOrderItem[],
  assignees?: WorkOrderAssignee[]
): ScheduleCase[] {
  if (!rawItems || rawItems.length === 0) return []

  // Xây dựng lookup map cho tên kỹ sư từ danh sách assignees thực tế
  const assigneeNameMap: Record<string, string> = {}
  if (assignees && assignees.length > 0) {
    assignees.forEach((a) => {
      if (a.user_id && a.full_name) {
        assigneeNameMap[a.user_id] = a.full_name
      }
    })
  }

  // 1. Lọc bỏ hoàn toàn các lệnh đã bị hủy (wo_status === 'cancelled')
  const activeItems = (rawItems as WorkOrderRawItem[]).filter((raw) => {
    const status = String(raw.wo_status || '').toLowerCase()
    return status !== 'cancelled'
  })

  if (activeItems.length === 0) return []

  // 2. Sắp xếp theo thứ tự thời gian tăng dần để chuỗi tiến trình (Survey -> Inspection -> Repair) đúng thứ tự
  const sortedItems = [...activeItems].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime()
    const timeB = new Date(b.created_at || 0).getTime()
    return timeA - timeB
  })

  const casesMap: Record<string, ScheduleCase> = {}

  sortedItems.forEach((raw) => {
    const workOrderId = raw.work_order_id || ''
    const caseKey = raw.case_id || workOrderId
    const title = raw.title || 'Lệnh công tác'
    const segment = formatSegmentDisplay(raw.segment_name || raw.segment_id, title)
    const rawKind = String(raw.task_kind || 'inspection').toLowerCase()
    const woStatus = String(raw.wo_status || 'open').toLowerCase()
    const assignedTo = raw.assigned_to || ''
    const assigneeName =
      raw.assignee_name ||
      (assignedTo ? assigneeNameMap[assignedTo] || assignedTo : 'Chưa phân công')
    const scheduledDate = raw.scheduled_date || raw.created_at || '2026-10-01'
    const phaseDate = scheduledDate.substring(0, 10)
    const endReason = raw.end_reason || undefined

    if (!casesMap[caseKey]) {
      casesMap[caseKey] = {
        code: caseKey,
        title,
        segment,
        createdAt: raw.created_at || undefined,
        currentPhaseIndex: 0,
        isTerminated: Boolean(endReason),
        endReason,
        phases: [],
      }
    } else {
      if (raw.segment_name || raw.segment_id) {
        casesMap[caseKey].segment = formatSegmentDisplay(raw.segment_name || raw.segment_id, title)
      }
      if (Boolean(endReason)) {
        casesMap[caseKey].isTerminated = true
        casesMap[caseKey].endReason = endReason
      }
    }

    const isRepair = rawKind.includes('repair')
    const isSurvey = rawKind.includes('survey')
    const phaseType: TaskKind = isRepair ? 'repair' : isSurvey ? 'survey' : 'inspection'
    const phaseName = isRepair ? '3. Sửa chữa' : isSurvey ? '1. Khảo sát' : '2. Kiểm tra'

    let status: 'pending' | 'reported' | 'ended' = 'pending'
    if (woStatus === 'done') status = 'reported'
    else if (woStatus === 'verified') status = 'ended'

    const phase: SchedulePhase = {
      phaseType,
      name: phaseName,
      date: phaseDate,
      dueDate: raw.due_date || undefined,
      createdAt: raw.created_at || undefined,
      rawStatus: woStatus,
      assigneeId: assignedTo || '',
      assigneeName,
      status,
      notes: raw.note || title,
      materialsNote: raw.materials_note || undefined,
      workOrderId,
      cancellationRequest:
        raw.cancellation_request_status && raw.cancellation_request_status !== 'none'
          ? {
              status: raw.cancellation_request_status as 'none' | 'pending' | 'rejected',
              reason:
                raw.cancellation_request_note ||
                'Kỹ sư hiện trường xin hủy lịch vì sự cố phương tiện hoặc thiết bị.',
              requestedAt: raw.cancellation_requested_at || raw.updated_at || undefined,
              requestedBy: assigneeName,
              rejectReason: raw.cancellation_reject_note || undefined,
              rejectedAt: raw.cancellation_rejected_at || undefined,
            }
          : undefined,
      report:
        raw.report_note || woStatus === 'done' || woStatus === 'verified'
          ? {
            submittedAt: raw.created_at || `${phaseDate} 17:00`,
            summary: raw.report_note || 'Báo cáo kỹ thuật hiện trường',
            usedMaterialsNote: raw.materials_used || undefined,
            suggestedMaterialsNote: raw.materials_note || undefined,
            luxMeasured: raw.lux_measured || undefined,
            videoUrl: raw.video_url || undefined,
            aiDetections: raw.ai_detections || undefined,
          }
          : undefined,
    }

    casesMap[caseKey].phases.push(phase)
  })

  const result = Object.values(casesMap)
  result.forEach((c) => {
    c.currentPhaseIndex = Math.max(0, c.phases.length - 1)
    c.hasPendingCancellationRequest = c.phases.some(
      (p) => p.cancellationRequest?.status === 'pending'
    )
  })

  return result
}
