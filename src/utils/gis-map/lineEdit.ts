import { calculateDistanceMeters } from './routeUtils'

/**
 * Sửa hình tuyến bằng kéo thả trên bản đồ: kéo đỉnh để uốn, kéo điểm giữa hai đỉnh để thêm chỗ uốn, xoá đỉnh.
 * Hình luôn giữ tối thiểu 2 đỉnh.
 */
export type LngLat = [number, number]

/** Mét trên một độ, cùng bán kính Trái Đất với `calculateDistanceMeters`. */
const M_PER_DEG = (6371000 * Math.PI) / 180

export const moveVertex = (line: LngLat[], index: number, to: LngLat): LngLat[] =>
  index < 0 || index >= line.length ? line : line.map((p, i) => (i === index ? to : p))

/** Chèn đỉnh mới giữa `line[index - 1]` và `line[index]`. */
export const insertVertex = (line: LngLat[], index: number, at: LngLat): LngLat[] =>
  index <= 0 || index >= line.length ? line : [...line.slice(0, index), at, ...line.slice(index)]

/** Xoá một đỉnh; còn 2 đỉnh thì không xoá được nữa. */
export const removeVertex = (line: LngLat[], index: number): LngLat[] =>
  line.length <= 2 || index < 0 || index >= line.length ? line : line.filter((_, i) => i !== index)

/** Điểm giữa từng cạnh: `mids[i]` nằm giữa `line[i]` và `line[i + 1]`. */
export const edgeMidpoints = (line: LngLat[]): LngLat[] =>
  line.slice(1).map((p, i) => [(line[i][0] + p[0]) / 2, (line[i][1] + p[1]) / 2])

/**
 * Lược bớt đỉnh (Douglas–Peucker) mà hình lệch không quá `toleranceM` mét: nét đường bản đồ nền có rất nhiều đỉnh,
 * để nguyên thì tay nắm dày đặc, không kéo được. Giữ nguyên hai đầu.
 */
export const simplifyLine = (line: LngLat[], toleranceM = 1): LngLat[] => {
  if (line.length <= 2) return [...line]
  const lat0 = (line[0][1] * Math.PI) / 180
  const xy = line.map(([lng, lat]) => [lng * M_PER_DEG * Math.cos(lat0), lat * M_PER_DEG] as const)
  const keep = new Array<boolean>(line.length).fill(false)
  keep[0] = true
  keep[line.length - 1] = true

  const distToChord = (i: number, a: number, b: number) => {
    const [ax, ay] = xy[a]
    const [bx, by] = xy[b]
    const [px, py] = xy[i]
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
  }

  const stack: Array<[number, number]> = [[0, line.length - 1]]
  while (stack.length > 0) {
    const [a, b] = stack.pop() as [number, number]
    let worst = -1
    let worstD = toleranceM
    for (let i = a + 1; i < b; i++) {
      const d = distToChord(i, a, b)
      if (d > worstD) {
        worstD = d
        worst = i
      }
    }
    if (worst >= 0) {
      keep[worst] = true
      stack.push([a, worst], [worst, b])
    }
  }
  return line.filter((_, i) => keep[i])
}

/** Nối thêm điểm vào đầu hoặc cuối hình, chọn đầu nào gần `at` hơn (theo khoảng cách tới đỉnh đầu / đỉnh cuối). */
export const extendLine = (line: LngLat[], at: LngLat): { line: LngLat[]; end: 'start' | 'end' } => {
  if (line.length < 2) return { line, end: 'end' }
  const dStart = calculateDistanceMeters(at, line[0])
  const dEnd = calculateDistanceMeters(at, line[line.length - 1])
  if (dStart < dEnd) {
    return { line: [at, ...line], end: 'start' }
  }
  return { line: [...line, at], end: 'end' }
}

const TRIM_POLE_TOLERANCE_M = 0.5

/**
 * Cắt hình từ khúc `edgeIndex` (nối `line[edgeIndex]` và `line[edgeIndex + 1]`) tới đầu hoặc cuối gần nhất.
 * `polesAlong`: vị trí dọc hình (mét tính từ đỉnh đầu) của MỌI cột thuộc tuyến.
 * Trả `null` + `reason` khi không cắt được.
 */
