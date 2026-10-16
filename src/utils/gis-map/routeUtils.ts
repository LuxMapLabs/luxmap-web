/**
 * Utility functions for route geometry projection, magnetic road snapping, and trimming.
 * Guarantees that routes and endpoints ALWAYS strictly lie on the road centerline.
 */

// Haversine distance between two coordinates in meters
export const calculateDistanceMeters = (
  p1: [number, number],
  p2: [number, number]
): number => {
  const R = 6371000 // Earth radius in meters
  const rad = Math.PI / 180
  const dLat = (p2[1] - p1[1]) * rad
  const dLng = (p2[0] - p1[0]) * rad
  const lat1 = p1[1] * rad
  const lat2 = p2[1] * rad

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Calculate total length of a polyline in meters
export const calculateRouteLengthMeters = (coords: [number, number][]): number => {
  if (!coords || coords.length < 2) return 0
  let total = 0
  for (let i = 0; i < coords.length - 1; i++) {
    total += calculateDistanceMeters(coords[i], coords[i + 1])
  }
  return Math.round(total)
}

// Project a point p onto line segment ab, returning the closest point on the segment
export const projectPointOnSegment = (
  p: [number, number],
  a: [number, number],
  b: [number, number]
): { point: [number, number]; dist: number; t: number } => {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lenSq = dx * dx + dy * dy

  if (lenSq === 0) {
    const d = calculateDistanceMeters(p, a)
    return { point: [a[0], a[1]], dist: d, t: 0 }
  }

  // Parameter t of projection
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))

  const roundCoord = (val: number) => Math.round(val * 1000000) / 1000000
  const proj: [number, number] = [roundCoord(a[0] + t * dx), roundCoord(a[1] + t * dy)]
  const dist = calculateDistanceMeters(p, proj)
  return { point: proj, dist, t }
}

export interface SnappedPointResult {
  snappedPoint: [number, number]
  segmentIndex: number
  distMeters: number
  accumulatedDist: number
}

/**
 * Magnetically snap any coordinate onto the nearest point on the road centerline.
 */
export const snapPointToPolyline = (
  p: [number, number],
  roadCoords: [number, number][]
): SnappedPointResult => {
  if (!roadCoords || roadCoords.length === 0) {
    return { snappedPoint: p, segmentIndex: 0, distMeters: 0, accumulatedDist: 0 }
  }
  if (roadCoords.length === 1) {
    return {
      snappedPoint: roadCoords[0],
      segmentIndex: 0,
      distMeters: calculateDistanceMeters(p, roadCoords[0]),
      accumulatedDist: 0,
    }
  }

  let bestDist = Infinity
  let bestIndex = 0
  let bestPoint: [number, number] = roadCoords[0]
  let bestAccumDist = 0

  let currentAccumDist = 0

  for (let i = 0; i < roadCoords.length - 1; i++) {
    const segA = roadCoords[i]
    const segB = roadCoords[i + 1]
    const segLen = calculateDistanceMeters(segA, segB)
    const { point, dist, t } = projectPointOnSegment(p, segA, segB)

    if (dist < bestDist) {
      bestDist = dist
      bestIndex = i
      bestPoint = point
      bestAccumDist = currentAccumDist + segLen * t
    }

    currentAccumDist += segLen
  }

  return {
    snappedPoint: bestPoint,
    segmentIndex: bestIndex,
    distMeters: bestDist,
    accumulatedDist: bestAccumDist,
  }
}

export interface SliceRoadResult {
  snappedStart: [number, number]
  snappedEnd: [number, number]
  slicedCoords: [number, number][]
}

/**
 * Slice the road centerline between startCandidate and endCandidate.
 * Both endpoints are magnetically snapped onto the road surface.
 * Guarantees that 100% of the returned polyline strictly lies on the road surface!
 */
export const sliceRoadBetweenPoints = (
  fullRoadCoords: [number, number][],
  startCandidate: [number, number],
  endCandidate: [number, number]
): SliceRoadResult => {
  if (!fullRoadCoords || fullRoadCoords.length < 2) {
    return {
      snappedStart: startCandidate,
      snappedEnd: endCandidate,
      slicedCoords: [startCandidate, endCandidate],
    }
  }

  const snapStart = snapPointToPolyline(startCandidate, fullRoadCoords)
  const snapEnd = snapPointToPolyline(endCandidate, fullRoadCoords)

  const isForward = snapStart.accumulatedDist <= snapEnd.accumulatedDist

  if (isForward) {
    const points: [number, number][] = [snapStart.snappedPoint]

    // Intermediate road vertices strictly between snapStart and snapEnd
    for (let i = snapStart.segmentIndex + 1; i <= snapEnd.segmentIndex; i++) {
      points.push(fullRoadCoords[i])
    }

    // Add end point if distinct
    const lastPt = points[points.length - 1]
    if (
      Math.abs(lastPt[0] - snapEnd.snappedPoint[0]) > 0.000005 ||
      Math.abs(lastPt[1] - snapEnd.snappedPoint[1]) > 0.000005
    ) {
      points.push(snapEnd.snappedPoint)
    }

    return {
      snappedStart: snapStart.snappedPoint,
      snappedEnd: snapEnd.snappedPoint,
      slicedCoords: points.length >= 2 ? points : [snapStart.snappedPoint, snapEnd.snappedPoint],
    }
  } else {
    // Reverse direction
    const points: [number, number][] = [snapStart.snappedPoint]

    for (let i = snapStart.segmentIndex; i > snapEnd.segmentIndex; i--) {
      points.push(fullRoadCoords[i])
    }

    const lastPt = points[points.length - 1]
    if (
      Math.abs(lastPt[0] - snapEnd.snappedPoint[0]) > 0.000005 ||
      Math.abs(lastPt[1] - snapEnd.snappedPoint[1]) > 0.000005
    ) {
      points.push(snapEnd.snappedPoint)
    }

    return {
      snappedStart: snapStart.snappedPoint,
      snappedEnd: snapEnd.snappedPoint,
      slicedCoords: points.length >= 2 ? points : [snapStart.snappedPoint, snapEnd.snappedPoint],
    }
  }
}

