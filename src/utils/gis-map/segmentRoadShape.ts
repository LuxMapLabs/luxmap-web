/**
 * Hình tuyến là con đường thật, không phải dây nối các cột.
 *
 * Tuyến có thể mang một trong hai loại hình:
 * - **Đường nối cột**: bản nháp web dựng từ các cột (mọi cột nằm đúng trên một đỉnh của đường). Web được dựng lại
 *   khi cột đổi, như trước.
 * - **Hình thật**: lấy theo đường của bản đồ nền hoặc vẽ tay, cột đứng bên lề nên không trùng đỉnh. Web không bao giờ
 *   dựng lại hình này từ cột; cột phải nằm trong hành lang khảo sát quanh nó.
 */
import { calculateDistanceMeters, calculateRouteLengthMeters, parseLineStringWkt } from './routeUtils'
import { ROUTE_CORRIDOR_M } from './poleMove'
import { polesFarFromLine } from './segmentReshape'
import {
  VERTEX_MATCH_METERS,
  buildSegmentGeometry,
  deriveInitialOrder,
  orderPolesAlongLine,
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
    'form "Sửa tuyến" (Quản lý tài sản, nút "Vẽ lại hình tuyến trên bản đồ").'
  )
}

/** Hình dài hơn chuỗi cột nối nhau quá tỉ lệ này (và dư quá ngần này mét) thì nghi đi vòng / quay ngược. */
const DETOUR_RATIO = 1.15
const DETOUR_EXTRA_M = 60

/**
 * Cảnh báo (không chặn) khi hình mới dài hơn nhiều so với chuỗi cột của tuyến: thường là bấm nhầm sang nét đường song song
 * nên máy đi vòng qua ngã tư rồi quay ngược, hoặc kéo một chấm ra xa. Cột vẫn nằm trong 25 m nên luật hành lang không bắt được.
 */
export const roadShapeDetourMessage = (line: LngLat[], poles: OrderedPole[]): string | null => {
  if (line.length < 2 || poles.length < 2) return null
  const ordered = orderPolesAlongLine(poles, line)
  let chain = 0
  for (let i = 1; i < ordered.length; i++) chain += calculateDistanceMeters(ordered[i - 1].coord, ordered[i].coord)
  const shape = calculateRouteLengthMeters(line)
  if (shape <= chain * DETOUR_RATIO || shape - chain < DETOUR_EXTRA_M) return null
  const fmt = (m: number) => `${Math.round(m).toLocaleString('vi-VN')} m`
  return (
    `Hình dài ${fmt(shape)} nhưng các cột của tuyến nối nhau chỉ dài ${fmt(chain)}. Có thể hình đi vòng hoặc quay ngược ` +
    '(bấm nhầm sang nét đường song song, hoặc kéo một chấm ra xa). Xem lại trên bản đồ; đúng rồi thì cứ lưu.'
  )
}
