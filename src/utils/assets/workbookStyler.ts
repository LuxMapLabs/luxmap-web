/**
 * Tiện ích tân trang tệp Excel tài sản chiếu sáng (workbookStyler).
 *
 * LUẬT BE QUAN TRỌNG (TUYỆT ĐỐI TUÂN THỦ ĐỂ KHÔNG LÀM HỎNG LOGIC BACKEND):
 * 1. BE chỉ đọc 5 sheet tài sản: 'Tuyến đường', 'Tủ điện', 'Mạch điện', 'Cột điện', 'Bóng đèn'.
 * 2. Dòng 1 trong 5 sheet tài sản là tên cột kỹ thuật (technical keys). Không được đổi giá trị.
 * 3. Mọi dòng >= 2 có ô có giá trị đều là dữ liệu. Không thêm dòng, không xoá ô, không đổi kiểu dữ liệu.
 * 4. Không gộp ô (merge) trong các dòng dữ liệu của 5 sheet tài sản.
 * 5. Giữ nguyên data validations và defined names (ds_tuyen_duong, ds_tu_dien, ds_mach_dien, ds_cot_dien).
 * 6. Tuyệt đối không tạo sheet có tên 'IoT'.
 * 7. Sheet 'Không xuất' (nếu có trong tệp xuất) được giữ nguyên toàn bộ nội dung.
 * 8. Sheet 'Hướng dẫn': tệp mẫu xoá bỏ (thay bằng 'Cách điền'); tệp xuất chỉ định dạng lại, nội dung giữ nguyên.
 */

import type { Borders, DataValidation, Worksheet } from 'exceljs';

interface WorksheetInternal extends Worksheet {
  conditionalFormattings?: unknown[];
  dataValidations?: {
    model?: Record<string, DataValidation>;
  };
  orderNo?: number;
}

export interface AssetColumnDef {
  key: string;
  label: string;
  required: boolean;
  example: string;
  rule: string;
}

export interface CodeMeaning {
  column: string;
  code: string;
  meaning: string;
}

