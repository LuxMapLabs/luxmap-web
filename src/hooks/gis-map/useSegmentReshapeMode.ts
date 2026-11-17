import type * as maplibregl from 'maplibre-gl'
import { ROAD_CLASS_LIST, roadLinesFromFeatures, type LngLat } from '../../utils/gis-map/roadRouting'
import { MIN_ROAD_ZOOM } from '../../utils/gis-map/segmentReshape'
import { GOOGLE_HYBRID_STYLE } from '../../utils/gis-map/mapUtils'

/** Nguồn và lớp đường của bản đồ nền (`GOOGLE_HYBRID_STYLE`, MapTiler Planet v4). */
const BASE_MAP_SOURCE = 'maptiler_planet'
const ROAD_SOURCE_LAYER = 'road'
/**
 * Nguồn riêng cho nét đường (cùng URL ô với bản đồ nền, ép `maxzoom` 14). Đọc thẳng nguồn nền thì ở zoom 16 - 16.9 ô phóng to
 * trả về rỗng: lớp vàng và cú bấm theo đường mất đúng mức đó (đo trên Chrome); nguồn riêng thì đủ ở mọi mức.
 */
const ROAD_SOURCE = 'road-hint-source'

/** Nét đường của bản đồ nền trong các ô đang tải. */
export const queryBaseMapRoadLines = (map: maplibregl.Map): LngLat[][] =>
  roadLinesFromFeatures(map.querySourceFeatures(ROAD_SOURCE, { sourceLayer: ROAD_SOURCE_LAYER }))

/** Lớp tô vàng các đường có trên bản đồ nền, chỉ hiện khi đang lấy hình: biết đường nào bấm theo được. */
export const ROAD_HINT_LAYER = 'base-map-road-hint'
const BASE_SOURCES = new Set(Object.keys(GOOGLE_HYBRID_STYLE.sources))

export const showRoadHint = (map: maplibregl.Map) => {
  try {
    if (map.getLayer(ROAD_HINT_LAYER)) return
    const base = map.getStyle().sources[BASE_MAP_SOURCE]
    if (base?.type !== 'vector' || !base.url) return
    if (!map.getSource(ROAD_SOURCE)) map.addSource(ROAD_SOURCE, { type: 'vector', url: base.url, maxzoom: 14 })
    // Nằm trên ảnh nền, dưới mọi lớp của web (cột, tuyến, nét đang lấy)
    const before = map
      .getStyle()
      .layers.find((l) => 'source' in l && typeof l.source === 'string' && !BASE_SOURCES.has(l.source))?.id
    map.addLayer(
      {
        id: ROAD_HINT_LAYER,
        type: 'line',
        source: ROAD_SOURCE,
        'source-layer': ROAD_SOURCE_LAYER,
        minzoom: MIN_ROAD_ZOOM,
        filter: ['all', ['in', ['get', 'class'], ['literal', ROAD_CLASS_LIST]], ['!=', ['get', 'construction'], true]],
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
    if (map.getSource(ROAD_SOURCE)) map.removeSource(ROAD_SOURCE)
  } catch {
    // Bản đồ đã bị huỷ (rời trang) - không còn gì để gỡ
  }
}
