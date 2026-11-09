import { useEffect } from 'react'

const CLOSE_BUTTON_SELECTOR = 'button[aria-label="Đóng"], button:has(> svg.lucide-x)'
const CANCEL_LABELS = ['hủy', 'hủy bỏ', 'đóng', 'huỷ', 'để sau']

const getZIndex = (el: Element): number => {
  const z = Number.parseInt(window.getComputedStyle(el).zIndex, 10)
  return Number.isNaN(z) ? 0 : z
}

// Tìm lớp phủ nằm trên cùng (z-index cao nhất, cùng z-index thì phần tử thêm sau cùng)
const findTopOverlay = (): HTMLElement | null => {
  const overlays = Array.from(document.querySelectorAll<HTMLElement>('div.fixed.inset-0')).filter(
    (el) => getZIndex(el) >= 50 && !el.classList.contains('ui-closing') && el.dataset.escSelf === undefined
  )
  let top: HTMLElement | null = null
  let topZ = -1
  overlays.forEach((el) => {
    const z = getZIndex(el)
    if (z >= topZ) {
      top = el
      topZ = z
    }
  })
  return top
}

const findCloseControl = (overlay: HTMLElement): HTMLElement | null => {
  const iconButton = overlay.querySelector<HTMLElement>(CLOSE_BUTTON_SELECTOR)
  if (iconButton) return iconButton
  const buttons = Array.from(overlay.querySelectorAll<HTMLButtonElement>('button'))
  return buttons.find((b) => CANCEL_LABELS.includes((b.textContent || '').trim().toLowerCase())) ?? null
}

/**
 * Cho phép phím Esc đóng modal đứng trên cùng ở mọi trang.
 * Modal/Drawer dùng chung đã tự xử lý Esc nên được đánh dấu data-esc-self để bỏ qua.
 */
export const useModalEscape = (): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const overlay = findTopOverlay()
      if (!overlay) return
      const control = findCloseControl(overlay)
      if (control) {
        e.preventDefault()
        control.click()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
