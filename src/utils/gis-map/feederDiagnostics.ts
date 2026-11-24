import type { IotDiagnosticSummaryItem } from '../../types/iot/diagnostics'

/**
 * Mức hiển thị của một mạch trên GIS, suy từ chẩn đoán IoT (GET /iot/diagnostics/summary):
 * - `fault`: lỗi điện ảnh hưởng chiếu sáng. Backend đổi ba mã này thành Fault current_anomaly /
 *   segment_outage / voltage_anomaly (docs/IOT-DIAGNOSTICS.md mục 5) → đường đỏ "Sự cố".
 * - `warn`: lỗi phần cứng node, dữ liệu điện quá hạn hoặc node mất liên lạc. Chỉ nói thiết bị đo / đường truyền
 *   có vấn đề, không chắc đèn hỏng → đường cam "Cảnh báo".
 */
export type FeederDiagnosticLevel = 'fault' | 'warn'

/** Mã lỗi điện: dòng giảm quá 5% so với danh định, mất áp khi bật, áp lệch dung sai. */
export const ELECTRICAL_FAULT_CODES: readonly string[] = ['current_drop', 'voltage_loss', 'voltage_deviation']

export function feederDiagnosticLevel(item?: IotDiagnosticSummaryItem | null): FeederDiagnosticLevel | null {
  if (!item) return null
  const codes = item.anomaly_codes ?? []
  if (item.diagnostic_status === 'anomaly' && codes.some((c) => ELECTRICAL_FAULT_CODES.includes(c))) return 'fault'
  if (codes.length > 0 || item.diagnostic_status === 'stale' || item.connection_status === 'offline') return 'warn'
  return null
}

/** Mức cao nhất theo từng mạch (một mạch có thể có nhiều node). Mạch không có lỗi thì không có trong kết quả. */
export function buildFeederDiagnosticLevels(
  items: readonly IotDiagnosticSummaryItem[]
): Map<string, FeederDiagnosticLevel> {
  const levels = new Map<string, FeederDiagnosticLevel>()
  items.forEach((item) => {
    if (!item.feeder_id) return
    const level = feederDiagnosticLevel(item)
    if (!level) return
    if (level === 'fault' || !levels.has(item.feeder_id)) levels.set(item.feeder_id, level)
  })
  return levels
}
