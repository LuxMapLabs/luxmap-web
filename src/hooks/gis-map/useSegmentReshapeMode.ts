import { useEffect, useRef } from 'react'
import type * as maplibregl from 'maplibre-gl'
import { ROAD_CLASS_LIST, roadLinesFromFeatures, type LngLat } from '../../utils/gis-map/roadRouting'
import { MIN_ROAD_ZOOM } from '../../utils/gis-map/segmentReshape'
import { GOOGLE_HYBRID_STYLE } from '../../utils/gis-map/mapUtils'
import { reshapeLine, type SegmentReshape } from '../../utils/gis-map/segmentReshape'

const SOURCE_ID = 'segment-reshape'
const LINE_LAYER = 'segment-reshape-line'
const POINT_LAYER = 'segment-reshape-points'
/** Gắn lên khung bản đồ khi đang bấm chọn điểm: chấm cột / tủ điện không bắt cú bấm. */
export const PICKING_CLASS = 'gis-map-picking'

/** Nguồn và lớp đường của bản đồ nền (`GOOGLE_HYBRID_STYLE`, lược đồ OpenMapTiles). */
const BASE_MAP_SOURCE = 'maptiler_planet'
const ROAD_SOURCE_LAYER = 'transportation'

/** Nét đường của bản đồ nền trong các ô đang tải. */
export const queryBaseMapRoadLines = (map: maplibregl.Map): LngLat[][] =>
  roadLinesFromFeatures(map.querySourceFeatures(BASE_MAP_SOURCE, { sourceLayer: ROAD_SOURCE_LAYER }))

/** Lớp tô vàng các đường có trên bản đồ nền, chỉ hiện khi đang lấy hình: biết đường nào bấm theo được. */
export const ROAD_HINT_LAYER = 'base-map-road-hint'
const BASE_SOURCES = new Set(Object.keys(GOOGLE_HYBRID_STYLE.sources))

export const showRoadHint = (map: maplibregl.Map) => {
  try {
    if (!map.getSource(BASE_MAP_SOURCE) || map.getLayer(ROAD_HINT_LAYER)) return
    // Nằm trên ảnh nền, dưới mọi lớp của web (cột, tuyến, nét đang lấy)
    const before = map
      .getStyle()
      .layers.find((l) => 'source' in l && typeof l.source === 'string' && !BASE_SOURCES.has(l.source))?.id
    map.addLayer(
      {
        id: ROAD_HINT_LAYER,
        type: 'line',
        source: BASE_MAP_SOURCE,
        'source-layer': ROAD_SOURCE_LAYER,
        minzoom: MIN_ROAD_ZOOM,
        filter: ['in', ['get', 'class'], ['literal', ROAD_CLASS_LIST]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#facc15',
          'line-opacity': 0.7,
          'line-width': ['interpolate', ['linear'], ['zoom'], 14, 1.5, 18, 4, 22, 8],
        },
      },
      before
    )
  } catch {
    // Bản đồ đã bị huỷ hoặc chưa có kiểu - bỏ qua
  }
}

export const hideRoadHint = (map: maplibregl.Map) => {
  try {
    if (map.getLayer(ROAD_HINT_LAYER)) map.removeLayer(ROAD_HINT_LAYER)
  } catch {
    // Bản đồ đã bị huỷ (rời trang) - không còn gì để gỡ
  }
}

const removeLayers = (map: maplibregl.Map) => {
  try {
    if (map.getLayer(POINT_LAYER)) map.removeLayer(POINT_LAYER)
    if (map.getLayer(LINE_LAYER)) map.removeLayer(LINE_LAYER)
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
  } catch {
    // Bản đồ đã bị huỷ (rời trang) - không còn gì để gỡ
  }
}

/**
 * Chế độ lấy hình tuyến: bấm vào bản đồ để thêm điểm (`onPick`), vẽ đoạn đã lấy và các điểm đã bấm.
 * Tắt khi `reshape` về null.
 */
export function useSegmentReshapeMode(
  map: maplibregl.Map | null,
  isMapLoaded: boolean,
  reshape: SegmentReshape | null,
  onPick: (click: LngLat) => void
) {
  const onPickRef = useRef(onPick)
  useEffect(() => {
    onPickRef.current = onPick
  })

  const reshapingId = reshape?.segmentId ?? null

  // Bấm vào bản đồ để thêm điểm. Cột nằm ngay trên đường và chặn cú bấm, nên trong lúc lấy hình
  // `PICKING_CLASS` (index.css) cho cú bấm xuyên qua chấm cột / tủ điện, ẩn khung nổi, giữ con trỏ chữ thập.
  useEffect(() => {
    if (!map || !isMapLoaded || !reshapingId) return
    const handleClick = (e: maplibregl.MapMouseEvent) => onPickRef.current([e.lngLat.lng, e.lngLat.lat])
    map.on('click', handleClick)
    const container = map.getContainer()
    container.classList.add(PICKING_CLASS)
    showRoadHint(map)
    return () => {
      map.off('click', handleClick)
      container.classList.remove(PICKING_CLASS)
      hideRoadHint(map)
    }
  }, [map, isMapLoaded, reshapingId])

  // Đoạn đã lấy + các điểm đã bấm
  useEffect(() => {
    if (!map || !isMapLoaded) return
    if (!reshape) {
      removeLayers(map)
      return
    }
    const line = reshapeLine(reshape)
    const data: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        ...(line.length >= 2
          ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: line } }]
          : []),
        ...reshape.points.map((p, i) => ({
          type: 'Feature' as const,
          properties: { first: i === 0 },
          geometry: { type: 'Point' as const, coordinates: p },
        })),
      ],
    }
    try {
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
      if (source) {
        source.setData(data)
        return
      }
      map.addSource(SOURCE_ID, { type: 'geojson', data })
      map.addLayer({
        id: LINE_LAYER,
        type: 'line',
        source: SOURCE_ID,
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#f97316', 'line-width': 5, 'line-opacity': 0.95 },
      })
      map.addLayer({
        id: POINT_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 6,
          'circle-color': ['case', ['get', 'first'], '#16a34a', '#f97316'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      })
    } catch {
      // Style chưa sẵn sàng - effect chạy lại ở lần bấm kế tiếp
    }
  }, [map, isMapLoaded, reshape])

  // Rời trang khi đang lấy hình: gỡ lớp vẽ
  useEffect(() => {
    return () => {
      if (map) removeLayers(map)
    }
  }, [map])
}
