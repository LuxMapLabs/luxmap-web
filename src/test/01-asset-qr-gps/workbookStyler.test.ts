// @vitest-environment node
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import type { CellValue, DataValidation, Worksheet } from 'exceljs';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  ASSET_SHEETS,
  normalizeSpreadsheetMlPrefix,
  styleAssetWorkbook,
} from '../../utils/assets/workbookStyler';

interface CellSnapshot {
  address: string;
  value: CellValue;
  type: string;
}

interface ValidationSnapshot {
  address: string;
  type?: string;
  formulae?: unknown[];
  prompt?: string;
  promptTitle?: string;
  showInputMessage?: boolean;
}

interface SheetSnapshot {
  row1: (CellValue | undefined)[];
  dataCells: CellSnapshot[];
  validations: ValidationSnapshot[];
}

interface WorkbookSnapshot {
  sheetNames: string[];
  assetSheets: Record<string, SheetSnapshot>;
  definedNames: { name: string; ranges: string[] }[];
}

interface WorksheetWithInternals extends Worksheet {
  dataValidations?: {
    model?: Record<string, DataValidation>;
  };
}

async function snapshot(buffer: ArrayBuffer): Promise<WorkbookSnapshot> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const sheetNames = wb.worksheets.map((w) => w.name);
  const assetSheets: Record<string, SheetSnapshot> = {};

  for (const sheetName of Object.keys(ASSET_SHEETS)) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) continue;

    const row1: (CellValue | undefined)[] = [];
    ws.getRow(1).eachCell((cell, colNumber) => {
      row1[colNumber] = cell.value;
    });

    const dataCells: CellSnapshot[] = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber < 2) return;
      row.eachCell((cell) => {
        dataCells.push({
          address: cell.address,
          value: cell.value,
          type: typeof cell.value,
        });
      });
    });

    const validations: ValidationSnapshot[] = [];
    const internalWs = ws as unknown as WorksheetWithInternals;
    const dvModel = internalWs.dataValidations?.model;
    if (dvModel) {
      for (const [address, dv] of Object.entries(dvModel)) {
        validations.push({
          address,
          type: dv.type,
          formulae: dv.formulae,
          prompt: dv.prompt,
          promptTitle: dv.promptTitle,
          showInputMessage: dv.showInputMessage,
        });
      }
    }

    assetSheets[sheetName] = {
      row1,
      dataCells,
      validations,
    };
  }

  const definedNames = wb.definedNames.model.map((d) => ({
    name: d.name,
    ranges: [...d.ranges],
  }));

  return {
    sheetNames,
    assetSheets,
    definedNames,
  };
}

function getOriginalTemplateBuffer(): ArrayBuffer {
  const filePath = path.resolve(process.cwd(), 'public/templates/assets-workbook.xlsx');
  const file = fs.readFileSync(filePath);
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
}

/**
 * Đọc danh sách vùng data validation (sqref) thực tế được ghi vào từng sheet trong XML của tệp xlsx
 * (kiểm tra độc lập không phụ thuộc vào bộ giải mã nội bộ của ExcelJS).
 */
async function extractValidationSqrefs(
  buffer: ArrayBuffer,
): Promise<Record<string, string[]>> {
  const zip = await JSZip.loadAsync(buffer);
  const relsXml =
    (await zip.file('xl/_rels/workbook.xml.rels')?.async('text')) || '';
  const wbXml = (await zip.file('xl/workbook.xml')?.async('text')) || '';

  const sheetMatches = Array.from(
    wbXml.matchAll(/<sheet\s+[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g),
  );

  const relMatches: Record<string, string> = {};
  for (const rel of relsXml.matchAll(/<Relationship\s+([^>]+)\/>/g)) {
    const idMatch = rel[1].match(/Id="([^"]+)"/);
    const targetMatch = rel[1].match(/Target="([^"]+)"/);
    if (idMatch && targetMatch) {
      relMatches[idMatch[1]] = targetMatch[1];
    }
  }

  const result: Record<string, string[]> = {};
  for (const [, name, rId] of sheetMatches) {
    const target = relMatches[rId];
    if (!target) continue;
    const cleanTarget = target.startsWith('/') ? target.slice(1) : target;
    const targetPath = cleanTarget.startsWith('xl/')
      ? cleanTarget
      : `xl/${cleanTarget}`;
    const sheetXml = await zip.file(targetPath)?.async('text');
    if (!sheetXml) continue;
    const sqrefs = Array.from(
      sheetXml.matchAll(/<dataValidation\s+[^>]*sqref="([^"]+)"/g),
    ).map((m) => m[1]);
    result[name] = sqrefs;
  }
  return result;
}

