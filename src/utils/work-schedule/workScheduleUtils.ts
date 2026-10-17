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

const DEFAULT_ASSIGNEE_NAMES: Record<string, string> = {
  'USR-004': 'Khang Lê',
  'USR-005': 'Nguyễn Văn Hoàng',
  'USR-006': 'Trần Minh Tuấn',
  'USR-khang': 'Khang Lê',
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
  const assigneeNameMap: Record<string, string> = { ...DEFAULT_ASSIGNEE_NAMES }
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
    const segment = raw.segment_name || raw.segment_id || 'Tuyến chiếu sáng phụ trách'
    const rawKind = String(raw.task_kind || 'inspection').toLowerCase()
    const woStatus = String(raw.wo_status || 'open').toLowerCase()
    const assignedTo = raw.assigned_to || ''
    const assigneeName =
      raw.assignee_name ||
      assigneeNameMap[assignedTo] ||
      assignedTo ||
      'Kỹ sư hiện trường'
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
      assigneeId: assignedTo || 'USR-004',
      assigneeName,
      status,
      notes: raw.note || title,
      materialsNote: raw.materials_note || undefined,
      workOrderId,
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
  })

  return result
}
