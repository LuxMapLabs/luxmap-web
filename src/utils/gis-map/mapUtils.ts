import type { CommuneBbox } from '../../types/admin/communes'
import type { MapBounds } from '../../types/auth/me'
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'

/** Fallback only — the map opens on the account's `map_bounds` (GET /auth/me). Centre of the surveyed communes. */
export const DEFAULT_MAP_CENTER: [number, number] = [106.4975, 10.9715]
/** Fallback `bbox` for map layers when the account has no `map_bounds` (no commune frame set yet). */

/** A complete commune frame as MapLibre bounds, or null when any edge is missing. Supports numbers and numeric strings with comma/dot. */
export function toLngLatBounds(bbox?: any | null): [[number, number], [number, number]] | null {
  if (!bbox) return null
  const target = bbox?.bbox && typeof bbox.bbox === 'object' ? bbox.bbox : bbox
  const parseCoord = (v: any): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string') {
      const normalized = v.trim().replace(',', '.')
      const num = parseFloat(normalized)
      if (Number.isFinite(num)) return num
    }
    return null
  }

  const min_lng = parseCoord(target.min_lng)
  const min_lat = parseCoord(target.min_lat)
  const max_lng = parseCoord(target.max_lng)
  const max_lat = parseCoord(target.max_lat)

  if (min_lng === null || min_lat === null || max_lng === null || max_lat === null) return null
  return [[min_lng, min_lat], [max_lng, max_lat]]
}

/** The `bbox` query value (`min_lng,min_lat,max_lng,max_lat`) for a commune frame, or null when incomplete. */
export function toBboxParam(bbox?: CommuneBbox | null): string | null {
  const b = toLngLatBounds(bbox)
  return b ? `${b[0][0]},${b[0][1]},${b[1][0]},${b[1][1]}` : null
}

/**
 * Chuyển đổi Bbox thành GeoJSON Feature Polygon đóng kín (4 góc + đỉnh đóng)
 * để render khung ranh giới trực quan của địa bàn trên bản đồ.
 */
export function toBboxPolygonGeoJSON(bbox?: any | null): GeoJSON.Feature<GeoJSON.Polygon> | null {
  const bounds = toLngLatBounds(bbox)
  if (!bounds) return null
  const [[minLng, minLat], [maxLng, maxLat]] = bounds
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [minLng, minLat],
          [maxLng, minLat],
          [maxLng, maxLat],
          [minLng, maxLat],
          [minLng, minLat],
        ],
      ],
    },
  }
}

export interface ResolvedCommuneBounds {
  bbox: CommuneBbox | null
  center: [number, number] | null
  bounds: [[number, number], [number, number]] | null
}

/**
 * Trích xuất Bbox và tâm (Center) chính xác của địa bàn từ Redux State
 */
export function getCommuneBboxInfo(
  communeId?: string | null,
  userCommunes?: Array<{
    commune_id?: string | null
    bbox?: CommuneBbox | null
    center?: { lng?: number | null; lat?: number | null } | null
  }> | null,
  adminCommunes?: Array<{
    commune_id?: string | null
    bbox?: CommuneBbox | null
  }> | null,
  fallbackMapBounds?: MapBounds | null
): ResolvedCommuneBounds {
  if (communeId) {
    const foundUser = userCommunes?.find((c) => c.commune_id === communeId)
    if (foundUser?.bbox) {
      const bounds = toLngLatBounds(foundUser.bbox)
      if (bounds) {
        const center: [number, number] =
          typeof foundUser.center?.lng === 'number' &&
          typeof foundUser.center?.lat === 'number' &&
          Number.isFinite(foundUser.center.lng) &&
          Number.isFinite(foundUser.center.lat)
            ? [foundUser.center.lng, foundUser.center.lat]
            : [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2]
        return { bbox: foundUser.bbox, center, bounds }
      }
    }
    const foundAdmin = adminCommunes?.find((c) => c.commune_id === communeId)
    if (foundAdmin?.bbox) {
      const bounds = toLngLatBounds(foundAdmin.bbox)
      if (bounds) {
        const center: [number, number] = [
          (bounds[0][0] + bounds[1][0]) / 2,
          (bounds[0][1] + bounds[1][1]) / 2,
        ]
        return { bbox: foundAdmin.bbox, center, bounds }
      }
    }
  }

  // Fallback to user map_bounds if available
  if (fallbackMapBounds?.bbox) {
    const bounds = toLngLatBounds(fallbackMapBounds.bbox)
    if (bounds) {
      const center: [number, number] =
        typeof fallbackMapBounds.center?.lng === 'number' &&
        typeof fallbackMapBounds.center?.lat === 'number' &&
        Number.isFinite(fallbackMapBounds.center.lng) &&
        Number.isFinite(fallbackMapBounds.center.lat)
          ? [fallbackMapBounds.center.lng, fallbackMapBounds.center.lat]
          : [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2]
      return { bbox: fallbackMapBounds.bbox, center, bounds }
    }
  }

  return { bbox: null, center: null, bounds: null }
}