/**
 * Build spine waypoints from ordered poles of a segment.
 * Ensures OSRM strictly routes through the road where the poles are located,
 * never jumping to parallel streets or bypassing poles.
 */
export const getPoleSpineWaypoints = (
  start: [number, number],
  end: [number, number],
  orderedPoleCoords: [number, number][]
): [number, number][] => {
  if (!orderedPoleCoords || orderedPoleCoords.length === 0) return []

  const count = orderedPoleCoords.length

  // If 6 poles or fewer, include all poles distinct from start/end
  if (count <= 6) {
    return orderedPoleCoords.filter((p) => {
      const distToStart = calculateDistanceMeters(p, start)
      const distToEnd = calculateDistanceMeters(p, end)
      return distToStart > 10 && distToEnd > 10
    })
  }

  // 5 strategic anchors: 0%, 25%, 50%, 75%, and 100% (the last pole at intersection)
  const indices = [
    0,
    Math.floor(count * 0.25),
    Math.floor(count * 0.5),
    Math.floor(count * 0.75),
    count - 1,
  ]

  const sampled: [number, number][] = []
  for (const idx of indices) {
    const p = orderedPoleCoords[idx]
    if (!p) continue
    if (calculateDistanceMeters(p, start) > 10 && calculateDistanceMeters(p, end) > 10) {
      const last = sampled[sampled.length - 1]
      if (!last || calculateDistanceMeters(p, last) > 10) {
        sampled.push(p)
      }
    }
  }

  // Ensure last pole is strictly included if distinct from end
  const lastPole = orderedPoleCoords[count - 1]
  if (calculateDistanceMeters(lastPole, end) > 10) {
    const hasLast = sampled.some((p) => calculateDistanceMeters(p, lastPole) < 5)
    if (!hasLast) {
      sampled.push(lastPole)
    }
  }

  return sampled
}

/**
 * Trích xuất mảng tọa độ [lng, lat] từ chuỗi WKT LINESTRING
 */
export function parseLineStringWkt(wkt?: string | null): [number, number][] {
  if (!wkt) return []
  const match = wkt.match(/LINESTRING\s*\(([^)]+)\)/i)
  if (!match) return []
  const parts = match[1].split(',')
  const coords: [number, number][] = []
  for (const part of parts) {
    const tokens = part.trim().split(/\s+/)
    if (tokens.length >= 2) {
      const lng = parseFloat(tokens[0])
      const lat = parseFloat(tokens[1])
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        coords.push([lng, lat])
      }
    }
  }
  return coords
}

/**
 * Trích xuất tọa độ điểm đầu, điểm cuối và toàn bộ lộ trình thực tế của tuyến đường
 * Thứ tự ưu tiên: geom_wkt -> Cột đèn thực tế thuộc tuyến -> Tọa độ mặc định Củ Chi
 */