export const trimLineAt = (
  line: LngLat[],
  edgeIndex: number,
  polesAlong: number[]
):
  | { line: LngLat[]; end: 'start' | 'end' }
  | { line: null; reason: 'invalid' | 'has_poles' | 'too_short' } => {
  if (line.length < 2 || !Number.isInteger(edgeIndex) || edgeIndex < 0 || edgeIndex > line.length - 2) {
    return { line: null, reason: 'invalid' }
  }

  const vertexAlong: number[] = [0]
  for (let i = 1; i < line.length; i++) {
    vertexAlong.push(vertexAlong[i - 1] + calculateDistanceMeters(line[i - 1], line[i]))
  }
  const totalLen = vertexAlong[vertexAlong.length - 1]
  const midAlong = (vertexAlong[edgeIndex] + vertexAlong[edgeIndex + 1]) / 2
  const end: 'start' | 'end' = midAlong <= totalLen / 2 ? 'start' : 'end'

  const cutLo = end === 'start' ? 0 : vertexAlong[edgeIndex]
  const cutHi = end === 'start' ? vertexAlong[edgeIndex + 1] : totalLen

  const hasPoleInCut = polesAlong.some(
    (p) => p >= cutLo - TRIM_POLE_TOLERANCE_M && p <= cutHi + TRIM_POLE_TOLERANCE_M
  )
  if (hasPoleInCut) {
    return { line: null, reason: 'has_poles' }
  }

  const remaining = end === 'start' ? line.slice(edgeIndex + 1) : line.slice(0, edgeIndex + 1)
  if (remaining.length < 2) {
    return { line: null, reason: 'too_short' }
  }

  return { line: remaining, end }
}

/** Giữ phần hình nằm giữa vị trí dọc hình `fromAlong` và `toAlong` (mét từ đỉnh đầu), cắt đúng tại hai vị trí đó (nội suy điểm cắt). */
export const clipLineBetween = (line: LngLat[], fromAlong: number, toAlong: number): LngLat[] => {
  if (line.length < 2 || fromAlong >= toAlong) return line

  const vertexAlong: number[] = [0]
  for (let i = 1; i < line.length; i++) {
    vertexAlong.push(vertexAlong[i - 1] + calculateDistanceMeters(line[i - 1], line[i]))
  }
  const totalLen = vertexAlong[vertexAlong.length - 1]
  if (totalLen <= 0) return line

  const from = Math.max(0, Math.min(totalLen, fromAlong))
  const to = Math.max(0, Math.min(totalLen, toAlong))
  if (from >= to) return line

  const pointAt = (d: number): LngLat => {
    if (d <= 0) return line[0]
    if (d >= totalLen) return line[line.length - 1]
    for (let i = 0; i < line.length - 1; i++) {
      const aAlong = vertexAlong[i]
      const bAlong = vertexAlong[i + 1]
      if (d <= bAlong || i === line.length - 2) {
        const segLen = bAlong - aAlong
        if (segLen <= 0) return line[i]
        const t = (d - aAlong) / segLen
        return [
          Math.round((line[i][0] + t * (line[i + 1][0] - line[i][0])) * 1e6) / 1e6,
          Math.round((line[i][1] + t * (line[i + 1][1] - line[i][1])) * 1e6) / 1e6,
        ]
      }
    }
    return line[line.length - 1]
  }

  const startPt = pointAt(from)
  const endPt = pointAt(to)
  const result: LngLat[] = [startPt]

  for (let i = 1; i < line.length - 1; i++) {
    if (vertexAlong[i] > from && vertexAlong[i] < to) {
      if (
        calculateDistanceMeters(result[result.length - 1], line[i]) >= 0.5 &&
        calculateDistanceMeters(line[i], endPt) >= 0.5
      ) {
        result.push(line[i])
      }
    }
  }

  if (calculateDistanceMeters(result[result.length - 1], endPt) >= 0.5 || result.length === 1) {
    result.push(endPt)
  }

  return result
}