/**
 * Áp dụng giới hạn Bbox (maxBounds) và mức thu nhỏ tối đa (minZoom) từ Backend
 * để người dùng không zoom out hoặc kéo bản đồ ra ngoài địa bàn quản lý.
 */
export function applyMapBoundsLimits(
  map: MapLibreMap,
  mapBounds?: MapBounds | { bbox?: any } | CommuneBbox | null,
  options?: { padding?: number }
): void {
  const bounds = toLngLatBounds(mapBounds)
  if (!bounds) return
  map.setMaxBounds(bounds)
  const camera = map.cameraForBounds(bounds, { padding: options?.padding ?? 20 })
  if (typeof camera?.zoom === 'number' && Number.isFinite(camera.zoom)) {
    map.setMinZoom(camera.zoom)
  }
}

export const DEFAULT_MAP_ZOOM = 14.8

// ==========================================
// 1. GIỚI HẠN CAMERA TOÀN CỤC (GLOBAL MAP LIMITS)
// ==========================================
/** Mức zoom tối đa cho phép của bản đồ nền (tránh bể hạt ngói vệ tinh) */
export const MAP_MAX_ZOOM = 20

/** Mức zoom tối thiểu mặc định toàn cục */
export const MAP_DEFAULT_MIN_ZOOM = 6

/** Mức zoom cận cảnh tiêu chuẩn khi chọn vị trí tài sản (Location Picker) */
export const MAP_ASSET_PICKER_ZOOM = 17

// ==========================================
// 2. CẤU HÌNH FITBOUNDS PRESETS CHUẨN HÓA (FITBOUNDS CONFIG PRESETS)
// ==========================================

/**
 * [PHẠM VI ĐỊA BÀN / XÃ - ADMIN BBOX] (Commune Scope - Macro)
 * Phóng bao quát toàn bộ khung địa bàn xã khi mở modal xem chi tiết
 */
export const FIT_BOUNDS_COMMUNE = {
  padding: 40,
  maxZoom: 14.5,
  duration: 300,
} as const

/** Mở nhanh khung địa bàn xã không hiệu ứng (ví dụ sau khi resize modal) */
export const FIT_BOUNDS_COMMUNE_INSTANT = {
  padding: 40,
  maxZoom: 14.5,
  duration: 0,
} as const

/**
 * [PHẠM VI THÊM MỚI TÀI SẢN / CỌT / TỦ] (Asset Add Scope)
 * Tự động focus vào tuyến đường khi chọn tuyến để hỗ trợ cắm mốc mới
 */
export const FIT_BOUNDS_ASSET_ADD_INSTANT = {
  padding: 40,
  maxZoom: 17,
  duration: 0,
} as const

export const FIT_BOUNDS_ASSET_ADD_SMOOTH = {
  padding: 40,
  maxZoom: 17,
  duration: 600,
} as const

/**
 * [PHẠM VI TUYẾN ĐƯỜNG / SEGMENT ROUTE MAP] (LineString Route Scope)
 * Bao quát toàn bộ chiều dài tuyến từ điểm đầu đến điểm cuối (Add, Edit, Detail)
 */
