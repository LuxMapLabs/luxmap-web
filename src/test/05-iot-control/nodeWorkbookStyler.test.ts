import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { styleIotNodeWorkbook } from '../../utils/iot/nodeWorkbookStyler'

const buildWorkbook = async (): Promise<ArrayBuffer> => {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Nodes')
  ws.addRow(['server_id', 'feeder_id', 'device_id', 'nominal_voltage', 'nominal_current_ma', 'nominal_power_mw', 'radius_km'])
  ws.addRow(['iot-server-01', 'FDR-009', 'LUXMAP-P001', 5, 100, 500, 0.2])
  const guide = wb.addWorksheet('Hướng dẫn')
  guide.addRow(['Tiêu đề'])
  guide.addRow(['Nội dung giữ nguyên'])
  const out = await wb.xlsx.writeBuffer()
  const bytes = new Uint8Array(out as ArrayBuffer)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

describe('styleIotNodeWorkbook', () => {
  it('styles headers, freezes row 1 and keeps every value', async () => {
    const styled = await styleIotNodeWorkbook(await buildWorkbook())
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(styled)

    const ws = wb.getWorksheet('Nodes')!
    expect(ws.getRow(1).values).toEqual([undefined, 'server_id', 'feeder_id', 'device_id', 'nominal_voltage', 'nominal_current_ma', 'nominal_power_mw', 'radius_km'])
    expect(ws.getRow(2).values).toEqual([undefined, 'iot-server-01', 'FDR-009', 'LUXMAP-P001', 5, 100, 500, 0.2])
    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })

    const required = ws.getCell('A1')
    const optional = ws.getCell('G1')
    expect(required.font?.bold).toBe(true)
    expect(required.fill).toMatchObject({ fgColor: { argb: 'FF1F3864' } })
    expect(optional.fill).toMatchObject({ fgColor: { argb: 'FFE8EDF5' } })
    expect(String(required.note && typeof required.note !== 'string' ? JSON.stringify(required.note) : required.note)).toContain('bắt buộc')
    expect(String(JSON.stringify(optional.note))).toContain('tuỳ chọn')
  })

  it('keeps the guide sheet content', async () => {
    const styled = await styleIotNodeWorkbook(await buildWorkbook())
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(styled)
    const guide = wb.getWorksheet('Hướng dẫn')!
    expect(guide.getCell('A1').value).toBe('Tiêu đề')
    expect(guide.getCell('A2').value).toBe('Nội dung giữ nguyên')
  })

  it('leaves a workbook without a Nodes sheet readable', async () => {
    const wb = new ExcelJS.Workbook()
    wb.addWorksheet('Khác').addRow(['a'])
    const out = await wb.xlsx.writeBuffer()
    const bytes = new Uint8Array(out as ArrayBuffer)
    const styled = await styleIotNodeWorkbook(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
    const back = new ExcelJS.Workbook()
    await back.xlsx.load(styled)
    expect(back.getWorksheet('Khác')!.getCell('A1').value).toBe('a')
  })
})
