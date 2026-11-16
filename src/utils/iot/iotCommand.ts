import type { IotCommandHistoryItem, IotCommandStatus } from '../../types/iot/nodes'

/** Lịch AUTO mặc định khi node chưa có lịch nào. */
export const DEFAULT_AUTO_SCHEDULE = { day_start: '06:00', night_start: '18:00' }

/** Nút người dùng bấm, ánh xạ sang body của POST /iot/nodes/{id}/command. */
export type IotCommandChoice = 'on' | 'off' | 'auto'

export function commandBody(choice: IotCommandChoice) {
  return choice === 'auto'
    ? { mode: 'AUTO', command: null }
    : { mode: 'MANUAL', command: choice === 'on' ? 'ON' : 'OFF' }
}

/** Lệnh đang hiệu lực trên node, đọc từ GET command: `AUTO` hoặc `MANUAL` + `ON`/`OFF`. */
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

export type IotCommandProgress = 'pending' | 'acknowledged' | 'superseded' | 'expired'

/**
 * Tiến trình của lệnh FE vừa gửi (docs/LUXMAP-IOT-FE.md mục 4):
 * GET trả mã khác ⇒ lệnh mới đã thay; cùng mã và `command_acknowledged` ⇒ node đã xác nhận;
 * quá `expires_at` mà chưa ACK ⇒ hết hạn chờ xác nhận.
 */
export function commandProgress(
  tracked: { command_id?: string | null; expires_at?: string | null },
  current: IotCommandStatus | null,
  now: number
): IotCommandProgress {
  if (current?.command_id && tracked.command_id && current.command_id !== tracked.command_id) return 'superseded'
  if (current?.command_id === tracked.command_id && current?.command_acknowledged) return 'acknowledged'
  const expiresAt = tracked.expires_at ? Date.parse(tracked.expires_at) : NaN
  if (Number.isFinite(expiresAt) && now >= expiresAt) return 'expired'
  return 'pending'
}

/** "HH:mm" 24 giờ — cùng luật với backend (TimeOnly.TryParseExact "HH:mm"). */
export function isClock(value: string): boolean {
  return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)
}
