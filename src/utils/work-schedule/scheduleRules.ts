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

export type PhaseOverdueKind = 'none' | 'overdue_not_started' | 'overdue_no_report'

export interface PhaseOverdueInfo {
  kind: PhaseOverdueKind
  isOverdue: boolean
  isExtended: boolean
  overdueDays: number
  deadlineYmd: string
  deadlineFormatted: string
  deadlineShortFormatted: string
}

export interface ScheduleModificationCheck {
  canModify: boolean
  reason?: string
  scheduledDateFormatted?: string
  isFutureDate?: boolean
  isPastDate?: boolean
}

export function getLocalTodayYmd(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatYmdToVi(ymdStr?: string): string {
  if (!ymdStr) return '-'
  const datePart = ymdStr.substring(0, 10)
  const parts = datePart.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return datePart
}

export function formatYmdToShortVi(ymdStr?: string): string {
  if (!ymdStr) return '-'
  const datePart = ymdStr.substring(0, 10)
  const parts = datePart.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`
  }
  return datePart
}

function diffDaysBetweenYmd(earlierYmd: string, laterYmd: string): number {
  const [y1, m1, d1] = earlierYmd.split('-').map(Number)
  const [y2, m2, d2] = laterYmd.split('-').map(Number)
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0
  const utc1 = Date.UTC(y1, m1 - 1, d1)
  const utc2 = Date.UTC(y2, m2 - 1, d2)
  return Math.max(1, Math.round((utc2 - utc1) / 86_400_000))
}

/**
 * Xác định trạng thái quá hạn của một bước công tác (đồng bộ với WorkOrderOverdueJob ở Backend):
 * - 'overdue_not_started': Đã qua hạn (dueDate/date < hôm nay) nhưng kỹ sư chưa bấm Bắt đầu (open / assigned).
 * - 'overdue_no_report': Đã qua hạn (dueDate/date < hôm nay), kỹ sư đã bấm Bắt đầu (in_progress) nhưng chưa nộp báo cáo.
 */
export function getPhaseOverdueInfo(
  phase?: {
    date?: string
    dueDate?: string
    status?: string
    rawStatus?: string
  } | null,
  isTerminated?: boolean,
  effectiveRawStatusOverride?: string,
  todayYmd: string = getLocalTodayYmd()
): PhaseOverdueInfo {
  const scheduledYmd = (phase?.date || '').substring(0, 10)
  const deadlineYmd = (phase?.dueDate || phase?.date || '').substring(0, 10)
  const deadlineFormatted = formatYmdToVi(deadlineYmd)
  const deadlineShortFormatted = formatYmdToShortVi(deadlineYmd)
  const isExtended = Boolean(
    /^\d{4}-\d{2}-\d{2}$/.test(scheduledYmd) &&
      /^\d{4}-\d{2}-\d{2}$/.test(deadlineYmd) &&
      deadlineYmd > scheduledYmd
  )

  if (!phase || isTerminated || !/^\d{4}-\d{2}-\d{2}$/.test(deadlineYmd)) {
    return {
      kind: 'none',
      isOverdue: false,
      isExtended: false,
      overdueDays: 0,
      deadlineYmd,
      deadlineFormatted,
      deadlineShortFormatted,
    }
  }

  const normPhase = String(phase.status || '').toLowerCase()
  const normRaw = String(effectiveRawStatusOverride || phase.rawStatus || '').toLowerCase()

  if (
    normPhase === 'ended' ||
    normPhase === 'reported' ||
    normRaw === 'done' ||
    normRaw === 'verified' ||
    normRaw === 'cancelled'
  ) {
    return {
      kind: 'none',
      isOverdue: false,
      isExtended,
      overdueDays: 0,
      deadlineYmd,
      deadlineFormatted,
      deadlineShortFormatted,
    }
  }

  if (deadlineYmd >= todayYmd) {
    return {
      kind: 'none',
      isOverdue: false,
      isExtended,
      overdueDays: 0,
      deadlineYmd,
      deadlineFormatted,
      deadlineShortFormatted,
    }
  }

  const overdueDays = diffDaysBetweenYmd(deadlineYmd, todayYmd)
  const kind: PhaseOverdueKind =
    normRaw === 'in_progress' ? 'overdue_no_report' : 'overdue_not_started'

  return {
    kind,
    isOverdue: true,
    isExtended,
    overdueDays,
    deadlineYmd,
    deadlineFormatted,
    deadlineShortFormatted,
  }
}

export function checkScheduleModificationAllowed(
  scheduledDateStr?: string,
  phaseStatus?: string,
  isTerminated?: boolean,
  rawStatus?: string,
  todayYmd: string = getLocalTodayYmd()
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

  const datePart = scheduledDateStr ? scheduledDateStr.substring(0, 10) : ''
  const scheduledDateFormatted = scheduledDateStr ? formatYmdToVi(scheduledDateStr) : undefined
  const isFutureDate = /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart > todayYmd : false
  const isPastDate = /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart < todayYmd : false

  // Cho phép Quản lý chỉnh sửa và hủy lịch
  return {
    canModify: true,
    scheduledDateFormatted,
    isFutureDate,
    isPastDate,
  }
}
