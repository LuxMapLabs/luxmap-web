type TranslationRule = [RegExp, (m: RegExpMatchArray) => string]

const TRANSLATION_RULES: TranslationRule[] = [
  // 1 & 2: Required
  [/^Required, but the cell is empty\.$/, () => 'Ô bắt buộc đang trống.'],
  [/^Geometry is required\.$/, () => 'Ô bắt buộc đang trống.'],

  // 3, 4, 5: Numbers (order: specific to generic)
  [
    /^'(.*)' is not a whole number of at least (.+)\.$/,
    (m) => `'${m[1]}' phải là số nguyên từ ${m[2]} trở lên.`,
  ],
  [
    /^'(.*)' is not a whole number from (.+) to (.+)\.$/,
    (m) => `'${m[1]}' phải là số nguyên từ ${m[2]} đến ${m[3]}.`,
  ],
  [/^'(.*)' is not a whole number\.$/, (m) => `'${m[1]}' không phải số nguyên.`],

  // 6: Date format
  [
    /^'(.*)' is not a date in YYYY-MM-DD form\.$/,
    (m) => `'${m[1]}' không đúng dạng ngày YYYY-MM-DD, ví dụ 2026-01-31.`,
  ],

  // 7: Boolean
  [/^'(.*)' is not true or false\.$/, (m) => `'${m[1]}' phải là true hoặc false.`],

  // 8: Enum list
  [
    /^'(.*)' is not one of:\s*(.+)\.$/,
    (m) => `'${m[1]}' không phải mã hợp lệ. Chọn một trong: ${m[2]}.`,
  ],

  // 9: WKT invalid
  [/^Not valid WKT:.*$/, () => 'Không đọc được WKT. Ví dụ đúng: POINT(106.49 10.97).'],

  // 10: Coordinate range & swapped
  [
    /^Coordinate \(([^)]+)\) is outside EPSG:4326: longitude must be within ±180 and latitude within ±90\.( The pair looks swapped: longitude comes first, e\.g\. POINT\(106\.49 10\.97\)\.)?$/,
    (m) =>
      m[2]
        ? `Toạ độ (${m[1]}) nằm ngoài phạm vi: kinh độ trong ±180, vĩ độ trong ±90. Có vẻ bị đảo thứ tự, kinh độ phải đứng trước, ví dụ POINT(106.49 10.97).`
        : `Toạ độ (${m[1]}) nằm ngoài phạm vi: kinh độ trong ±180, vĩ độ trong ±90.`,
  ],

  // 11, 12, 13: Geometry primitives
  [/^Coordinates must be finite numbers\.$/, () => 'Toạ độ phải là số hợp lệ.'],
  [/^Geometry is empty\.$/, () => 'Hình học đang rỗng.'],
  [/^A LineString needs at least two positions\.$/, () => 'LINESTRING cần ít nhất hai điểm.'],

  // 14: Geometry type
  [
    /^Geometry type '(.*)' is not supported; expected Point or LineString\.$/,
    (m) => `Kiểu hình '${m[1]}' không được hỗ trợ, chỉ nhận POINT hoặc LINESTRING.`,
  ],

  // 15: Expected vs actual geometry type (uppercase A & B)
  [
    /^Expected a (.+), but the value is a (.+)\.$/,
    (m) => `Cần ${m[1].toUpperCase()} nhưng ô đang là ${m[2].toUpperCase()}.`,
  ],

  // 16: Matches nothing
  [
    /^'(.*)' matches nothing\..*$/,
    (m) =>
      `Không tìm thấy mã '${m[1]}'. Kiểm tra lại mã, hoặc thêm dòng đó vào sheet tương ứng trong cùng tệp.`,
  ],

  // 17: Commune ambiguous
  [
    /^'(.*)' exists in more than one commune you can see;.*$/,
    (m) => `Mã '${m[1]}' có ở nhiều xã, không xác định được đúng tài sản.`,
  ],

  // 18: Duplicate ref
  [/^Duplicate external_ref; first defined on row (.+)\.$/, (m) => `Trùng mã với dòng ${m[1]}.`],

  // 19: Segment route needs length
  [
    /^Required when the segment has a route \(geom_wkt\), but the cell is empty\.$/,
    () => 'Tuyến có hình (geom_wkt) thì phải nhập chiều dài.',
  ],

  // 20, 21, 22: Pole note
  [
    /^A pole without geom_wkt needs a note describing where it is\.?$/,
    () => 'Cột chưa có GPS phải ghi note mô tả vị trí.',
  ],
  [
    /^A note is at most (.+) characters; this one has (.+)\.$/,
    (m) => `Ghi chú tối đa ${m[1]} ký tự, ô này có ${m[2]}.`,
  ],
  [/^Replaced the pole's previous note: "(.*)"$/, (m) => `Đã thay ghi chú cũ của cột: "${m[1]}"`],

  // 23, 24, 25, 26: Fixture / fitting constraints
  [
    /^'(.*)' is before install_date '(.*)'\.$/,
    (m) => `Ngày tháo '${m[1]}' trước ngày lắp '${m[2]}'.`,
  ],
  [
    /^The fitting match \(pole, install_date\) is ambiguous\.$/,
    () => 'Cột này có nhiều bộ đèn cùng ngày lắp, không xác định được dòng này.',
  ],
  [
    /^Different (.+); change a fitting through the asset form\.?$/,
    (m) => `Khác dữ liệu bộ đèn đã có (${m[1]}). Muốn đổi thì sửa trên trang tài sản.`,
  ],
  [
    /^That pole already has a fitting in service\..*$/,
    () =>
      'Cột này đang có bộ đèn hoạt động. Ghi ngày tháo bộ đèn cũ trước rồi mới nạp bộ đèn thay thế.',
  ],

  // 27, 28: Commune mismatch
  [
    /^'(.*)' belongs to commune '.*', not to the feeder's commune '.*'\.$/,
    (m) => `'${m[1]}' thuộc xã khác với mạch này.`,
  ],
  [
    /^'(.*)' belongs to commune '.*', not to the pole's commune '.*'\.$/,
    (m) => `'${m[1]}' thuộc xã khác với cột này.`,
  ],

  // 29: Feeder cabinet switch
  [
    /^Device '(.*)' in the feeder's cabinet switches it, so the feeder cannot move to another cabinet\.$/,
    (m) => `Thiết bị '${m[1]}' trong tủ đang điều khiển mạch này, không chuyển mạch sang tủ khác được.`,
  ],

  // 30, 31, 32, 33: Headers & columns
  [/^Column missing from the header row\.$/, () => 'Thiếu cột bắt buộc.'],
  [/^Duplicate column in the header row\.$/, () => 'Tiêu đề bị lặp.'],
  [
    /^Column '(.*)' is not supported in this sheet\.$/,
    () => 'Cột không thuộc sheet này. Xoá cột hoặc đổi về tên trong tệp mẫu.',
  ],
  [/^A nonempty column has no header\.$/, () => 'Có cột có dữ liệu nhưng thiếu tiêu đề.'],

  // 34, 35, 36: Sheets
  [/^Duplicate asset sheet\.$/, () => 'Sheet tài sản bị lặp.'],
  [
    /^No asset sheet found\.?$/,
    () => 'Không tìm thấy sheet tài sản nào. Dùng tệp mẫu để giữ đúng tên sheet.',
  ],
  [
    /^IoT import is not supported yet\.?$/,
    () => 'Sheet IoT không nạp được qua tệp này. Xoá dữ liệu trong sheet IoT.',
  ],

  // 37, 38, 39: Limits
  [/^A worksheet may have at most (.+) data rows\.$/, (m) => `Mỗi sheet tối đa ${m[1]} dòng dữ liệu.`],
  [/^A worksheet may have at most (.+) columns\.$/, (m) => `Mỗi sheet tối đa ${m[1]} cột.`],
  [
    /^A (?:cell|shared string) may have at most (.+) characters\.$/,
    (m) => `Mỗi ô tối đa ${m[1]} ký tự.`,
  ],

  // 40, 41, 42: Excel cells & dates
  [/^Excel cell error: (.+)\.$/, (m) => `Ô đang báo lỗi Excel (${m[1]}). Sửa công thức hoặc nhập giá trị.`],
  [/^A date serial must not contain a time\.$/, () => 'Ô ngày không được có giờ.'],
  [/^Invalid date serial\.$/, () => 'Ngày không hợp lệ.'],
]

export function translateImportMessage(message: string | null | undefined): string {
  if (message == null) return ''
  const trimmed = message.trim()
  if (!trimmed) return ''

  for (const [pattern, replacer] of TRANSLATION_RULES) {
    const match = trimmed.match(pattern)
    if (match) {
      return replacer(match)
    }
  }

  return trimmed
}
