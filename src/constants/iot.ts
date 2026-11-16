/**
 * Nhãn tiếng Việt cho trạng thái IoT bridge. Danh sách giá trị lấy theo backend (contract-drift.md, mục
 * IOT-DIAGNOSTICS); OpenAPI hiện chỉ khai `string`, nên giá trị lạ luôn rơi về nhãn "Không xác định".
 */
export type IotTone = 'ok' | 'warn' | 'bad' | 'muted'

export interface IotStatusBadge {
  label: string
  tone: IotTone
}

/** `GET /iot/servers` → `status` của gateway. */
export const IOT_GATEWAY_STATUS: Record<string, IotStatusBadge> = {
  online: { label: 'Gateway online', tone: 'ok' },
  offline: { label: 'Gateway offline', tone: 'bad' },
  broker_down: { label: 'Broker MQTT dừng', tone: 'bad' },
  unreachable: { label: 'Không kết nối được bridge', tone: 'bad' },
  unconfigured: { label: 'Chưa cấu hình', tone: 'muted' },
}

/** `GET /iot/nodes` → `items[].status` của node (theo độ mới của mẫu điện). */
export const IOT_NODE_STATUS: Record<string, IotStatusBadge> = {
  online: { label: 'Node online', tone: 'ok' },
  offline: { label: 'Node mất tín hiệu', tone: 'bad' },
  no_data: { label: 'Chưa có dữ liệu', tone: 'warn' },
  source_unavailable: { label: 'Không đọc được nguồn', tone: 'warn' },
  unconfigured: { label: 'Chưa gán nguồn đo', tone: 'muted' },
}

const UNKNOWN: IotStatusBadge = { label: 'Không xác định', tone: 'muted' }

export function iotStatusBadge(table: Record<string, IotStatusBadge>, status?: string | null): IotStatusBadge {
  return (status && table[status]) || UNKNOWN
}

/** Màu chấm trạng thái dùng cho marker bản đồ (style inline, không qua Tailwind). */
export const IOT_TONE_COLOR: Record<IotTone, string> = {
  ok: '#10b981',
  warn: '#f59e0b',
  bad: '#f43f5e',
  muted: '#94a3b8',
}

/** Lớp Tailwind cho badge trạng thái trong drawer. */
export const IOT_TONE_CLASS: Record<IotTone, string> = {
  ok: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  warn: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  bad: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  muted: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}
