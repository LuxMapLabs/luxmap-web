import { calculateRouteLengthMeters } from './routeUtils'

/**
 * Lấy hình tuyến theo đường có sẵn trên bản đồ nền (lớp `road` của MapTiler Planet v4, dữ liệu
 * © OpenStreetMap). Bản đồ nền tới trình duyệt dưới dạng từng ô: một con đường bị cắt ở mép ô thành nhiều mẩu,
 * mẩu của ô này lấn sang ô kia một chút. Ở đây ghép các mẩu lại thành mạng đường rồi tìm đoạn ngắn nhất dọc
 * theo đường giữa hai điểm người dùng bấm.
 */

export type LngLat = [number, number]

/** Đường xe chạy được. Bỏ đường đi bộ (`path`), đường sắt, phà, cáp treo và đường đang xây. */
export const ROAD_CLASS_LIST = [
  'motorway',
  'trunk',
  'primary',
  'secondary',
  'tertiary',
  'minor',
  'service',
  'track',
  'busway',
  'raceway',
]
const ROAD_CLASSES = new Set(ROAD_CLASS_LIST)

/** Bấm cách con đường xa hơn mức này thì coi như không bấm vào đường nào. */
export const MAX_SNAP_M = 30
/** Hai đỉnh gần nhau hơn mức này là một đỉnh. */
const MERGE_M = 0.25
/** Đầu mẩu đường cách một mẩu khác trong mức này thì nối vào (vết cắt ở mép ô bản đồ). */
const JOIN_M = 2
/** Cạnh ô lưới chỉ mục, mét. */
const CELL_M = 25
/** Mét trên một độ, cùng bán kính Trái Đất với `calculateDistanceMeters` để số đo ở đây khớp các chỗ khác của web. */
const M_PER_DEG = (6371000 * Math.PI) / 180

interface RoadFeatureLike {
  geometry: GeoJSON.Geometry
  properties?: Record<string, unknown> | null
}

/** Nét đường xe chạy được trong các feature của lớp `road`; MultiLineString tách thành từng nét. */
export const roadLinesFromFeatures = (features: ReadonlyArray<RoadFeatureLike>): LngLat[][] => {
  const lines: LngLat[][] = []
  for (const f of features) {
    if (f.properties?.construction === true) continue
    if (!ROAD_CLASSES.has(String(f.properties?.class ?? ''))) continue
    const g = f.geometry
    if (g.type === 'LineString') lines.push(g.coordinates as LngLat[])
    else if (g.type === 'MultiLineString') lines.push(...(g.coordinates as LngLat[][]))
  }
  return lines.filter((line) => line.length >= 2)
}

interface Segment {
  a: number
  b: number
  alive: boolean
}

export interface RoadGraph {
  /** Gốc phép chiếu phẳng cục bộ (độ). */
  origin: LngLat
  /** Mét trên một độ kinh / vĩ quanh gốc. */
  kx: number
  ky: number
  xs: number[]
  ys: number[]
  adj: { to: number; w: number }[][]
  segs: Segment[]
  cells: Map<string, number[]>
}

const cellKey = (cx: number, cy: number) => `${cx}:${cy}`

const toXY = (g: RoadGraph, p: LngLat): [number, number] => [(p[0] - g.origin[0]) * g.kx, (p[1] - g.origin[1]) * g.ky]
const toLngLat = (g: RoadGraph, x: number, y: number): LngLat => [g.origin[0] + x / g.kx, g.origin[1] + y / g.ky]

/** Điểm gần nhất trên đoạn (ax,ay)-(bx,by) tính từ (px,py), kèm khoảng cách. */
const project = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  const x = ax + t * dx
  const y = ay + t * dy
  return { x, y, d: Math.hypot(px - x, py - y) }
}

const indexSegment = (g: RoadGraph, s: number) => {
  const { a, b } = g.segs[s]
  const x0 = Math.floor(Math.min(g.xs[a], g.xs[b]) / CELL_M)
  const x1 = Math.floor(Math.max(g.xs[a], g.xs[b]) / CELL_M)
  const y0 = Math.floor(Math.min(g.ys[a], g.ys[b]) / CELL_M)
  const y1 = Math.floor(Math.max(g.ys[a], g.ys[b]) / CELL_M)
  for (let cx = x0; cx <= x1; cx++)
    for (let cy = y0; cy <= y1; cy++) {
      const key = cellKey(cx, cy)
      const list = g.cells.get(key)
      if (list) list.push(s)
      else g.cells.set(key, [s])
    }
}

