import { useCallback, useMemo, useState } from 'react'
import type { PoleListItem } from '../../types/assets/poles'
import type { PickablePole } from '../../components/SegmentPolePickerMap'
import {
  autoSortRoute,
  buildSegmentGeometry,
  dropEdgeBends,
  insertBendInRoute,
  insertPoleInRoute,
  makeBend,
  moveBend as moveBendInRoute,
  movePole,
  polesOf,
  removePole,
  type OrderedPole,
} from '../../utils/gis-map/segmentPoleOrder'

/**
 * Cột được phép chọn vào tuyến: có GPS và chưa thuộc tuyến nào,
 * hoặc đang thuộc chính tuyến đang sửa. Cột của tuyến khác bị ẩn.
 */
export const toPickablePoles = (poles: PoleListItem[], currentSegmentId?: string | null): PickablePole[] =>
  poles
    .filter((p) => {
      if (!p.pole_id) return false
      if (!p.location || !Number.isFinite(p.location.lat) || !Number.isFinite(p.location.lng)) return false
      return !p.segment_id || p.segment_id === currentSegmentId
    })
    .map((p) => ({
      id: p.pole_id as string,
      code: p.external_ref || p.pole_id || undefined,
      coord: [p.location.lng, p.location.lat] as [number, number],
    }))

/**
 * Danh sách cột của tuyến theo thứ tự dọc tuyến, có thể xen điểm uốn (`selected` gồm cả hai,
 * `poles` chỉ gồm cột).
 * Click cột trên bản đồ: thêm (tự chèn vào chỗ hợp lý) hoặc bỏ. Người dùng chỉnh thứ tự bằng
 * `move` (kéo thả). `lastAddedId` cho danh sách biết cột vừa thêm để cuộn tới và tô sáng.
 */
export const useSegmentPoleSelection = (candidates: PickablePole[], initial: OrderedPole[] = []) => {
  const [selected, setSelected] = useState<OrderedPole[]>(initial)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)

  const toggle = useCallback(
    (poleId: string) => {
      const exists = selected.some((p) => p.id === poleId)
      const pole = candidates.find((p) => p.id === poleId)
      if (!exists && !pole) return
      setSelected((prev) =>
        dropEdgeBends(
          prev.some((p) => p.id === poleId)
            ? removePole(prev, poleId)
            : pole
            ? insertPoleInRoute(prev, { id: pole.id, coord: pole.coord })
            : prev
        )
      )
      setLastAddedId(exists ? null : poleId)
    },
    [candidates, selected]
  )

  const remove = useCallback((poleId: string) => {
    setSelected((prev) => dropEdgeBends(removePole(prev, poleId)))
    setLastAddedId(null)
  }, [])

  const move = useCallback((from: number, to: number) => {
    setSelected((prev) => dropEdgeBends(movePole(prev, from, to)))
  }, [])

  /** Sắp lại theo chuỗi gần nhất, dùng khi danh sách bị xáo trộn nhiều. */
  const autoSort = useCallback(() => {
    setSelected((prev) => autoSortRoute(prev))
  }, [])

  /** Đặt điểm uốn tại tọa độ: nằm giữa hai cột, tự chèn vào chỗ làm đường dài thêm ít nhất. */
  const addBend = useCallback((coord: [number, number]) => {
    const bend = makeBend(coord)
    setSelected((prev) => insertBendInRoute(prev, bend))
    setLastAddedId(bend.id)
  }, [])

  const moveBend = useCallback((bendId: string, coord: [number, number]) => {
    setSelected((prev) => moveBendInRoute(prev, bendId, coord))
  }, [])

  const poles = useMemo(() => polesOf(selected), [selected])
  const geometry = useMemo(() => buildSegmentGeometry(selected), [selected])

  return { selected, poles, toggle, remove, move, autoSort, addBend, moveBend, lastAddedId, geometry }
}
