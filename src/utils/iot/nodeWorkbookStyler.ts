/**
 * Tân trang tệp Excel node IoT: dùng cho tệp mẫu nhập node, và sau này cho tệp xuất node của backend
 * (cùng một bố cục sheet `Nodes` nên dùng chung được).
 *
 * LUẬT BE (POST /iot/nodes/import) — chỉ định dạng, không đụng nội dung:
 * 1. Dòng 1 của sheet `Nodes` là tên cột kỹ thuật, không đổi giá trị.
 * 2. Không thêm/xoá dòng, không gộp ô, không đổi kiểu dữ liệu của ô.
 * 3. Không dùng công thức (BE không nhận công thức).
 * 4. Sheet `Hướng dẫn` chỉ định dạng lại, nội dung giữ nguyên.
 */

import type { Borders } from 'exceljs'
import { normalizeSpreadsheetMlPrefix } from '../assets/workbookStyler'

export interface IotNodeColumnDef {
  key: string
  label: string
  required: boolean
  example: string
  rule: string
}

export const IOT_NODE_SHEET = 'Nodes'
export const IOT_GUIDE_SHEET = 'Hướng dẫn'

export const IOT_NODE_COLUMNS: IotNodeColumnDef[] = [
  { key: 'server_id', label: 'Server IoT', required: true, example: 'iot-server-01', rule: 'Server đã đăng ký và cấp quyền gateway.' },
  { key: 'feeder_id', label: 'Mạch điện', required: true, example: 'FDR-009', rule: 'Mạch thuộc tủ cùng xã với server; hệ thống tự suy ra tủ.' },
  { key: 'device_id', label: 'Mã thiết bị', required: true, example: 'LUXMAP-P001', rule: 'Khớp DEVICE_ID nạp trong firmware node.' },
  { key: 'nominal_voltage', label: 'Điện áp danh định (V)', required: true, example: '5', rule: 'Số dương, không kèm đơn vị.' },
  { key: 'nominal_current_ma', label: 'Dòng danh định (mA)', required: true, example: '100', rule: 'Số dương, dòng chuẩn của cả mạch khi đủ tải.' },
  { key: 'nominal_power_mw', label: 'Công suất danh định (mW)', required: true, example: '500', rule: 'Số dương, không kèm đơn vị.' },
  { key: 'radius_km', label: 'Bán kính node (km)', required: false, example: '0.2', rule: 'Từ 0 đến 1000. Để trống là 0.' },
]

const NAVY = 'FF1F3864'
const NAVY_SOFT = 'FFE8EDF5'
const WHITE = 'FFFFFFFF'
const LINE = 'FFCBD5E1'
const FONT_NAME = 'Arial'

const BOX_BORDER: Partial<Borders> = {
  top: { style: 'thin', color: { argb: LINE } },
  left: { style: 'thin', color: { argb: LINE } },
  bottom: { style: 'thin', color: { argb: LINE } },
  right: { style: 'thin', color: { argb: LINE } },
}

export async function styleIotNodeWorkbook(input: ArrayBuffer): Promise<ArrayBuffer> {
  const clean = await normalizeSpreadsheetMlPrefix(input)
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(clean)

  const ws = wb.getWorksheet(IOT_NODE_SHEET)
  if (ws) {
    ws.properties.tabColor = { argb: NAVY }
    ws.views = [{ state: 'frozen', ySplit: 1 }]
    ws.getRow(1).height = 30

    const meta = new Map(IOT_NODE_COLUMNS.map((c) => [c.key, c]))
    let lastCol = 0
    ws.getRow(1).eachCell((cell, col) => {
      lastCol = Math.max(lastCol, col)
      const def = meta.get(String(cell.value ?? '').trim())
      if (!def) return
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: def.required ? NAVY : NAVY_SOFT } }
      cell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: def.required ? WHITE : NAVY } }
      cell.alignment = { vertical: 'middle', indent: 1 }
      cell.border = BOX_BORDER
      cell.note = [`${def.label} (${def.required ? 'bắt buộc' : 'tuỳ chọn'})`, def.rule, `Ví dụ: ${def.example}`].join('\n')
      ws.getColumn(col).width = Math.min(Math.max(def.key.length + 6, 16), 30)
    })

    // Dòng dữ liệu (có ô giá trị): chỉ đổi font, căn lề, viền; không đổi giá trị hay kiểu ô.
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r)
      let hasValue = false
      for (let c = 1; c <= lastCol; c++) {
        const v = row.getCell(c).value
        if (v !== null && v !== undefined && v !== '') hasValue = true
      }
      if (!hasValue) continue
      row.height = 22
      for (let c = 1; c <= lastCol; c++) {
        const cell = row.getCell(c)
        cell.font = { name: FONT_NAME, size: 11 }
        cell.alignment = { vertical: 'middle', indent: 1, horizontal: typeof cell.value === 'number' ? 'right' : 'left' }
        cell.border = BOX_BORDER
      }
    }
  }

  const guide = wb.getWorksheet(IOT_GUIDE_SHEET)
  if (guide) {
    guide.getColumn(1).width = 120
    guide.views = [{ showGridLines: false }]
    guide.eachRow((row, n) => {
      const cell = row.getCell(1)
      cell.alignment = { wrapText: true, vertical: 'top', indent: 1 }
      cell.font = n === 1 ? { name: FONT_NAME, size: 14, bold: true, color: { argb: NAVY } } : { name: FONT_NAME, size: 11 }
      row.height = n === 1 ? 30 : 34
    })
  }

  const out = await wb.xlsx.writeBuffer()
  const bytes = new Uint8Array(out as ArrayBuffer)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}
