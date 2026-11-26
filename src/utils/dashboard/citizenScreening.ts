/**
 * Tiện ích cho khối "Báo cáo QR · sàng lọc CV" trên dashboard Quản lý (GET /statistics/citizen-screening, drift ST-14).
 * Mọi con số đếm và tỉ lệ đến từ backend; ở đây chỉ chọn cửa sổ đêm, lấp đêm trống cho biểu đồ và định dạng.
 */
import type {
  CitizenScreeningNight,
  CitizenScreeningSource,
  CitizenScreeningStatistics,
} from '../../types/statistics/citizen-screening'

/** Số đêm khối dashboard nhìn lại, đêm nay tính cả. */
export const SCREENING_NIGHTS = 30

const VN_OFFSET_MS = 7 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

const isoDay = (utcMidnightMs: number): string => new Date(utcMidnightMs).toISOString().slice(0, 10)

/**
 * Đêm nay theo luật của backend (WorkOrderAgendaOptions.NightOf): ngày giờ Việt Nam, trước 12:00 thì thuộc đêm hôm trước.
 * Việt Nam không có giờ mùa hè nên cộng cố định 7 giờ là đủ.
 */
export const tonightVN = (now: Date): string => {
  const local = new Date(now.getTime() + VN_OFFSET_MS)
  const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
  return isoDay(local.getUTCHours() < 12 ? day - DAY_MS : day)
}

/** `from`/`to` (theo night_of) của SCREENING_NIGHTS đêm gần nhất. */
export const screeningWindow = (now: Date, nights = SCREENING_NIGHTS): { from: string; to: string } => {
  const to = tonightVN(now)
  return { from: isoDay(Date.parse(`${to}T00:00:00Z`) - (nights - 1) * DAY_MS), to }
}

const emptyNight = (night_of: string): CitizenScreeningNight => ({
  night_of,
  reports: 0,
  cv_off: 0,
  cv_on: 0,
  inconclusive: 0,
  not_analyzed: 0,
  no_photo: 0,
  contradicted: 0,
})

/** Backend chỉ trả đêm có báo cáo; biểu đồ cần đủ mọi đêm từ `from` tới `to`. */
export const fillNights = (byNight: CitizenScreeningNight[], from: string, to: string): CitizenScreeningNight[] => {
  const known = new Map(byNight.filter((n) => n.night_of).map((n) => [n.night_of as string, n]))
  const result: CitizenScreeningNight[] = []
  for (let t = Date.parse(`${from}T00:00:00Z`), end = Date.parse(`${to}T00:00:00Z`); t <= end; t += DAY_MS) {
    const day = isoDay(t)
    result.push(known.get(day) ?? emptyNight(day))
  }
  return result
}

/** Nguồn hiển thị mặc định: `field` (dữ liệu thực địa) nếu có, không thì nguồn đầu tiên backend trả. */
export const defaultSourceOf = (stats: CitizenScreeningStatistics | null): string | null => {
  const sources = stats?.sources ?? []
  return (sources.find((s) => s.data_source === 'field') ?? sources[0])?.data_source ?? null
}

export const sourceOf = (
  stats: CitizenScreeningStatistics | null,
  dataSource: string | null
): CitizenScreeningSource | null => stats?.sources.find((s) => s.data_source === dataSource) ?? null

/** Tỉ lệ 0..1 của backend thành phần trăm; `null` (mẫu số 0) thành "—". */
export const formatRate = (rate: number | null | undefined): string =>
  rate == null ? '—' : `${(rate * 100).toFixed(1).replace(/\.0$/, '')}%`

export const DATA_SOURCE_LABELS_VN: Record<string, string> = {
  field: 'Thực địa',
  public_imagery: 'Ảnh công khai',
  calibration_rig: 'Bộ thử nghiệm',
  simulated: 'Mô phỏng',
}