export const ASSET_SHEETS: Record<string, AssetColumnDef[]> = {
  'Tuyến đường': [
    {
      key: 'external_ref',
      label: 'Mã tuyến',
      required: true,
      example: 'TUYEN-A',
      rule: 'Mã kiểm kê của xã, không trùng trong sheet.',
    },
    {
      key: 'segment_name',
      label: 'Tên tuyến',
      required: true,
      example: 'Đường liên xã ĐX-01',
      rule: '',
    },
    {
      key: 'road_class',
      label: 'Cấp đường',
      required: true,
      example: 'inter_commune',
      rule: 'Chọn trong danh sách, xem sheet Danh mục.',
    },
    {
      key: 'length_m',
      label: 'Chiều dài (m)',
      required: false,
      example: '1250',
      rule: 'Số mét, dùng dấu chấm cho phần thập phân.',
    },
    {
      key: 'geom_wkt',
      label: 'Hình tuyến',
      required: false,
      example: 'LINESTRING(106.70 10.77, 106.71 10.78)',
      rule: 'Kinh độ trước, vĩ độ sau. Để trống thì giữ hình đã vẽ trên bản đồ.',
    },
  ],
  'Tủ điện': [
    {
      key: 'external_ref',
      label: 'Mã tủ',
      required: true,
      example: 'TU-01',
      rule: 'Mã kiểm kê của xã, không trùng trong sheet.',
    },
    {
      key: 'cabinet_name',
      label: 'Tên tủ',
      required: true,
      example: 'Tủ điện ấp 3',
      rule: '',
    },
    {
      key: 'geom_wkt',
      label: 'Vị trí tủ',
      required: true,
      example: 'POINT(106.7012 10.7765)',
      rule: 'Kinh độ trước, vĩ độ sau.',
    },
  ],
  'Mạch điện': [
    {
      key: 'external_ref',
      label: 'Mã mạch',
      required: true,
      example: 'MACH-01',
      rule: 'Mã kiểm kê của xã, không trùng trong sheet.',
    },
    {
      key: 'feeder_name',
      label: 'Tên mạch',
      required: true,
      example: 'Mạch 1 tủ ấp 3',
      rule: '',
    },
    {
      key: 'cabinet_external_ref',
      label: 'Thuộc tủ',
      required: false,
      example: 'TU-01',
      rule: 'Chọn mã tủ đã nhập ở sheet Tủ điện.',
    },
    {
      key: 'cabinet_source',
      label: 'Độ tin cậy liên kết tủ',
      required: false,
      example: 'verified',
      rule: 'Chọn trong danh sách, xem sheet Danh mục.',
    },
  ],
  'Cột điện': [
    {
      key: 'external_ref',
      label: 'Mã cột',
      required: true,
      example: 'CTA-001',
      rule: 'Mã kiểm kê của xã, không trùng trong sheet.',
    },
    {
      key: 'segment_external_ref',
      label: 'Thuộc tuyến',
      required: false,
      example: 'TUYEN-A',
      rule: 'Chọn mã tuyến đã nhập ở sheet Tuyến đường.',
    },
    {
      key: 'feeder_external_ref',
      label: 'Thuộc mạch',
      required: false,
      example: 'MACH-01',
      rule: 'Chọn mã mạch đã nhập ở sheet Mạch điện.',
    },
    {
      key: 'feeder_source',
      label: 'Độ tin cậy liên kết mạch',
      required: false,
      example: 'verified',
      rule: 'Chọn trong danh sách, xem sheet Danh mục.',
    },
    {
      key: 'geom_wkt',
      label: 'Vị trí cột',
      required: false,
      example: 'POINT(106.7015 10.7768)',
      rule: 'Để trống nếu chưa có GPS, kỹ sư sẽ quét QR để gán sau. Cột đã có thì giữ vị trí cũ.',
    },
    {
      key: 'near_sensitive_poi',
      label: 'Gần điểm nhạy cảm',
      required: false,
      example: 'true',
      rule: 'true nếu gần trường học, bệnh viện, ngã tư...',
    },
    {
      key: 'note',
      label: 'Ghi chú',
      required: false,
      example: 'Trước cổng trường tiểu học',
      rule: 'Bắt buộc với cột mới chưa có vị trí: mô tả chỗ đặt cột để kỹ sư tìm.',
    },
  ],
  'Bóng đèn': [
    {
      key: 'pole_external_ref',
      label: 'Gắn trên cột',
      required: true,
      example: 'CTA-001',
      rule: 'Chọn mã cột đã nhập ở sheet Cột điện.',
    },
    {
      key: 'fixture_type',
      label: 'Loại đèn',
      required: true,
      example: 'led_road_lamp',
      rule: 'Chọn trong danh sách, xem sheet Danh mục.',
    },
    {
      key: 'power_source',
      label: 'Nguồn điện',
      required: true,
      example: 'grid',
      rule: 'Chọn trong danh sách, xem sheet Danh mục.',
    },
    {
      key: 'lamp_watt',
      label: 'Công suất (W)',
      required: true,
      example: '100',
      rule: 'Số nguyên dương.',
    },
    {
      key: 'install_date',
      label: 'Ngày lắp',
      required: true,
      example: '2024-05-20',
      rule: 'Năm-tháng-ngày.',
    },
    {
      key: 'lamp_count',
      label: 'Số bóng',
      required: false,
      example: '1',
      rule: 'Từ 1 đến 4, để trống là 1.',
    },
    {
      key: 'removed_date',
      label: 'Ngày tháo',
      required: false,
      example: '',
      rule: 'Chỉ điền nếu bộ đèn đã tháo.',
    },
    {
      key: 'warranty_expiry',
      label: 'Hết bảo hành',
      required: false,
      example: '2027-05-20',
      rule: 'Năm-tháng-ngày.',
    },
    {
      key: 'note',
      label: 'Ghi chú',
      required: false,
      example: '',
      rule: '',
    },
  ],
};

export const CODE_MEANINGS: CodeMeaning[] = [
  { column: 'road_class', code: 'inter_commune', meaning: 'Đường liên xã' },
  { column: 'road_class', code: 'inter_village', meaning: 'Đường liên thôn' },
  { column: 'cabinet_source, feeder_source', code: 'verified', meaning: 'Đã kiểm tra tại hiện trường' },
  { column: 'cabinet_source, feeder_source', code: 'inferred', meaning: 'Suy ra từ sơ đồ, chưa kiểm tra' },
  { column: 'near_sensitive_poi', code: 'true', meaning: 'Gần điểm nhạy cảm' },
  { column: 'near_sensitive_poi', code: 'false', meaning: 'Không gần điểm nhạy cảm' },
  { column: 'fixture_type', code: 'led_road_lamp', meaning: 'Đèn LED chiếu sáng đường' },
  { column: 'power_source', code: 'grid', meaning: 'Điện lưới' },
];

