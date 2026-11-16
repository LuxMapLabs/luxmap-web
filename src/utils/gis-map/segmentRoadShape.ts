/**
 * Hình tuyến là con đường thật, không phải dây nối các cột.
 *
 * Tuyến có thể mang một trong hai loại hình:
 * - **Đường nối cột**: bản nháp web dựng từ các cột (mọi cột nằm đúng trên một đỉnh của đường). Web được dựng lại
 *   khi cột đổi, như trước.
 * - **Hình thật**: lấy theo đường của bản đồ nền hoặc vẽ tay, cột đứng bên lề nên không trùng đỉnh. Web không bao giờ
 *   dựng lại hình này từ cột; cột phải nằm trong hành lang khảo sát quanh nó.
 */
import { calculateDistanceMeters, parseLineStringWkt } from './routeUtils'
import { ROUTE_CORRIDOR_M } from './poleMove'
import { polesFarFromLine } from './segmentReshape'
import {
  VERTEX_MATCH_METERS,
  buildSegmentGeometry,
  deriveInitialOrder,
  reconcileRoute,
  type OrderedPole,
} from './segmentPoleOrder'

type LngLat = [number, number]

/**
 * Hình đang lưu là hình thật (không phải đường nối cột).
 * `poles`: các cột có GPS của tuyến, ở vị trí đang lưu (trước khi sửa). Chưa có hình thì false.
 */
export const isRoadShape = (poles: OrderedPole[], geomWkt: string | null | undefined): boolean => {
  const line = typeof geomWkt === 'string' ? parseLineStringWkt(geomWkt) : []
  if (line.length < 2) return false
  // Dưới 2 cột thì không dựng được đường nào từ cột, nên đường đang có là hình thật
  if (poles.length < 2) return true
  // Đầu / cuối kéo dài ra ngoài cột đầu / cột cuối (đoạn đường không có cột) thì không còn là dây nối cột
  const atPole = (vertex: LngLat) => poles.some((p) => calculateDistanceMeters(p.coord, vertex) <= VERTEX_MATCH_METERS)
  if (!atPole(line[0]) || !atPole(line[line.length - 1])) return true
  return !deriveInitialOrder(poles, geomWkt).exact
}

/**
 * Đường của tuyến sau khi các cột đổi thành `current`: hình thật thì giữ nguyên;
 * đường nối cột (hoặc chưa có hình) thì chạy theo cột, giữ điểm uốn đã đặt. Chưa đủ 2 cột thì rỗng.
 */
export const segmentLineAfter = (
  previous: OrderedPole[],
  geomWkt: string | null | undefined,
  current: OrderedPole[]
): { roadShape: boolean; line: LngLat[] } => {
  if (isRoadShape(previous, geomWkt)) return { roadShape: true, line: parseLineStringWkt(geomWkt) }
  const geometry = buildSegmentGeometry(reconcileRoute(previous, geomWkt, current))
  return { roadShape: false, line: geometry ? parseLineStringWkt(geometry.geomWkt) : [] }
}

/** Mã các cột nằm ngoài hành lang quanh hình thật của tuyến. */
export const polesOffRoadShape = (poles: ReadonlyArray<{ label: string; coord: LngLat }>, line: LngLat[]): string[] =>
  polesFarFromLine(poles, line, ROUTE_CORRIDOR_M)

/** Câu báo khi còn cột nằm xa hình thật của tuyến. */
export const offRoadShapeMessage = (labels: string[]): string => {
  const shown = labels.slice(0, 5).join(', ') + (labels.length > 5 ? '…' : '')
  return (
    `${labels.length} cột nằm cách hình tuyến quá ${ROUTE_CORRIDOR_M} m (${shown}). ` +
    'Tuyến đã có hình theo con đường nên hình không chạy theo cột. Đặt cột sát đường hơn, hoặc lấy lại hình tuyến ở ' +
    'Bản đồ GIS (chọn tuyến, bấm "Lấy hình theo đường trên bản đồ").'
  )
}
