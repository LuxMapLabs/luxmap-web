/**
 * Lưới tuần cho lịch khảo sát định kỳ: mỗi tuyến bật tối đa MỘT thứ.
 *
 * Backend (`SurveyRecurringGenerateJob`) chỉ sinh một phiếu khảo sát cho một tuyến mỗi tuần, nên thứ
 * thứ hai của cùng tuyến không bao giờ ra phiếu. Module này giữ luật một-ô-mỗi-hàng và tính các lệnh
 * API cần gửi khi lưu, theo diff so với dữ liệu đã tải.
 *
 * PATCH /survey-schedules/recurring/{id} chỉ nhận `is_active`, `assigned_to`, `note` (đổi `day_of_week`
 * → 400 SERVER_OWNED_FIELD), nên chuyển ngày = POST ngày mới rồi DELETE lịch cũ.
 */
import type {
  CreateSurveyRecurringRequest,
  PatchSurveyRecurringRequest,
  SurveyRecurringItem,
} from '../../types/survey-schedules/recurring'

export const WEEK_DAYS = [
  { value: 1, label: 'Thứ Hai', short: 'T2' },
  { value: 2, label: 'Thứ Ba', short: 'T3' },
  { value: 3, label: 'Thứ Tư', short: 'T4' },
  { value: 4, label: 'Thứ Năm', short: 'T5' },
  { value: 5, label: 'Thứ Sáu', short: 'T6' },
  { value: 6, label: 'Thứ Bảy', short: 'T7' },
  { value: 7, label: 'Chủ Nhật', short: 'CN' },
] as const

export const dayLabel = (day: number): string =>
  WEEK_DAYS.find((d) => d.value === day)?.label ?? `Thứ ${day}`

/** Ô đang bật của một hàng. `assignedTo = null` → hệ thống tự chọn kỹ sư ít việc nhất. */
export interface GridCell {
  day: number
  assignedTo: string | null
  note: string
  isActive: boolean
}

/** segment_id → ô đang bật (hoặc null). Kiểu dữ liệu này tự bảo đảm một ô mỗi hàng. */
export type GridState = Record<string, GridCell | null>

export interface RowBaseline {
  /** Lịch hiển thị trên lưới. */
  primary: SurveyRecurringItem | null
  /** Lịch thừa của cùng tuyến (dữ liệu từ form chọn nhiều thứ cũ) — bị xoá khi lưu. */
  extras: SurveyRecurringItem[]
}

export type Baseline = Record<string, RowBaseline>

const byDay = (a: SurveyRecurringItem, b: SurveyRecurringItem) =>
  (a.day_of_week ?? 0) - (b.day_of_week ?? 0)

/** Gom lịch theo tuyến; lịch chính là lịch đang bật sớm nhất trong tuần, không có thì lịch sớm nhất. */
export function buildBaseline(items: SurveyRecurringItem[]): Baseline {
  const groups = new Map<string, SurveyRecurringItem[]>()
  for (const item of items) {
    if (!item.segment_id || !item.schedule_id) continue
    const list = groups.get(item.segment_id) ?? []
    list.push(item)
    groups.set(item.segment_id, list)
  }
  const baseline: Baseline = {}
  for (const [segmentId, list] of groups) {
    const sorted = [...list].sort(byDay)
    const primary = sorted.find((s) => s.is_active) ?? sorted[0]
    baseline[segmentId] = { primary, extras: sorted.filter((s) => s !== primary) }
  }
  return baseline
}

const cellFromItem = (item: SurveyRecurringItem): GridCell => ({
  day: item.day_of_week ?? 1,
  assignedTo: item.assigned_to || null,
  note: item.note ?? '',
  isActive: item.is_active !== false,
})

export function gridFromBaseline(baseline: Baseline): GridState {
  const grid: GridState = {}
  for (const [segmentId, row] of Object.entries(baseline)) {
    grid[segmentId] = row.primary ? cellFromItem(row.primary) : null
  }
  return grid
}

