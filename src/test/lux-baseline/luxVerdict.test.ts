import { describe, expect, it } from 'vitest'
import { luxAwaitingVerdict, luxVerdict } from '../../utils/work-schedule/luxVerdict'

describe('luxVerdict (LUX-BASELINE)', () => {
  it('shows nothing without a reading', () => {
    expect(luxVerdict({})).toBeNull()
  })

  it('marks a reading the backend has not judged', () => {
    expect(luxVerdict({ lux_value: 5.8 })).toEqual({ label: 'Chưa đánh giá độ sáng', tone: 'muted' })
    expect(luxAwaitingVerdict({ lux_value: 5.8 })).toBe(true)
  })

  it('explains why a reading could not be judged yet', () => {
    expect(luxVerdict({ lux_value: 10, lux_classified_as: 'normal', lux_reason_codes: ['baseline_missing'] })?.label)
      .toBe('Chưa đủ baseline (cần 3 đêm)')
    expect(luxVerdict({ lux_value: 10, lux_classified_as: 'normal', lux_baseline_ratio: 0.5, lux_reason_codes: ['baseline_unstable'] })?.label)
      .toBe('Baseline chưa ổn định')
  })

  it('shows the backend ratio for a judged reading, never a value of its own', () => {
    expect(luxVerdict({ lux_value: 7, lux_classified_as: 'dim', lux_baseline_ratio: 0.7, lux_reason_codes: ['brightness_evaluated'] }))
      .toEqual({ label: 'MỜ · 70% baseline', tone: 'dim' })
    expect(luxVerdict({ lux_value: 10.2, lux_classified_as: 'normal', lux_baseline_ratio: 1.02, lux_reason_codes: ['brightness_evaluated'] }))
      .toEqual({ label: 'Sáng bình thường · 102% baseline', tone: 'normal' })
  })

  it('keeps a filter test apart from a real verdict', () => {
    expect(luxVerdict({ lux_value: 7, lux_classified_as: 'dim', lux_baseline_ratio: 0.7, lux_reason_codes: ['brightness_evaluated', 'optical_filter'] }))
      .toEqual({ label: 'Thử tấm lọc · 70% baseline', tone: 'muted' })
  })

  it('adds nothing for an OFF photo, which the out label already covers', () => {
    expect(luxVerdict({ lux_value: 0.5, lux_classified_as: 'out', lux_reason_codes: ['cv_off'] })).toBeNull()
  })
})