const NAVY = 'FF1F3864';
const NAVY_SOFT = 'FFE8EDF5';
const SLATE = 'FF475569';
const LINE = 'FFCBD5E1';
const TEAL = 'FF5FC4B0';
const DARK_TEXT = 'FF1E293B';
const WHITE = 'FFFFFFFF';
const FONT_NAME = 'Arial';

const BOX_BORDER: Partial<Borders> = {
  top: { style: 'thin', color: { argb: LINE } },
  left: { style: 'thin', color: { argb: LINE } },
  bottom: { style: 'thin', color: { argb: LINE } },
  right: { style: 'thin', color: { argb: LINE } },
};

function colNumberToLetter(col: number): string {
  let letter = '';
  let temp = col;
  while (temp > 0) {
    const remainder = (temp - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
}

function styleGuideSheet(ws: Worksheet): void {
  ws.properties.tabColor = { argb: NAVY };
  ws.views = [{ showGridLines: false }];

  ws.getColumn(1).width = 90;
  for (let c = 2; c <= 5; c++) {
    ws.getColumn(c).width = 14;
  }

  // Dòng 1: tiêu đề chính
  const titleCell = ws.getCell(1, 1);
  if (titleCell.value !== null && titleCell.value !== undefined && String(titleCell.value).trim() !== '') {
    titleCell.font = { name: FONT_NAME, size: 16, bold: true, color: { argb: NAVY } };
    titleCell.alignment = { wrapText: true, vertical: 'middle' };
    ws.getRow(1).height = 28;
  }

  // Tìm dòng header của bảng đếm data_source: dòng đầu tiên (>= 2) có ô cột B là chuỗi
  let tableHeaderRow: number | null = null;
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < 2 || tableHeaderRow !== null) return;
    const bVal = row.getCell(2).value;
    if (typeof bVal === 'string' && bVal.trim().length > 0) {
      tableHeaderRow = rowNumber;
    }
  });

  // Định dạng bảng đếm data_source (nếu có) và ghi nhận phạm vi dòng bảng
  let tableEndRow: number | null = null;
  if (tableHeaderRow !== null) {
    const headerRow = ws.getRow(tableHeaderRow);
    let tableColCount = 5;
    headerRow.eachCell({ includeEmpty: false }, (_cell, colNumber) => {
      if (colNumber > tableColCount) tableColCount = colNumber;
    });

    for (let c = 1; c <= tableColCount; c++) {
      const cell = ws.getCell(tableHeaderRow, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
      cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: WHITE } };
      cell.alignment = { horizontal: c === 1 ? 'left' : 'center', vertical: 'middle' };
      cell.border = BOX_BORDER;
    }
    headerRow.height = 22;

    let dataRowIndex = 0;
    let r = tableHeaderRow + 1;
    const maxRow = ws.rowCount;
    while (r <= maxRow) {
      let hasData = false;
      for (let c = 1; c <= tableColCount; c++) {
        const val = ws.getCell(r, c).value;
        if (val !== null && val !== undefined && String(val).trim() !== '') {
          hasData = true;
          break;
        }
      }
      if (!hasData) break;

      const isEvenDataRow = dataRowIndex % 2 === 1;
      for (let c = 1; c <= tableColCount; c++) {
        const cell = ws.getCell(r, c);
        cell.border = BOX_BORDER;
        if (isEvenDataRow) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_SOFT } };
        }
        if (c === 1) {
          cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: NAVY } };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else {
          const val = cell.value;
          const num = typeof val === 'number' ? val : Number(val);
          const isNumeric = val !== null && val !== undefined && String(val).trim() !== '' && !Number.isNaN(num);
          const isZero = isNumeric && num === 0;
          const isPositive = isNumeric && num > 0;
          cell.font = {
            name: FONT_NAME,
            size: 10,
            bold: isPositive,
            color: { argb: isZero ? SLATE : DARK_TEXT },
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }
      ws.getRow(r).height = 20;
      tableEndRow = r;
      dataRowIndex += 1;
      r += 1;
    }
  }

  // Định dạng các dòng văn bản hướng dẫn (từ dòng 2 tới trước dòng header bảng, và sau bảng nếu có)
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < 2) return;
    if (
      tableHeaderRow !== null &&
      rowNumber >= tableHeaderRow &&
      rowNumber <= (tableEndRow ?? tableHeaderRow)
    ) {
      return;
    }

    const cellA = row.getCell(1);
    const rawVal = cellA.value;
    if (rawVal === null || rawVal === undefined) return;
    const text = String(rawVal);
    if (text.trim().length === 0) return;

    cellA.font = { name: FONT_NAME, size: 11, color: { argb: DARK_TEXT } };
    cellA.alignment = { wrapText: true, vertical: 'top' };
    row.height = Math.max(18, Math.ceil(text.length / 95) * 15);
  });
}

