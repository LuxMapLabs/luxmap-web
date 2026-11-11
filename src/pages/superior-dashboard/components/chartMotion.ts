import { useEffect, useState } from 'react'
import { useMediaQuery } from '../../../hooks/useMediaQuery'

const DURATION_MS = 800

// Chuyển động vẽ biểu đồ: chỉ chạy khi vào trang hoặc khi `signature` (dữ liệu, chế độ xem) đổi.
// Đổi kích thước khung (bật trình chiếu, thu gọn sidebar) không làm chart chạy lại.
// Tắt hẳn khi người dùng chọn giảm chuyển động.
export const useChartMotion = (delayMs: number, signature: string) => {
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    setPlaying(true)
    const timer = window.setTimeout(() => setPlaying(false), delayMs + DURATION_MS + 200)
    return () => window.clearTimeout(timer)
  }, [signature, delayMs])

  return {
    isAnimationActive: !reduce && playing,
    animationBegin: delayMs,
    animationDuration: DURATION_MS,
    animationEasing: 'ease-out' as const,
  }
}
