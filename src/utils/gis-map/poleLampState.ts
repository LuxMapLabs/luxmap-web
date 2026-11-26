/**
 * Trạng thái hiển thị của cột trên bản đồ GIS, gộp từ hai trường API:
 * - `fixture_status`: lần quan sát đã công bố gần nhất (sweep / ảnh cột) — normal | dim | out | unknown.
 * - `power_state` của mạch cấp cho cột: rơ-le node IoT báo — on | off | unknown.
 *
 * Chỉ cột `normal` mới đổi theo mạch: mạch `off` → đèn đang tắt, mạch `on` → đèn đang bật,
 * mạch chưa rõ → giữ "bình thường". `dim`, `out`, `unknown` luôn theo `fixture_status`, mạch thế nào cũng vậy.
 * Đây là trạng thái HIỂN THỊ: thống kê / bộ lọc vẫn đếm theo `fixture_status`.
 */
import type { FeederHealthState, FeederPowerState } from '../../types/common/enums'

export type PoleLampState = 'on' | 'off' | 'normal' | 'dim' | 'out' | 'unknown'

export function poleLampState(fixtureStatus?: string | null, powerState?: string | null): PoleLampState {
  if (fixtureStatus === 'normal') return powerState === 'on' ? 'on' : powerState === 'off' ? 'off' : 'normal'
  if (fixtureStatus === 'dim' || fixtureStatus === 'out') return fixtureStatus
  return 'unknown'
}

interface LampStateUi {
  /** Nhãn đầy đủ (tooltip, badge chi tiết cột). */
  label: string
  /** Nhãn ngắn (danh sách cột). */
  short: string
  /** Lớp Tailwind cho badge. */
  badge: string
  /** Lớp Tailwind cho chấm màu (kết quả tìm kiếm). */
  dot: string
  /** Màu khối cầu marker (sáng → tối) và quầng sáng. */
  sphere: { highlight: string; body: string; deep: string; shadow: string; glow: string }
}

const GREEN = { highlight: '#86efac', body: '#10b981', deep: '#047857', shadow: '#022c22', glow: 'rgba(16, 185, 129, 0.35)' }
const GREEN_BADGE = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'

export const POLE_LAMP_UI: Record<PoleLampState, LampStateUi> = {
  on: { label: 'Đang bật', short: 'Bật', badge: GREEN_BADGE, dot: 'bg-emerald-500', sphere: GREEN },
  normal: { label: 'Bình thường', short: 'Bình thường', badge: GREEN_BADGE, dot: 'bg-emerald-500', sphere: GREEN },
  off: {
    label: 'Đang tắt',
    short: 'Tắt',
    badge: 'bg-white text-slate-600 border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-600',
    dot: 'bg-white border border-slate-400',
    sphere: { highlight: '#ffffff', body: '#f1f5f9', deep: '#cbd5e1', shadow: '#64748b', glow: 'rgba(148, 163, 184, 0.25)' },
  },
  dim: {
    label: 'Đèn mờ',
    short: 'Mờ',
    badge: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    dot: 'bg-amber-500',
    sphere: { highlight: '#fef08a', body: '#f59e0b', deep: '#b45309', shadow: '#451a03', glow: 'rgba(245, 158, 11, 0.4)' },
  },
  out: {
    label: 'Hỏng',
    short: 'Hỏng',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    dot: 'bg-rose-500',
    sphere: { highlight: '#fecdd3', body: '#f43f5e', deep: '#be123c', shadow: '#4c0519', glow: 'rgba(244, 63, 94, 0.45)' },
  },
  unknown: {
    label: 'Chưa quét',
    short: 'Chưa quét',
    badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400',
    sphere: { highlight: '#f1f5f9', body: '#64748b', deep: '#334155', shadow: '#0f172a', glow: 'rgba(100, 116, 139, 0.2)' },
  },
}

/** Trạng thái hiển thị của một feature cột (`properties.fixture_status` + `properties.power_state`). */
export const poleFeatureLampState = (p?: { fixture_status?: string | null; power_state?: string | null } | null) =>
  poleLampState(p?.fixture_status, p?.power_state)

/**
 * Sức khỏe mạch = `power_state` của GET /assets/feeders (FEEDER-HEALTH-1), backend tự tính.
 * Màu đường feeder (lõi + quầng), nhãn và badge chỉ theo trường này; bật/tắt là `lamp_state`, tách riêng.
 */
export const FEEDER_HEALTH_UI: Record<FeederHealthState, { label: string; color: string; glow: string; badge: string }> = {
  normal: {
    label: 'Bình thường',
    color: '#10b981',
    glow: '#059669',
    badge: GREEN_BADGE,
  },
  warning: {
    label: 'Cảnh báo',
    color: '#f59e0b',
    glow: '#d97706',
    badge: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  },
  incident: {
    label: 'Sự cố',
    color: '#ef4444',
    glow: '#dc2626',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
  },
  offline: {
    label: 'Mất kết nối IoT',
    color: '#475569',
    glow: '#1e293b',
    badge: 'bg-slate-200 text-slate-800 border-slate-400 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-500',
  },
  unknown: {
    label: 'Chưa có IoT',
    color: '#94a3b8',
    glow: '#64748b',
    badge: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
}

/** Bật/tắt quan sát được = `lamp_state` của GET /assets/feeders. */
export const FEEDER_LAMP_LABEL: Record<FeederPowerState, string> = { on: 'Đang bật', off: 'Đang tắt', unknown: 'Chưa rõ' }

/** UI sức khỏe mạch; API chưa trả (hoặc mạch không có trong danh sách) thì `null`: chữ ghi '-', đường tô xám như "Chưa có IoT". */
export const feederHealthUi = (state?: string | null) =>
  state && state in FEEDER_HEALTH_UI ? FEEDER_HEALTH_UI[state as FeederHealthState] : null

/** Nhãn bật/tắt; API chưa trả thì '-'. */
export const feederLampLabel = (state?: string | null) =>
  state && state in FEEDER_LAMP_LABEL ? FEEDER_LAMP_LABEL[state as FeederPowerState] : '-'
