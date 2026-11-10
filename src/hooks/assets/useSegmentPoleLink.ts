import { useCallback, useState } from 'react'

type HoverSource = 'list' | 'map'

/**
 * Liên kết hai chiều giữa danh sách cột và bản đồ:
 * - rê chuột vào dòng hoặc vào cột trên bản đồ thì cột đó được làm nổi ở cả hai nơi
 * - click dòng thì bản đồ bay tới cột đó
 * - `revealId` là dòng cần cuộn vào tầm nhìn (cột vừa thêm, hoặc cột đang rê chuột từ bản đồ)
 */
export const useSegmentPoleLink = (lastAddedId: string | null) => {
  const [hover, setHover] = useState<{ id: string; source: HoverSource } | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ id: string; tick: number } | null>(null)

  // Giữ nguyên state khi không đổi, tránh render lại liên tục theo mỗi lần rê chuột trên bản đồ
  const setHoverOf = useCallback(
    (id: string | null, source: HoverSource) =>
      setHover((prev) => {
        if (!id) return prev === null ? prev : null
        return prev?.id === id && prev.source === source ? prev : { id, source }
      }),
    []
  )
  const hoverFromList = useCallback((id: string | null) => setHoverOf(id, 'list'), [setHoverOf])
  const hoverFromMap = useCallback((id: string | null) => setHoverOf(id, 'map'), [setHoverOf])
  const focusPole = useCallback(
    (id: string) => setFocusRequest((prev) => ({ id, tick: (prev?.tick ?? 0) + 1 })),
    []
  )

  const revealId = hover?.source === 'map' ? hover.id : lastAddedId

  return { highlightId: hover?.id ?? null, revealId, focusRequest, hoverFromList, hoverFromMap, focusPole }
}
