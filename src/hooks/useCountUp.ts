import { useEffect, useRef, useState } from 'react'

/**
 * Đếm số mượt từ giá trị hiện tại đến giá trị đích (ease-out).
 * Khi dữ liệu làm mới, số chạy tiếp từ giá trị cũ sang giá trị mới.
 * Tôn trọng prefers-reduced-motion: hiển thị thẳng giá trị đích.
 */
export const useCountUp = (target: number, duration = 1100): number => {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (!Number.isFinite(target)) return

    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      fromRef.current = target
      setValue(target)
      return
    }

    const from = fromRef.current
    const startedAt = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = from + (target - from) * eased
      fromRef.current = next
      setValue(next)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}
