import type { IotAutoSchedule, IotCommandHistoryItem, IotCommandRequest, IotCommandStatus } from '../../types/iot/nodes'

/** Lịch AUTO mặc định khi node chưa có lịch nào. */
export const DEFAULT_AUTO_SCHEDULE = { day_start: '06:00', night_start: '18:00' }

/** Nút người dùng bấm, ánh xạ sang body của POST /iot/nodes/{id}/command. */
export type IotCommandChoice = 'on' | 'off' | 'auto'

/** Kiểu chạy AUTO của node: theo lịch giờ hoặc toàn thời gian theo cảm biến lux. */
export type IotAutoType = 'scheduled' | 'full_time'

export function commandBody(choice: IotCommandChoice): IotCommandRequest {
  return choice === 'auto'
    ? { mode: 'AUTO', command: null }
    : { mode: 'MANUAL', command: choice === 'on' ? 'ON' : 'OFF' }
}

/** Tạo body cho lệnh AUTO theo kiểu `scheduled` hoặc `full_time` (không kèm `auto_schedule` khi `full_time`). */
export function autoBody(
  type: IotAutoType,
  schedule?: { day_start: string; night_start: string }
): IotCommandRequest {
  if (type === 'full_time') {
    return { mode: 'AUTO', command: null, auto_type: 'full_time' }
  }
  return schedule
    ? { mode: 'AUTO', command: null, auto_type: 'scheduled', auto_schedule: schedule }
    : { mode: 'AUTO', command: null, auto_type: 'scheduled' }
}

/** Xác định kiểu AUTO từ trạng thái lệnh (`scheduled` mặc định khi đang ở chế độ AUTO mà thiếu `auto_type`). */
export function autoTypeOf(
  status?: Pick<IotCommandStatus, 'mode' | 'auto_type'> | null
): IotAutoType | null {
  if (!status?.mode || status.mode.toUpperCase() !== 'AUTO') return null
  return status.auto_type === 'full_time' ? 'full_time' : 'scheduled'
}

/** Nút tương ứng một lệnh: `AUTO` hoặc `MANUAL` + `ON`/`OFF`. */
export function currentChoice(status?: Pick<IotCommandStatus, 'mode' | 'command'> | null): IotCommandChoice | null {
  if (!status?.mode) return null
  if (status.mode.toUpperCase() === 'AUTO') return 'auto'
  const command = status.command?.toUpperCase()
  return command === 'ON' ? 'on' : command === 'OFF' ? 'off' : null
}

/**
 * Lịch điền sẵn cho form AUTO: lịch của lệnh AUTO `success` mới nhất trong lịch sử lệnh (lịch node đã thực sự chạy).
 * Lệnh AUTO pending / expired không tính. Không có → null (form dùng 06:00 / 18:00).
 */
export function latestSuccessAutoSchedule(items?: IotCommandHistoryItem[] | null): IotAutoSchedule | null {
  const latest = (items || []).find(
    (item) =>
      item.status === 'success' &&
      item.mode?.toUpperCase() === 'AUTO' &&
      item.auto_schedule?.day_start &&
      item.auto_schedule.night_start
  )
  return latest?.auto_schedule ?? null
}

/** "HH:mm" 24 giờ — cùng luật với backend (TimeOnly.TryParseExact "HH:mm"). */
export function isClock(value: string): boolean {
  return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)
}
