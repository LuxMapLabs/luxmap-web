import type { WorkbookRowError } from '../../types/assets/import'
import {
  ASSET_SHEETS,
  CODE_MEANINGS,
  normalizeSpreadsheetMlPrefix,
} from './workbookStyler'

export interface WorkbookSheetCount {
  sheet: string
  rows: number
}

export interface WorkbookPreview {
  sheets: WorkbookSheetCount[]
  totalRows: number
  issues: WorkbookRowError[]
}

function colNumberToLetter(col: number): string {
  let letter = ''
  let temp = col
  while (temp > 0) {
    const remainder = (temp - 1) % 26
    letter = String.fromCharCode(65 + remainder) + letter
    temp = Math.floor((temp - 1) / 26)
  }
  return letter
}

function getValidCodesByColumn(): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const item of CODE_MEANINGS) {
    const columns = item.column.split(',').map((c) => c.trim())
    for (const col of columns) {
      const list = map.get(col) ?? []
      if (!list.includes(item.code)) {
        list.push(item.code)
      }
      map.set(col, list)
    }
  }
  return map
}

function toArrayBuffer(input: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (ArrayBuffer.isView(input)) {
    return input.buffer.slice(
      input.byteOffset,
      input.byteOffset + input.byteLength,
    ) as ArrayBuffer
  }
  return input
}

