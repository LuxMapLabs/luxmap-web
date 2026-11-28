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

/** `GET /iot/nodes` → `items[].status`, `diagnostics.connection_status` (liên lạc thực tế của node). */
export const IOT_NODE_STATUS: Record<string, IotStatusBadge> = {
  online: { label: 'Node online', tone: 'ok' },
  offline: { label: 'Node mất tín hiệu', tone: 'bad' },
  no_data: { label: 'Chưa có dữ liệu', tone: 'warn' },
  source_unavailable: { label: 'Không đọc được nguồn', tone: 'warn' },
  unconfigured: { label: 'Chưa gán nguồn đo', tone: 'muted' },
  // `/iot/feeders/{id}/electrical` → `status` khi mạch đang có khoảng sửa mở (IOT-FEEDER-REPAIR)
  repairing: { label: 'Đang sửa', tone: 'muted' },
}

/** `GET /iot/nodes`, `/electrical`, `/diagnostics`, `/diagnostics/summary` → `electrical_status` (độ mới mẫu điện). */
export const IOT_ELECTRICAL_STATUS: Record<string, IotStatusBadge> = {
  fresh: { label: 'Mẫu điện mới', tone: 'ok' },
  stale: { label: 'Mẫu điện quá hạn', tone: 'warn' },
  no_data: { label: 'Chưa có mẫu điện', tone: 'muted' },
  source_unavailable: { label: 'Không đọc được nguồn', tone: 'warn' },
  unconfigured: { label: 'Chưa cấu hình nguồn', tone: 'muted' },
  repairing: { label: 'Đang sửa · tạm ngưng đọc', tone: 'muted' },
}

/** `GET /iot/nodes/{nodeId}/diagnostics` & `GET /iot/diagnostics/summary` → trạng thái chẩn đoán. */
export const IOT_DIAGNOSTIC_STATUS: Record<string, IotStatusBadge> = {
  normal: { label: 'Bình thường', tone: 'ok' },
  anomaly: { label: 'Có cảnh báo', tone: 'bad' },
  stale: { label: 'Dữ liệu quá hạn', tone: 'warn' },
  no_data: { label: 'Chưa có dữ liệu', tone: 'muted' },
  unconfigured: { label: 'Chưa cấu hình nguồn', tone: 'muted' },
  source_unavailable: { label: 'Mất nguồn Bridge', tone: 'warn' },
  repairing: { label: 'Đang sửa · tạm ngưng chẩn đoán', tone: 'muted' },
}

/** `GET /iot/nodes/{nodeId}/diagnostics` → `sensor_health.status`. */
export const IOT_SENSOR_HEALTH_STATUS: Record<string, IotStatusBadge> = {
  fresh: { label: 'Phần cứng: Bản tin mới', tone: 'ok' },
  stale: { label: 'Phần cứng: Bản tin quá hạn', tone: 'warn' },
  unknown: { label: 'Phần cứng: Chưa có bản tin', tone: 'muted' },
}

/** 17 mã cảnh báo trong docs/IOT-DIAGNOSTICS.md của backend. */
export const IOT_ANOMALY_LABELS: Record<string, string> = {
  // Mẫu điện
  telemetry_stale: 'Mẫu điện quá hạn (giây)',
  voltage_loss: 'Mất điện áp khi đèn bật (V)',
  voltage_deviation: 'Điện áp lệch danh định (V)',
  current_drop: 'Sụt dòng điện (>5% so với danh định)',
  // DS3231 (Đồng hồ thời gian thực)
  ds3231_unavailable: 'DS3231: Không nhận hoặc không khởi tạo được đồng hồ',
  ds3231_read_failed: 'DS3231: Đọc giờ qua I²C thất bại',
  ds3231_time_invalid: 'DS3231: Giờ không hợp lệ hoặc từng mất nguồn',
  // INA226 (Cảm biến điện)
  ina226_unavailable: 'INA226: Không nhận hoặc không khởi tạo được cảm biến điện',
  ina226_read_failed: 'INA226: Đọc thanh ghi đo thất bại',
  ina226_shunt_out_of_range: 'INA226: Số đo điện trở shunt chạm giới hạn',
  // BH1750 (Cảm biến ánh sáng)
  bh1750_unavailable: 'BH1750: Không nhận hoặc không khởi tạo được cảm biến ánh sáng',
  bh1750_read_failed: 'BH1750: Đọc ánh sáng thất bại',
  // MicroSD
  microsd_unavailable: 'MicroSD: Không khởi tạo được hàng đợi trên thẻ',
  microsd_read_failed: 'MicroSD: Không đọc được hàng đợi hoặc gặp bản ghi lỗi',
  microsd_write_failed: 'MicroSD: Không ghi được mẫu lên thẻ',
  // LoRa
  lora_tx_blocked: 'LoRa: Kênh phát bị nghẽn (AUX giữ LOW ≥ 10 giây)',
  lora_rx_frame_error: 'LoRa: Nhận lặp lại gói lỗi CRC hoặc sai khung',
}

export function iotAnomalyLabel(code?: string | null): string {
  return (code && IOT_ANOMALY_LABELS[code]) || code || 'Cảnh báo'
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
