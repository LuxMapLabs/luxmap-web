/**
 * Tiện ích hiển thị cho màn hình thẩm định phản ánh người dân:
 * nhãn tiếng Việt cho mã kỹ thuật và định dạng ngày giờ thống nhất dd/MM/yyyy.
 */
import type { CitizenReportStatus, FaultStatus, FaultType, Severity } from '../../types/common/enums'

const pad2 = (n: number): string => String(n).padStart(2, '0')

const toDate = (value?: string | null): Date | null => {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** dd/MM/yyyy */
export const formatDateVN = (value?: string | null): string => {
  const d = toDate(value)
  return d ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}` : '-'
}

/** HH:mm dd/MM/yyyy */
export const formatDateTimeVN = (value?: string | null): string => {
  const d = toDate(value)
  return d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())} ${formatDateVN(value)}` : '-'
}

/** HH:mm:ss */
export const formatTimeVN = (value?: string | null): string => {
  const d = toDate(value)
  return d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}` : ''
}

/** "yyyy-MM-dd" (đêm phát sinh) thành "dd/MM/yyyy"; không parse theo múi giờ để tránh lệch ngày */
export const formatNightOf = (nightOf?: string | null): string => {
  if (!nightOf) return '-'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(nightOf)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : nightOf
}

export const FAULT_TYPE_LABELS_VN: Record<FaultType, string> = {
  lamp_out: 'Đèn tắt hoàn toàn',
  lamp_dim: 'Đèn sáng yếu / chập chờn',
  segment_outage: 'Mất điện toàn tuyến',
  node_offline: 'Mất tín hiệu điều khiển',
  runtime_decline: 'Suy giảm hiệu năng',
}

export const SEVERITY_LABELS_VN: Record<Severity, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  critical: 'Khẩn cấp',
}

export const FAULT_STATUS_LABELS_VN: Record<FaultStatus, string> = {
  detected: 'Mới phát hiện',
  confirmed: 'Đã xác nhận',
  in_progress: 'Đang xử lý',
  resolved: 'Đã sửa xong',
  verified: 'Đã nghiệm thu',
  rejected: 'Đã từ chối',
}

export const REPORT_DECISION_LABELS_VN: Record<CitizenReportStatus, string> = {
  pending: 'Chờ duyệt',
  accepted: 'Đã chấp thuận, tạo sự cố',
  merged: 'Đã gộp vào sự cố đang mở',
  rejected: 'Đã từ chối',
}

export const faultTypeLabel = (t?: string | null): string =>
  (t && FAULT_TYPE_LABELS_VN[t as FaultType]) || t || '-'
export const severityLabel = (s?: string | null): string =>
  (s && SEVERITY_LABELS_VN[s as Severity]) || s || '-'
export const faultStatusLabel = (s?: string | null): string =>
  (s && FAULT_STATUS_LABELS_VN[s as FaultStatus]) || s || '-'
