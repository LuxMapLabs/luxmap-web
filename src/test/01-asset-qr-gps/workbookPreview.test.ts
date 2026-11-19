import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { previewAssetWorkbook } from '../../utils/assets/workbookPreview'

async function createWorkbookBuffer(
  sheetsConfig: Record<
    string,
    {
      headers: string[]
      rows: (string | number | boolean | null | undefined)[][]
    }
  >,
): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  for (const [sheetName, config] of Object.entries(sheetsConfig)) {
    const ws = wb.addWorksheet(sheetName)
    if (config.headers.length > 0) {
      ws.addRow(config.headers)
    }
    for (const row of config.rows) {
      ws.addRow(row)
    }
  }
  const buf = await wb.xlsx.writeBuffer()
  const u8 = new Uint8Array(buf)
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)
}

describe('workbookPreview (Task 7a)', { timeout: 30000 }, () => {
  it('tệp mẫu thật public/templates/assets-workbook.xlsx (đọc bằng fs) → totalRows = 0, issues = [], 5 sheet đủ, rows 0', async () => {
    const filePath = path.resolve(process.cwd(), 'public/templates/assets-workbook.xlsx')
    const fileBuf = fs.readFileSync(filePath)
    const arrayBuffer = fileBuf.buffer.slice(
      fileBuf.byteOffset,
      fileBuf.byteOffset + fileBuf.byteLength,
    )

    const result = await previewAssetWorkbook(arrayBuffer)

    expect(result.totalRows).toBe(0)
    expect(result.issues).toEqual([])
    expect(result.sheets).toEqual([
      { sheet: 'Tuyến đường', rows: 0 },
      { sheet: 'Tủ điện', rows: 0 },
      { sheet: 'Mạch điện', rows: 0 },
      { sheet: 'Cột điện', rows: 0 },
      { sheet: 'Bóng đèn', rows: 0 },
    ])
  })

  it('tệp hợp lệ nhỏ (1 tuyến, 1 tủ, 1 cột có GPS, 1 bóng) → đếm đúng, không lỗi', async () => {
    const buffer = await createWorkbookBuffer({
      'Tuyến đường': {
        headers: ['external_ref', 'segment_name', 'road_class', 'length_m', 'geom_wkt'],
        rows: [['TUYEN-01', 'Đường ĐX-01', 'inter_commune', 1200, 'LINESTRING(106.7 10.7, 106.8 10.8)']],
      },
      'Tủ điện': {
        headers: ['external_ref', 'cabinet_name', 'geom_wkt'],
        rows: [['CAB-01', 'Tủ điện 1', 'POINT(106.7012 10.7765)']],
      },
      'Mạch điện': {
        headers: ['external_ref', 'feeder_name', 'cabinet_external_ref', 'cabinet_source'],
        rows: [],
      },
      'Cột điện': {
        headers: ['external_ref', 'segment_external_ref', 'feeder_external_ref', 'feeder_source', 'geom_wkt', 'near_sensitive_poi', 'note'],
        rows: [['POLE-01', 'TUYEN-01', '', '', 'POINT(106.7015 10.7768)', 'false', '']],
      },
      'Bóng đèn': {
        headers: ['pole_external_ref', 'fixture_type', 'power_source', 'lamp_watt', 'install_date', 'lamp_count', 'removed_date', 'warranty_expiry', 'note'],
        rows: [['POLE-01', 'led_road_lamp', 'grid', 100, '2024-05-20', 1, '', '', '']],
      },
    })

    const result = await previewAssetWorkbook(buffer)

    expect(result.totalRows).toBe(4)
    expect(result.issues).toEqual([])
    expect(result.sheets).toEqual([
      { sheet: 'Tuyến đường', rows: 1 },
      { sheet: 'Tủ điện', rows: 1 },
      { sheet: 'Mạch điện', rows: 0 },
      { sheet: 'Cột điện', rows: 1 },
      { sheet: 'Bóng đèn', rows: 1 },
    ])
  })

  it('bắt lỗi ô bắt buộc trống', async () => {
    const buffer = await createWorkbookBuffer({
      'Tuyến đường': {
        headers: ['external_ref', 'segment_name', 'road_class'],
        rows: [['TUYEN-01', '', 'inter_commune']], // segment_name trống
      },
    })

    const result = await previewAssetWorkbook(buffer)

    expect(result.totalRows).toBe(1)
    expect(result.issues).toEqual([
      {
        sheet: 'Tuyến đường',
        row: 2,
        column: 'segment_name',
        message: 'Ô bắt buộc đang trống.',
      },
    ])
  })

  it('bắt lỗi mã sai (road_class = "abc")', async () => {
    const buffer = await createWorkbookBuffer({
      'Tuyến đường': {
        headers: ['external_ref', 'segment_name', 'road_class'],
        rows: [['TUYEN-01', 'Đường 1', 'abc']],
      },
    })

    const result = await previewAssetWorkbook(buffer)

    expect(result.totalRows).toBe(1)
    expect(result.issues).toEqual([
      {
        sheet: 'Tuyến đường',
        row: 2,
        column: 'road_class',
        message: "'abc' không phải mã hợp lệ. Chọn một trong: inter_commune, inter_village.",
      },
    ])
  })

  it('near_sensitive_poi = "TRUE" hợp lệ (không phân biệt hoa thường)', async () => {
    const buffer = await createWorkbookBuffer({
      'Cột điện': {
        headers: ['external_ref', 'geom_wkt', 'near_sensitive_poi', 'note'],
        rows: [['POLE-01', 'POINT(106.7 10.7)', 'TRUE', '']],
      },
    })

    const result = await previewAssetWorkbook(buffer)

    expect(result.totalRows).toBe(1)
    expect(result.issues).toEqual([])
  })

  it('bắt lỗi trùng external_ref trong cùng sheet', async () => {
    const buffer = await createWorkbookBuffer({
      'Tủ điện': {
        headers: ['external_ref', 'cabinet_name', 'geom_wkt'],
        rows: [
          ['CAB-01', 'Tủ 1', 'POINT(106.7 10.7)'],
          ['CAB-01', 'Tủ 2', 'POINT(106.8 10.8)'],
        ],
      },
    })

    const result = await previewAssetWorkbook(buffer)

    expect(result.totalRows).toBe(2)
    expect(result.issues).toEqual([
      {
        sheet: 'Tủ điện',
        row: 3,
        column: 'external_ref',
        message: 'Trùng mã với dòng 2.',
      },
    ])
  })

  it('cột không GPS không note (và có note thì hết lỗi)', async () => {
    // 1. Không GPS không note -> có lỗi
    const bufferWithError = await createWorkbookBuffer({
      'Cột điện': {
        headers: ['external_ref', 'geom_wkt', 'note'],
        rows: [['POLE-01', '', '']],
      },
    })

    const result1 = await previewAssetWorkbook(bufferWithError)
    expect(result1.issues).toEqual([
      {
        sheet: 'Cột điện',
        row: 2,
        column: 'note',
        message: 'Cột chưa có GPS phải ghi note mô tả vị trí.',
      },
    ])

    // 2. Có note -> hết lỗi
    const bufferWithNote = await createWorkbookBuffer({
      'Cột điện': {
        headers: ['external_ref', 'geom_wkt', 'note'],
        rows: [['POLE-01', '', 'Trước cổng trường']],
      },
    })

    const result2 = await previewAssetWorkbook(bufferWithNote)
    expect(result2.issues).toEqual([])
  })

  it('bắt lỗi cột lạ có dữ liệu', async () => {
    const buffer = await createWorkbookBuffer({
      'Tuyến đường': {
        headers: ['external_ref', 'segment_name', 'road_class', 'commune_id'],
        rows: [['TUYEN-01', 'Đường 1', 'inter_commune', 'COMMUNE_123']],
      },
    })

    const result = await previewAssetWorkbook(buffer)

    expect(result.totalRows).toBe(1)
    expect(result.issues).toEqual([
      {
        sheet: 'Tuyến đường',
        row: 1,
        column: 'commune_id',
        message: 'Cột không thuộc sheet này. Xoá cột hoặc đổi về tên trong tệp mẫu.',
      },
    ])
  })

  it('cột lạ trống thì bỏ qua không báo lỗi', async () => {
    const buffer = await createWorkbookBuffer({
      'Tuyến đường': {
        headers: ['external_ref', 'segment_name', 'road_class', 'data_source'],
        rows: [['TUYEN-01', 'Đường 1', 'inter_commune', '']], // data_source trống
      },
    })

    const result = await previewAssetWorkbook(buffer)

    expect(result.totalRows).toBe(1)
    expect(result.issues).toEqual([])
  })

  it('bắt lỗi thiếu cột bắt buộc khi sheet có dữ liệu', async () => {
    const buffer = await createWorkbookBuffer({
      'Tuyến đường': {
        headers: ['external_ref', 'road_class'], // thiếu segment_name
        rows: [['TUYEN-01', 'inter_commune']],
      },
    })

    const result = await previewAssetWorkbook(buffer)

    expect(result.totalRows).toBe(1)
    expect(result.issues).toEqual([
      {
        sheet: 'Tuyến đường',
        row: 1,
        column: 'segment_name',
        message: 'Thiếu cột bắt buộc.',
      },
    ])
  })

  it('bắt lỗi tiêu đề lặp', async () => {
    const buffer = await createWorkbookBuffer({
      'Tuyến đường': {
        headers: ['external_ref', 'segment_name', 'road_class', 'external_ref'],
        rows: [['TUYEN-01', 'Đường 1', 'inter_commune', 'TUYEN-01']],
      },
    })

    const result = await previewAssetWorkbook(buffer)

    expect(result.totalRows).toBe(1)
    expect(result.issues).toEqual([
      {
        sheet: 'Tuyến đường',
        row: 1,
        column: 'external_ref',
        message: 'Tiêu đề bị lặp.',
      },
    ])
  })

  it('bắt lỗi tiêu đề trống nhưng cột có dữ liệu', async () => {
    const buffer = await createWorkbookBuffer({
      'Tuyến đường': {
        headers: ['external_ref', 'segment_name', 'road_class', '', 'length_m'],
        rows: [['TUYEN-01', 'Đường 1', 'inter_commune', 'dữ liệu vô danh', 100]],
      },
    })

    const result = await previewAssetWorkbook(buffer)

    expect(result.totalRows).toBe(1)
    expect(result.issues).toEqual([
      {
        sheet: 'Tuyến đường',
        row: 1,
        column: null,
        message: 'Cột D có dữ liệu nhưng thiếu tiêu đề.',
      },
    ])
  })

  it('bắt lỗi sheet IoT có dữ liệu ở dòng >= 2', async () => {
    const buffer = await createWorkbookBuffer({
      'Tuyến đường': {
        headers: ['external_ref', 'segment_name', 'road_class'],
        rows: [['TUYEN-01', 'Đường 1', 'inter_commune']],
      },
      'IoT': {
        headers: ['node_id', 'mac_address'],
        rows: [['IOT-01', 'AA:BB:CC:DD:EE:FF']],
      },
    })

    const result = await previewAssetWorkbook(buffer)

    expect(result.issues).toEqual([
      {
        sheet: 'IoT',
        row: 2,
        column: null,
        message: 'Sheet IoT không nạp được qua tệp này. Xoá dữ liệu trong sheet IoT.',
      },
    ])
    // Sheet IoT không tính vào sheets tài sản và totalRows
    expect(result.totalRows).toBe(1)
  })

  it('cột đổi thứ tự vẫn map đúng và không báo lỗi', async () => {
    const buffer = await createWorkbookBuffer({
      'Tuyến đường': {
        headers: ['road_class', 'geom_wkt', 'external_ref', 'segment_name'],
        rows: [['inter_commune', 'LINESTRING(106.7 10.7, 106.8 10.8)', 'TUYEN-01', 'Đường 1']],
      },
    })

    const result = await previewAssetWorkbook(buffer)

    expect(result.totalRows).toBe(1)
    expect(result.issues).toEqual([])
  })

  it('tên sheet có khoảng trắng thừa vẫn nhận diện đúng', async () => {
    const buffer = await createWorkbookBuffer({
      '  Tuyến đường  ': {
        headers: ['external_ref', 'segment_name', 'road_class'],
        rows: [['TUYEN-01', 'Đường 1', 'inter_commune']],
      },
    })

    const result = await previewAssetWorkbook(buffer)

    expect(result.totalRows).toBe(1)
    expect(result.issues).toEqual([])
    expect(result.sheets[0]).toEqual({ sheet: 'Tuyến đường', rows: 1 })
  })

  it('sheet Mạch điện có header thêm cột geom_wkt và có dữ liệu → báo lỗi cột không thuộc sheet này', async () => {
    const buffer = await createWorkbookBuffer({
      'Tuyến đường': {
        headers: ['external_ref', 'segment_name', 'road_class', 'length_m', 'geom_wkt'],
        rows: [['TUYEN-01', 'Đường ĐX-01', 'inter_commune', 1200, 'LINESTRING(106.7 10.7, 106.8 10.8)']],
      },
      'Tủ điện': {
        headers: ['external_ref', 'cabinet_name', 'geom_wkt'],
        rows: [['CAB-01', 'Tủ điện 1', 'POINT(106.7012 10.7765)']],
      },
      'Mạch điện': {
        headers: ['external_ref', 'feeder_name', 'cabinet_external_ref', 'cabinet_source', 'geom_wkt'],
        rows: [['MACH-01', 'Mạch 1 tủ ấp 3', 'CAB-01', 'verified', 'LINESTRING(106.70 10.77, 106.71 10.78)']],
      },
      'Cột điện': {
        headers: ['external_ref', 'segment_external_ref', 'feeder_external_ref', 'feeder_source', 'geom_wkt', 'near_sensitive_poi', 'note'],
        rows: [['POLE-01', 'TUYEN-01', '', '', 'POINT(106.7015 10.7768)', 'false', '']],
      },
      'Bóng đèn': {
        headers: ['pole_external_ref', 'fixture_type', 'power_source', 'lamp_watt', 'install_date', 'lamp_count', 'removed_date', 'warranty_expiry', 'note'],
        rows: [['POLE-01', 'led_road_lamp', 'grid', 100, '2024-05-20', 1, '', '', '']],
      },
    })

    const result = await previewAssetWorkbook(buffer)

    expect(result.issues).toContainEqual({
      sheet: 'Mạch điện',
      row: 1,
      column: 'geom_wkt',
      message: 'Cột không thuộc sheet này. Xoá cột hoặc đổi về tên trong tệp mẫu.',
    })
  })

  it('sheet Mạch điện có header thêm geom_wkt nhưng cột đó để trống ở mọi dòng → không có issue ở cột geom_wkt', async () => {
    const buffer = await createWorkbookBuffer({
      'Tuyến đường': {
        headers: ['external_ref', 'segment_name', 'road_class', 'length_m', 'geom_wkt'],
        rows: [['TUYEN-01', 'Đường ĐX-01', 'inter_commune', 1200, 'LINESTRING(106.7 10.7, 106.8 10.8)']],
      },
      'Tủ điện': {
        headers: ['external_ref', 'cabinet_name', 'geom_wkt'],
        rows: [['CAB-01', 'Tủ điện 1', 'POINT(106.7012 10.7765)']],
      },
      'Mạch điện': {
        headers: ['external_ref', 'feeder_name', 'cabinet_external_ref', 'cabinet_source', 'geom_wkt'],
        rows: [['MACH-01', 'Mạch 1 tủ ấp 3', 'CAB-01', 'verified', '']],
      },
      'Cột điện': {
        headers: ['external_ref', 'segment_external_ref', 'feeder_external_ref', 'feeder_source', 'geom_wkt', 'near_sensitive_poi', 'note'],
        rows: [['POLE-01', 'TUYEN-01', '', '', 'POINT(106.7015 10.7768)', 'false', '']],
      },
      'Bóng đèn': {
        headers: ['pole_external_ref', 'fixture_type', 'power_source', 'lamp_watt', 'install_date', 'lamp_count', 'removed_date', 'warranty_expiry', 'note'],
        rows: [['POLE-01', 'led_road_lamp', 'grid', 100, '2024-05-20', 1, '', '', '']],
      },
    })

    const result = await previewAssetWorkbook(buffer)

    const geomIssues = result.issues.filter(
      (i) => i.sheet === 'Mạch điện' && i.column === 'geom_wkt',
    )
    expect(geomIssues).toHaveLength(0)
  })

  it('buffer không phải xlsx → reject', async () => {
    const invalidBuffer = new ArrayBuffer(32)
    await expect(previewAssetWorkbook(invalidBuffer)).rejects.toThrow()
  })
})
