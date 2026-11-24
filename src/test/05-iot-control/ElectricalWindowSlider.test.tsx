import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  ElectricalWindowSlider,
  leftPxToWindowEnd,
  windowEndToLeftPx,
} from '../../components/ElectricalWindowSlider'

const H = 3_600_000
const day = (year: number, monthIndex: number, date: number, hour = 0, minute = 0) =>
  new Date(year, monthIndex, date, hour, minute, 0, 0).getTime()

describe('ElectricalWindowSlider — ánh xạ tuyến tính và nhãn ngày/giờ', () => {
  describe('windowEndToLeftPx & leftPxToWindowEnd', () => {
    it('là nghịch đảo của nhau khi không bị nới rộng và trùng công thức tỉ lệ cũ (24 giờ / 6 giờ)', () => {
      const trackStart = day(2026, 10, 24, 0, 0)
      const spanMs = 24 * H
      const windowMs = 6 * H
      const minEnd = trackStart + windowMs
      const maxEnd = trackStart + spanMs
      const trackWidthPx = 600
      const thumbPx = (windowMs / spanMs) * trackWidthPx // 150px (>= 24px, không bị nới)

      const params = { minEnd, maxEnd, trackWidthPx, thumbPx }

      // Đầu trái, giữa, và đầu phải
      const samples = [minEnd, trackStart + 12 * H, trackStart + 18 * H, maxEnd]
      for (const endMs of samples) {
        const leftPx = windowEndToLeftPx(endMs, params)
        // Trùng công thức cũ: ((windowStart - trackStart) / spanMs) * W
        const expectedLegacyLeft = ((endMs - windowMs - trackStart) / spanMs) * trackWidthPx
        expect(leftPx).toBeCloseTo(expectedLegacyLeft, 5)
        expect(leftPxToWindowEnd(leftPx, params)).toBe(endMs)
      }
    })

    it('khi khoảng dài bị nới tối thiểu 24px (30 ngày / 1 giờ), thanh luôn nằm trong [0, W - thumbPx] và nghịch đảo đúng', () => {
      const trackStart = day(2026, 9, 26, 0, 0)
      const spanMs = 30 * 24 * H
      const windowMs = 1 * H
      const minEnd = trackStart + windowMs
      const maxEnd = trackStart + spanMs
      const trackWidthPx = 600
      const thumbPx = 24 // Nới từ ~0.83px lên 24px

      const params = { minEnd, maxEnd, trackWidthPx, thumbPx }

      expect(windowEndToLeftPx(minEnd, params)).toBe(0)
      expect(windowEndToLeftPx(maxEnd, params)).toBe(trackWidthPx - thumbPx)

      const midEnd = Math.round((minEnd + maxEnd) / 2)
      const midLeft = windowEndToLeftPx(midEnd, params)
      expect(midLeft).toBeGreaterThanOrEqual(0)
      expect(midLeft).toBeLessThanOrEqual(trackWidthPx - thumbPx)
      expect(leftPxToWindowEnd(midLeft, params)).toBe(midEnd)

      // Giá trị vượt biên được kẹp gọn
      expect(windowEndToLeftPx(minEnd - 10 * H, params)).toBe(0)
      expect(windowEndToLeftPx(maxEnd + 10 * H, params)).toBe(trackWidthPx - thumbPx)
      expect(leftPxToWindowEnd(-100, params)).toBe(minEnd)
      expect(leftPxToWindowEnd(1000, params)).toBe(maxEnd)
    })

    it('xử lý mẫu số = 0 (minEnd === maxEnd) mà không sinh NaN', () => {
      const t = day(2026, 10, 24, 12, 0)
      const params = { minEnd: t, maxEnd: t, trackWidthPx: 600, thumbPx: 24 }
      expect(windowEndToLeftPx(t, params)).toBe(0)
      expect(leftPxToWindowEnd(100, params)).toBe(t)
    })
  })

  describe('nhãn ngày khi spanMs > 25 giờ và 5 nhãn giờ khi <= 25 giờ', () => {
    it('khoảng 30 ngày (> 25 giờ): hiện nhãn dd/MM (<= 9 nhãn), không có HH:mm và có vạch dọc mỗi ngày', () => {
      const trackStart = day(2026, 9, 27, 0, 0) // 27/10 00:00
      const trackEnd = day(2026, 10, 25, 1, 40) // 25/11 01:40

      render(
        <ElectricalWindowSlider
          points={[]}
          metric="power"
          trackStart={trackStart}
          trackEnd={trackEnd}
          windowMs={6 * H}
          windowEnd={trackEnd}
          onChangeWindowEnd={() => {}}
        />
      )

      const labelsBox = screen.getByTestId('electrical-window-labels')
      const dayMatches = labelsBox.textContent?.match(/\d{2}\/\d{2}/g) ?? []
      expect(dayMatches.length).toBeGreaterThan(0)
      expect(dayMatches.length).toBeLessThanOrEqual(9)
      expect(labelsBox.textContent).not.toMatch(/\d{2}:\d{2}/)

      // Có vạch dọc ranh giới ngày cho các mốc 00:00 bên trong track
      const ticks = screen.getAllByTestId('electrical-slider-day-tick')
      expect(ticks.length).toBeGreaterThan(20)
    })

    it('khoảng 24 giờ (<= 25 giờ): giữ nguyên 5 nhãn dd/MM HH:mm và không vẽ vạch ngày', () => {
      const trackStart = day(2026, 10, 24, 0, 0)
      const trackEnd = trackStart + 24 * H

      render(
        <ElectricalWindowSlider
          points={[]}
          metric="power"
          trackStart={trackStart}
          trackEnd={trackEnd}
          windowMs={6 * H}
          windowEnd={trackEnd}
          onChangeWindowEnd={() => {}}
        />
      )

      const labelsBox = screen.getByTestId('electrical-window-labels')
      const dateTimeMatches = labelsBox.textContent?.match(/\d{2}\/\d{2} \d{2}:\d{2}/g) ?? []
      expect(dateTimeMatches).toHaveLength(5)
      expect(screen.queryByTestId('electrical-slider-day-tick')).not.toBeInTheDocument()
    })
  })
})
