/**
 * Quy tắc nghiệp vụ kiểm tra quyền Chỉnh sửa hoặc Hủy lịch làm việc.
 * Quy định:
 * - Đồng bộ với Backend C# (WorkOrderRules.cs):
 *   Quản lý được phép Chỉnh sửa và Hủy lịch khi lệnh ở các trạng thái chưa hoàn tất (Open, Assigned, InProgress).
 * - Không cho phép Chỉnh sửa hoặc Hủy khi:
 *   1. Kỹ sư đã nộp báo cáo nghiệm thu (reported / Done) -> Quản lý phải duyệt hoặc yêu cầu làm lại.
 *   2. Giai đoạn hoặc toàn bộ sự vụ đã kết thúc/nghiệm thu (ended / Verified).
 *   3. Lệnh đã bị hủy trước đó (cancelled).
 */

export interface ScheduleModificationCheck {
  canModify: boolean
  reason?: string
  scheduledDateFormatted?: string
}

export function checkScheduleModificationAllowed(
  scheduledDateStr?: string,
  phaseStatus?: string,
  isTerminated?: boolean,
  rawStatus?: string
): ScheduleModificationCheck {
  const normRaw = String(rawStatus || '').toLowerCase()
  const normPhase = String(phaseStatus || '').toLowerCase()

  if (isTerminated || normPhase === 'ended' || normRaw === 'verified' || normRaw === 'cancelled') {
    return {
      canModify: false,
      reason: 'Sự vụ hoặc lệnh công tác này đã kết thúc hoặc đã hủy, không thể chỉnh sửa hoặc hủy.',
    }
  }

  if (normPhase === 'reported' || normRaw === 'done') {
    return {
      canModify: false,
      reason:
        'Kỹ sư hiện trường đã nộp báo cáo nghiệm thu. Vui lòng Duyệt báo cáo hoặc Yêu cầu làm lại trước khi chỉnh sửa hoặc hủy lịch.',
    }
  }

  // Chuẩn hóa chuỗi ngày YYYY-MM-DD
  let scheduledDateFormatted = scheduledDateStr
  if (scheduledDateStr) {
    const datePart = scheduledDateStr.substring(0, 10)
    const parts = datePart.split('-')
    if (parts.length === 3) {
      scheduledDateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`
    }
  }

  // Cho phép Quản lý chỉnh sửa và hủy lịch
  return {
    canModify: true,
    scheduledDateFormatted,
  }
}
