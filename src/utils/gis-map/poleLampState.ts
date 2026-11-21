/**
 * Trạng thái hiển thị của cột trên bản đồ GIS, gộp từ hai trường API:
 * - `fixture_status`: lần quan sát đã công bố gần nhất (sweep / ảnh cột) — normal | dim | out | unknown.
 * - `power_state` của mạch cấp cho cột: rơ-le node IoT báo — on | off | unknown.
 *
 * Đèn trên GIS chỉ còn bình thường hoặc hỏng; `dim` (dữ liệu cũ) coi như bình thường.
 * Chỉ cột bình thường mới đổi theo mạch: mạch `off` → đèn đang tắt, mạch `on` → đèn đang bật,
 * mạch chưa rõ → giữ "bình thường". `out`, `unknown` luôn theo `fixture_status`, mạch thế nào cũng vậy.
 * Đây là trạng thái HIỂN THỊ: thống kê / bộ lọc cũng gộp `dim` vào bình thường.
 */
export type PoleLampState = 'on' | 'off' | 'normal' | 'out' | 'unknown'

export function poleLampState(fixtureStatus?: string | null, powerState?: string | null): PoleLampState {
  if (fixtureStatus === 'normal' || fixtureStatus === 'dim') {
    return powerState === 'on' ? 'on' : powerState === 'off' ? 'off' : 'normal'
  }
  if (fixtureStatus === 'out') return 'out'
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

export type FeederLineStatus = 'fault' | 'off' | 'active' | 'unknown'

/** Màu đường feeder (lõi + quầng) và nhãn ngắn trong mục "Mạch điện" của chú giải. */
export const FEEDER_LINE_UI: Record<FeederLineStatus, { label: string; color: string; glow: string }> = {
  active: { label: 'Có điện', color: '#10b981', glow: '#059669' },
  // Trắng như cột đang tắt: nét tối chìm mất trên mặt đường của ảnh vệ tinh
  off: { label: 'Đang tắt', color: '#f8fafc', glow: '#0f172a' },
  fault: { label: 'Sự cố', color: '#ef4444', glow: '#dc2626' },
  unknown: { label: 'Chưa rõ', color: '#94a3b8', glow: '#64748b' },
}

/**
 * Trạng thái đường feeder: sự cố (tủ / mạch / cạnh `status = fault`) trước, rồi `power_state`.
 * Mạch `off` là mạch đang tắt (rơ-le OFF), KHÔNG tô như sự cố; chỉ `on` mới xanh.
 */
export function feederLineStyle(isFault: boolean, powerState?: string | null) {
  const status: FeederLineStatus = isFault ? 'fault' : powerState === 'off' ? 'off' : powerState === 'on' ? 'active' : 'unknown'
  return { status, ...FEEDER_LINE_UI[status] }
}