export function extractSegmentCoordinates(
  segment: Record<string, any> | null | undefined,
  poles?: { coord: [number, number] }[]
): {
  initialStart: [number, number]
  initialEnd: [number, number]
  initialCoords: [number, number][]
} {
  if (!segment) {
    const fallbackStart: [number, number] = [106.4896, 10.9701]
    const fallbackEnd: [number, number] = [106.4950, 10.9750]
    return {
      initialStart: fallbackStart,
      initialEnd: fallbackEnd,
      initialCoords: [fallbackStart, fallbackEnd],
    }
  }

  // 1. Ưu tiên trích xuất từ geom_wkt của segment
  const geomWkt = (segment as any).geom_wkt
  if (typeof geomWkt === 'string') {
    const parsed = parseLineStringWkt(geomWkt)
    if (parsed.length >= 2) {
      return {
        initialStart: parsed[0],
        initialEnd: parsed[parsed.length - 1],
        initialCoords: parsed,
      }
    }
  }

  // 2. Ưu tiên trích xuất từ geometry GeoJSON nếu có
  const geojsonCoords = (segment as any).geometry?.coordinates
  if (Array.isArray(geojsonCoords) && geojsonCoords.length >= 2) {
    const valid = geojsonCoords.filter(
      (c: any) => Array.isArray(c) && c.length === 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])
    ) as [number, number][]
    if (valid.length >= 2) {
      return {
        initialStart: valid[0],
        initialEnd: valid[valid.length - 1],
        initialCoords: valid,
      }
    }
  }

  // 3. Trích xuất từ danh sách cột đèn thực tế thuộc tuyến
  if (poles && poles.length >= 2) {
    const poleCoords = poles.map((p) => p.coord)
    return {
      initialStart: poleCoords[0],
      initialEnd: poleCoords[poleCoords.length - 1],
      initialCoords: poleCoords,
    }
  }

  if (poles && poles.length === 1) {
    const singleCoord = poles[0].coord
    return {
      initialStart: singleCoord,
      initialEnd: singleCoord,
      initialCoords: [singleCoord, singleCoord],
    }
  }

  // 4. Fallback mặc định khu vực trung tâm Củ Chi khi tuyến chưa có hình học & chưa có cột
  const fallbackStart: [number, number] = [106.4896, 10.9701]
  const fallbackEnd: [number, number] = [106.4950, 10.9750]
  return {
    initialStart: fallbackStart,
    initialEnd: fallbackEnd,
    initialCoords: [fallbackStart, fallbackEnd],
  }
}

/**
 * Interpolate coordinates along polyline given target distance in meters from the start.
 */
export const getPointAtDistanceAlongPolyline = (
  coords: [number, number][],
  distMeters: number
): [number, number] => {
  if (!coords || coords.length === 0) return [0, 0]
  if (coords.length === 1 || distMeters <= 0) return coords[0]

  let accum = 0
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i]
    const p2 = coords[i + 1]
    const segLen = calculateDistanceMeters(p1, p2)
    if (accum + segLen >= distMeters) {
      const remain = distMeters - accum
      const t = segLen === 0 ? 0 : remain / segLen
      return [
        Math.round((p1[0] + t * (p2[0] - p1[0])) * 1000000) / 1000000,
        Math.round((p1[1] + t * (p2[1] - p1[1])) * 1000000) / 1000000,
      ]
    }
    accum += segLen
  }
  return coords[coords.length - 1]
}

/**
 * Magnetically snap coordinate onto polyline and leapfrog over obstacle points (e.g. existing poles)
 * to avoid spatial collision within `minClearance` meters.
 */
export const resolveNonOverlappingRoutePoint = (
  rawLng: number,
  rawLat: number,
  coords: [number, number][],
  obstaclePoints: [number, number][],
  minClearance: number = 15
): [number, number] => {
  if (!coords || coords.length < 2) return [rawLng, rawLat]

  const snap = snapPointToPolyline([rawLng, rawLat], coords)
  const mouseDist = snap.accumulatedDist
  let targetDist = mouseDist

  const validObstacles = obstaclePoints.filter(
    (pt) => Array.isArray(pt) && pt.length === 2 && Number.isFinite(pt[0]) && Number.isFinite(pt[1])
  )

  if (validObstacles.length === 0) {
    return snap.snappedPoint
  }

  // Convert obstacles to distance along polyline
  const obstacleDists = validObstacles
    .map((pt) => snapPointToPolyline(pt, coords).accumulatedDist)
    .sort((a, b) => a - b)

  // Build & merge overlapping forbidden intervals [d - minClearance, d + minClearance]
  const rawIntervals = obstacleDists.map((d) => [
    Math.max(0, d - minClearance),
    d + minClearance,
  ] as [number, number])

  const mergedIntervals: [number, number][] = []
  for (const cur of rawIntervals) {
    if (mergedIntervals.length === 0) {
      mergedIntervals.push([...cur])
    } else {
      const prev = mergedIntervals[mergedIntervals.length - 1]
      if (cur[0] <= prev[1]) {
        prev[1] = Math.max(prev[1], cur[1])
      } else {
        mergedIntervals.push([...cur])
      }
    }
  }

  const totalLen = calculateRouteLengthMeters(coords)

  // Push targetDist outside forbidden intervals
  let iterations = 0
  while (iterations < 10) {
    iterations++
    const inside = mergedIntervals.find(
      ([start, end]) => targetDist >= start - 0.0001 && targetDist <= end + 0.0001
    )
    if (!inside) break

    const [start, end] = inside
    const mid = (start + end) / 2

    if (start <= 0.1 && end >= totalLen - 0.1) {
      break
    }

    if (start <= 0.1) {
      targetDist = end + 0.05
    } else if (end >= totalLen - 0.1) {
      targetDist = Math.max(0, start - 0.05)
    } else if (mouseDist >= mid) {
      targetDist = end + 0.05
    } else {
      targetDist = Math.max(0, start - 0.05)
    }
  }

  return getPointAtDistanceAlongPolyline(coords, targetDist)
}
