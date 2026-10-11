import { z } from 'zod'
import type { RoadClass, DataSource, FixtureType, PowerSource } from '../types/common/enums'
import type { PoleListItem, CreatePoleRequest } from '../types/assets/poles'
import type { CabinetListItem, CreateCabinetRequest } from '../types/assets/cabinets'
import type { SegmentListItem, CreateSegmentRequest } from '../types/assets/segments'
import type { CreateFixtureRequest } from '../types/assets/fixtures'
import type { ManagedFixture } from '../hooks/assets/useAssetData'
import { formatCommuneDisplayName } from '../constants/communes'

/**
 * Interface cho các trường thay đổi khi so khớp bản ghi
 */
export interface FieldDiff {
  label: string
  oldVal: string
  newVal: string
}

/**
 * UI State thuần túy cho một dòng đối soát dữ liệu nạp
 */
export interface ItemReview<C extends 'segments' | 'cabinets' | 'fixtures' | 'poles' | 'poles_and_fixtures', T> {
  category: C
  externalRef: string
  actionType: 'new' | 'updated' | 'unchanged' | 'invalid'
  errorMsg?: string
  diffs: FieldDiff[]
  data: T
  fixtureData?: CreateFixtureRequest
}

export type SegmentItemReview = ItemReview<'segments', CreateSegmentRequest>
export type CabinetItemReview = ItemReview<'cabinets', CreateCabinetRequest>
export type FixtureItemReview = ItemReview<'fixtures', CreateFixtureRequest>
export type PoleItemReview = ItemReview<'poles' | 'poles_and_fixtures', CreatePoleRequest>

/**
 * Kiểu đối tượng review - sử dụng trực tiếp các DTO Backend thông qua ItemReview<T>
 */
export type ParsedItemReview =
  | SegmentItemReview
  | CabinetItemReview
  | FixtureItemReview
  | PoleItemReview

/**
 * Ngữ cảnh dữ liệu GIS đang có trong hệ thống để đối soát ràng buộc quan hệ
 */
export interface ValidationContext {
  poles: PoleListItem[]
  fixtures: ManagedFixture[]
  cabinets: CabinetListItem[]
  segments: SegmentListItem[]
}

// ==========================================
// 1. ZOD SCHEMAS FOR INDIVIDUAL CSV FORMATS
// ==========================================

