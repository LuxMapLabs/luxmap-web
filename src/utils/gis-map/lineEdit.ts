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