export const FIT_BOUNDS_ROUTE_INSTANT = {
  padding: 40,
  maxZoom: 17,
  duration: 0,
} as const

export const FIT_BOUNDS_ROUTE_SMOOTH = {
  padding: 40,
  maxZoom: 17,
  duration: 400,
} as const

/**
 * [PHẠM VI GIS MAP TOÀN CẢNH & PHÂN TUYẾN]
 * Khi người dùng chọn lọc hiển thị tất cả tuyến hoặc 1 tuyến cụ thể trên GIS Map chính
 */
export const FIT_BOUNDS_GIS_PANORAMA = {
  padding: 60,
  maxZoom: 15.5,
  duration: 800,
} as const

export const FIT_BOUNDS_GIS_SEGMENT = {
  padding: 80,
  maxZoom: 16.5,
  duration: 800,
} as const

export const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY 

/**
 * Bản đồ Vệ Tinh Google Hybrid Sạch (Google Satellite + Tự Động Nạp Hoàng Sa & Trường Sa từ Google + MapTiler Vector Sạch trong đất liền - 0% Rác Quán Xá)
 */
export const GOOGLE_HYBRID_STYLE: StyleSpecification = Object.freeze({
  version: 8,
  id: 'hybrid',
  name: 'Satellite Hybrid',
  glyphs: 'https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=4A7ex43XNIzlzIcSnO8d',
  sprite: 'https://api.maptiler.com/maps/hybrid/sprite',
  bearing: 0,
  pitch: 0,
  center: [0, 0],
  zoom: 1,
  sources: {
    maptiler_planet: {
      url: 'https://api.maptiler.com/tiles/v3/tiles.json?key=4A7ex43XNIzlzIcSnO8d',
      type: 'vector',
    },
    satellite: {
      type: 'raster',
      tiles: [
        'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        'https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        'https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      ],
      tileSize: 256,
      maxzoom: 22,
      attribution: '&copy; Google Maps',
    },
    'google-vn-hybrid': {
      type: 'raster',
      tiles: [
        'https://mt0.google.com/vt/lyrs=y&hl=vi&gl=VN&x={x}&y={y}&z={z}',
        'https://mt1.google.com/vt/lyrs=y&hl=vi&gl=VN&x={x}&y={y}&z={z}',
        'https://mt2.google.com/vt/lyrs=y&hl=vi&gl=VN&x={x}&y={y}&z={z}',
        'https://mt3.google.com/vt/lyrs=y&hl=vi&gl=VN&x={x}&y={y}&z={z}',
      ],
      tileSize: 256,
      maxzoom: 22,
      attribution: '&copy; Google Maps',
    },
  },
  layers: [
    {
      id: 'Satellite',
      type: 'raster',
      source: 'satellite',
      minzoom: 0,
      maxzoom: 22,
      layout: { visibility: 'visible' },
      paint: { 'raster-opacity': 1.0 },
    },
    {
      id: 'google-vn-regional-hybrid',
      type: 'raster',
      source: 'google-vn-hybrid',
      minzoom: 0,
      maxzoom: 9.5,
      layout: { visibility: 'visible' },
      paint: { 'raster-opacity': 1.0 },
    },
    {
      id: 'Country border',
      type: 'line',
      source: 'maptiler_planet',
      'source-layer': 'boundary',
      layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'visible' },
      paint: {
        'line-color': 'hsl(0, 0%, 94%)',
        'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 3, 0.5, 9, 1.5, 22, 32],
      },
      filter: ['all', ['==', 'admin_level', 2], ['==', 'maritime', 0], ['==', 'disputed', 0]],
      minzoom: 9.5,
    },
    {
      id: 'Road labels',
      type: 'symbol',
      source: 'maptiler_planet',
      'source-layer': 'transportation_name',
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': ['step', ['zoom'], 250, 21, 900],
        'text-field': ['coalesce', ['get', 'name:vi'], ['get', 'name'], ['get', 'name:en']],
        'text-font': ['Noto Sans Regular'],
        'text-letter-spacing': 0.1,
        'text-rotation-alignment': 'map',
        'text-size': ['interpolate', ['linear', 0.75, 1, 0.75, 1], ['zoom'], 10, 8, 16, 10, 24, 14],
        'text-transform': 'none',
        visibility: 'visible',
      },
      paint: {
        'text-color': 'hsl(0, 0%, 100%)',
        'text-halo-color': 'hsl(0, 0%, 17%)',
        'text-halo-width': 1,
      },
      filter: ['all', ['==', '$type', 'LineString'], ['!=', 'class', 'ferry']],
      minzoom: 9.5,
    },
    {
      id: 'Place labels',
      type: 'symbol',
      source: 'maptiler_planet',
      'source-layer': 'place',
      minzoom: 9.5,
      maxzoom: 16,
      layout: {
        'symbol-sort-key': ['to-number', ['get', 'rank']],
        'text-field': ['coalesce', ['get', 'name:vi'], ['get', 'name'], ['get', 'name:en']],
        'text-font': ['Noto Sans Regular'],
        'text-max-width': 10,
        'text-size': ['interpolate', ['linear', 0.5, 1, 0.5, 1], ['zoom'], 3, 9, 6, 10, 8, 12, 10, 14],
        visibility: 'visible',
      },
      paint: {
        'text-color': 'hsl(0, 0%, 100%)',
        'text-halo-blur': 0.5,
        'text-halo-color': 'hsl(0, 0%, 0%)',
        'text-halo-width': 1,
      },
      filter: ['all', ['==', '$type', 'Point'], ['!in', 'class', 'city', 'country', 'province', 'state', 'place']],
    },
    {
      id: 'City labels',
      type: 'symbol',
      source: 'maptiler_planet',
      'source-layer': 'place',
      minzoom: 9.5,
      maxzoom: 16,
      layout: {
        'symbol-sort-key': ['to-number', ['get', 'rank']],
        'text-field': ['coalesce', ['get', 'name:vi'], ['get', 'name'], ['get', 'name:en']],
        'text-font': ['Noto Sans Regular'],
        'text-max-width': 10,
        'text-size': ['interpolate', ['linear', 0.5, 1, 0.5, 1], ['zoom'], 4, 11, 6, 13, 8, 16, 12, 18, 16, 20],
        visibility: 'visible',
      },
      paint: {
        'text-color': 'hsl(0, 0%, 100%)',
        'text-halo-blur': 0.5,
        'text-halo-color': 'hsl(0, 0%, 0%)',
        'text-halo-width': 1,
      },
      filter: ['all', ['==', '$type', 'Point'], ['==', 'class', 'city'], ['!=', 'capital', 2]],
    },
    {
      id: 'State labels',
      type: 'symbol',
      source: 'maptiler_planet',
      'source-layer': 'place',
      minzoom: 9.5,
      maxzoom: 8,
      layout: {
        'symbol-sort-key': ['to-number', ['get', 'rank']],
        'text-field': ['coalesce', ['get', 'name:vi'], ['get', 'name'], ['get', 'name:en']],
        'text-font': ['Noto Sans Italic'],
        'text-letter-spacing': 0.05,
        'text-max-width': 10,
        'text-size': [
          'interpolate',
          ['linear', 0.75, 1],
          ['zoom'],
          3,
          ['step', ['get', 'rank'], 12, 1, 11, 2, 11],
          6,
          ['step', ['get', 'rank'], 13, 1, 12, 2, 12],
          9,
          ['step', ['get', 'rank'], 22, 1, 14, 2, 14],
        ],
        'text-transform': 'none',
        visibility: 'visible',
      },
      paint: {
        'text-color': 'hsl(0, 0%, 90%)',
        'text-halo-blur': 1,
        'text-halo-color': 'hsl(0, 0%, 0%)',
        'text-halo-width': 1,
        'text-opacity': ['step', ['zoom'], 0, 3, ['case', ['<=', ['get', 'rank'], 3], 1, 0], 7, ['case', ['<=', ['get', 'rank'], 3], 0, 1]],
      },
      filter: ['all', ['==', '$type', 'Point'], ['in', 'class', 'state', 'province'], ['<=', 'rank', 6]],
    },
    {
      id: 'Capital city labels',
      type: 'symbol',
      source: 'maptiler_planet',
      'source-layer': 'place',
      minzoom: 9.5,
      maxzoom: 16,
      layout: {
        'symbol-sort-key': ['to-number', ['get', 'rank']],
        'text-anchor': 'center',
        'text-field': ['coalesce', ['get', 'name:vi'], ['get', 'name'], ['get', 'name:en']],
        'text-font': ['Noto Sans Bold'],
        'text-max-width': 8,
        'text-offset': [0.4, 0],
        'text-size': ['interpolate', ['linear'], ['zoom'], 4, 12, 6, 14, 8, 16, 12, 22],
        visibility: 'visible',
      },
      paint: {
        'text-color': 'hsl(0, 0%, 100%)',
        'text-halo-blur': 0.5,
        'text-halo-color': 'hsl(0, 0%, 0%)',
        'text-halo-width': 1,
      },
      filter: ['all', ['==', 'capital', 2], ['==', 'class', 'city']],
    },
    {
      id: 'Country labels',
      type: 'symbol',
      source: 'maptiler_planet',
      'source-layer': 'place',
      minzoom: 9.5,
      maxzoom: 12,
      layout: {
        'symbol-sort-key': ['to-number', ['get', 'rank']],
        'text-field': ['coalesce', ['get', 'name:vi'], ['get', 'name'], ['get', 'name:en']],
        'text-font': ['Noto Sans Bold'],
        'text-max-width': 10,
        'text-size': [
          'interpolate',
          ['linear', 0.75, 1, 0.75, 1],
          ['zoom'],
          1,
          ['step', ['get', 'rank'], 13, 1, 12, 2, 12],
          4,
          ['step', ['get', 'rank'], 15, 1, 14, 2, 14],
          6,
          ['step', ['get', 'rank'], 23, 1, 18, 2, 18],
          9,
          ['step', ['get', 'rank'], 27, 1, 22, 2, 22],
        ],
        visibility: 'visible',
      },
      paint: {
        'text-color': 'hsl(0, 0%, 100%)',
        'text-halo-blur': 1,
        'text-halo-color': 'hsl(0, 0%, 0%)',
        'text-halo-width': 1,
      },
      filter: ['all', ['==', '$type', 'Point'], ['in', 'class', 'country'], ['!=', 'iso_a2', 'VA']],
    },
    {
      id: 'Public',
      type: 'symbol',
      source: 'maptiler_planet',
      'source-layer': 'poi',
      minzoom: 13,
      layout: {
        'icon-image': [
          'case',
          ['in', 'Tòa án', ['get', 'name']],
          'town_hall',
          ['in', 'UBND', ['get', 'name']],
          'landmark',
          ['in', 'Ủy ban', ['get', 'name']],
          'landmark',
          ['in', 'Viện kiểm sát', ['get', 'name']],
          'police',
          ['in', 'Công an', ['get', 'name']],
          'police',
          ['==', ['get', 'class'], 'police'],
          'police',
          ['==', ['get', 'class'], 'fire_station'],
          'fire_station',
          'town_hall',
        ],
        'icon-size': 1.05,
        'symbol-sort-key': ['to-number', ['get', 'rank']],
        'text-anchor': 'top',
        'text-field': ['coalesce', ['get', 'name:vi'], ['get', 'name'], ['get', 'name:en']],
        'text-font': ['Roboto Regular', 'Noto Sans Regular'],
        'text-max-width': 8,
        'text-offset': [0, 0.9],
        'text-optional': false,
        'text-padding': 2,
        'text-size': { stops: [[12, 10], [16, 12], [22, 14]] },
        visibility: 'visible',
        'icon-optional': true,
      },
      paint: {
        'icon-color': [
          'case',
          ['in', 'Tòa án', ['get', 'name']],
          '#f59e0b',
          ['in', 'UBND', ['get', 'name']],
          '#818cf8',
          ['in', 'Ủy ban', ['get', 'name']],
          '#818cf8',
          ['in', 'Viện kiểm sát', ['get', 'name']],
          '#38bdf8',
          ['in', 'Công an', ['get', 'name']],
          '#38bdf8',
          '#818cf8',
        ],
        'icon-halo-blur': ['interpolate', ['linear'], ['zoom'], 12, 1, 14, 0.8, 16, 0],
        'icon-halo-color': '#13223f',
        'icon-halo-width': 2,
        'icon-opacity': 1,
        'text-color': '#ffffff',
        'text-halo-blur': ['interpolate', ['linear'], ['zoom'], 12, 1, 14, 0.5, 16, 0],
        'text-halo-color': '#13223f',
        'text-halo-width': 2.5,
        'text-opacity': 1,
      },
      metadata: {},
      filter: [
        'all',
        ['==', '$type', 'Point'],
        ['in', 'class', 'townhall', 'town_hall', 'courthouse', 'police', 'fire_station'],
        ['has', 'name'],
      ],
    },
    {
      id: 'Education',
      type: 'symbol',
      source: 'maptiler_planet',
      'source-layer': 'poi',
      minzoom: 13,
      layout: {
        'icon-image': 'school',
        'icon-size': 1.05,
        'symbol-sort-key': ['to-number', ['get', 'rank']],
        'text-anchor': 'top',
        'text-field': ['coalesce', ['get', 'name:vi'], ['get', 'name'], ['get', 'name:en']],
        'text-font': ['Roboto Regular', 'Noto Sans Regular'],
        'text-max-width': 8,
        'text-offset': [0, 0.9],
        'text-optional': false,
        'text-padding': 2,
        'text-size': { stops: [[12, 10], [16, 12], [22, 14]] },
        visibility: 'visible',
        'icon-optional': true,
      },
      paint: {
        'icon-color': '#38bdf8',
        'icon-halo-blur': ['interpolate', ['linear'], ['zoom'], 12, 1, 14, 0.8, 16, 0],
        'icon-halo-color': '#13223f',
        'icon-halo-width': 2,
        'icon-opacity': 1,
        'text-color': '#ffffff',
        'text-halo-blur': ['interpolate', ['linear'], ['zoom'], 12, 1, 14, 0.5, 16, 0],
        'text-halo-color': '#13223f',
        'text-halo-width': 2.5,
        'text-opacity': 1,
      },
      metadata: {},
      filter: ['all', ['==', '$type', 'Point'], ['in', 'class', 'school', 'college', 'university'], ['has', 'name']],
    },
    {
      id: 'Healthcare',
      type: 'symbol',
      source: 'maptiler_planet',
      'source-layer': 'poi',
      minzoom: 13,
      layout: {
        'icon-image': 'hospital',
        'icon-size': 1.05,
        'symbol-sort-key': ['to-number', ['get', 'rank']],
        'text-anchor': 'top',
        'text-field': ['coalesce', ['get', 'name:vi'], ['get', 'name'], ['get', 'name:en']],
        'text-font': ['Roboto Regular', 'Noto Sans Regular'],
        'text-max-width': 8,
        'text-offset': [0, 0.9],
        'text-optional': false,
        'text-padding': 2,
        'text-size': { stops: [[12, 10], [16, 12], [22, 14]] },
        visibility: 'visible',
        'icon-optional': true,
      },
      paint: {
        'icon-color': '#f43f5e',
        'icon-halo-blur': ['interpolate', ['linear'], ['zoom'], 12, 1, 14, 0.8, 16, 0],
        'icon-halo-color': '#13223f',
        'icon-halo-width': 2,
        'icon-opacity': 1,
        'text-color': '#ffffff',
        'text-halo-blur': ['interpolate', ['linear'], ['zoom'], 12, 1, 14, 0.5, 16, 0],
        'text-halo-color': '#13223f',
        'text-halo-width': 2.5,
        'text-opacity': 1,
      },
      metadata: {},
      filter: ['all', ['==', '$type', 'Point'], ['==', 'class', 'hospital'], ['has', 'name']],
    },
  ],
}) as unknown as StyleSpecification