interface RangeInterval {
  col: string;
  start: number;
  end: number;
}

function parseRange(sqref: string): RangeInterval {
  const parts = sqref.split(':');
  const startMatch = parts[0].match(/^([A-Z]+)(\d+)$/);
  if (!startMatch) {
    throw new Error(`Invalid range: ${sqref}`);
  }
  const col = startMatch[1];
  const start = parseInt(startMatch[2], 10);
  const end =
    parts.length > 1
      ? parseInt(parts[1].match(/^([A-Z]+)(\d+)$/)![2], 10)
      : start;
  return { col, start, end };
}

function findOverlappingRanges(ranges: string[]): [string, string][] {
  const parsed = ranges.map((r) => ({ range: r, ...parseRange(r) }));
  const overlaps: [string, string][] = [];

  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i];
      const b = parsed[j];
      if (a.col === b.col) {
        if (Math.max(a.start, b.start) <= Math.min(a.end, b.end)) {
          overlaps.push([a.range, b.range]);
        }
      }
    }
  }

  return overlaps;
}

async function createMockExportBuffer(options?: {
  reorderColumns?: boolean;
  unknownColumn?: boolean;
}): Promise<ArrayBuffer> {
  const wbMock = new ExcelJS.Workbook();

  // 1. Sheet Tuyến đường
  const wsTuyen = wbMock.addWorksheet('Tuyến đường');
  if (options?.unknownColumn) {
    wsTuyen.getRow(1).values = ['external_ref', 'cot_khong_hop_le'];
    wsTuyen.getRow(2).values = ['TUYEN-01', 'Gia tri la'];
  } else if (options?.reorderColumns) {
    // Đảo thứ tự cột so với mẫu: mẫu là [external_ref, segment_name, road_class, length_m, geom_wkt]
    wsTuyen.getRow(1).values = [
      'road_class',
      'length_m',
      'segment_name',
      'geom_wkt',
      'external_ref',
    ];
    wsTuyen.getRow(2).values = [
      'inter_commune',
      1250,
      'Đường liên xã ĐX-01',
      'LINESTRING(106.70 10.77, 106.71 10.78)',
      '007',
    ];
  } else {
    wsTuyen.getRow(1).values = [
      'external_ref',
      'segment_name',
      'road_class',
      'length_m',
      'geom_wkt',
    ];
    wsTuyen.getRow(2).values = [
      '007',
      'Đường liên xã ĐX-01',
      'inter_commune',
      1250,
      'LINESTRING(106.70 10.77, 106.71 10.78)',
    ];
  }

  // 2. Sheet Tủ điện
  const wsTu = wbMock.addWorksheet('Tủ điện');
  wsTu.getRow(1).values = ['external_ref', 'cabinet_name', 'geom_wkt'];

  // 3. Sheet Mạch điện
  const wsMach = wbMock.addWorksheet('Mạch điện');
  wsMach.getRow(1).values = [
    'external_ref',
    'feeder_name',
    'cabinet_external_ref',
    'cabinet_source',
    'geom_wkt',
  ];

  // 4. Sheet Cột điện
  const wsCot = wbMock.addWorksheet('Cột điện');
  if (options?.reorderColumns) {
    wsCot.getRow(1).values = [
      'near_sensitive_poi',
      'note',
      'external_ref',
      'segment_external_ref',
      'feeder_external_ref',
      'feeder_source',
      'geom_wkt',
    ];
    wsCot.getCell('A2').value = 'true';
    wsCot.getCell('C2').value = 'CTA-001';
    wsCot.getCell('D2').value = '007';
    wsCot.getCell('A3').value = 'false';
    wsCot.getCell('C3').value = 'CTA-002';
    wsCot.getCell('A4').value = true;
    wsCot.getCell('C4').value = 'CTA-003';
    wsCot.getCell('C5').value = 'CTA-005';
    wsCot.getCell('B5').value = 'Trước cổng trường tiểu học';
  } else {
    wsCot.getRow(1).values = [
      'external_ref',
      'segment_external_ref',
      'feeder_external_ref',
      'feeder_source',
      'geom_wkt',
      'near_sensitive_poi',
      'note',
    ];
    wsCot.getCell('A2').value = 'CTA-001';
    wsCot.getCell('B2').value = '007';
    wsCot.getCell('A5').value = 'CTA-005';
    wsCot.getCell('G5').value = 'Trước cổng trường tiểu học';
  }

  // 5. Sheet Bóng đèn
  const wsBong = wbMock.addWorksheet('Bóng đèn');
  wsBong.getRow(1).values = [
    'pole_external_ref',
    'fixture_type',
    'power_source',
    'lamp_watt',
    'install_date',
    'lamp_count',
    'removed_date',
    'warranty_expiry',
    'note',
  ];
  wsBong.getCell('A2').value = 'CTA-001';
  wsBong.getCell('E2').value = '2024-05-20';

  // Sheet Hướng dẫn
  const wsHd = wbMock.addWorksheet('Hướng dẫn');
  wsHd.getCell('A1').value = 'LUXMAP · MẪU NẠP TÀI SẢN CHIẾU SÁNG';
  wsHd.getRow(13).values = [
    'data_source',
    'segments',
    'cabinets',
    'poles',
    'fixtures',
  ];
  wsHd.getRow(14).values = ['field', 4, 6, 105, 104];

  // Sheet Không xuất
  const wsKx = wbMock.addWorksheet('Không xuất');
  wsKx.getCell('A1').value = 'Dữ liệu không xuất';
  wsKx.getCell('B2').value = 9999;

  const rawBuffer = await wbMock.xlsx.writeBuffer();
  const uint8 = new Uint8Array(rawBuffer);
  const unprefixedAb = uint8.buffer.slice(
    uint8.byteOffset,
    uint8.byteOffset + uint8.byteLength,
  );

  const zip = await JSZip.loadAsync(unprefixedAb);
  const SPREADSHEETML_NS =
    'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

  let addedBom = false;
  for (const [filePath, file] of Object.entries(zip.files)) {
    if (file.dir || !filePath.endsWith('.xml')) continue;
    let text = await file.async('string');

    if (text.includes(`xmlns="${SPREADSHEETML_NS}"`)) {
      text = text.replace(
        `xmlns="${SPREADSHEETML_NS}"`,
        `xmlns:x="${SPREADSHEETML_NS}"`,
      );

      text = text.replace(
        /<(\/)?([a-zA-Z][\w]*)(?=[ >/])/g,
        (match, slash, tagName) => {
          if (tagName.toLowerCase() === 'xml') return match;
          return `<${slash || ''}x:${tagName}`;
        },
      );

      if (!addedBom && filePath.includes('sheet1.xml')) {
        text = '\uFEFF' + text;
        addedBom = true;
      }

      zip.file(filePath, text);
    }
  }

  return await zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
  });
}