export async function previewAssetWorkbook(
  buffer: ArrayBuffer | Uint8Array,
): Promise<WorkbookPreview> {
  const rawBuffer = toArrayBuffer(buffer)
  const cleanBuffer = await normalizeSpreadsheetMlPrefix(rawBuffer)
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(cleanBuffer)

  const sheets: WorkbookSheetCount[] = []
  const issues: WorkbookRowError[] = []
  const validCodesByCol = getValidCodesByColumn()
  const assetSheetNames = Object.keys(ASSET_SHEETS)

  for (const assetSheetName of assetSheetNames) {
    const colDefs = ASSET_SHEETS[assetSheetName]
    const normTarget = assetSheetName.trim().normalize('NFC')
    const ws = wb.worksheets.find(
      (w) => w.name.trim().normalize('NFC') === normTarget,
    )

    if (!ws) {
      sheets.push({ sheet: assetSheetName, rows: 0 })
      continue
    }

    let maxCol = ws.columnCount || 0
    ws.eachRow({ includeEmpty: false }, (row) => {
      if (row.cellCount > maxCol) {
        maxCol = row.cellCount
      }
      row.eachCell({ includeEmpty: false }, (_cell, colNumber) => {
        if (colNumber > maxCol) {
          maxCol = colNumber
        }
      })
    })

    // Xác định các dòng dữ liệu (dòng >= 2 có ít nhất 1 ô không rỗng)
    const dataRowIndices: number[] = []
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r)
      let hasData = false
      for (let c = 1; c <= maxCol; c++) {
        const text = String(row.getCell(c).text ?? '').trim()
        if (text !== '') {
          hasData = true
          break
        }
      }
      if (hasData) {
        dataRowIndices.push(r)
      }
    }

    const rowCount = dataRowIndices.length
    sheets.push({ sheet: assetSheetName, rows: rowCount })

    // Kiểm tra dòng 1 (tiêu đề)
    const knownKeys = new Set(colDefs.map((d) => d.key))
    const headerErrors: WorkbookRowError[] = []
    const seenHeaders = new Set<string>()
    const colKeyToColIndex = new Map<string, number>()

    const colHasData = (colIndex: number): boolean => {
      for (const r of dataRowIndices) {
        const text = String(ws.getRow(r).getCell(colIndex).text ?? '').trim()
        if (text !== '') {
          return true
        }
      }
      return false
    }

    for (let c = 1; c <= maxCol; c++) {
      const headerCell = ws.getRow(1).getCell(c)
      const headerText = String(headerCell.text ?? '').trim()
      const hasData = colHasData(c)

      if (headerText === '') {
        if (hasData) {
          headerErrors.push({
            sheet: assetSheetName,
            row: 1,
            column: null,
            message: `Cột ${colNumberToLetter(c)} có dữ liệu nhưng thiếu tiêu đề.`,
          })
        }
      } else {
        if (seenHeaders.has(headerText)) {
          headerErrors.push({
            sheet: assetSheetName,
            row: 1,
            column: headerText,
            message: 'Tiêu đề bị lặp.',
          })
        } else {
          seenHeaders.add(headerText)
          if (knownKeys.has(headerText)) {
            colKeyToColIndex.set(headerText, c)
          }
        }

        if (!knownKeys.has(headerText) && hasData) {
          headerErrors.push({
            sheet: assetSheetName,
            row: 1,
            column: headerText,
            message:
              'Cột không thuộc sheet này. Xoá cột hoặc đổi về tên trong tệp mẫu.',
          })
        }
      }
    }

    // Thiếu cột bắt buộc (chỉ khi sheet có ít nhất 1 dòng dữ liệu)
    if (rowCount > 0) {
      for (const def of colDefs) {
        if (def.required && !seenHeaders.has(def.key)) {
          headerErrors.push({
            sheet: assetSheetName,
            row: 1,
            column: def.key,
            message: 'Thiếu cột bắt buộc.',
          })
        }
      }
    }

    // Có lỗi tiêu đề ở sheet nào thì KHÔNG kiểm từng dòng của sheet đó
    if (headerErrors.length > 0) {
      issues.push(...headerErrors)
      continue
    }

    // Kiểm tra từng dòng dữ liệu (dòng >= 2)
    const seenExternalRefs = new Map<string, number>()

    for (const r of dataRowIndices) {
      const row = ws.getRow(r)

      // Kiểm tra các cột theo định nghĩa
      for (const def of colDefs) {
        const c = colKeyToColIndex.get(def.key)
        const cellText = c ? String(row.getCell(c).text ?? '').trim() : ''

        if (def.required && cellText === '') {
          issues.push({
            sheet: assetSheetName,
            row: r,
            column: def.key,
            message: 'Ô bắt buộc đang trống.',
          })
        } else if (cellText !== '') {
          const validCodes = validCodesByCol.get(def.key)
          if (validCodes) {
            let isValid = false
            if (def.key === 'near_sensitive_poi') {
              isValid = validCodes.some(
                (code) => code.toLowerCase() === cellText.toLowerCase(),
              )
            } else {
              isValid = validCodes.includes(cellText)
            }

            if (!isValid) {
              issues.push({
                sheet: assetSheetName,
                row: r,
                column: def.key,
                message: `'${cellText}' không phải mã hợp lệ. Chọn một trong: ${validCodes.join(', ')}.`,
              })
            }
          }
        }
      }

      // Trùng external_ref trong cùng sheet (mọi sheet trừ Bóng đèn)
      if (assetSheetName !== 'Bóng đèn') {
        const refCol = colKeyToColIndex.get('external_ref')
        if (refCol) {
          const refVal = String(row.getCell(refCol).text ?? '').trim()
          if (refVal !== '') {
            if (seenExternalRefs.has(refVal)) {
              const firstRow = seenExternalRefs.get(refVal)!
              issues.push({
                sheet: assetSheetName,
                row: r,
                column: 'external_ref',
                message: `Trùng mã với dòng ${firstRow}.`,
              })
            } else {
              seenExternalRefs.set(refVal, r)
            }
          }
        }
      }

      // Sheet Cột điện: geom_wkt trống VÀ note trống
      if (assetSheetName === 'Cột điện') {
        const wktCol = colKeyToColIndex.get('geom_wkt')
        const noteCol = colKeyToColIndex.get('note')
        const wktVal = wktCol ? String(row.getCell(wktCol).text ?? '').trim() : ''
        const noteVal = noteCol ? String(row.getCell(noteCol).text ?? '').trim() : ''
        if (wktVal === '' && noteVal === '') {
          issues.push({
            sheet: 'Cột điện',
            row: r,
            column: 'note',
            message: 'Cột chưa có GPS phải ghi note mô tả vị trí.',
          })
        }
      }
    }
  }

  // Kiểm tra sheet IoT
  const iotWs = wb.worksheets.find(
    (w) => w.name.trim().normalize('NFC').toLowerCase() === 'iot',
  )
  if (iotWs) {
    let firstDataRow = -1
    for (let r = 2; r <= iotWs.rowCount; r++) {
      const row = iotWs.getRow(r)
      let hasData = false
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (String(cell.text ?? '').trim() !== '') {
          hasData = true
        }
      })
      if (hasData) {
        firstDataRow = r
        break
      }
    }

    if (firstDataRow !== -1) {
      issues.push({
        sheet: 'IoT',
        row: firstDataRow,
        column: null,
        message:
          'Sheet IoT không nạp được qua tệp này. Xoá dữ liệu trong sheet IoT.',
      })
    }
  }

  // Sắp xếp issues: sheet -> row -> column
  function getSheetOrder(sheetName: string | null | undefined): number {
    if (!sheetName) return 999
    const idx = assetSheetNames.indexOf(sheetName.trim().normalize('NFC'))
    return idx === -1 ? 999 : idx
  }

  issues.sort((a, b) => {
    const sA = getSheetOrder(a.sheet)
    const sB = getSheetOrder(b.sheet)
    if (sA !== sB) return sA - sB

    const rA = a.row ?? 0
    const rB = b.row ?? 0
    if (rA !== rB) return rA - rB

    const cA = a.column ?? ''
    const cB = b.column ?? ''
    return cA.localeCompare(cB)
  })

  const totalRows = sheets.reduce((sum, s) => sum + s.rows, 0)

  return {
    sheets,
    totalRows,
    issues,
  }
}