export const segmentImportSchema = z.object({
  external_ref: z.string().min(1, 'Mã tuyến đường (external_ref) không được để trống'),
  commune_id: z.string().min(1, 'Mã xã/phường (commune_id) không được để trống'),
  segment_name: z.string().min(1, 'Tên tuyến đường (segment_name) không được để trống'),
  road_class: z.enum(['inter_commune', 'inter_village'] as const satisfies readonly [RoadClass, ...RoadClass[]], {
    message: 'Cấp đường (road_class) phải là inter_commune hoặc inter_village',
  }),
  length_m: z.coerce.number().positive('Chiều dài tuyến đường (length_m) phải lớn hơn 0'),
  data_source: z
    .enum(['field', 'public_imagery', 'calibration_rig', 'simulated'] as const satisfies readonly [
      DataSource,
      ...DataSource[],
    ])
    .default('field'),
  geom_wkt: z.string().refine((val) => /^LINESTRING\s*\(/i.test(val.trim()), {
    message: 'Tọa độ tuyến đường phải là định dạng LINESTRING WKT hợp lệ',
  }),
})

export const cabinetImportSchema = z
  .object({
    external_ref: z.string().min(1, 'Mã tủ điện (external_ref) không được để trống'),
    commune_id: z.string().min(1, 'Mã xã/phường (commune_id) không được để trống'),
    cabinet_name: z.string().optional().nullable(),
    feeder_name: z.string().optional().nullable(),
    geom_wkt: z
      .string()
      .min(1, 'Tọa độ tủ điện (geom_wkt) không được để trống')
      .refine(
        (val) => /^LINESTRING\s*\(|^POINT\s*\(/i.test(val.trim()),
        {
          message:
            'Tọa độ tủ điện phải là định dạng WKT hợp lệ (Ví dụ: POINT(lng lat) hoặc LINESTRING(lng1 lat1, lng2 lat2))',
        }
      ),
    data_source: z
      .enum(['field', 'public_imagery', 'calibration_rig', 'simulated'] as const satisfies readonly [
        DataSource,
        ...DataSource[],
      ])
      .default('field'),
  })
  .refine(
    (val) => Boolean((val.cabinet_name && val.cabinet_name.trim()) || (val.feeder_name && val.feeder_name.trim())),
    {
      message: 'Tên tủ điện (cabinet_name) không được để trống',
      path: ['cabinet_name'],
    }
  )

export const poleImportSchema = z.object({
  external_ref: z.string().min(1, 'Mã cột điện (external_ref) không được để trống'),
  commune_id: z.string().min(1, 'Mã xã/phường (commune_id) không được để trống'),
  segment_external_ref: z.string().min(1, 'Mã tuyến đường liên kết (segment_external_ref) không được để trống'),
  feeder_external_ref: z.string().optional().nullable(),
  geom_wkt: z.string().refine((val) => /^POINT\s*\(\s*([0-9.-]+)\s+([0-9.-]+)\s*\)/i.test(val.trim()), {
    message: 'Tọa độ cột điện phải là POINT(lng lat) WKT hợp lệ',
  }),
  near_sensitive_poi: z.preprocess((val) => {
    if (typeof val === 'string') return val.toLowerCase() === 'true'
    return Boolean(val)
  }, z.boolean()).default(false),
  data_source: z
    .enum(['field', 'public_imagery', 'calibration_rig', 'simulated'] as const satisfies readonly [
      DataSource,
      ...DataSource[],
    ])
    .default('field'),
  fixture_type: z
    .enum(['led_road_lamp'] as const satisfies readonly [FixtureType, ...FixtureType[]])
    .optional(),
  power_source: z
    .enum(['grid'] as const satisfies readonly [PowerSource, ...PowerSource[]])
    .optional(),
  lamp_watt: z.coerce.number().positive().optional(),
  warranty_expiry: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().optional().nullable()
  ),
  note: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().max(1000, 'Ghi chú không được vượt quá 1000 ký tự').optional().nullable()
  ),
})

export const fixtureImportSchema = z.object({
  pole_external_ref: z.string().min(1, 'Mã cột điện (pole_external_ref) không được để trống'),
  fixture_type: z
    .enum(['led_road_lamp'] as const satisfies readonly [FixtureType, ...FixtureType[]])
    .default('led_road_lamp'),
  power_source: z
    .enum(['grid'] as const satisfies readonly [PowerSource, ...PowerSource[]])
    .default('grid'),
  lamp_watt: z.coerce.number().positive('Công suất đèn (lamp_watt) phải lớn hơn 0'),
  install_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày lắp đặt phải theo định dạng YYYY-MM-DD'),
  removed_date: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày tháo dỡ phải theo định dạng YYYY-MM-DD')
      .optional()
      .nullable()
  ),
  warranty_expiry: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Hạn bảo hành phải theo định dạng YYYY-MM-DD')
      .optional()
      .nullable()
  ),
  data_source: z
    .enum(['field', 'public_imagery', 'calibration_rig', 'simulated'] as const satisfies readonly [
      DataSource,
      ...DataSource[],
    ])
    .default('field'),
})

// ==========================================
// 2. HELPER COORDINATE PARSERS
// ==========================================

function extractPointCoords(wkt: string | null | undefined, defaultLat = 10.970187, defaultLng = 106.489639) {
  if (!wkt) return { lat: defaultLat, lng: defaultLng }
  const match = wkt.match(/POINT\s*\(\s*([0-9.-]+)\s+([0-9.-]+)\s*\)/i)
  if (match) {
    return {
      lng: parseFloat(match[1]) || defaultLng,
      lat: parseFloat(match[2]) || defaultLat,
    }
  }
  return { lat: defaultLat, lng: defaultLng }
}