function formatNearSensitivePoiColumn(ws: Worksheet): void {
  const row1 = ws.getRow(1);
  let nearPoiCol: number | null = null;
  row1.eachCell((cell, colNumber) => {
    if (cell.value?.toString().trim() === 'near_sensitive_poi') {
      nearPoiCol = colNumber;
    }
  });

  if (nearPoiCol !== null) {
    for (let r = 2; r <= 5001; r++) {
      const cell = ws.getCell(r, nearPoiCol);
      cell.numFmt = '@';
      cell.alignment = {
        ...cell.alignment,
        horizontal: 'left',
        vertical: 'middle',
      };
    }
  }
}

/**
 * Gom các ô data validation đơn lẻ thành dải ô (ví dụ 'C2', 'C3', ..., 'C5001' -> 'C2:C5001').
 * ExcelJS khi đọc tệp sẽ rã dải ô thành từng ô đơn lẻ, rồi khi ghi lại dùng hàm
 * `optimiseDataValidations` sắp xếp theo strcmp (thứ tự chuỗi 'C10' < 'C2') dẫn đến
 * tạo ra 2 vùng chồng lấn (C10:C5001 và C2:C5001).
 * Khi lưu trữ dưới dạng key dải ô (có chứa dấu ':'), ExcelJS ghi trực tiếp sqref mà không bị rã/chồng vùng.
 */
function compactDataValidations(
  model: Record<string, DataValidation>,
): Record<string, DataValidation> {
  const colGroups: Record<
    string,
    { row: number; dv: DataValidation; address: string }[]
  > = {};

  const newModel: Record<string, DataValidation> = {};

  for (const [address, dv] of Object.entries(model)) {
    if (address.includes(':')) {
      newModel[address] = dv;
      continue;
    }
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match) continue;
    const [, colLetter, rowStr] = match;
    const row = parseInt(rowStr, 10);
    if (!colGroups[colLetter]) {
      colGroups[colLetter] = [];
    }
    colGroups[colLetter].push({ row, dv, address });
  }

  for (const [colLetter, items] of Object.entries(colGroups)) {
    if (items.length === 0) continue;
    items.sort((a, b) => a.row - b.row);

    let startRow = items[0].row;
    let endRow = items[0].row;
    let currentDv = items[0].dv;

    for (let i = 1; i < items.length; i++) {
      const item = items[i];
      const isSameValidation =
        item.dv === currentDv ||
        (item.dv.type === currentDv.type &&
          JSON.stringify(item.dv.formulae) ===
            JSON.stringify(currentDv.formulae));

      if (item.row === endRow + 1 && isSameValidation) {
        endRow = item.row;
      } else {
        const rangeKey =
          startRow === endRow
            ? `${colLetter}${startRow}`
            : `${colLetter}${startRow}:${colLetter}${endRow}`;
        newModel[rangeKey] = currentDv;
        startRow = item.row;
        endRow = item.row;
        currentDv = item.dv;
      }
    }
    const rangeKey =
      startRow === endRow
        ? `${colLetter}${startRow}`
        : `${colLetter}${startRow}:${colLetter}${endRow}`;
    newModel[rangeKey] = currentDv;
  }

  return newModel;
}

