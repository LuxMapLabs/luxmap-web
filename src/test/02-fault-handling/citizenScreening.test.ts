import { describe, expect, it } from 'vitest'
import {
  defaultSourceOf,
  fillNights,
  formatRate,
  screeningWindow,
  tonightVN,
} from '../../utils/dashboard/citizenScreening'
import type { CitizenScreeningStatistics } from '../../types/statistics/citizen-screening'

describe('citizen screening helpers (ST-14)', () => {
  it('counts a night from 12:00 Vietnam time, like the backend', () => {
    // 04:59 UTC = 11:59 tại Việt Nam: vẫn là đêm hôm trước
    expect(tonightVN(new Date('2026-11-26T04:59:00Z'))).toBe('2026-11-25')
    // 05:00 UTC = 12:00: sang đêm mới
    expect(tonightVN(new Date('2026-11-26T05:00:00Z'))).toBe('2026-11-26')
    // 18:00 UTC ngày 26 = 01:00 ngày 27 tại Việt Nam: vẫn thuộc đêm 26
    expect(tonightVN(new Date('2026-11-26T18:00:00Z'))).toBe('2026-11-26')
  })

  it('looks back thirty nights, tonight included', () => {
    expect(screeningWindow(new Date('2026-11-26T10:00:00Z'))).toEqual({ from: '2026-10-28', to: '2026-11-26' })
  })

  it('fills the nights the backend leaves out with zeros and keeps the ones it sends', () => {
    const night = { night_of: '2026-11-25', reports: 2, cv_off: 1, cv_on: 1, inconclusive: 0, not_analyzed: 0, no_photo: 0, contradicted: 1 }
    const filled = fillNights([night], '2026-11-24', '2026-11-26')
    expect(filled.map((n) => n.night_of)).toEqual(['2026-11-24', '2026-11-25', '2026-11-26'])
    expect(filled[1]).toBe(night)
    expect(filled[0].reports + filled[2].reports).toBe(0)
  })

  it('prefers field data, else the first source the backend returns', () => {
    const stats = (sources: string[]) => ({ sources: sources.map((data_source) => ({ data_source })) }) as unknown as CitizenScreeningStatistics
    expect(defaultSourceOf(stats(['public_imagery', 'field']))).toBe('field')
    expect(defaultSourceOf(stats(['simulated']))).toBe('simulated')
    expect(defaultSourceOf(stats([]))).toBeNull()
    expect(defaultSourceOf(null)).toBeNull()
  })

  it('shows a null rate as a dash, never as 0%', () => {
    expect(formatRate(null)).toBe('—')
    expect(formatRate(0.6667)).toBe('66.7%')
    expect(formatRate(0.5)).toBe('50%')
    expect(formatRate(0)).toBe('0%')
  })
})
