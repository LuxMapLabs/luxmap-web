import type { PolePhotoItem } from '../../types/workorders/orders'

export type LuxVerdictSource = Pick<PolePhotoItem, 'lux_value' | 'lux_classified_as' | 'lux_baseline_ratio' | 'lux_reason_codes'>
export type LuxVerdict = { label: string; tone: 'dim' | 'normal' | 'muted' }

/**
 * Kết luận độ sáng của số lux đo đứng yên (LUX-BASELINE, Contract v1.24). Backend chấm, FE chỉ hiển thị:
 * không tự tính tỉ lệ, không so lux giữa các cột.
 */
export function luxVerdict(photo: LuxVerdictSource): LuxVerdict | null {
  if (typeof photo.lux_value !== 'number') return null
  const reasons = photo.lux_reason_codes ?? []
  const percent =
    typeof photo.lux_baseline_ratio === 'number' ? `${Math.round(photo.lux_baseline_ratio * 100)}% baseline` : null

  if (!photo.lux_classified_as) return { label: 'Chưa đánh giá độ sáng', tone: 'muted' }
  if (reasons.includes('cv_off')) return null
  if (reasons.includes('optical_filter')) return { label: `Thử tấm lọc${percent ? ` · ${percent}` : ''}`, tone: 'muted' }
  if (reasons.includes('baseline_missing')) return { label: 'Chưa đủ baseline (cần 3 đêm)', tone: 'muted' }
  if (reasons.includes('baseline_unstable')) return { label: 'Baseline chưa ổn định', tone: 'muted' }
  if (photo.lux_classified_as === 'dim') return { label: `MỜ${percent ? ` · ${percent}` : ''}`, tone: 'dim' }
  return { label: `Sáng bình thường${percent ? ` · ${percent}` : ''}`, tone: 'normal' }
}

/** Số đo đã có nhưng backend chưa kết luận được độ sáng (chưa duyệt, đối chứng, chưa đủ / chưa ổn định baseline). */
export const luxAwaitingVerdict = (photo: LuxVerdictSource) => luxVerdict(photo)?.tone === 'muted'