/**
 * Bấm ô (segment, day): ô đang bật → tắt; ô khác trong hàng đang bật → chuyển ngày (giữ kỹ sư, ghi chú,
 * trạng thái); hàng trống → bật ô mới.
 */
export function toggleCell(grid: GridState, segmentId: string, day: number): GridState {
  const current = grid[segmentId] ?? null
  if (current?.day === day) return { ...grid, [segmentId]: null }
  if (current) return { ...grid, [segmentId]: { ...current, day } }
  return { ...grid, [segmentId]: { day, assignedTo: null, note: '', isActive: true } }
}

export function updateCell(
  grid: GridState,
  segmentId: string,
  patch: Partial<Omit<GridCell, 'day'>>
): GridState {
  const current = grid[segmentId]
  if (!current) return grid
  return { ...grid, [segmentId]: { ...current, ...patch } }
}

export type SaveOp =
  | {
      kind: 'create'
      segmentId: string
      day: number
      body: CreateSurveyRecurringRequest
      /** Sau khi tạo thì PATCH is_active=false (POST luôn tạo lịch đang bật). */
      pauseAfterCreate: boolean
      /** Chuyển ngày: lịch cũ bị xoá sau khi tạo lịch mới thành công. */
      replacesScheduleId?: string
    }
  | { kind: 'patch'; segmentId: string; day: number; scheduleId: string; body: PatchSurveyRecurringRequest }
  | { kind: 'delete'; segmentId: string; day: number; scheduleId: string; reason: 'removed' | 'duplicate' }

