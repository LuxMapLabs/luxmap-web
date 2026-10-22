import type { PoleListItem } from '../../types/assets/poles'
import type { CabinetListItem } from '../../types/assets/cabinets'
import type { SegmentListItem } from '../../types/assets/segments'
import type { FeederListItem } from '../../types/assets/feeders'
import type { ManagedFixture } from '../../hooks/assets/useAssetData'

/**
 * Escapes a cell value according to RFC 4180 rules.
 * Wraps values with double quotes if they contain commas, double quotes, or newlines.
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Downloads a string content as a CSV file with UTF-8 BOM (\uFEFF)
 * to ensure Microsoft Excel on Windows renders Vietnamese characters properly.
 */
export function downloadCsvWithBom(filename: string, csvContent: string): void {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Formats a date string into YYYY-MM-DD
 */
export function formatDateOnly(dateStr?: string | null): string {
  if (!dateStr) return ''
  return dateStr.split('T')[0] || ''
}

/**
 * Generates an export filename with timestamp:
 * e.g., danh-sach-cot-dien_2026-10-22.csv
 */
export function getExportFilename(category: string): string {
  const dateStr = new Date().toISOString().split('T')[0]
  const prefixMap: Record<string, string> = {
    poles: 'danh-sach-cot-dien',
    fixtures: 'danh-sach-bo-den',
    cabinets: 'danh-sach-tu-dien',
    segments: 'danh-sach-tuyen-duong',
    feeders: 'danh-sach-tuyen-lo-cap-nguon',
  }
  const prefix = prefixMap[category] || `danh-sach-${category}`
  return `${prefix}_${dateStr}.csv`
}

/**
 * Export Poles to CSV string (Header matching public/templates/poles.csv)
 */
export function exportPolesToCsv(
  poles: PoleListItem[],
  segments: SegmentListItem[] = [],
  feeders: FeederListItem[] = []
): string {
  const headers = [
    'external_ref',
    'segment_external_ref',
    'feeder_external_ref',
    'commune_id',
    'geom_wkt',
    'data_source',
  ]

  const rows = poles.map((pole) => {
    const extRef = pole.external_ref || pole.pole_id || ''
    const seg = segments.find((s) => s.segment_id === pole.segment_id)
    const segRef = seg?.external_ref || pole.segment_id || ''
    const fdr = feeders.find((f) => f.feeder_id === pole.feeder_id)
    const fdrRef = fdr?.external_ref || pole.feeder_id || ''
    const communeId = pole.commune_id || ''
    const geomWkt = pole.location
      ? `POINT(${pole.location.lng} ${pole.location.lat})`
      : ''
    const dataSource = pole.data_source || 'field'

    return [
      escapeCsvCell(extRef),
      escapeCsvCell(segRef),
      escapeCsvCell(fdrRef),
      escapeCsvCell(communeId),
      escapeCsvCell(geomWkt),
      escapeCsvCell(dataSource),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\r\n')
}

/**
 * Export Cabinets to CSV string (Header matching public/templates/cabinets.csv)
 */
export function exportCabinetsToCsv(cabinets: CabinetListItem[]): string {
  const headers = ['external_ref', 'cabinet_name', 'commune_id', 'geom_wkt', 'data_source']

  const rows = cabinets.map((cab) => {
    const extRef = cab.external_ref || cab.cabinet_id || ''
    const name = cab.cabinet_name || ''
    const communeId = cab.commune_id || ''
    const geomWkt = cab.location ? `POINT(${cab.location.lng} ${cab.location.lat})` : ''
    const dataSource = cab.data_source || 'field'

    return [
      escapeCsvCell(extRef),
      escapeCsvCell(name),
      escapeCsvCell(communeId),
      escapeCsvCell(geomWkt),
      escapeCsvCell(dataSource),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\r\n')
}

/**
 * Export Fixtures to CSV string (Header matching public/templates/fixtures.csv)
 */
export function exportFixturesToCsv(
  fixtures: ManagedFixture[],
  poles: PoleListItem[] = []
): string {
  const headers = [
    'pole_external_ref',
    'fixture_type',
    'power_source',
    'lamp_watt',
    'lamp_count',
    'install_date',
    'data_source',
  ]

  const rows = fixtures.map((fix) => {
    let poleRef = fix.pole_external_ref || ''
    if (!poleRef && fix.pole_id) {
      const p = poles.find((pole) => pole.pole_id === fix.pole_id)
      poleRef = p?.external_ref || fix.pole_id || ''
    }

    const type = fix.fixture_type || 'led_road_lamp'
    const power = fix.power_source || 'grid'
    const watt = fix.lamp_watt ?? 100
    const count = fix.lamp_count ?? 1
    const installDate = formatDateOnly(fix.install_date)
    const dataSource = fix.data_source || 'field'

    return [
      escapeCsvCell(poleRef),
      escapeCsvCell(type),
      escapeCsvCell(power),
      escapeCsvCell(watt),
      escapeCsvCell(count),
      escapeCsvCell(installDate),
      escapeCsvCell(dataSource),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\r\n')
}

/**
 * Export Segments to CSV string (Header matching public/templates/segments.csv)
 */
export function exportSegmentsToCsv(
  segments: SegmentListItem[],
  mapSegments: Array<{ properties?: { segment_id?: string }; geometry?: { type: string; coordinates: any[] } }> = []
): string {
  const headers = [
    'external_ref',
    'segment_name',
    'road_class',
    'length_m',
    'geom_wkt',
    'commune_id',
    'data_source',
  ]

  const rows = segments.map((seg) => {
    const extRef = seg.external_ref || seg.segment_id || ''
    const name = seg.segment_name || ''
    const roadClass = seg.road_class || 'inter_commune'
    const lengthM = seg.length_m || 0
    const communeId = seg.commune_id || ''
    const dataSource = seg.data_source || 'field'

    // Extract geom_wkt if existing, or from mapSegments LineString coordinates
    let geomWkt = (seg as unknown as { geom_wkt?: string }).geom_wkt || ''
    if (!geomWkt && mapSegments && mapSegments.length > 0) {
      const matchFeat = mapSegments.find(
        (f) => f.properties?.segment_id === seg.segment_id
      )
      if (
        matchFeat?.geometry?.type === 'LineString' &&
        Array.isArray(matchFeat.geometry.coordinates)
      ) {
        const coordList = matchFeat.geometry.coordinates
          .map((c) => `${c[0]} ${c[1]}`)
          .join(', ')
        geomWkt = `LINESTRING(${coordList})`
      }
    }

    return [
      escapeCsvCell(extRef),
      escapeCsvCell(name),
      escapeCsvCell(roadClass),
      escapeCsvCell(lengthM),
      escapeCsvCell(geomWkt),
      escapeCsvCell(communeId),
      escapeCsvCell(dataSource),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\r\n')
}

/**
 * Export Feeders to CSV string (Header matching public/templates/feeders.csv)
 */
export function exportFeedersToCsv(
  feeders: FeederListItem[],
  cabinets: CabinetListItem[] = []
): string {
  const headers = ['external_ref', 'feeder_name', 'commune_id', 'cabinet_external_ref']

  const rows = feeders.map((fdr) => {
    const extRef = fdr.external_ref || fdr.feeder_id || ''
    const name = fdr.feeder_name || ''
    const communeId = fdr.commune_id || ''

    let cabRef = ''
    if (fdr.cabinet?.cabinet_id) {
      const cab = cabinets.find((c) => c.cabinet_id === fdr.cabinet?.cabinet_id)
      cabRef = cab?.external_ref || fdr.cabinet.cabinet_id
    }

    return [
      escapeCsvCell(extRef),
      escapeCsvCell(name),
      escapeCsvCell(communeId),
      escapeCsvCell(cabRef),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\r\n')
}
