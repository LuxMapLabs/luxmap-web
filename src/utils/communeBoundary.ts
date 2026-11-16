import type { CommuneBbox } from '../types/admin/communes'
import type { Geometry } from '../types/common/base'

/** Đỉnh [lng, lat]. Vòng "mở": không lặp lại đỉnh đầu ở cuối (chỉ đóng vòng khi xuất ra GeoJSON). */
export type BoundaryPoint = [number, number]
export type BoundaryRing = BoundaryPoint[]
/** Một vùng = vòng ngoài + các vòng lỗ (nếu có). */
export type BoundaryPolygon = BoundaryRing[]

const isPoint = (p: unknown): p is BoundaryPoint =>
  Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])

const toOpenRing = (raw: unknown): BoundaryRing => {
  if (!Array.isArray(raw)) return []
  const pts: BoundaryRing = raw.filter(isPoint).map((p) => [p[0], p[1]])
  if (pts.length > 1) {
    const first = pts[0]
    const last = pts[pts.length - 1]
    if (first[0] === last[0] && first[1] === last[1]) pts.pop()
  }
  return pts
}

const toPolygon = (raw: unknown): BoundaryPolygon => {
  if (!Array.isArray(raw)) return []
  return raw.map(toOpenRing).filter((ring) => ring.length >= 3)
}

/** GeoJSON Polygon/MultiPolygon -> danh sách vùng với vòng mở. Kiểu khác/rỗng -> []. */
export const geometryToPolygons = (geometry: Geometry | null | undefined): BoundaryPolygon[] => {
  if (!geometry) return []
  if (geometry.type === 'Polygon') {
    const polygon = toPolygon(geometry.coordinates)
    return polygon.length > 0 ? [polygon] : []
  }
  if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.map(toPolygon).filter((polygon: BoundaryPolygon) => polygon.length > 0)
  }
  return []
}

const closeRing = (ring: BoundaryRing): BoundaryPoint[] => [...ring, ring[0]]

/** Danh sách vùng -> GeoJSON (1 vùng = Polygon, nhiều vùng = MultiPolygon, rỗng = null). */
export const polygonsToGeometry = (polygons: BoundaryPolygon[]): Geometry | null => {
  const valid = polygons.filter((polygon) => polygon.length > 0 && polygon[0].length >= 3)
  if (valid.length === 0) return null
  if (valid.length === 1) {
    return { type: 'Polygon', coordinates: valid[0].map(closeRing) }
  }
  return { type: 'MultiPolygon', coordinates: valid.map((polygon) => polygon.map(closeRing)) }
}

/** Hộp bao của ranh giới (backend vẫn nhận bbox làm khung bản đồ). */
export const polygonsToBbox = (polygons: BoundaryPolygon[]): CommuneBbox | null => {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      }
    }
  }
  if (!Number.isFinite(minLng)) return null
  const round = (n: number) => Number(n.toFixed(6))
  return { min_lng: round(minLng), min_lat: round(minLat), max_lng: round(maxLng), max_lat: round(maxLat) }
}

export const countVertices = (polygons: BoundaryPolygon[]): number =>
  polygons.reduce((sum, polygon) => sum + polygon.reduce((s, ring) => s + ring.length, 0), 0)

const perpendicularDistance = (p: BoundaryPoint, a: BoundaryPoint, b: BoundaryPoint): number => {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
  const clamped = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - (a[0] + clamped * dx), p[1] - (a[1] + clamped * dy))
}

const douglasPeucker = (pts: BoundaryPoint[], tolerance: number): BoundaryPoint[] => {
  if (pts.length <= 2) return pts
  let maxDist = 0
  let index = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpendicularDistance(pts[i], pts[0], pts[pts.length - 1])
    if (d > maxDist) {
      maxDist = d
      index = i
    }
  }
  if (maxDist <= tolerance) return [pts[0], pts[pts.length - 1]]
  const left = douglasPeucker(pts.slice(0, index + 1), tolerance)
  const right = douglasPeucker(pts.slice(index), tolerance)
  return [...left.slice(0, -1), ...right]
}

/**
 * Giảm số đỉnh (Douglas–Peucker) để polygon OSM hàng nghìn đỉnh vẫn kéo chỉnh được.
 * Tách vòng làm 2 nửa để giữ đỉnh đầu/cuối; vòng sau giản lược dưới 3 đỉnh thì giữ nguyên bản gốc.
 */
export const simplifyRing = (ring: BoundaryRing, tolerance: number): BoundaryRing => {
  if (ring.length <= 12) return ring
  const half = Math.floor(ring.length / 2)
  const first = douglasPeucker(ring.slice(0, half + 1), tolerance)
  const second = douglasPeucker([...ring.slice(half), ring[0]], tolerance)
  const result = [...first.slice(0, -1), ...second.slice(0, -1)]
  return result.length >= 3 ? result : ring
}

export const simplifyPolygons = (polygons: BoundaryPolygon[], tolerance: number): BoundaryPolygon[] =>
  polygons.map((polygon) => polygon.map((ring) => simplifyRing(ring, tolerance)))

/** Khung chữ nhật cũ (bbox) coi như một polygon 4 đỉnh, để xã chưa có ranh giới vẫn có viền. */
export const bboxToGeometry = (bbox: CommuneBbox | null | undefined): Geometry | null => {
  if (!bbox) return null
  const { min_lng, min_lat, max_lng, max_lat } = bbox
  if (
    typeof min_lng !== 'number' ||
    typeof min_lat !== 'number' ||
    typeof max_lng !== 'number' ||
    typeof max_lat !== 'number' ||
    min_lng >= max_lng ||
    min_lat >= max_lat
  ) {
    return null
  }
  return polygonsToGeometry([
    [
      [
        [min_lng, max_lat],
        [max_lng, max_lat],
        [max_lng, min_lat],
        [min_lng, min_lat],
      ],
    ],
  ])
}
