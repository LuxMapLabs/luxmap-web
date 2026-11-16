import { snapPointToPolyline } from './routeUtils'
import { ROUTE_CORRIDOR_M } from './poleMove'
import {
  buildRoadGraph,
  joinLegs,
  routeAlongRoads,
  snapToRoad,
  type LngLat,
  type RoadRouteFailure,
} from './roadRouting'

/**
 * Bản đồ nền chỉ có đủ đường nhỏ (hẻm, đường đất) từ mức phóng to này; xa hơn, ô bản đồ đã bỏ bớt đường.
 */
export const MIN_ROAD_ZOOM = 14

/** Một lần lấy hình tuyến theo đường trên bản đồ nền (Quản lý, Bản đồ GIS). */
export interface SegmentReshape {
  segmentId: string
  label: string
  /** Chiều dài đang lưu của tuyến, để so với hình mới. */
  oldLengthM: number | null
  /** Các điểm đã bấm, đã chiếu xuống con đường. */
  points: LngLat[]
  /** `legs[i]` là đoạn dọc đường từ `points[i]` tới `points[i + 1]`. */
  legs: LngLat[][]
  /** `freehand[i]` = `points[i]` đặt bằng vẽ tay (không bám đường bản đồ nền). */
  freehand: boolean[]
  error: string | null
}

export const startReshape = (segmentId: string, label: string, oldLengthM: number | null): SegmentReshape => ({
  segmentId,
  label,
  oldLengthM,
  points: [],
  legs: [],
  freehand: [],
  error: null,
})

/** Khung xã dạng [[minLng, minLat], [maxLng, maxLat]] (web chỉ có khung chữ nhật, chưa có ranh giới thật). */
export type CommuneFrame = [[number, number], [number, number]]

const insideFrame = (frame: CommuneFrame | null | undefined, [lng, lat]: LngLat): boolean =>
  !frame || (lng >= frame[0][0] && lng <= frame[1][0] && lat >= frame[0][1] && lat <= frame[1][1])

export const RESHAPE_MESSAGES = {
  outsideCommune:
    'Chỗ vừa bấm nằm ngoài khung xã (khung nét đứt trên bản đồ). Tuyến chỉ vẽ trong địa bàn xã đang quản lý, hãy bấm vào trong khung.',
  zoom: 'Phóng to bản đồ thêm rồi bấm lại: ở mức này bản đồ nền chưa hiện đủ đường nhỏ.',
  offRoad:
    'Chỗ vừa bấm không nằm trên con đường nào của bản đồ nền (đường có trên bản đồ nền hiện nét vàng). Bấm sát vào nét vàng. Đường không có nét vàng thì chọn "Vẽ tay" rồi bấm từng điểm dọc đường.',
  previousOutOfView:
    'Điểm trước nằm ngoài vùng bản đồ đang xem. Kéo bản đồ cho thấy cả điểm trước lẫn chỗ muốn bấm rồi bấm lại.',
  noPath:
    'Không có đường nối từ điểm trước tới chỗ vừa bấm trên bản đồ nền: đoạn đường có thể bị thiếu trên bản đồ, hoặc nằm ngoài vùng đang xem. Kéo bản đồ cho thấy cả hai điểm rồi bấm lại.',
} as const

const failureMessage: Record<RoadRouteFailure, string> = {
  start_off_road: RESHAPE_MESSAGES.previousOutOfView,
  end_off_road: RESHAPE_MESSAGES.offRoad,
  no_path: RESHAPE_MESSAGES.noPath,
}

/**
 * Thêm một điểm bấm: điểm đầu thì chỉ chiếu xuống đường; các điểm sau thì nối từ điểm trước dọc theo đường.
 * `roadLines` là các nét đường của bản đồ nền đang có trong vùng xem.
 */
export const addReshapePoint = (
  current: SegmentReshape,
  roadLines: LngLat[][],
  click: LngLat,
  zoom: number,
  frame?: CommuneFrame | null
): SegmentReshape => {
  if (!insideFrame(frame, click)) return { ...current, error: RESHAPE_MESSAGES.outsideCommune }
  if (zoom < MIN_ROAD_ZOOM) return { ...current, error: RESHAPE_MESSAGES.zoom }
  const graph = buildRoadGraph(roadLines)
  const last = current.points[current.points.length - 1]
  if (!last) {
    const start = snapToRoad(graph, click)
    return start
      ? { ...current, points: [start], freehand: [false], error: null }
      : { ...current, error: RESHAPE_MESSAGES.offRoad }
  }
  // Điểm trước vẽ tay (không nằm trên đường bản đồ nền): nối thẳng tới chỗ bấm, chiếu xuống đường
  if (current.freehand[current.points.length - 1]) {
    const end = snapToRoad(graph, click)
    if (!end) return { ...current, error: RESHAPE_MESSAGES.offRoad }
    return addLeg(current, [last, end], false)
  }
  const route = routeAlongRoads(graph, last, click)
  if ('error' in route) return { ...current, error: failureMessage[route.error] }
  return addLeg(current, route.line, false)
}

const addLeg = (current: SegmentReshape, leg: LngLat[], freehand: boolean): SegmentReshape => ({
  ...current,
  points: [...current.points, leg[leg.length - 1]],
  legs: [...current.legs, leg],
  freehand: [...current.freehand, freehand],
  error: null,
})

/**
 * Vẽ tay: đặt điểm đúng chỗ bấm, nối thẳng từ điểm trước. Dùng cho đường chưa có trên bản đồ nền
 * (đường đất, bờ kênh); Quản lý bấm dọc con đường trên ảnh vệ tinh, khúc cua thì bấm dày hơn.
 */
export const addFreehandPoint = (
  current: SegmentReshape,
  click: LngLat,
  frame?: CommuneFrame | null
): SegmentReshape => {
  if (!insideFrame(frame, click)) return { ...current, error: RESHAPE_MESSAGES.outsideCommune }
  const last = current.points[current.points.length - 1]
  if (!last) return { ...current, points: [click], freehand: [true], error: null }
  return addLeg(current, [last, click], true)
}

/** Bỏ điểm bấm cuối cùng (và đoạn dẫn tới nó). */
export const undoReshapePoint = (current: SegmentReshape): SegmentReshape => ({
  ...current,
  points: current.points.slice(0, -1),
  legs: current.legs.slice(0, Math.max(0, current.points.length - 2)),
  freehand: current.freehand.slice(0, -1),
  error: null,
})

export const reshapeLine = (current: SegmentReshape): LngLat[] => joinLegs(current.legs)

/** Cột của tuyến nằm xa hình mới quá hành lang khảo sát (backend sẽ từ chối lưu). */
export const polesFarFromLine = (
  poles: ReadonlyArray<{ label: string; coord: LngLat }>,
  line: LngLat[],
  limitM = ROUTE_CORRIDOR_M
): string[] =>
  line.length < 2 ? [] : poles.filter((p) => snapPointToPolyline(p.coord, line).distMeters > limitM).map((p) => p.label)

/** Id các cột nằm trong hành lang khảo sát quanh hình: gợi ý gán vào tuyến. */
export const polesNearLine = (
  poles: ReadonlyArray<{ id: string; coord: LngLat }>,
  line: LngLat[],
  limitM = ROUTE_CORRIDOR_M
): string[] =>
  line.length < 2 ? [] : poles.filter((p) => snapPointToPolyline(p.coord, line).distMeters <= limitM).map((p) => p.id)
