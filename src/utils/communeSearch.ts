import type { Geometry } from '../types/common/base'

export interface CommuneSuggestion {
  name: string
  fullName: string
  lng: number
  lat: number
  /** Ranh giới Polygon/MultiPolygon do OSM trả về; null khi OSM chỉ có điểm. */
  geometry: Geometry | null
}

const removeVietnameseTones = (str: string) =>
  str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()

const VALID_CLASSES = new Set(['boundary', 'place'])
const VALID_ADMIN_TYPES = new Set([
  'suburb',
  'village',
  'town',
  'quarter',
  'commune',
  'municipality',
  'administrative',
  'neighbourhood',
])
const EXCLUDED_POI_PATTERN =
  /\b(uy ban|ubnd|tru so|dang uy|hdnd|hoi dong nhan dan|mttq|cong an|tram y te|benh vien|truong|cho|nha van hoa|buu dien|chua|nha tho|dinh|duong|hem|ngo|cau|khu cong nghiep|cong ty|chi nhanh|cua hang|khach san|ngan hang|so nha)\b/i

const isAreaGeometry = (g: unknown): g is Geometry => {
  const type = (g as { type?: unknown } | null)?.type
  return type === 'Polygon' || type === 'MultiPolygon'
}

/**
 * Chuyển kết quả thô của Nominatim thành gợi ý xã/phường/thị trấn: bỏ POI, cấp tỉnh/huyện, trùng lặp.
 */
export const parseCommuneSuggestions = (data: unknown, limit = 8): CommuneSuggestion[] => {
  if (!Array.isArray(data)) return []
  const seen = new Set<string>()
  const result: CommuneSuggestion[] = []

  for (const rawItem of data) {
    const item = rawItem as Record<string, unknown>
    const itemClass = String(item.class || item.category || '').toLowerCase()
    const addrType = String(item.addresstype || item.type || '').toLowerCase()
    if (!VALID_CLASSES.has(itemClass) || !VALID_ADMIN_TYPES.has(addrType)) continue

    const rawParts = String(item.display_name || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    const firstPart = String(item.name || rawParts[0] || '').trim()
    if (!firstPart) continue

    const normalizedFirst = removeVietnameseTones(firstPart)
    if (EXCLUDED_POI_PATTERN.test(normalizedFirst)) continue
    if (
      /^(tinh|thanh pho|quan|huyen|thi xa)\b/i.test(normalizedFirst) &&
      !/^(xa|phuong|thi tran)\b/i.test(normalizedFirst)
    ) {
      continue
    }

    const cleanParts: string[] = []
    for (const part of rawParts) {
      const norm = removeVietnameseTones(part)
      if (/^\d{4,6}$/.test(part)) continue
      if (/^\d+[a-z]?(\/\d+)*$/i.test(part)) continue
      if (norm === 'viet nam' || norm === 'vietnam') continue
      if (EXCLUDED_POI_PATTERN.test(norm)) continue
      if (cleanParts.length === 0 || removeVietnameseTones(cleanParts[cleanParts.length - 1]) !== norm) {
        cleanParts.push(part)
      }
    }

    const name = cleanParts[0] || firstPart
    const fullName = cleanParts.length > 0 ? cleanParts.join(', ') : name

    const lng = parseFloat(String(item.lon))
    const lat = parseFloat(String(item.lat))
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue

    const key = removeVietnameseTones(fullName)
    if (seen.has(key)) continue
    seen.add(key)

    result.push({ name, fullName, lng, lat, geometry: isAreaGeometry(item.geojson) ? item.geojson : null })
    if (result.length >= limit) break
  }
  return result
}

/** Tìm xã/phường/thị trấn kèm ranh giới (OpenStreetMap Nominatim, Việt Nam). */
export const searchCommuneSuggestions = async (query: string): Promise<CommuneSuggestion[]> => {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&featureType=settlement' +
    '&countrycodes=vn&dedupe=1&limit=20&polygon_geojson=1&polygon_threshold=0.0002' +
    `&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { 'Accept-Language': 'vi' } })
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  return parseCommuneSuggestions(await res.json())
}
