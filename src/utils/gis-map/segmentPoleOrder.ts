/**
 * Thứ tự cột dọc tuyến đường. Backend chỉ nhận TẬP `pole_ids` (không lưu thứ tự) nên FE tự giữ thứ tự
 * ngầm rồi nối tọa độ các cột theo thứ tự đó thành `geom_wkt`.
 */
import {
  calculateDistanceMeters,
  calculateRouteLengthMeters,
  parseLineStringWkt,
  projectPointOnSegment,
} from './routeUtils'

export interface OrderedPole {
  id: string
  coord: [number, number] // [lng, lat]
}

// Đỉnh của đường cũ coi như trùng cột nếu cách nhau không quá ngần này (mét)
const VERTEX_MATCH_METERS = 3

/** Chiếu cột lên đường: trả đoạn gần nhất, tham số t trên đoạn và khoảng cách dọc đường từ đầu. */
const projectOnLine = (coord: [number, number], line: [number, number][]) => {
  let best = { idx: 0, t: 0, dist: Infinity, along: 0 }
  let acc = 0
  for (let i = 0; i < line.length - 1; i++) {
    const proj = projectPointOnSegment(coord, line[i], line[i + 1])
    const edgeLen = calculateDistanceMeters(line[i], line[i + 1])
    if (proj.dist < best.dist) best = { idx: i, t: proj.t, dist: proj.dist, along: acc + proj.t * edgeLen }
    acc += edgeLen
  }
  return best
}

/**
 * Thêm cột vào tuyến đang có tại vị trí làm đường dài thêm ít nhất (chèn giữa hai cột liền nhau,
 * hoặc nối vào đầu / cuối). Đúng với đường thẳng và đường có góc rẽ; ở khúc gấp hình chữ U / S
 * mà thiếu hình học cũ thì có thể không phân biệt được cột thuộc nhánh nào.
 */
export const insertPoleInRoute = (route: OrderedPole[], pole: OrderedPole): OrderedPole[] => {
  if (route.some((p) => p.id === pole.id)) return route
  if (route.length < 2) return [...route, pole]

  const dist = (a: OrderedPole, b: OrderedPole) => calculateDistanceMeters(a.coord, b.coord)
  let bestCost = dist(pole, route[0])
  let at = 0
  const endCost = dist(route[route.length - 1], pole)
  if (endCost < bestCost) {
    bestCost = endCost
    at = route.length
  }
  for (let i = 0; i < route.length - 1; i++) {
    const cost = dist(route[i], pole) + dist(pole, route[i + 1]) - dist(route[i], route[i + 1])
    if (cost < bestCost) {
      bestCost = cost
      at = i + 1
    }
  }
  return [...route.slice(0, at), pole, ...route.slice(at)]
}

export const removePole = (route: OrderedPole[], poleId: string): OrderedPole[] =>
  route.filter((p) => p.id !== poleId)

/** Dời cột ở vị trí `from` sang vị trí `to` (chỉ số trong danh sách), các cột khác giữ thứ tự. */
export const movePole = (route: OrderedPole[], from: number, to: number): OrderedPole[] => {
  if (from === to || from < 0 || to < 0 || from >= route.length || to >= route.length) return route
  const next = [...route]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** Sắp cột theo vị trí chiếu dọc một đường tham chiếu. */
export const orderPolesAlongLine = (poles: OrderedPole[], line: [number, number][]): OrderedPole[] => {
  if (line.length < 2) return [...poles]
  return poles
    .map((pole) => ({ pole, along: projectOnLine(pole.coord, line).along }))
    .sort((a, b) => a.along - b.along)
    .map((item) => item.pole)
}

/**
 * Sắp cột khi không có đường tham chiếu: bắt đầu từ một đầu của cặp cột xa nhau nhất,
 * rồi đi lần lượt tới cột chưa đi gần nhất. Đủ tốt cho đường thẳng hoặc cong nhẹ.
 */
export const orderPolesByChain = (poles: OrderedPole[]): OrderedPole[] => {
  if (poles.length < 3) return [...poles]

  let startIdx = 0
  let farthest = -1
  for (let i = 0; i < poles.length; i++) {
    for (let j = i + 1; j < poles.length; j++) {
      const d = calculateDistanceMeters(poles[i].coord, poles[j].coord)
      if (d > farthest) {
        farthest = d
        startIdx = i
      }
    }
  }

  const remaining = [...poles]
  const ordered = remaining.splice(startIdx, 1)
  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1]
    let nearest = 0
    let nearestDist = Infinity
    remaining.forEach((p, idx) => {
      const d = calculateDistanceMeters(last.coord, p.coord)
      if (d < nearestDist) {
        nearestDist = d
        nearest = idx
      }
    })
    ordered.push(remaining.splice(nearest, 1)[0])
  }
  return ordered
}

/**
 * Thứ tự ban đầu của các cột thuộc tuyến khi mở form sửa.
 * `exact` = mọi đỉnh của đường cũ trùng đúng một cột (đường dựng từ cột); ngược lại là đường vẽ tự do
 * hoặc không có hình học nên thứ tự chỉ là suy ra, người dùng cần kiểm tra lại.
 */
export const deriveInitialOrder = (
  poles: OrderedPole[],
  geomWkt: string | null | undefined
): { ordered: OrderedPole[]; exact: boolean } => {
  if (poles.length < 2) return { ordered: [...poles], exact: true }

  const line = typeof geomWkt === 'string' ? parseLineStringWkt(geomWkt) : []
  if (line.length < 2) return { ordered: orderPolesByChain(poles), exact: false }

  if (line.length === poles.length) {
    const remaining = [...poles]
    const ordered: OrderedPole[] = []
    for (const vertex of line) {
      const at = remaining.findIndex((p) => calculateDistanceMeters(p.coord, vertex) <= VERTEX_MATCH_METERS)
      if (at === -1) break
      ordered.push(remaining.splice(at, 1)[0])
    }
    if (ordered.length === poles.length) return { ordered, exact: true }
  }

  return { ordered: orderPolesAlongLine(poles, line), exact: false }
}

/** `geom_wkt` (kinh độ trước) và `length_m` từ danh sách cột đã sắp thứ tự. Cần tối thiểu 2 cột. */
export const buildSegmentGeometry = (
  route: OrderedPole[]
): { geomWkt: string; lengthM: number } | null => {
  if (route.length < 2) return null
  const coords = route.map((p) => p.coord)
  return {
    geomWkt: `LINESTRING(${coords.map((c) => `${c[0]} ${c[1]}`).join(', ')})`,
    lengthM: calculateRouteLengthMeters(coords),
  }
}