describe('styleAssetWorkbook', { timeout: 30000 }, () => {
  it('tân trang tệp mẫu giữ nguyên cấu trúc BE và thêm sheet Cách điền, Danh mục', async () => {
    const origAb = getOriginalTemplateBuffer();
    const snapBefore = await snapshot(origAb);

    const styledAb = await styleAssetWorkbook(origAb);
    const snapAfter = await snapshot(styledAb);

    // Vị trí sheet
    expect(snapAfter.sheetNames[0]).toBe('Cách điền');
    expect(snapAfter.sheetNames).toContain('Danh mục');
    expect(snapAfter.sheetNames).not.toContain('Hướng dẫn');
    expect(snapAfter.sheetNames).not.toContain('IoT');

    // Defined names giữ nguyên
    expect(snapAfter.definedNames).toEqual(snapBefore.definedNames);

    // 5 sheet tài sản: dòng 1 và dữ liệu dòng >= 2 không đổi
    for (const sheetName of Object.keys(ASSET_SHEETS)) {
      expect(snapAfter.assetSheets[sheetName].row1).toEqual(
        snapBefore.assetSheets[sheetName].row1,
      );
      expect(snapAfter.assetSheets[sheetName].dataCells).toEqual(
        snapBefore.assetSheets[sheetName].dataCells,
      );
    }

    // Ô A1 sheet Cột điện có note chứa "Mã cột"
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(styledAb);
    const cotDienA1Note = wb.getWorksheet('Cột điện')?.getCell('A1').note;
    const noteText =
      typeof cotDienA1Note === 'string'
        ? cotDienA1Note
        : JSON.stringify(cotDienA1Note);
    expect(noteText).toContain('Mã cột');
  }, 30000);

  it('tân trang tệp xuất giả lập có tiền tố x: và đảo thứ tự cột đưa giá trị vào đúng cột theo tên', async () => {
    const origAb = getOriginalTemplateBuffer();
    const snapTemplateBefore = await snapshot(origAb);
    const mockExportAb = await createMockExportBuffer({ reorderColumns: true });

    // 1. Khẳng định exceljs load trực tiếp tệp xuất giả lập bị lỗi tiền tố
    const wbDirect = new ExcelJS.Workbook();
    await expect(wbDirect.xlsx.load(mockExportAb)).rejects.toThrow();

    // 2. styleAssetWorkbook(template, export) chạy thành công
    const styledExportAb = await styleAssetWorkbook(origAb, mockExportAb);
    const snapExportAfter = await snapshot(styledExportAb);

    // Thứ tự sheet của tệp xuất: 'Cách điền', 'Hướng dẫn', 5 sheet tài sản, 'Danh mục', 'Không xuất'
    expect(snapExportAfter.sheetNames[0]).toBe('Cách điền');
    expect(snapExportAfter.sheetNames[1]).toBe('Hướng dẫn');
    expect(snapExportAfter.sheetNames[2]).toBe('Tuyến đường');
    expect(snapExportAfter.sheetNames[3]).toBe('Tủ điện');
    expect(snapExportAfter.sheetNames[4]).toBe('Mạch điện');
    expect(snapExportAfter.sheetNames[5]).toBe('Cột điện');
    expect(snapExportAfter.sheetNames[6]).toBe('Bóng đèn');
    expect(snapExportAfter.sheetNames[7]).toBe('Danh mục');
    expect(snapExportAfter.sheetNames[8]).toBe('Không xuất');

    // Defined names giữ nguyên từ tệp mẫu
    expect(snapExportAfter.definedNames).toEqual(snapTemplateBefore.definedNames);

    // Kiểm tra trực tiếp các ô trong sheet Tuyến đường: giá trị vào đúng cột theo tên
    const wbExport = new ExcelJS.Workbook();
    await wbExport.xlsx.load(styledExportAb);
    const wsTuyen = wbExport.getWorksheet('Tuyến đường');
    expect(wsTuyen).toBeDefined();

    // Trong mẫu: Cột A = external_ref, B = segment_name, C = road_class, D = length_m, E = geom_wkt
    // Mặc dù trong tệp xuất cột bị đảo thứ tự: road_class ở col 1, external_ref ở col 5
    // Kết quả sau tân trang phải vào đúng cột theo tên:
    expect(wsTuyen?.getCell('A2').value).toBe('007');
    expect(typeof wsTuyen?.getCell('A2').value).toBe('string');
    expect(wsTuyen?.getCell('B2').value).toBe('Đường liên xã ĐX-01');
    expect(wsTuyen?.getCell('C2').value).toBe('inter_commune');
    expect(wsTuyen?.getCell('D2').value).toBe(1250);
    expect(typeof wsTuyen?.getCell('D2').value).toBe('number');
    expect(wsTuyen?.getCell('E2').value).toBe(
      'LINESTRING(106.70 10.77, 106.71 10.78)',
    );

    // Cột điện: ô '007' vẫn là chuỗi string
    const cellCot007 = wbExport.getWorksheet('Cột điện')?.getCell('B2');
    expect(cellCot007?.value).toBe('007');
    expect(typeof cellCot007?.value).toBe('string');

    // Sheet Hướng dẫn và Không xuất
    const wsHd = wbExport.getWorksheet('Hướng dẫn');
    expect(wsHd?.getCell('A1').value).toBe('LUXMAP · MẪU NẠP TÀI SẢN CHIẾU SÁNG');
    expect(wsHd?.getColumn(1).width).toBe(100);

    const cellKhongXuat = wbExport.getWorksheet('Không xuất')?.getCell('B2');
    expect(cellKhongXuat?.value).toBe(9999);
  }, 30000);

  it('tệp xuất có cột lạ sẽ khiến styleAssetWorkbook ném lỗi (reject)', async () => {
    const origAb = getOriginalTemplateBuffer();
    const invalidExportAb = await createMockExportBuffer({
      unknownColumn: true,
    });

    await expect(
      styleAssetWorkbook(origAb, invalidExportAb),
    ).rejects.toThrow();
  }, 30000);

  it('giữ nguyên số lượng, vùng và công thức data validation, bổ sung prompt hướng dẫn', async () => {
    const origAb = getOriginalTemplateBuffer();
    const snapBefore = await snapshot(origAb);

    const styledAb = await styleAssetWorkbook(origAb);
    const snapAfter = await snapshot(styledAb);

    for (const sheetName of ['Tuyến đường', 'Mạch điện', 'Cột điện', 'Bóng đèn']) {
      const beforeVals = snapBefore.assetSheets[sheetName].validations;
      const afterVals = snapAfter.assetSheets[sheetName].validations;

      expect(afterVals.length).toBe(beforeVals.length);

      const beforeByAddr = new Map(beforeVals.map((v) => [v.address, v]));
      for (const afterVal of afterVals) {
        const beforeVal = beforeByAddr.get(afterVal.address);
        expect(beforeVal).toBeDefined();
        expect(afterVal.type).toBe(beforeVal?.type);
        expect(afterVal.formulae).toEqual(beforeVal?.formulae);

        // Có prompt và promptTitle
        expect(afterVal.prompt).toBeTruthy();
        expect(afterVal.promptTitle).toBeTruthy();
        expect(afterVal.showInputMessage).toBe(true);
      }
    }
  }, 30000);

  it('không có 2 vùng data validation nào chồng nhau trên cùng sheet và tập vùng = tập vùng gốc', async () => {
    const origAb = getOriginalTemplateBuffer();
    const styledAb = await styleAssetWorkbook(origAb);

    const origSqrefs = await extractValidationSqrefs(origAb);
    const styledSqrefs = await extractValidationSqrefs(styledAb);

    for (const sheetName of Object.keys(ASSET_SHEETS)) {
      const sheetRanges = styledSqrefs[sheetName] || [];
      const origRanges = origSqrefs[sheetName] || [];

      // 1. Không có 2 vùng nào chồng nhau trên cùng sheet
      const overlaps = findOverlappingRanges(sheetRanges);
      expect(
        overlaps,
        `Sheet "${sheetName}" có vùng data validation chồng nhau: ${JSON.stringify(overlaps)}`,
      ).toHaveLength(0);

      // 2. Tập vùng kết quả phải bằng tập vùng gốc
      expect(sheetRanges.slice().sort()).toEqual(origRanges.slice().sort());
    }
  }, 30000);

  it('chạy hai lần liên tiếp (idempotency) không làm đổi dữ liệu và không nhân đôi sheet', async () => {
    const origAb = getOriginalTemplateBuffer();
    const styledOnceAb = await styleAssetWorkbook(origAb);
    const snapOnce = await snapshot(styledOnceAb);

    const styledTwiceAb = await styleAssetWorkbook(styledOnceAb);
    const snapTwice = await snapshot(styledTwiceAb);

    // Không nhân đôi sheet
    expect(snapTwice.sheetNames).toEqual(snapOnce.sheetNames);

    // Defined names không đổi
    expect(snapTwice.definedNames).toEqual(snapOnce.definedNames);

    // Dòng 1 và dữ liệu các ô không đổi
    for (const sheetName of Object.keys(ASSET_SHEETS)) {
      expect(snapTwice.assetSheets[sheetName].row1).toEqual(
        snapOnce.assetSheets[sheetName].row1,
      );
      expect(snapTwice.assetSheets[sheetName].dataCells).toEqual(
        snapOnce.assetSheets[sheetName].dataCells,
      );
      expect(snapTwice.assetSheets[sheetName].validations.length).toEqual(
        snapOnce.assetSheets[sheetName].validations.length,
      );
    }

    // Kiểm tra vùng sqref sau 2 lần chạy vẫn khớp và không chồng nhau
    const origSqrefs = await extractValidationSqrefs(origAb);
    const twiceSqrefs = await extractValidationSqrefs(styledTwiceAb);
    for (const sheetName of Object.keys(ASSET_SHEETS)) {
      const sheetRanges = twiceSqrefs[sheetName] || [];
      const origRanges = origSqrefs[sheetName] || [];
      expect(findOverlappingRanges(sheetRanges)).toHaveLength(0);
      expect(sheetRanges.slice().sort()).toEqual(origRanges.slice().sort());
    }
  }, 30000);

  it('normalizeSpreadsheetMlPrefix trả về đúng buffer đầu vào khi template không có tiền tố', async () => {
    const origAb = getOriginalTemplateBuffer();
    const resultAb = await normalizeSpreadsheetMlPrefix(origAb);
    expect(resultAb).toBe(origAb);
  });

  it('template: ô near_sensitive_poi dòng 2 và 5001 có numFmt === "@" và alignment.horizontal === "left", dòng 1 giữ nguyên fill', async () => {
    const origAb = getOriginalTemplateBuffer();
    const styledAb = await styleAssetWorkbook(origAb);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(styledAb);

    const wsCot = wb.getWorksheet('Cột điện');
    expect(wsCot).toBeDefined();

    let nearPoiCol = -1;
    wsCot!.getRow(1).eachCell((cell, colNumber) => {
      if (cell.value?.toString().trim() === 'near_sensitive_poi') {
        nearPoiCol = colNumber;
      }
    });
    expect(nearPoiCol).toBeGreaterThan(0);

    // Ô tiêu đề dòng 1 giữ nguyên fill
    const cell1 = wsCot!.getCell(1, nearPoiCol);
    expect(cell1.fill).toBeDefined();
    expect((cell1.fill as { fgColor?: { argb?: string } })?.fgColor?.argb).toBeTruthy();

    // Dòng 2 và dòng 5001 có numFmt === '@' và alignment.horizontal === 'left'
    const cell2 = wsCot!.getCell(2, nearPoiCol);
    expect(cell2.numFmt).toBe('@');
    expect(cell2.alignment?.horizontal).toBe('left');
    expect(cell2.alignment?.vertical).toBe('middle');

    const cell5001 = wsCot!.getCell(5001, nearPoiCol);
    expect(cell5001.numFmt).toBe('@');
    expect(cell5001.alignment?.horizontal).toBe('left');
    expect(cell5001.alignment?.vertical).toBe('middle');
  });

  it('export giả có near_sensitive_poi = "true"/"false" (chuỗi) ở cột đổi vị trí → sau tân trang giá trị vẫn là chuỗi, numFmt === "@"', async () => {
    const origAb = getOriginalTemplateBuffer();
    const mockExportAb = await createMockExportBuffer({ reorderColumns: true });

    const styledAb = await styleAssetWorkbook(origAb, mockExportAb);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(styledAb);

    const wsCot = wb.getWorksheet('Cột điện');
    expect(wsCot).toBeDefined();

    let nearPoiCol = -1;
    wsCot!.getRow(1).eachCell((cell, colNumber) => {
      if (cell.value?.toString().trim() === 'near_sensitive_poi') {
        nearPoiCol = colNumber;
      }
    });
    expect(nearPoiCol).toBeGreaterThan(0);

    // Dòng 2 có giá trị 'true' (chuỗi)
    const cell2 = wsCot!.getCell(2, nearPoiCol);
    expect(cell2.value).toBe('true');
    expect(typeof cell2.value).toBe('string');
    expect(cell2.numFmt).toBe('@');
    expect(cell2.alignment?.horizontal).toBe('left');

    // Dòng 3 có giá trị 'false' (chuỗi)
    const cell3 = wsCot!.getCell(3, nearPoiCol);
    expect(cell3.value).toBe('false');
    expect(typeof cell3.value).toBe('string');
    expect(cell3.numFmt).toBe('@');
    expect(cell3.alignment?.horizontal).toBe('left');

    // Dòng 4 BE xuất boolean true -> sau tân trang được chuyển thành chuỗi 'true'
    const cell4 = wsCot!.getCell(4, nearPoiCol);
    expect(cell4.value).toBe('true');
    expect(typeof cell4.value).toBe('string');
    expect(cell4.numFmt).toBe('@');
  });
});
