import { describe, it, expect } from 'vitest'
import {
  escapeCsvCell,
  formatDateOnly,
  getExportFilename,
  exportPolesToCsv,
  exportCabinetsToCsv,
  exportFixturesToCsv,
  exportSegmentsToCsv,
  exportFeedersToCsv,
} from '../../utils/assets/assetCsvExporter'
import type { PoleListItem } from '../../types/assets/poles'
import type { CabinetListItem } from '../../types/assets/cabinets'
import type { SegmentListItem } from '../../types/assets/segments'
import type { FeederListItem } from '../../types/assets/feeders'
import type { ManagedFixture } from '../../hooks/assets/useAssetData'

describe('assetCsvExporter', () => {
  describe('escapeCsvCell', () => {
    it('returns empty string for null and undefined', () => {
      expect(escapeCsvCell(null)).toBe('')
      expect(escapeCsvCell(undefined)).toBe('')
    })

    it('returns original string if no special characters are present', () => {
      expect(escapeCsvCell('POLE-001')).toBe('POLE-001')
      expect(escapeCsvCell('Cột số 1')).toBe('Cột số 1')
    })

    it('wraps with quotes when value contains comma', () => {
      expect(escapeCsvCell('Tỉnh Lộ 8, Củ Chi')).toBe('"Tỉnh Lộ 8, Củ Chi"')
    })

    it('escapes internal quotes and wraps with quotes', () => {
      expect(escapeCsvCell('Tủ "A1"')).toBe('"Tủ ""A1"""')
    })

    it('escapes newlines properly', () => {
      expect(escapeCsvCell('Dòng 1\nDòng 2')).toBe('"Dòng 1\nDòng 2"')
    })
  })

  describe('formatDateOnly', () => {
    it('formats ISO date to YYYY-MM-DD', () => {
      expect(formatDateOnly('2026-10-22T08:30:00Z')).toBe('2026-10-22')
      expect(formatDateOnly('2025-01-15')).toBe('2025-01-15')
      expect(formatDateOnly(null)).toBe('')
    })
  })

  describe('getExportFilename', () => {
    it('generates filename with current date and correct prefix', () => {
      const today = new Date().toISOString().split('T')[0]
      expect(getExportFilename('poles')).toBe(`danh-sach-cot-dien_${today}.csv`)
      expect(getExportFilename('cabinets')).toBe(`danh-sach-tu-dien_${today}.csv`)
      expect(getExportFilename('fixtures')).toBe(`danh-sach-bo-den_${today}.csv`)
      expect(getExportFilename('segments')).toBe(`danh-sach-tuyen-duong_${today}.csv`)
      expect(getExportFilename('feeders')).toBe(`danh-sach-tuyen-lo-cap-nguon_${today}.csv`)
    })
  })

  describe('exportCabinetsToCsv', () => {
    it('exports cabinets with Vietnamese names and valid headers', () => {
      const mockCabinets: CabinetListItem[] = [
        {
          cabinet_id: 'CAB-01',
          external_ref: 'CAB-TL8-A',
          cabinet_name: 'Tủ A - Tỉnh Lộ 8, Xã Tân An Hội',
          commune_id: 'COM-001',
          data_source: 'field',
          location: { lng: 106.48948, lat: 10.97008 },
          feeder_ids: [],
          updated_at: null,
        },
      ]

      const csv = exportCabinetsToCsv(mockCabinets)
      const lines = csv.split('\r\n')
      expect(lines[0]).toBe('external_ref,cabinet_name,commune_id,geom_wkt,data_source')
      expect(lines[1]).toContain('CAB-TL8-A')
      expect(lines[1]).toContain('"Tủ A - Tỉnh Lộ 8, Xã Tân An Hội"')
      expect(lines[1]).toContain('COM-001')
      expect(lines[1]).toContain('POINT(106.48948 10.97008)')
      expect(lines[1]).toContain('field')
    })
  })

  describe('exportPolesToCsv', () => {
    it('maps segment and feeder external references correctly', () => {
      const mockPoles: PoleListItem[] = [
        {
          pole_id: 'P-1',
          external_ref: 'POLE-0001',
          segment_id: 'SEG-ID-1',
          feeder_id: 'FDR-ID-1',
          commune_id: 'COM-001',
          data_source: 'field',
          near_sensitive_poi: false,
          location: { lng: 106.489639, lat: 10.970187 },
          updated_at: null,
        },
      ]
      const mockSegments: SegmentListItem[] = [
        {
          segment_id: 'SEG-ID-1',
          external_ref: 'SEG-001',
          segment_name: 'Tuyến Tỉnh Lộ 8',
          road_class: 'inter_commune',
          length_m: 1500,
          commune_id: 'COM-001',
          data_source: 'field',
          pole_count: 10,
          updated_at: null,
        },
      ]
      const mockFeeders: FeederListItem[] = [
        {
          feeder_id: 'FDR-ID-1',
          external_ref: 'FDR-CAB-TL8-A',
          feeder_name: 'Lộ 1 - Tủ A',
          commune_id: 'COM-001',
          has_geometry: false,
          pole_count: 5,
          updated_at: null,
        },
      ]

      const csv = exportPolesToCsv(mockPoles, mockSegments, mockFeeders)
      const lines = csv.split('\r\n')
      expect(lines[0]).toBe(
        'external_ref,segment_external_ref,feeder_external_ref,commune_id,geom_wkt,data_source'
      )
      expect(lines[1]).toBe(
        'POLE-0001,SEG-001,FDR-CAB-TL8-A,COM-001,POINT(106.489639 10.970187),field'
      )
    })
  })

  describe('exportFixturesToCsv', () => {
    it('exports fixtures with correct header and mapped pole reference', () => {
      const mockFixtures: ManagedFixture[] = [
        {
          fixture_id: 'FIX-01',
          pole_id: 'P-1',
          pole_external_ref: 'POLE-0001',
          fixture_type: 'led_road_lamp',
          power_source: 'grid',
          lamp_watt: 120,
          lamp_count: 2,
          install_date: '2024-05-10T00:00:00Z',
          data_source: 'field',
        },
      ]

      const csv = exportFixturesToCsv(mockFixtures)
      const lines = csv.split('\r\n')
      expect(lines[0]).toBe(
        'pole_external_ref,fixture_type,power_source,lamp_watt,lamp_count,install_date,data_source'
      )
      expect(lines[1]).toBe('POLE-0001,led_road_lamp,grid,120,2,2024-05-10,field')
    })
  })

  describe('exportFeedersToCsv', () => {
    it('exports feeders with mapped cabinet external reference', () => {
      const mockCabinets: CabinetListItem[] = [
        {
          cabinet_id: 'CAB-UUID-1',
          external_ref: 'CAB-TL8-A',
          cabinet_name: 'Tủ A',
          commune_id: 'COM-001',
          data_source: 'field',
          location: { lng: 106.48, lat: 10.97 },
          feeder_ids: [],
          updated_at: null,
        },
      ]

      const mockFeeders: FeederListItem[] = [
        {
          feeder_id: 'FDR-1',
          external_ref: 'FDR-CAB-TL8-A',
          feeder_name: 'Lộ 1 - Tỉnh Lộ 8',
          commune_id: 'COM-001',
          has_geometry: false,
          pole_count: 10,
          cabinet: {
            cabinet_id: 'CAB-UUID-1',
            cabinet_name: 'Tủ A',
            location: { lng: 106.48, lat: 10.97 },
            cabinet_source: 'verified',
          },
          updated_at: null,
        },
      ]

      const csv = exportFeedersToCsv(mockFeeders, mockCabinets)
      const lines = csv.split('\r\n')
      expect(lines[0]).toBe('external_ref,feeder_name,commune_id,cabinet_external_ref')
      expect(lines[1]).toBe('FDR-CAB-TL8-A,Lộ 1 - Tỉnh Lộ 8,COM-001,CAB-TL8-A')
    })
  })

  describe('exportSegmentsToCsv', () => {
    it('exports segments with geometry and road class', () => {
      const mockSegments: SegmentListItem[] = [
        {
          segment_id: 'SEG-1',
          external_ref: 'SEG-001',
          segment_name: 'Tuyến A - Tỉnh Lộ 8, Củ Chi',
          road_class: 'inter_commune',
          length_m: 1615,
          commune_id: 'COM-001',
          data_source: 'field',
          pole_count: 20,
          updated_at: null,
        },
      ]

      const mockMapSegments = [
        {
          properties: { segment_id: 'SEG-1' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [106.48951, 10.970115],
              [106.489639, 10.970187],
            ],
          },
        },
      ]

      const csv = exportSegmentsToCsv(mockSegments, mockMapSegments)
      const lines = csv.split('\r\n')
      expect(lines[0]).toBe(
        'external_ref,segment_name,road_class,length_m,geom_wkt,commune_id,data_source'
      )
      expect(lines[1]).toContain('SEG-001')
      expect(lines[1]).toContain('"Tuyến A - Tỉnh Lộ 8, Củ Chi"')
      expect(lines[1]).toContain('LINESTRING(106.48951 10.970115, 106.489639 10.970187)')
    })
  })
})