export async function normalizeSpreadsheetMlPrefix(
  input: ArrayBuffer,
): Promise<ArrayBuffer> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(input);

  const SPREADSHEETML_NS =
    'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const prefixRegex =
    /xmlns:([A-Za-z_][\w.-]*)="http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main"/;

  let modified = false;

  for (const [filePath, file] of Object.entries(zip.files)) {
    if (file.dir || !filePath.endsWith('.xml')) {
      continue;
    }

    const rawText = await file.async('string');
    let text = rawText;

    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }

    const match = text.match(prefixRegex);
    if (match) {
      const p = match[1];
      const hasDefaultSpreadsheetMlNs = text.includes(
        `xmlns="${SPREADSHEETML_NS}"`,
      );

      if (hasDefaultSpreadsheetMlNs) {
        text = text.replace(
          new RegExp(`\\s*xmlns:${p}="${SPREADSHEETML_NS}"`, 'g'),
          '',
        );
      } else {
        let replacedFirst = false;
        text = text.replace(
          new RegExp(`xmlns:${p}="${SPREADSHEETML_NS}"`, 'g'),
          () => {
            if (!replacedFirst) {
              replacedFirst = true;
              return `xmlns="${SPREADSHEETML_NS}"`;
            }
            return '';
          },
        );
      }

      text = text.replace(new RegExp(`<${p}:`, 'g'), '<');
      text = text.replace(new RegExp(`</${p}:`, 'g'), '</');
    }

    if (text !== rawText) {
      modified = true;
      zip.file(filePath, text);
    }
  }

  if (!modified) {
    return input;
  }

  return await zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
  });
}

