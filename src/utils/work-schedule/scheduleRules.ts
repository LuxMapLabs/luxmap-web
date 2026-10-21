/**
 * Quy tắc nghiệp vụ kiểm tra quyền Chỉnh sửa hoặc Hủy lịch làm việc.
 * Quy định:
 * - Lịch diễn ra trong ngày hôm nay (hoặc quá khứ): Quản lý không được xóa/sửa vì đã đến ngày kỹ sư thực hiện.
 * - Lịch diễn ra sau ngày hôm nay (từ ngày mai trở đi): Quản lý được phép xóa hoặc chỉnh sửa.
 */

export interface ScheduleModificationCheck {
  canModify: boolean
  reason?: string
  scheduledDateFormatted?: string
}

export function checkScheduleModificationAllowed(
  scheduledDateStr?: string,
  phaseStatus?: string,
  isTerminated?: boolean
): ScheduleModificationCheck {
  if (isTerminated || phaseStatus === 'ended') {
    return {
      canModify: false,
      reason: 'Sự vụ hoặc giai đoạn này đã kết thúc, không thể chỉnh sửa hoặc hủy.',
    }
  }

  if (phaseStatus === 'reported') {
    return {
      canModify: false,
      reason:
        'Kỹ sư hiện trường đã nộp báo cáo nghiệm thu. Vui lòng Duyệt báo cáo hoặc Yêu cầu làm lại trước khi chỉnh sửa hoặc hủy lịch.',
    }
  }

  if (!scheduledDateStr) {
    return { canModify: true }
  }

  // Chuẩn hóa chuỗi ngày YYYY-MM-DD
  const datePart = scheduledDateStr.substring(0, 10)
  const parts = datePart.split('-')
  const scheduledDateFormatted =
    parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : scheduledDateStr

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`

  // Nếu ngày thực hiện là hôm nay
  if (datePart === todayStr) {
    return {
      canModify: false,
      reason: `Lịch công tác được lên lịch thực hiện trong ngày hôm nay (${scheduledDateFormatted}). Theo quy chế dự án, Quản lý không được chỉnh sửa hoặc hủy lịch trong ngày thực hiện.`,
      scheduledDateFormatted,
    }
  }

  // Nếu ngày thực hiện là trong quá khứ
  if (datePart < todayStr) {
    return {
      canModify: false,
      reason: `Lịch công tác thuộc về ngày trong quá khứ (${scheduledDateFormatted}), không thể chỉnh sửa hoặc hủy.`,
      scheduledDateFormatted,
    }
  }

  // Nếu ngày thực hiện là sau ngày hôm nay (ngày mai trở đi)
  return {
    canModify: true,
    scheduledDateFormatted,
  }
}
