import type { PoleFeature, SegmentInfo } from '../../pages/gis-map/GisMapPage'

export type SearchCategory = 'segment' | 'cabinet' | 'pole'

export interface SearchResultItem {
  id: string
  title: string
  subtitle: string
  category: SearchCategory
  coordinates?: [number, number]
  data?: any
  badgeText?: string
  badgeColorClass?: string
  statusDotColor?: string
  atlasNote?: string
}

interface SearchOptions {
  query: string
  segmentsList: SegmentInfo[]
  cabinets: any[]
  poles: PoleFeature[]
  maxResults?: number
}

/**
 * Tìm kiếm đa danh mục thông minh phục vụ bản đồ GIS:
 * - Tuyến đường (tên, mã phân đoạn)
 * - Tủ điện (mã tủ, tên tủ, và Ghi chú Atlas vị trí thực tế)
 * - Cột đèn (mã cột, phân đoạn, và Ghi chú Atlas vị trí thực tế)
 */
export function searchAllCategories({
  query,
  segmentsList,
  cabinets,
  poles,
  maxResults = 12,
}: SearchOptions): SearchResultItem[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []

  const results: SearchResultItem[] = []

  // 1. Tuyến đường (Segments / Routes)
  segmentsList.forEach((s) => {
    const nameMatch = s.name.toLowerCase().includes(trimmed)
    const idMatch = s.id.toLowerCase().includes(trimmed)
    const roadMatch = (s.road || '').toLowerCase().includes(trimmed)

    if (nameMatch || idMatch || roadMatch) {
      results.push({
        id: s.id,
        title: s.name,
        subtitle: `${s.poleCount} cột đèn • ${s.lengthM}m • Tủ ${s.cabinet}`,
        category: 'segment',
        data: s,
        badgeText: 'Tuyến đường',
        badgeColorClass: 'bg-blue-50 text-blue-800 border-blue-200',
        statusDotColor: s.hasActiveSegmentFault ? 'bg-rose-500' : 'bg-emerald-500',
      })
    }
  })

  // 2. Tủ điện (Cabinets / Controllers) - Khớp mã, tên, và ghi chú Atlas thực địa
  cabinets.forEach((cab) => {
    const p = (cab.properties || {}) as any
    const isRoot = p.role === 'root_cabinet'
    const name = p.cabinet_name || ''
    const code = p.cabinet_code || ''
    const id = p.cabinet_id || ''
    const atlas = p.atlas || p.landmark_note || ''

    const nameMatch = name.toLowerCase().includes(trimmed)
    const codeMatch = code.toLowerCase().includes(trimmed)
    const idMatch = id.toLowerCase().includes(trimmed)
    const atlasMatch = atlas.toLowerCase().includes(trimmed)

    if (nameMatch || codeMatch || idMatch || atlasMatch) {
      const coords = cab.geometry?.coordinates as [number, number] | undefined
      const isFault = p.status === 'fault'

      results.push({
        id: id || code,
        title: name || code || id,
        subtitle: atlas || `${isRoot ? 'Tủ đỉnh nguồn' : 'Tủ nhánh phân đoạn'}`,
        category: 'cabinet',
        coordinates: coords,
        data: cab,
        atlasNote: atlas,
        badgeText: 'Tủ điện',
        badgeColorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        statusDotColor: isFault ? 'bg-rose-500' : 'bg-emerald-500',
      })
    }
  })

  // 3. Cột đèn (Poles) - Khớp mã cột, phân đoạn, và Ghi chú Atlas
  poles.forEach((f: PoleFeature) => {
    const p = (f.properties || {}) as any
    const id = p.pole_id || ''
    const seg = p.segment_id || ''
    const status = p.fixture_status || 'normal'
    const atlas = p.atlas || p.atlas_note || ''

    const idMatch = id.toLowerCase().includes(trimmed)
    const segMatch = seg.toLowerCase().includes(trimmed)
    const atlasMatch = atlas.toLowerCase().includes(trimmed)

    if (idMatch || segMatch || atlasMatch) {
      const dotColor =
        status === 'normal'
          ? 'bg-emerald-500'
          : status === 'dim'
          ? 'bg-amber-500'
          : status === 'out'
          ? 'bg-rose-500'
          : 'bg-slate-400'

      results.push({
        id: id,
        title: id,
        subtitle: atlas || seg,
        category: 'pole',
        coordinates: f.geometry.coordinates as [number, number],
        data: f,
        atlasNote: atlas,
        badgeText: 'Cột đèn',
        badgeColorClass: 'bg-slate-50 text-slate-700 border-slate-200',
        statusDotColor: dotColor,
      })
    }
  })

  return results.slice(0, maxResults)
}