function extractLineFirstPointCoords(wkt: string | null | undefined, defaultLat = 10.970187, defaultLng = 106.489639) {
  if (!wkt) return { lat: defaultLat, lng: defaultLng }
  const match = wkt.match(/LINESTRING\s*\(\s*([0-9.-]+)\s+([0-9.-]+)/i)
  if (match) {
    return {
      lng: parseFloat(match[1]) || defaultLng,
      lat: parseFloat(match[2]) || defaultLat,
    }
  }
  return { lat: defaultLat, lng: defaultLng }
}

// ==========================================
// 3. MASTER VALIDATOR & CONSTRAINT CHECKER
// ==========================================

export const REQUIRED_COLUMNS_BY_CATEGORY: Record<string, { key: string; label: string }[]> = {
  segments: [
    { key: 'external_ref', label: 'external_ref' },
    { key: 'segment_name', label: 'segment_name' },
    { key: 'road_class', label: 'road_class' },
    { key: 'length_m', label: 'length_m' },
    { key: 'geom_wkt', label: 'geom_wkt' },
    { key: 'commune_id', label: 'commune_id' },
    { key: 'data_source', label: 'data_source' },
  ],
  cabinets: [
    { key: 'external_ref', label: 'external_ref' },
    { key: 'cabinet_name', label: 'cabinet_name' },
    { key: 'commune_id', label: 'commune_id' },
    { key: 'geom_wkt', label: 'geom_wkt' },
    { key: 'data_source', label: 'data_source' },
  ],
  poles: [
    { key: 'external_ref', label: 'external_ref' },
    { key: 'segment_external_ref', label: 'segment_external_ref' },
    { key: 'commune_id', label: 'commune_id' },
    { key: 'geom_wkt', label: 'geom_wkt' },
    { key: 'data_source', label: 'data_source' },
  ],
  poles_and_fixtures: [
    { key: 'external_ref', label: 'external_ref' },
    { key: 'segment_external_ref', label: 'segment_external_ref' },
    { key: 'commune_id', label: 'commune_id' },
    { key: 'geom_wkt', label: 'geom_wkt' },
    { key: 'data_source', label: 'data_source' },
  ],
  fixtures: [
    { key: 'pole_external_ref', label: 'pole_external_ref' },
    { key: 'fixture_type', label: 'fixture_type' },
    { key: 'power_source', label: 'power_source' },
    { key: 'lamp_watt', label: 'lamp_watt' },
    { key: 'install_date', label: 'install_date' },
    { key: 'data_source', label: 'data_source' },
  ],
}

/**
 * Validate một dòng dữ liệu CSV tùy theo category, kiểm tra Schema + Ràng buộc quan hệ GIS
 */
export function validateImportRow(
  category: 'segments' | 'cabinets' | 'poles' | 'fixtures' | 'poles_and_fixtures',
  rowObj: Record<string, string>,
  context: ValidationContext,
  rowIndex: number
): ParsedItemReview {
  const { segments, cabinets, poles } = context

  // 0. KIỂM TRA TÍNH TOÀN VẸN 100%: Mọi cột bắt buộc không được để trống bất kỳ ô nào
  const requiredCols = REQUIRED_COLUMNS_BY_CATEGORY[category] || []
  for (const col of requiredCols) {
    if (category === 'cabinets' && col.key === 'cabinet_name') {
      const cabName = rowObj['cabinet_name'] || rowObj['feeder_name']
      if (!cabName || cabName.trim() === '') {
        return {
          category: 'cabinets',
          externalRef: rowObj.external_ref || `CAB-ROW-${rowIndex + 1}`,
          actionType: 'invalid',
          errorMsg: `Dòng ${rowIndex + 1}: Cột 'cabinet_name' không có dữ liệu (bắt buộc điền đầy đủ).`,
          data: {
            external_ref: rowObj.external_ref || null,
            cabinet_name: null,
            commune_id: rowObj.commune_id || null,
            geom_wkt: rowObj.geom_wkt || null,
            data_source: (rowObj.data_source as DataSource) || 'field',
          },
          diffs: [],
        }
      }
      continue
    }

    const val = rowObj[col.key]
    if (val === undefined || val === null || val.trim() === '') {
      return {
        category: category as any,
        externalRef: rowObj.external_ref || rowObj.pole_external_ref || `ROW-${rowIndex + 1}`,
        actionType: 'invalid',
        errorMsg: `Dòng ${rowIndex + 1}: Cột '${col.label}' không có dữ liệu (bắt buộc điền đầy đủ).`,
        data: {} as any,
        diffs: [],
      }
    }
  }

  // ----------------------------------------------------
  // CASE A: SEGMENTS (Tuyến đường chiếu sáng) - ROOT ENTITY
  // Không có ràng buộc phụ thuộc cha!
  // ----------------------------------------------------
  if (category === 'segments') {
    const parseResult = segmentImportSchema.safeParse(rowObj)
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Lỗi định dạng dữ liệu tuyến đường'
      return {
        category: 'segments',
        externalRef: rowObj.external_ref || `SEG-ROW-${rowIndex + 1}`,
        actionType: 'invalid',
        errorMsg: firstError,
        data: {
          external_ref: rowObj.external_ref || null,
          segment_name: rowObj.segment_name || null,
          road_class: (rowObj.road_class as RoadClass) || 'inter_commune',
          length_m: parseFloat(rowObj.length_m) || 0,
          geom_wkt: rowObj.geom_wkt || null,
          commune_id: rowObj.commune_id || null,
          data_source: (rowObj.data_source as DataSource) || 'field',
        },
        diffs: [],
      }
    }

    const data = parseResult.data
    extractLineFirstPointCoords(data.geom_wkt)

    // So khớp xem tuyến đường đã tồn tại trong GIS chưa (Chỉ tìm duy nhất theo external_ref chuẩn Backend)
    const existing = segments.find(
      (s) => s.external_ref && s.external_ref.toLowerCase() === data.external_ref.toLowerCase()
    )

    let actionType: 'new' | 'updated' | 'unchanged' = 'new'
    const diffs: FieldDiff[] = []

    if (!existing) {
      actionType = 'new'
      diffs.push({
        label: 'Tuyến đường mới',
        oldVal: 'Chưa có trên GIS',
        newVal: `${data.segment_name} (${data.length_m}m)`,
      })
    } else {
      if (existing.segment_name !== data.segment_name) {
        diffs.push({
          label: 'Tên tuyến đường',
          oldVal: existing.segment_name || 'Chưa đặt tên',
          newVal: data.segment_name,
        })
      }
      if (existing.road_class !== data.road_class) {
        diffs.push({
          label: 'Cấp đường',
          oldVal: existing.road_class === 'inter_commune' ? 'Đường liên xã' : 'Đường liên thôn',
          newVal: data.road_class === 'inter_commune' ? 'Đường liên xã' : 'Đường liên thôn',
        })
      }
      if (existing.length_m !== data.length_m) {
        diffs.push({
          label: 'Chiều dài',
          oldVal: `${existing.length_m}m`,
          newVal: `${data.length_m}m`,
        })
      }
      if (data.commune_id && existing.commune_id !== data.commune_id) {
        diffs.push({
          label: 'Xã/phường',
          oldVal: formatCommuneDisplayName(existing.commune_id),
          newVal: formatCommuneDisplayName(data.commune_id),
        })
      }

      actionType = diffs.length > 0 ? 'updated' : 'unchanged'
    }

    const segmentDto: CreateSegmentRequest = {
      external_ref: data.external_ref,
      segment_name: data.segment_name,
      road_class: data.road_class,
      length_m: data.length_m,
      geom_wkt: data.geom_wkt,
      commune_id: data.commune_id,
      data_source: data.data_source,
    }

    return {
      category: 'segments',
      externalRef: data.external_ref,
      actionType,
      data: segmentDto,
      diffs,
    }
  }

  // ----------------------------------------------------
  // CASE B: CABINETS (Tủ điện) - ROOT ENTITY
  // Không có ràng buộc phụ thuộc cha!
  // ----------------------------------------------------
  if (category === 'cabinets') {
    const parseResult = cabinetImportSchema.safeParse(rowObj)
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Lỗi định dạng dữ liệu tủ điện'
      return {
        category: 'cabinets',
        externalRef: rowObj.external_ref || `CAB-ROW-${rowIndex + 1}`,
        actionType: 'invalid',
        errorMsg: firstError,
        data: {
          external_ref: rowObj.external_ref || null,
          cabinet_name: rowObj.cabinet_name || rowObj.feeder_name || null,
          commune_id: rowObj.commune_id || null,
          geom_wkt: rowObj.geom_wkt || null,
          data_source: (rowObj.data_source as DataSource) || 'field',
        },
        diffs: [],
      }
    }

    const data = parseResult.data
    const cabinetDisplayName = data.cabinet_name?.trim() || data.feeder_name?.trim() || 'Tủ điện'
    const isPoint = /^POINT\s*\(/i.test(data.geom_wkt || '')
    const { lat, lng } = isPoint
      ? extractPointCoords(data.geom_wkt)
      : extractLineFirstPointCoords(data.geom_wkt)

    // So khớp xem tủ đã tồn tại trong GIS chưa (Chỉ tìm duy nhất theo external_ref chuẩn Backend)
    const existing = cabinets.find(
      (c) => c.external_ref && c.external_ref.toLowerCase() === data.external_ref.toLowerCase()
    )

    let actionType: 'new' | 'updated' | 'unchanged' = 'new'
    const diffs: FieldDiff[] = []

    if (!existing) {
      actionType = 'new'
      diffs.push({
        label: 'Tủ điện mới',
        oldVal: 'Chưa có trên GIS',
        newVal: `${cabinetDisplayName} (${formatCommuneDisplayName(data.commune_id)})`,
      })
    } else {
      if (existing.cabinet_name !== cabinetDisplayName) {
        diffs.push({
          label: 'Tên tủ điện',
          oldVal: existing.cabinet_name || 'Chưa đặt tên',
          newVal: cabinetDisplayName,
        })
      }
      if (data.commune_id && existing.commune_id !== data.commune_id) {
        diffs.push({
          label: 'Xã/phường',
          oldVal: formatCommuneDisplayName(existing.commune_id),
          newVal: formatCommuneDisplayName(data.commune_id),
        })
      }
      if (!existing.location?.lat && !existing.location?.lng && data.geom_wkt) {
        diffs.push({
          label: 'Tọa độ GIS',
          oldVal: 'Chưa định vị',
          newVal: `Định vị tọa độ (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        })
      }

      actionType = diffs.length > 0 ? 'updated' : 'unchanged'
    }

    const cabinetDto: CreateCabinetRequest = {
      external_ref: data.external_ref,
      cabinet_name: cabinetDisplayName,
      commune_id: data.commune_id,
      geom_wkt: data.geom_wkt || null,
      data_source: (rowObj.data_source as DataSource) || 'field',
    }

    return {
      category: 'cabinets',
      externalRef: data.external_ref,
      actionType,
      data: cabinetDto,
      diffs,
    }
  }

  // ----------------------------------------------------
  // CASE C: FIXTURES (Bóng đèn)
  // Ràng buộc bắt buộc: Cột điện (pole_external_ref) phải có trên GIS!
  // ----------------------------------------------------
  if (category === 'fixtures') {
    const parseResult = fixtureImportSchema.safeParse(rowObj)
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Lỗi định dạng dữ liệu bóng đèn'
      const poleRef = rowObj.pole_external_ref || ''
      const pPole = poleRef
        ? poles.find((p) => p.external_ref && p.external_ref.toLowerCase() === poleRef.toLowerCase())
        : undefined
      return {
        category: 'fixtures',
        externalRef: poleRef || `FIX-ROW-${rowIndex + 1}`,
        actionType: 'invalid',
        errorMsg: firstError,
        data: {
          pole_id: pPole?.pole_id || null,
          fixture_type: (rowObj.fixture_type as FixtureType) || 'led_road_lamp',
          power_source: (rowObj.power_source as PowerSource) || 'grid',
          lamp_watt: parseInt(rowObj.lamp_watt, 10) || 100,
          install_date: rowObj.install_date || null,
          removed_date: rowObj.removed_date || null,
          warranty_expiry: rowObj.warranty_expiry || null,
          data_source: (rowObj.data_source as DataSource) || 'field',
        },
        diffs: [],
      }
    }

    const data = parseResult.data
    const poleRef = data.pole_external_ref

    // Ràng buộc cha: Tìm Cột trong hệ thống GIS theo pole_external_ref
    const parentPole = poles.find(
      (p) => p.external_ref && p.external_ref.toLowerCase() === poleRef.toLowerCase()
    )

    if (!parentPole) {
      return {
        category: 'fixtures',
        externalRef: poleRef,
        actionType: 'invalid',
        errorMsg: `Cột điện [${poleRef}] chưa có trong hệ thống GIS. Cần có Cột điện trước khi nạp Bóng!`,
        data: {
          pole_id: null,
          fixture_type: data.fixture_type,
          power_source: data.power_source,
          lamp_watt: data.lamp_watt,
          install_date: data.install_date,
          removed_date: data.removed_date || null,
          warranty_expiry: data.warranty_expiry || null,
          data_source: data.data_source,
        },
        diffs: [],
      }
    }

    // Đã có cột điện hợp lệ -> Kiểm tra xem cột đó đã có bóng đèn chưa
    const existingFixture = parentPole.active_fixture

    let actionType: 'new' | 'updated' | 'unchanged' = 'new'
    const diffs: FieldDiff[] = []

    if (!existingFixture) {
      actionType = 'new'
      diffs.push({
        label: 'Lắp mới',
        oldVal: 'Chưa có bóng',
        newVal: `Đèn LED ${data.lamp_watt}W`,
      })
    } else {
      if (Number(existingFixture.lamp_watt) !== Number(data.lamp_watt)) {
        diffs.push({
          label: 'Công suất đèn',
          oldVal: `${existingFixture.lamp_watt}W`,
          newVal: `${data.lamp_watt}W`,
        })
      }
      if (data.install_date && existingFixture.install_date !== data.install_date) {
        diffs.push({
          label: 'Ngày lắp đặt',
          oldVal: existingFixture.install_date || 'Chưa thiết lập',
          newVal: data.install_date,
        })
      }
      if (data.data_source && existingFixture.data_source !== data.data_source) {
        const getSourceLabel = (src: DataSource) => {
          switch (src) {
            case 'field':
              return 'Khảo sát thực địa'
            case 'public_imagery':
              return 'Ảnh công cộng'
            case 'calibration_rig':
              return 'Giàn chuẩn'
            case 'simulated':
              return 'Mô phỏng'
            default:
              return src
          }
        }
        diffs.push({
          label: 'Nguồn dữ liệu',
          oldVal: getSourceLabel(existingFixture.data_source),
          newVal: getSourceLabel(data.data_source),
        })
      }
      if (data.warranty_expiry && existingFixture.warranty_expiry !== data.warranty_expiry) {
        diffs.push({
          label: 'Hạn bảo hành',
          oldVal: existingFixture.warranty_expiry || 'Chưa thiết lập',
          newVal: data.warranty_expiry,
        })
      }
      if (existingFixture.power_source !== data.power_source) {
        diffs.push({
          label: 'Nguồn điện',
          oldVal: existingFixture.power_source === 'grid' ? 'Lưới điện' : 'Năng lượng MT',
          newVal: data.power_source === 'grid' ? 'Lưới điện' : 'Năng lượng MT',
        })
      }
      if (data.fixture_type && existingFixture.fixture_type !== data.fixture_type) {
        diffs.push({
          label: 'Loại bóng đèn',
          oldVal: existingFixture.fixture_type || 'Chưa phân loại',
          newVal: data.fixture_type,
        })
      }

      actionType = diffs.length > 0 ? 'updated' : 'unchanged'
    }

    const fixtureDto: CreateFixtureRequest = {
      pole_id: parentPole.pole_id || null,
      fixture_type: data.fixture_type,
      power_source: data.power_source,
      lamp_watt: data.lamp_watt,
      install_date: data.install_date,
      removed_date: data.removed_date || null,
      warranty_expiry: data.warranty_expiry || null,
      data_source: data.data_source,
    }

    return {
      category: 'fixtures',
      externalRef: poleRef,
      actionType,
      data: fixtureDto,
      diffs,
    }
  }

  // ----------------------------------------------------
  // CASE D: POLES & POLES_AND_FIXTURES (Cột điện & Cột gắn bóng)
  // Ràng buộc:
  // 1. Tuyến đường (segment_external_ref) PHẢI tồn tại trong GIS
  // 2. Tủ điện (feeder_external_ref) nếu có nhập PHẢI tồn tại trong GIS
  // ----------------------------------------------------
  const parseResult = poleImportSchema.safeParse(rowObj)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || 'Lỗi định dạng dữ liệu cột điện'
    return {
      category: category as 'poles' | 'poles_and_fixtures',
      externalRef: rowObj.external_ref || `POLE-ROW-${rowIndex + 1}`,
      actionType: 'invalid',
      errorMsg: firstError,
      data: {
        external_ref: rowObj.external_ref || null,
        segment_id: rowObj.segment_external_ref || null,
        feeder_id: rowObj.feeder_external_ref || null,
        commune_id: rowObj.commune_id || null,
        geom_wkt: rowObj.geom_wkt || null,
        near_sensitive_poi: false,
        data_source: (rowObj.data_source as DataSource) || 'field',
        note: rowObj.note || null,
      },
      diffs: [],
    }
  }

  const data = parseResult.data
  const { lat, lng } = extractPointCoords(data.geom_wkt)

  // 1. Kiểm tra ràng buộc Tuyến đường theo segment_external_ref
  const segObj = segments.find(
    (s) => s.external_ref && s.external_ref.toLowerCase() === data.segment_external_ref.toLowerCase()
  )

  if (!segObj) {
    return {
      category: category as 'poles' | 'poles_and_fixtures',
      externalRef: data.external_ref,
      actionType: 'invalid',
      errorMsg: `Tuyến đường [${data.segment_external_ref}] chưa có trong hệ thống GIS. Cần có Tuyến đường trước khi nạp Cột!`,
      data: {
        external_ref: data.external_ref,
        segment_id: data.segment_external_ref,
        feeder_id: data.feeder_external_ref || null,
        commune_id: data.commune_id,
        geom_wkt: data.geom_wkt,
        near_sensitive_poi: data.near_sensitive_poi,
        data_source: data.data_source,
        note: data.note || null,
      },
      diffs: [],
    }
  }

  // 2. Kiểm tra ràng buộc Tủ điện (nếu có cung cấp) theo feeder_external_ref
  let cabObj: CabinetListItem | undefined = undefined
  if (data.feeder_external_ref) {
    cabObj = cabinets.find(
      (c) =>
        (c.external_ref && c.external_ref.toLowerCase() === data.feeder_external_ref!.toLowerCase()) ||
        (c.cabinet_id && c.cabinet_id.toLowerCase() === data.feeder_external_ref!.toLowerCase())
    )
    if (!cabObj) {
      return {
        category: category as 'poles' | 'poles_and_fixtures',
        externalRef: data.external_ref,
        actionType: 'invalid',
        errorMsg: `Tủ điện [${data.feeder_external_ref}] chưa có trong hệ thống GIS. Cần có Tủ điện trước khi nạp Cột!`,
        data: {
          external_ref: data.external_ref,
          segment_id: segObj.segment_id || data.segment_external_ref,
          feeder_id: data.feeder_external_ref,
          commune_id: data.commune_id,
          geom_wkt: data.geom_wkt,
          near_sensitive_poi: data.near_sensitive_poi,
          data_source: data.data_source,
          note: data.note || null,
        },
        diffs: [],
      }
    }
  }

  // Ràng buộc cha đã thỏa mãn -> Kiểm tra cột đã có trên GIS chưa theo external_ref
  const existingPole = poles.find(
    (p) => p.external_ref && p.external_ref.toLowerCase() === data.external_ref.toLowerCase()
  )

  const segName = segObj.segment_name || data.segment_external_ref
  const watt = data.lamp_watt || existingPole?.active_fixture?.lamp_watt || 100
  const powerSource = data.power_source || existingPole?.active_fixture?.power_source || 'grid'
  const fixtureType = data.fixture_type || existingPole?.active_fixture?.fixture_type || 'led_road_lamp'
  const warrantyExpiry = data.warranty_expiry || existingPole?.active_fixture?.warranty_expiry || '2026-12-31'

  let actionType: 'new' | 'updated' | 'unchanged' = 'new'
  const diffs: FieldDiff[] = []

  if (!existingPole) {
    actionType = 'new'
    diffs.push({
      label: 'Đăng ký mới',
      oldVal: 'Chưa có trên GIS',
      newVal: `Tạo mới (${watt}W, ${segName})`,
    })
  } else {
    // 1. So sánh Tọa độ GIS
    if (existingPole.location) {
      const latDiff = Math.abs(existingPole.location.lat - lat)
      const lngDiff = Math.abs(existingPole.location.lng - lng)
      if (latDiff > 0.00001 || lngDiff > 0.00001) {
        diffs.push({
          label: 'Tọa độ GIS',
          oldVal: `${existingPole.location.lat.toFixed(5)}, ${existingPole.location.lng.toFixed(5)}`,
          newVal: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        })
      }
    }

    // 2. So sánh Tuyến đường quản lý
    if (existingPole.segment_id && segObj.segment_id && existingPole.segment_id !== segObj.segment_id) {
      const oldSeg = segments.find((s) => s.segment_id === existingPole.segment_id)
      diffs.push({
        label: 'Tuyến đường quản lý',
        oldVal: oldSeg?.segment_name || existingPole.segment_id,
        newVal: segObj.segment_name || data.segment_external_ref,
      })
    }

    // 3. So sánh Tủ điện quản lý
    const currentFeederId = existingPole.feeder_id || null
    const newFeederId = cabObj?.cabinet_id || null
    if (data.feeder_external_ref && currentFeederId !== newFeederId) {
      const oldCab = cabinets.find((c) => c.cabinet_id === currentFeederId || c.external_ref === currentFeederId)
      diffs.push({
        label: 'Tủ điện quản lý',
        oldVal: oldCab?.cabinet_name || (currentFeederId ? `Tủ ${currentFeederId}` : 'Chưa gán tủ'),
        newVal: cabObj?.cabinet_name || `Tủ ${data.feeder_external_ref}`,
      })
    }

    // 4. So sánh Công suất đèn
    if (data.lamp_watt && Number(existingPole.active_fixture?.lamp_watt) !== Number(data.lamp_watt)) {
      diffs.push({
        label: 'Công suất đèn',
        oldVal: `${existingPole.active_fixture?.lamp_watt ?? 100}W`,
        newVal: `${data.lamp_watt}W`,
      })
    }

    // 5. So sánh Nguồn điện
    if (data.power_source && existingPole.active_fixture?.power_source !== data.power_source) {
      diffs.push({
        label: 'Nguồn điện',
        oldVal: existingPole.active_fixture?.power_source === 'grid' ? 'Lưới điện' : 'Năng lượng MT',
        newVal: data.power_source === 'grid' ? 'Lưới điện' : 'Năng lượng MT',
      })
    }

    // 6. So sánh Loại bóng đèn
    if (data.fixture_type && existingPole.active_fixture?.fixture_type !== data.fixture_type) {
      diffs.push({
        label: 'Loại bóng đèn',
        oldVal: existingPole.active_fixture?.fixture_type || 'Chưa phân loại',
        newVal: data.fixture_type,
      })
    }

    // 7. So sánh Hạn bảo hành
    if (data.warranty_expiry && existingPole.active_fixture?.warranty_expiry !== data.warranty_expiry) {
      diffs.push({
        label: 'Hạn bảo hành',
        oldVal: existingPole.active_fixture?.warranty_expiry || 'Chưa thiết lập',
        newVal: data.warranty_expiry,
      })
    }

    // 8. So sánh Khu vực nhạy cảm (POI)
    if (data.near_sensitive_poi !== undefined && existingPole.near_sensitive_poi !== data.near_sensitive_poi) {
      diffs.push({
        label: 'Khu vực nhạy cảm (POI)',
        oldVal: existingPole.near_sensitive_poi ? 'Gần khu nhạy cảm' : 'Bình thường',
        newVal: data.near_sensitive_poi ? 'Gần khu nhạy cảm' : 'Bình thường',
      })
    }

    // 9. So sánh Ghi chú hiện trường
    const incomingNote = data.note !== undefined ? data.note?.trim() || null : null
    const currentNote = existingPole.note?.trim() || null
    if (incomingNote !== null && incomingNote !== currentNote) {
      diffs.push({
        label: 'Ghi chú',
        oldVal: currentNote || 'Chưa có ghi chú',
        newVal: incomingNote,
      })
    }

    actionType = diffs.length > 0 ? 'updated' : 'unchanged'
  }

  const poleDto: CreatePoleRequest = {
    external_ref: data.external_ref,
    segment_id: segObj.segment_id || data.segment_external_ref,
    feeder_id: cabObj?.cabinet_id || data.feeder_external_ref || null,
    commune_id: data.commune_id,
    geom_wkt: data.geom_wkt,
    near_sensitive_poi: data.near_sensitive_poi,
    data_source: data.data_source,
    note: data.note || existingPole?.note || null,
  }

  const fixtureDto: CreateFixtureRequest | undefined =
    data.lamp_watt || data.fixture_type || data.power_source || data.warranty_expiry
      ? {
          pole_id: existingPole?.pole_id || null,
          fixture_type: fixtureType,
          power_source: powerSource,
          lamp_watt: watt,
          install_date: new Date().toISOString().split('T')[0],
          removed_date: null,
          warranty_expiry: warrantyExpiry || null,
          data_source: data.data_source,
        }
      : undefined

  return {
    category: category as 'poles' | 'poles_and_fixtures',
    externalRef: data.external_ref,
    actionType,
    data: poleDto,
    fixtureData: fixtureDto,
    diffs,
  }
}
