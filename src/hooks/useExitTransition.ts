import { useEffect, useState } from 'react'

/**
 * Giữ component được render thêm một khoảng ngắn sau khi đóng để chạy hiệu ứng thoát.
 * Trả về `mounted` (còn render hay không) và `closing` (đang chạy hiệu ứng đóng).
 */
export const useExitTransition = (isOpen: boolean, durationMs = 200) => {
  const [mounted, setMounted] = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      return
    }
    const timer = window.setTimeout(() => setMounted(false), durationMs)
    return () => window.clearTimeout(timer)
  }, [isOpen, durationMs])

  return { mounted: isOpen || mounted, closing: !isOpen && mounted }
}
