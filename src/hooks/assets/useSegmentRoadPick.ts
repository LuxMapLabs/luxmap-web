import { useCallback, useMemo, useState } from 'react'
import type { LngLat } from '../../utils/gis-map/roadRouting'
import { simplifyLine } from '../../utils/gis-map/lineEdit'
import {
  addFreehandPoint,
  addReshapePoint,
  reshapeLine,
  startReshape,
  undoReshapePoint,
  type SegmentReshape,
} from '../../utils/gis-map/segmentReshape'

/**
 * Hình tuyến lấy / sửa ngay trong form tuyến.
 * - Lấy theo đường bản đồ nền: bấm điểm đầu trên con đường, rồi bấm tiếp dọc đường; máy tự đi theo đường giữa hai
 *   lần bấm (cùng thuật toán với nút lấy hình ở Bản đồ GIS). "Xong" thì lược bớt đỉnh để kéo được.
 * - Vẽ tay (`freehand`): đường chưa có trên bản đồ nền thì bấm từng điểm dọc đường trên ảnh vệ tinh, nối thẳng.
 *   Đổi qua lại giữa hai cách được trong cùng một lần lấy.
 * - Kéo thả để uốn (`setLine`): sửa trên hình đã lấy, hoặc trên hình đang lưu của tuyến.
 * `line`: hình mới (đang lấy, đã lấy hoặc đã kéo) khi có từ 2 điểm; null = chưa đổi gì.
 */
export const useSegmentRoadPick = () => {
  const [state, setState] = useState<SegmentReshape | null>(null)
  const [picking, setPicking] = useState(false)
  const [edited, setEdited] = useState<LngLat[] | null>(null)
  // Hình trước lần lấy hình đang làm, để "Huỷ lấy hình" trả về đúng nó
  const [beforePick, setBeforePick] = useState<LngLat[] | null>(null)
  const [freehand, setFreehand] = useState(false)

  const picked = useMemo(() => (state ? reshapeLine(state) : []), [state])

  const start = useCallback(() => {
    setBeforePick(edited)
    setState(startReshape('form', '', null))
    setFreehand(false)
    setPicking(true)
  }, [edited])

  const pick = useCallback(
    (click: LngLat, roadLines: LngLat[][], zoom: number) => {
      setState((prev) =>
        prev
          ? freehand
            ? addFreehandPoint(prev, click)
            : addReshapePoint(prev, roadLines, click, zoom)
          : prev
      )
    },
    [freehand]
  )

  const undo = useCallback(() => setState((prev) => (prev ? undoReshapePoint(prev) : prev)), [])

  /** Xong: giữ hình đã lấy (lược bớt đỉnh); chưa đủ 2 điểm thì như huỷ. */
  const finish = useCallback(() => {
    setPicking(false)
    setEdited(picked.length >= 2 ? simplifyLine(picked) : beforePick)
    setState(null)
  }, [picked, beforePick])

  const cancel = useCallback(() => {
    setPicking(false)
    setEdited(beforePick)
    setState(null)
  }, [beforePick])

  /** Kéo thả để uốn: thay cả hình. */
  const setLine = useCallback((line: LngLat[]) => {
    if (line.length >= 2) setEdited(line)
  }, [])

  const line = picking ? (picked.length >= 2 ? picked : null) : edited

  return {
    picking,
    freehand,
    setFreehand,
    points: state?.points ?? [],
    error: state?.error ?? null,
    line,
    start,
    pick,
    undo,
    finish,
    cancel,
    setLine,
  }
}