const addEdge = (g: RoadGraph, a: number, b: number) => {
  if (a === b) return
  const w = Math.hypot(g.xs[a] - g.xs[b], g.ys[a] - g.ys[b])
  g.adj[a].push({ to: b, w })
  g.adj[b].push({ to: a, w })
  g.segs.push({ a, b, alive: true })
  indexSegment(g, g.segs.length - 1)
}

/** Đoạn đường gần (x, y) nhất trong bán kính `radius`, bỏ qua đoạn chạm đỉnh `exclude`. */
const nearestSegment = (g: RoadGraph, x: number, y: number, radius: number, exclude = -1) => {
  let best: { s: number; x: number; y: number; d: number } | null = null
  const r = Math.ceil(radius / CELL_M)
  const cx = Math.floor(x / CELL_M)
  const cy = Math.floor(y / CELL_M)
  const seen = new Set<number>()
  for (let i = cx - r; i <= cx + r; i++)
    for (let j = cy - r; j <= cy + r; j++)
      for (const s of g.cells.get(cellKey(i, j)) ?? []) {
        if (seen.has(s)) continue
        seen.add(s)
        const seg = g.segs[s]
        if (!seg.alive || seg.a === exclude || seg.b === exclude) continue
        const p = project(x, y, g.xs[seg.a], g.ys[seg.a], g.xs[seg.b], g.ys[seg.b])
        if (p.d <= radius && (!best || p.d < best.d)) best = { s, ...p }
      }
  return best
}

/** Chèn một đỉnh vào giữa đoạn `s` tại (x, y); trùng một đầu đoạn thì dùng luôn đầu đó. */
const splitSegment = (g: RoadGraph, s: number, x: number, y: number, nodeAt: (x: number, y: number) => number) => {
  const seg = g.segs[s]
  if (Math.hypot(g.xs[seg.a] - x, g.ys[seg.a] - y) <= MERGE_M) return seg.a
  if (Math.hypot(g.xs[seg.b] - x, g.ys[seg.b] - y) <= MERGE_M) return seg.b
  const p = nodeAt(x, y)
  seg.alive = false
  addEdge(g, seg.a, p)
  addEdge(g, p, seg.b)
  return p
}

/** Giao điểm thật sự bên trong hai đoạn (p1,p2) và (p3,p4); song song hoặc chỉ chạm đầu mút thì null. */
const crossing = (g: RoadGraph, p1: number, p2: number, p3: number, p4: number): [number, number] | null => {
  const { xs, ys } = g
  const dx1 = xs[p2] - xs[p1]
  const dy1 = ys[p2] - ys[p1]
  const dx2 = xs[p4] - xs[p3]
  const dy2 = ys[p4] - ys[p3]
  const den = dx1 * dy2 - dy1 * dx2
  if (Math.abs(den) < 1e-9) return null
  const t = ((xs[p3] - xs[p1]) * dy2 - (ys[p3] - ys[p1]) * dx2) / den
  const u = ((xs[p3] - xs[p1]) * dy1 - (ys[p3] - ys[p1]) * dx1) / den
  if (t <= 0 || t >= 1 || u <= 0 || u >= 1) return null
  return [xs[p1] + t * dx1, ys[p1] + t * dy1]
}

/**
 * Ô bản đồ ở zoom thấp (dưới 15) đã giản lược nét đường: hai con đường cắt nhau mà mất đỉnh chung ở ngã ba / ngã tư,
 * tìm đường phải đi vòng cả khu phố. Tách cả hai đoạn tại giao điểm để nối lại. Hệ quả: cầu vượt cũng bị coi là
 * ngã tư; ở đường nông thôn hiếm gặp, và người dùng vẫn thấy nét cam để bỏ điểm cuối.
 */