const normNote = (note: string | null | undefined): string | null => {
  const trimmed = (note ?? '').trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Lệnh API cần gửi để server khớp với lưới. `communeOf` trả xã của tuyến (để gửi `commune_id` khi tạo).
 */
export function planSave(
  baseline: Baseline,
  grid: GridState,
  communeOf: (segmentId: string) => string | undefined
): SaveOp[] {
  const ops: SaveOp[] = []
  const segmentIds = new Set([...Object.keys(baseline), ...Object.keys(grid)])

  for (const segmentId of segmentIds) {
    const row = baseline[segmentId] ?? { primary: null, extras: [] }
    const cell = grid[segmentId] ?? null
    const primary = row.primary

    const createOp = (target: GridCell, replacesScheduleId?: string): SaveOp => ({
      kind: 'create',
      segmentId,
      day: target.day,
      body: {
        commune_id: communeOf(segmentId),
        segment_id: segmentId,
        day_of_week: target.day,
        ...(target.assignedTo ? { assigned_to: target.assignedTo } : {}),
        ...(normNote(target.note) ? { note: normNote(target.note) } : {}),
      },
      pauseAfterCreate: !target.isActive,
      ...(replacesScheduleId ? { replacesScheduleId } : {}),
    })

    const existing = primary ? [primary, ...row.extras] : row.extras
    // Lịch đã có đúng thứ của ô (kể cả lịch thừa) thì sửa nó, không tạo mới — tạo trùng là 409.
    const match = cell ? existing.find((s) => s.day_of_week === cell.day) : undefined
    let replaced: SurveyRecurringItem | undefined

    if (cell && match) {
      const body: PatchSurveyRecurringRequest = {}
      if (cell.isActive !== (match.is_active !== false)) body.is_active = cell.isActive
      if ((cell.assignedTo || null) !== (match.assigned_to || null)) body.assigned_to = cell.assignedTo || null
      if (normNote(cell.note) !== normNote(match.note)) body.note = normNote(cell.note)
      if (Object.keys(body).length > 0) {
        ops.push({ kind: 'patch', segmentId, day: cell.day, scheduleId: match.schedule_id!, body })
      }
    } else if (cell) {
      // Chuyển ngày: lịch cũ chỉ bị xoá khi lịch mới đã tạo được.
      replaced = primary ?? undefined
      ops.push(createOp(cell, replaced?.schedule_id ?? undefined))
    }

    for (const item of existing) {
      if (item === match || item === replaced) continue
      ops.push({
        kind: 'delete',
        segmentId,
        day: item.day_of_week ?? 0,
        scheduleId: item.schedule_id!,
        reason: item === primary ? 'removed' : 'duplicate',
      })
    }
  }
  return ops
}

export interface ScheduleError {
  code: string
  message: string
}

const ERROR_MESSAGES: Record<string, string> = {
  // Sau mỗi lần lưu lưới đã tải lại từ máy chủ, nên không bảo người dùng "tải lại".
  SURVEY_SCHEDULE_EXISTS: 'Tuyến đã có lịch vào thứ này (có thể vừa được người khác tạo); lưới đã cập nhật theo máy chủ.',
  CROSS_COMMUNE_REFERENCE: 'Tuyến không thuộc địa bàn xã của lịch.',
  ASSIGNEE_NOT_ELIGIBLE: 'Kỹ sư được chọn không phụ trách xã / tuyến này.',
  SURVEY_SCHEDULE_NOT_FOUND: 'Lịch không còn trên hệ thống; lưới đã cập nhật theo máy chủ.',
  ASSET_NOT_FOUND: 'Không tìm thấy tuyến đường trên hệ thống.',
  ROLE_FORBIDDEN: 'Chỉ Quản lý được sửa lịch khảo sát định kỳ.',
  COMMUNE_FORBIDDEN: 'Địa bàn xã nằm ngoài phạm vi tài khoản.',
}

/** Đọc lỗi `{ error: { code, message } }` của API thành thông điệp tiếng Việt. */
export function describeScheduleError(err: unknown): ScheduleError {
  const response = (err as { response?: { status?: number; data?: any } })?.response
  const code: string = response?.data?.error?.code ?? (response?.status ? `HTTP_${response.status}` : 'NETWORK')
  const message =
    ERROR_MESSAGES[code] ??
    response?.data?.error?.message ??
    (err as { message?: string })?.message ??
    'Không thể lưu lịch.'
  return { code, message }
}

export const cellKey = (segmentId: string, day: number) => `${segmentId}:${day}`

export interface SaveApi {
  create(body: CreateSurveyRecurringRequest): Promise<SurveyRecurringItem>
  patch(id: string, body: PatchSurveyRecurringRequest): Promise<SurveyRecurringItem>
  remove(id: string): Promise<void>
}

export interface SaveResult {
  succeeded: number
  /** cellKey → lỗi, để hiện đúng ô. */
  errors: Record<string, ScheduleError>
  /** Tuyến có ít nhất một lệnh lỗi: giữ lựa chọn của người dùng ở các hàng này sau khi tải lại. */
  failedSegments: Set<string>
}

/** Gửi lần lượt từng lệnh; lỗi của một hàng không chặn các hàng khác. */
export async function executeSave(ops: SaveOp[], api: SaveApi): Promise<SaveResult> {
  const result: SaveResult = { succeeded: 0, errors: {}, failedSegments: new Set() }
  const fail = (op: SaveOp, err: unknown) => {
    result.errors[cellKey(op.segmentId, op.day)] = describeScheduleError(err)
    result.failedSegments.add(op.segmentId)
  }

  for (const op of ops) {
    try {
      if (op.kind === 'create') {
        const created = await api.create(op.body)
        if (op.pauseAfterCreate && created.schedule_id) {
          await api.patch(created.schedule_id, { is_active: false })
        }
        if (op.replacesScheduleId) await api.remove(op.replacesScheduleId)
      } else if (op.kind === 'patch') {
        await api.patch(op.scheduleId, op.body)
      } else {
        await api.remove(op.scheduleId)
      }
      result.succeeded++
    } catch (err) {
      fail(op, err)
    }
  }
  return result
}