export async function styleAssetWorkbook(
  template: ArrayBuffer,
  exported?: ArrayBuffer,
): Promise<ArrayBuffer> {
  const cleanTemplate = await normalizeSpreadsheetMlPrefix(template);
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(cleanTemplate);

  // 1. Tân trang các sheet tài sản có trong tệp mẫu
  for (const [sheetName, columns] of Object.entries(ASSET_SHEETS)) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) continue;

    ws.properties.tabColor = { argb: NAVY };
    ws.getRow(1).height = 30;
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const metaMap = new Map<string, AssetColumnDef>();
    for (const c of columns) {
      metaMap.set(c.key, c);
    }

    let maxColNum = 0;
    const row1 = ws.getRow(1);
    row1.eachCell((cell, colNumber) => {
      maxColNum = Math.max(maxColNum, colNumber);
      const key = cell.value?.toString();
      if (!key) return;
      const meta = metaMap.get(key);
      if (!meta) return;

      const { label, required, example, rule } = meta;

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: required ? NAVY : NAVY_SOFT },
      };
      cell.font = {
        name: FONT_NAME,
        size: 11,
        bold: true,
        color: { argb: required ? WHITE : NAVY },
      };
      cell.alignment = {
        vertical: 'middle',
        indent: 1,
      };
      cell.border = BOX_BORDER;

      const lines = [`${label} (${required ? 'bắt buộc' : 'tuỳ chọn'})`];
      if (rule) {
        lines.push(rule);
      }
      if (example) {
        lines.push(`Ví dụ: ${example}`);
      }
      cell.note = lines.join('\n');

      const colWidth = Math.min(Math.max(Math.max(key.length, example.length) + 4, 16), 44);
      ws.getColumn(colNumber).width = colWidth;
    });

    // Định dạng có điều kiện viền mảnh cho các dòng có dữ liệu: A2:{lastCol}5001
    const lastColLetter = colNumberToLetter(maxColNum || columns.length);
    const internalWs = ws as unknown as WorksheetInternal;
    internalWs.conditionalFormattings = [];
    ws.addConditionalFormatting({
      ref: `A2:${lastColLetter}5001`,
      rules: [
        {
          priority: 1,
          type: 'expression',
          formulae: [`COUNTA($A2:$${lastColLetter}2)>0`],
          style: {
            border: BOX_BORDER,
          },
        },
      ],
    });

    // Cập nhật thông điệp gợi ý data validation và gom dải ô để tránh lỗi chồng vùng của ExcelJS
    const rawDvModel = internalWs.dataValidations?.model;
    if (rawDvModel) {
      const compactedModel = compactDataValidations(rawDvModel);

      const colLetterToKey: Record<string, string> = {};
      row1.eachCell((cell, colNumber) => {
        const val = cell.value?.toString();
        if (val) {
          colLetterToKey[colNumberToLetter(colNumber)] = val;
        }
      });

      for (const [address, dv] of Object.entries(compactedModel)) {
        const colLetter = address.split(':')[0].replace(/[0-9]/g, '');
        const key = colLetterToKey[colLetter];
        if (!key) continue;
        const meta = metaMap.get(key);
        if (!meta) continue;

        dv.showInputMessage = true;
        dv.promptTitle = meta.label.slice(0, 32);
        dv.prompt = (meta.rule || 'Chọn trong danh sách.').slice(0, 255);
        dv.showErrorMessage = true;
        dv.errorTitle = 'Giá trị không hợp lệ';
        dv.error = 'Chỉ chọn giá trị có trong danh sách.';
      }

      if (internalWs.dataValidations) {
        internalWs.dataValidations.model = compactedModel;
      }
    }

    if (sheetName === 'Cột điện') {
      formatNearSensitivePoiColumn(ws);
    }
  }

  // 2. Dọn dẹp sheet cũ trước khi tạo lại (hỗ trợ tính bất biến / chạy lặp lại)
  const existingCachDien = wb.getWorksheet('Cách điền');
  if (existingCachDien) {
    wb.removeWorksheet(existingCachDien.id);
  }
  const existingDanhMuc = wb.getWorksheet('Danh mục');
  if (existingDanhMuc) {
    wb.removeWorksheet(existingDanhMuc.id);
  }
  const existingHuongDan = wb.getWorksheet('Hướng dẫn');
  if (existingHuongDan) {
    wb.removeWorksheet(existingHuongDan.id);
  }

  // 3. Nếu có tệp xuất (exported): nạp chỉ để đọc và chép dữ liệu sang khung tệp mẫu
  if (exported) {
    const cleanExported = await normalizeSpreadsheetMlPrefix(exported);
    const exportWb = new ExcelJS.Workbook();
    await exportWb.xlsx.load(cleanExported);

    // Chép dữ liệu các sheet tài sản
    for (const exportWs of exportWb.worksheets) {
      if (exportWs.name in ASSET_SHEETS) {
        const targetWs = wb.getWorksheet(exportWs.name);
        if (!targetWs) {
          throw new Error(
            `Sheet tài sản "${exportWs.name}" không có trong tệp mẫu`,
          );
        }

        // Đọc dòng 1 của tệp mẫu -> map tên cột -> số cột
        const targetKeyToCol = new Map<string, number>();
        targetWs.getRow(1).eachCell((cell, colNumber) => {
          if (cell.value != null) {
            targetKeyToCol.set(String(cell.value).trim(), colNumber);
          }
        });

        // Đọc dòng 1 của tệp xuất -> map số cột -> tên cột
        const exportColToKey = new Map<number, string>();
        exportWs.getRow(1).eachCell((cell, colNumber) => {
          if (cell.value != null) {
            const key = String(cell.value).trim();
            exportColToKey.set(colNumber, key);
          }
        });

        // Dọn dữ liệu cũ dòng >= 2 nếu có
        for (let r = 2; r <= targetWs.rowCount; r++) {
          targetWs.getRow(r).eachCell((cell) => {
            cell.value = null;
          });
        }

        // Chép giá trị mọi ô dòng >= 2 sang ô cùng dòng, cột theo TÊN trong sheet mẫu
        exportWs.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber < 2) return;
          row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const key = exportColToKey.get(colNumber);
            if (!key) return;
            const targetCol = targetKeyToCol.get(key);
            if (!targetCol) return;
            let val = cell.value;
            if (key === 'near_sensitive_poi') {
              if (typeof val === 'boolean') {
                val = val ? 'true' : 'false';
              } else if (typeof val === 'string') {
                const lower = val.trim().toLowerCase();
                if (lower === 'true' || lower === 'false') {
                  val = lower;
                }
              }
            }
            targetWs.getCell(rowNumber, targetCol).value = val;
          });
        });

        if (exportWs.name === 'Cột điện') {
          formatNearSensitivePoiColumn(targetWs);
        }
      }
    }

    // Chép sheet Hướng dẫn và Không xuất (nếu có trong tệp xuất)
    for (const specialName of ['Hướng dẫn', 'Không xuất'] as const) {
      const exportSpecialWs = exportWb.getWorksheet(specialName);
      if (!exportSpecialWs) continue;

      const specialWs = wb.addWorksheet(specialName);
      if (specialName === 'Hướng dẫn') {
        exportSpecialWs.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            specialWs.getCell(rowNumber, colNumber).value = cell.value;
          });
        });
        styleGuideSheet(specialWs);
      } else {
        specialWs.getColumn(1).width = 100;
        const maxCols = Math.max(20, exportSpecialWs.columnCount || 0);
        for (let c = 2; c <= maxCols; c++) {
          specialWs.getColumn(c).width = 20;
        }

        exportSpecialWs.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const targetCell = specialWs.getCell(rowNumber, colNumber);
            targetCell.value = cell.value;
            if (colNumber === 1) {
              targetCell.alignment = { wrapText: true, vertical: 'top' };
            }
          });
        });
      }
    }
  }

  // 3. Tạo sheet 'Cách điền'
  const guideWs = wb.addWorksheet('Cách điền');
  guideWs.properties.tabColor = { argb: TEAL };
  const guideColWidths = [16, 24, 26, 11, 34, 60];
  guideColWidths.forEach((w, idx) => {
    guideWs.getColumn(idx + 1).width = w;
  });

  guideWs.getCell('A1').value = 'Mẫu nạp tài sản chiếu sáng';
  guideWs.getCell('A1').font = { name: FONT_NAME, size: 16, bold: true, color: { argb: NAVY } };
  guideWs.getRow(1).height = 28;

  guideWs.getCell('A2').value =
    'Điền dữ liệu vào 5 sheet tài sản rồi nạp cả tệp ở trang Quản lý tài sản. Sheet nào chưa có dữ liệu thì để trống.';
  guideWs.getCell('A2').font = { name: FONT_NAME, size: 11, color: { argb: SLATE } };

  let guideRow = 4;
  guideWs.getCell(`A${guideRow}`).value = 'Các bước';
  guideWs.getCell(`A${guideRow}`).font = { name: FONT_NAME, size: 12, bold: true, color: { argb: NAVY } };

  const steps = [
    'Điền lần lượt Tuyến đường, Tủ điện, Mạch điện, Cột điện, Bóng đèn. Sheet sau chọn mã từ sheet trước.',
    'Giữ nguyên tên sheet và dòng tiêu đề. Không thêm dòng ghi chú hay dòng ví dụ dưới tiêu đề.',
    'Di chuột vào ô tiêu đề để xem nghĩa và ví dụ của từng cột. Giá trị dropdown giải nghĩa ở sheet Danh mục.',
    'Nạp tệp và chọn nguồn dữ liệu. Có lỗi thì không dòng nào được lưu, sửa theo danh sách lỗi rồi nạp lại.',
  ];
  steps.forEach((text, i) => {
    guideRow += 1;
    guideWs.getCell(`A${guideRow}`).value = `Bước ${i + 1}`;
    guideWs.getCell(`A${guideRow}`).font = { name: FONT_NAME, size: 11, bold: true, color: { argb: SLATE } };
    guideWs.getCell(`B${guideRow}`).value = text;
    guideWs.getCell(`B${guideRow}`).font = { name: FONT_NAME, size: 11 };
    guideWs.mergeCells(guideRow, 2, guideRow, 6);
  });

  guideRow += 2;
  const legend = guideWs.getCell(`A${guideRow}`);
  legend.value = 'Bắt buộc';
  legend.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  legend.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: WHITE } };
  legend.alignment = { horizontal: 'center', vertical: 'middle' };

  const optional = guideWs.getCell(`B${guideRow}`);
  optional.value = 'Tuỳ chọn';
  optional.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_SOFT } };
  optional.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: NAVY } };
  optional.alignment = { horizontal: 'center', vertical: 'middle' };

  const legendDesc = guideWs.getCell(`C${guideRow}`);
  legendDesc.value = 'Màu ô tiêu đề trong các sheet tài sản';
  legendDesc.font = { name: FONT_NAME, size: 10, color: { argb: SLATE } };
  legendDesc.alignment = { vertical: 'middle' };

  guideRow += 2;
  const head = ['Sheet', 'Cột', 'Nghĩa', 'Bắt buộc', 'Ví dụ', 'Cách điền'];
  head.forEach((text, i) => {
    const c = guideWs.getCell(guideRow, i + 1);
    c.value = text;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: WHITE } };
    c.alignment = { vertical: 'middle' };
    c.border = BOX_BORDER;
  });
  guideWs.getRow(guideRow).height = 22;
  const tableHeadRow = guideRow;

  for (const [sheetName, columns] of Object.entries(ASSET_SHEETS)) {
    const first = guideRow + 1;
    for (const col of columns) {
      guideRow += 1;
      const values = [
        guideRow === first ? sheetName : '',
        col.key,
        col.label,
        col.required ? 'Có' : '',
        col.example,
        col.rule,
      ];
      values.forEach((val, i) => {
        const c = guideWs.getCell(guideRow, i + 1);
        c.value = val;
        c.font = {
          name: FONT_NAME,
          size: 10,
          bold: i === 0,
          color: { argb: i === 0 ? NAVY : DARK_TEXT },
        };
        c.alignment = { wrapText: true, vertical: 'top' };
        c.border = BOX_BORDER;
      });
    }
    guideWs.mergeCells(first, 1, guideRow, 1);
  }

  guideWs.views = [
    { state: 'frozen', ySplit: tableHeadRow, showGridLines: false },
  ];

  guideRow += 2;
  guideWs.getCell(`A${guideRow}`).value = 'Lưu ý';
  guideWs.getCell(`A${guideRow}`).font = { name: FONT_NAME, size: 12, bold: true, color: { argb: NAVY } };

  const notes = [
    'Toạ độ viết dạng POINT(kinh_độ vĩ_độ), kinh độ đứng trước, ví dụ POINT(106.7015 10.7768).',
    'Ngày viết dạng năm-tháng-ngày (2024-05-20) hoặc chọn ngày trong Excel, không kèm giờ.',
    'Mỗi sheet tối đa 5000 dòng, tệp tối đa 10 MB.',
    'Bộ đèn đã có trên hệ thống không sửa được bằng tệp, hãy sửa trong trang Quản lý tài sản.',
  ];
  notes.forEach((text) => {
    guideRow += 1;
    guideWs.getCell(`A${guideRow}`).value = text;
    guideWs.getCell(`A${guideRow}`).font = { name: FONT_NAME, size: 10, color: { argb: SLATE } };
    guideWs.mergeCells(guideRow, 1, guideRow, 6);
  });

  // 4. Tạo sheet 'Danh mục' ở cuối
  const catWs = wb.addWorksheet('Danh mục');
  catWs.properties.tabColor = { argb: 'FF94A3B8' };
  catWs.views = [{ showGridLines: false }];
  const catColWidths = [30, 18, 36];
  catColWidths.forEach((w, i) => {
    catWs.getColumn(i + 1).width = w;
  });

  catWs.getCell('A1').value = 'Giá trị trong các ô dropdown';
  catWs.getCell('A1').font = { name: FONT_NAME, size: 14, bold: true, color: { argb: NAVY } };

  const catHeaders = ['Cột', 'Giá trị nhập', 'Nghĩa'];
  catHeaders.forEach((text, i) => {
    const c = catWs.getCell(3, i + 1);
    c.value = text;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: WHITE } };
    c.border = BOX_BORDER;
  });

  CODE_MEANINGS.forEach((item, idx) => {
    const r = idx + 4;
    const vals = [item.column, item.code, item.meaning];
    vals.forEach((val, i) => {
      const c = catWs.getCell(r, i + 1);
      c.value = val;
      c.font = { name: FONT_NAME, size: 10, color: { argb: DARK_TEXT } };
      c.border = BOX_BORDER;
    });
  });

  // 6. Sắp xếp thứ tự các sheet và đặt sheet mặc định mở sẵn
  const orderedSheetNames: string[] = [];
  orderedSheetNames.push('Cách điền');
  if (exported && wb.getWorksheet('Hướng dẫn')) {
    orderedSheetNames.push('Hướng dẫn');
  }
  for (const name of Object.keys(ASSET_SHEETS)) {
    if (wb.getWorksheet(name)) {
      orderedSheetNames.push(name);
    }
  }
  if (wb.getWorksheet('Danh mục')) {
    orderedSheetNames.push('Danh mục');
  }
  if (exported && wb.getWorksheet('Không xuất')) {
    orderedSheetNames.push('Không xuất');
  }
  for (const ws of wb.worksheets) {
    if (!orderedSheetNames.includes(ws.name)) {
      orderedSheetNames.push(ws.name);
    }
  }

  orderedSheetNames.forEach((name, index) => {
    const ws = wb.getWorksheet(name);
    if (ws) {
      (ws as unknown as WorksheetInternal).orderNo = index + 1;
    }
  });

  wb.worksheets.sort((a, b) => {
    const idxA = orderedSheetNames.indexOf(a.name);
    const idxB = orderedSheetNames.indexOf(b.name);
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });

  wb.views = [
    {
      x: 0,
      y: 0,
      width: 10000,
      height: 20000,
      firstSheet: 0,
      activeTab: 0,
      visibility: 'visible',
    },
  ];

  const buffer = await wb.xlsx.writeBuffer();
  const uint8 = new Uint8Array(buffer);
  return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
}

export function saveWorkbookFile(buffer: ArrayBuffer, fileName: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