const splitCrossings = (g: RoadGraph, nodeAt: (x: number, y: number) => number) => {
  for (let s = 0; s < g.segs.length; s++) {
    const seg = g.segs[s]
    if (!seg.alive) continue
    const { a, b } = seg
    const x0 = Math.floor(Math.min(g.xs[a], g.xs[b]) / CELL_M)
    const x1 = Math.floor(Math.max(g.xs[a], g.xs[b]) / CELL_M)
    const y0 = Math.floor(Math.min(g.ys[a], g.ys[b]) / CELL_M)
    const y1 = Math.floor(Math.max(g.ys[a], g.ys[b]) / CELL_M)
    search: for (let cx = x0; cx <= x1; cx++)
      for (let cy = y0; cy <= y1; cy++)
        for (const o of g.cells.get(cellKey(cx, cy)) ?? []) {
          const other = g.segs[o]
          if (o === s || !other.alive) continue
          if (other.a === a || other.a === b || other.b === a || other.b === b) continue
          const hit = crossing(g, a, b, other.a, other.b)
          if (!hit) continue
          const p = splitSegment(g, o, hit[0], hit[1], nodeAt)
          // Đoạn `s` tách tại đúng đỉnh vừa dùng; hai nửa mới nằm cuối danh sách nên còn được xét tiếp
          if (p !== a && p !== b) {
            seg.alive = false
            addEdge(g, a, p)
            addEdge(g, p, b)
          }
          break search
        }
  }
}

/** Ghép các nét đường thành mạng đường (đỉnh trùng gộp lại, ngã ba bị giản lược mất, vết cắt ở mép ô bản đồ nối lại). */
export const buildRoadGraph = (lines: ReadonlyArray<ReadonlyArray<LngLat>>): RoadGraph => {
  const origin: LngLat = lines[0]?.[0] ? [lines[0][0][0], lines[0][0][1]] : [0, 0]
  const g: RoadGraph = {
    origin,
    kx: M_PER_DEG * Math.cos((origin[1] * Math.PI) / 180),
    ky: M_PER_DEG,
    xs: [],
    ys: [],
    adj: [],
    segs: [],
    cells: new Map(),
  }

  // Ô lưới 1 m cho việc gộp đỉnh trùng
  const nodeCells = new Map<string, number[]>()
  const nodeAt = (x: number, y: number) => {
    const cx = Math.floor(x)
    const cy = Math.floor(y)
    for (let i = cx - 1; i <= cx + 1; i++)
      for (let j = cy - 1; j <= cy + 1; j++)
        for (const n of nodeCells.get(cellKey(i, j)) ?? [])
          if (Math.hypot(g.xs[n] - x, g.ys[n] - y) <= MERGE_M) return n
    const n = g.xs.length
    g.xs.push(x)
    g.ys.push(y)
    g.adj.push([])
    const key = cellKey(cx, cy)
    const list = nodeCells.get(key)
    if (list) list.push(n)
    else nodeCells.set(key, [n])
    return n
  }

  const ends: number[] = []
  for (const line of lines) {
    let prev = -1
    for (const p of line) {
      const [x, y] = toXY(g, p)
      const n = nodeAt(x, y)
      if (prev >= 0) addEdge(g, prev, n)
      if (prev < 0) ends.push(n)
      prev = n
    }
    ends.push(prev)
  }

  splitCrossings(g, nodeAt)

  // Đầu mẩu còn cụt mà nằm sát một mẩu khác: đó là vết cắt ở mép ô, nối vào mẩu kia
  for (const e of new Set(ends)) {
    if (g.adj[e].length > 1) continue
    const near = nearestSegment(g, g.xs[e], g.ys[e], JOIN_M, e)
    if (!near) continue
    const p = splitSegment(g, near.s, near.x, near.y, nodeAt)
    if (p !== e) addEdge(g, e, p)
  }
  return g
}

export type RoadRouteFailure = 'start_off_road' | 'end_off_road' | 'no_path'

export interface RoadRoute {
  /** Đường dọc theo mạng đường, bắt đầu và kết thúc ở chỗ hai điểm bấm chiếu xuống đường. */
  line: LngLat[]
  lengthM: number
}

/** Hàng đợi ưu tiên nhỏ nhất (đống nhị phân) cho Dijkstra. */
class MinHeap {
  private keys: number[] = []
  private vals: number[] = []
  get size() {
    return this.keys.length
  }
  push(key: number, val: number) {
    const k = this.keys
    const v = this.vals
    k.push(key)
    v.push(val)
    let i = k.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (k[parent] <= k[i]) break
      ;[k[parent], k[i]] = [k[i], k[parent]]
      ;[v[parent], v[i]] = [v[i], v[parent]]
      i = parent
    }
  }
  pop(): [number, number] {
    const k = this.keys
    const v = this.vals
    const top: [number, number] = [k[0], v[0]]
    const lastK = k.pop() as number
    const lastV = v.pop() as number
    if (k.length > 0) {
      k[0] = lastK
      v[0] = lastV
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < k.length && k[l] < k[m]) m = l
        if (r < k.length && k[r] < k[m]) m = r
        if (m === i) break
        ;[k[m], k[i]] = [k[i], k[m]]
        ;[v[m], v[i]] = [v[i], v[m]]
        i = m
      }
    }
    return top
  }
}

