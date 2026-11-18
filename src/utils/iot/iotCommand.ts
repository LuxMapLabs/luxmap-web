import type { IotAutoSchedule, IotCommandHistoryItem, IotCommandRequest, IotCommandStatus } from '../../types/iot/nodes'

/** Lịch AUTO mặc định khi node chưa có lịch nào. */
export const DEFAULT_AUTO_SCHEDULE = { day_start: '06:00', night_start: '18:00' }

/** Nút người dùng bấm, ánh xạ sang body của POST /iot/nodes/{id}/command. */
export type IotCommandChoice = 'on' | 'off' | 'auto'

export function commandBody(choice: IotCommandChoice): IotCommandRequest {
  return choice === 'auto'
    ? { mode: 'AUTO', command: null }
    : { mode: 'MANUAL', command: choice === 'on' ? 'ON' : 'OFF' }
}

/** Nút tương ứng một lệnh: `AUTO` hoặc `MANUAL` + `ON`/`OFF`. */
export function currentChoice(status?: Pick<IotCommandStatus, 'mode' | 'command'> | null): IotCommandChoice | null {
  if (!status?.mode) return null
  if (status.mode.toUpperCase() === 'AUTO') return 'auto'
  const command = status.command?.toUpperCase()
  return command === 'ON' ? 'on' : command === 'OFF' ? 'off' : null
}

/**
 * Chế độ thật của mạch: lệnh mới nhất có `status = success` trong lịch sử lệnh (mới nhất trước).
 * Lệnh pending / expired chưa hoặc không bao giờ được node thực hiện nên không tính. Không có lệnh success → null.
 */
export function latestSuccessChoice(items?: IotCommandHistoryItem[] | null): IotCommandChoice | null {
  const latest = (items || []).find((item) => item.status === 'success')
  return latest ? currentChoice(latest) : null
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