/** Đoạn ngắn nhất dọc theo mạng đường từ `from` tới `to` (hai điểm được chiếu xuống con đường gần nhất). */
export const routeAlongRoads = (
  g: RoadGraph,
  from: LngLat,
  to: LngLat,
  maxSnapM = MAX_SNAP_M
): RoadRoute | { error: RoadRouteFailure } => {
  const [fx, fy] = toXY(g, from)
  const [tx, ty] = toXY(g, to)
  const start = nearestSegment(g, fx, fy, maxSnapM)
  if (!start) return { error: 'start_off_road' }
  const end = nearestSegment(g, tx, ty, maxSnapM)
  if (!end) return { error: 'end_off_road' }

  const finish = (points: [number, number][]): RoadRoute => {
    const line: LngLat[] = []
    for (const [x, y] of points) {
      const last = line[line.length - 1]
      const p = toLngLat(g, x, y)
      if (!last || Math.hypot((p[0] - last[0]) * g.kx, (p[1] - last[1]) * g.ky) > 0.05) line.push(p)
    }
    return { line, lengthM: calculateRouteLengthMeters(line) }
  }

  const s = g.segs[start.s]
  const t = g.segs[end.s]
  const n = g.xs.length
  const dist = new Float64Array(n).fill(Infinity)
  const prev = new Int32Array(n).fill(-1)
  const heap = new MinHeap()
  const seed = (node: number) => {
    const d = Math.hypot(g.xs[node] - start.x, g.ys[node] - start.y)
    if (d < dist[node]) {
      dist[node] = d
      heap.push(d, node)
    }
  }
  seed(s.a)
  seed(s.b)
  const tail = (node: number) => Math.hypot(g.xs[node] - end.x, g.ys[node] - end.y)

  // Hai điểm trên cùng một đoạn: đi thẳng dọc đoạn đó
  let best = start.s === end.s ? Math.hypot(start.x - end.x, start.y - end.y) : Infinity
  let bestNode = -1
  while (heap.size > 0) {
    const [d, u] = heap.pop()
    if (d > dist[u]) continue
    if (d >= best) break
    if (u === t.a || u === t.b) {
      const total = d + tail(u)
      if (total < best) {
        best = total
        bestNode = u
      }
    }
    for (const { to: v, w } of g.adj[u]) {
      const nd = d + w
      if (nd < dist[v]) {
        dist[v] = nd
        prev[v] = u
        heap.push(nd, v)
      }
    }
  }

  if (!Number.isFinite(best)) return { error: 'no_path' }
  if (bestNode < 0) return finish([[start.x, start.y], [end.x, end.y]])
  const nodes: number[] = []
  for (let u = bestNode; u >= 0; u = prev[u]) nodes.push(u)
  nodes.reverse()
  return finish([[start.x, start.y], ...nodes.map((u): [number, number] => [g.xs[u], g.ys[u]]), [end.x, end.y]])
}

/** Chỗ bấm chiếu xuống con đường gần nhất, hoặc null khi không có đường nào trong `maxSnapM`. */
export const snapToRoad = (g: RoadGraph, p: LngLat, maxSnapM = MAX_SNAP_M): LngLat | null => {
  const [x, y] = toXY(g, p)
  const near = nearestSegment(g, x, y, maxSnapM)
  return near ? toLngLat(g, near.x, near.y) : null
}

/** Nối các chặng liên tiếp thành một đường (điểm nối giữa hai chặng chỉ giữ một lần). */
export const joinLegs = (legs: ReadonlyArray<ReadonlyArray<LngLat>>): LngLat[] => {
  const line: LngLat[] = []
  for (const leg of legs) {
    for (const p of leg) {
      const last = line[line.length - 1]
      if (!last || last[0] !== p[0] || last[1] !== p[1]) line.push(p)
    }
  }
  return line
}

export const lineToWkt = (line: ReadonlyArray<LngLat>) => `LINESTRING(${line.map((c) => `${c[0]} ${c[1]}`).join(', ')})`
