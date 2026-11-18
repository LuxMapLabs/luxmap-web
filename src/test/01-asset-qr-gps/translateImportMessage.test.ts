import { describe, it, expect } from 'vitest'
import { translateImportMessage } from '../../utils/assets/translateImportMessage'

describe('translateImportMessage Test Suite', () => {
  const cases: [string, string, string][] = [
    [
      'Required cell empty',
      'Required, but the cell is empty.',
      'Ô bắt buộc đang trống.',
    ],
    [
      'Geometry is required',
      'Geometry is required.',
      'Ô bắt buộc đang trống.',
    ],
    [
      'Not a whole number of at least N',
      "'abc' is not a whole number of at least 10.",
      "'abc' phải là số nguyên từ 10 trở lên.",
    ],
    [
      'Not a whole number from A to B',
      "'99' is not a whole number from 1 to 10.",
      "'99' phải là số nguyên từ 1 đến 10.",
    ],
    [
      'Not a whole number',
      "'abc' is not a whole number.",
      "'abc' không phải số nguyên.",
    ],
    [
      'Not a date in YYYY-MM-DD form',
      "'31/01/2026' is not a date in YYYY-MM-DD form.",
      "'31/01/2026' không đúng dạng ngày YYYY-MM-DD, ví dụ 2026-01-31.",
    ],
    [
      'Not true or false',
      "'yes' is not true or false.",
      "'yes' phải là true hoặc false.",
    ],
    [
      'Not one of list',
      "'foo' is not one of: a, b, c.",
      "'foo' không phải mã hợp lệ. Chọn một trong: a, b, c.",
    ],
    [
      'Not valid WKT with extra info',
      'Not valid WKT: parsing error near POINT(foo)',
      'Không đọc được WKT. Ví dụ đúng: POINT(106.49 10.97).',
    ],
    [
      'Coordinate outside EPSG:4326 without swapped',
      'Coordinate (190.5 45.0) is outside EPSG:4326: longitude must be within ±180 and latitude within ±90.',
      'Toạ độ (190.5 45.0) nằm ngoài phạm vi: kinh độ trong ±180, vĩ độ trong ±90.',
    ],
    [
      'Coordinate outside EPSG:4326 with swapped hint',
      'Coordinate (10.97 106.49) is outside EPSG:4326: longitude must be within ±180 and latitude within ±90. The pair looks swapped: longitude comes first, e.g. POINT(106.49 10.97).',
      'Toạ độ (10.97 106.49) nằm ngoài phạm vi: kinh độ trong ±180, vĩ độ trong ±90. Có vẻ bị đảo thứ tự, kinh độ phải đứng trước, ví dụ POINT(106.49 10.97).',
    ],
    [
      'Coordinates must be finite numbers',
      'Coordinates must be finite numbers.',
      'Toạ độ phải là số hợp lệ.',
    ],
    [
      'Geometry is empty',
      'Geometry is empty.',
      'Hình học đang rỗng.',
    ],
    [
      'LineString needs at least two positions',
      'A LineString needs at least two positions.',
      'LINESTRING cần ít nhất hai điểm.',
    ],
    [
      'Geometry type not supported',
      "Geometry type 'Polygon' is not supported; expected Point or LineString.",
      "Kiểu hình 'Polygon' không được hỗ trợ, chỉ nhận POINT hoặc LINESTRING.",
    ],
    [
      'Expected type but value is type (uppercase)',
      'Expected a Point, but the value is a LineString.',
      'Cần POINT nhưng ô đang là LINESTRING.',
    ],
    [
      'Matches nothing with trailing info',
      "'CAB-01' matches nothing. Sheet Cabinets does not contain this external_ref.",
      "Không tìm thấy mã 'CAB-01'. Kiểm tra lại mã, hoặc thêm dòng đó vào sheet tương ứng trong cùng tệp.",
    ],
    [
      'Exists in more than one commune',
      "'CAB-02' exists in more than one commune you can see; ambiguity detected.",
      "Mã 'CAB-02' có ở nhiều xã, không xác định được đúng tài sản.",
    ],
    [
      'Duplicate external_ref',
      'Duplicate external_ref; first defined on row 5.',
      'Trùng mã với dòng 5.',
    ],
    [
      'Segment route requires length',
      'Required when the segment has a route (geom_wkt), but the cell is empty.',
      'Tuyến có hình (geom_wkt) thì phải nhập chiều dài.',
    ],
    [
      'Pole without geom_wkt needs note',
      'A pole without geom_wkt needs a note describing where it is',
      'Cột chưa có GPS phải ghi note mô tả vị trí.',
    ],
    [
      'Note character limit',
      'A note is at most 255 characters; this one has 300.',
      'Ghi chú tối đa 255 ký tự, ô này có 300.',
    ],
    [
      'Replaced pole note',
      'Replaced the pole\'s previous note: "Cột đối diện số 12"',
      'Đã thay ghi chú cũ của cột: "Cột đối diện số 12"',
    ],
    [
      'Removed date before install date',
      "'2025-01-01' is before install_date '2025-06-01'.",
      "Ngày tháo '2025-01-01' trước ngày lắp '2025-06-01'.",
    ],
    [
      'Fitting match ambiguous',
      'The fitting match (pole, install_date) is ambiguous.',
      'Cột này có nhiều bộ đèn cùng ngày lắp, không xác định được dòng này.',
    ],
    [
      'Different COL change fitting',
      'Different lamp_watt; change a fitting through the asset form',
      'Khác dữ liệu bộ đèn đã có (lamp_watt). Muốn đổi thì sửa trên trang tài sản.',
    ],
    [
      'Fitting already in service',
      'That pole already has a fitting in service. Please set removed_date first.',
      'Cột này đang có bộ đèn hoạt động. Ghi ngày tháo bộ đèn cũ trước rồi mới nạp bộ đèn thay thế.',
    ],
    [
      'Belongs to different commune from feeder',
      "'POLE-01' belongs to commune 'A', not to the feeder's commune 'B'.",
      "'POLE-01' thuộc xã khác với mạch này.",
    ],
    [
      'Belongs to different commune from pole',
      "'FIX-01' belongs to commune 'A', not to the pole's commune 'B'.",
      "'FIX-01' thuộc xã khác với cột này.",
    ],
    [
      'Device switches feeder cannot move',
      "Device 'DEV-01' in the feeder's cabinet switches it, so the feeder cannot move to another cabinet.",
      "Thiết bị 'DEV-01' trong tủ đang điều khiển mạch này, không chuyển mạch sang tủ khác được.",
    ],
    [
      'Column missing from header row',
      'Column missing from the header row.',
      'Thiếu cột bắt buộc.',
    ],
    [
      'Duplicate column in header row',
      'Duplicate column in the header row.',
      'Tiêu đề bị lặp.',
    ],
    [
      'Column not supported in sheet',
      "Column 'unknown_col' is not supported in this sheet.",
      'Cột không thuộc sheet này. Xoá cột hoặc đổi về tên trong tệp mẫu.',
    ],
    [
      'Nonempty column has no header',
      'A nonempty column has no header.',
      'Có cột có dữ liệu nhưng thiếu tiêu đề.',
    ],
    [
      'Duplicate asset sheet',
      'Duplicate asset sheet.',
      'Sheet tài sản bị lặp.',
    ],
    [
      'No asset sheet found',
      'No asset sheet found',
      'Không tìm thấy sheet tài sản nào. Dùng tệp mẫu để giữ đúng tên sheet.',
    ],
    [
      'IoT import not supported yet',
      'IoT import is not supported yet',
      'Sheet IoT không nạp được qua tệp này. Xoá dữ liệu trong sheet IoT.',
    ],
    [
      'Worksheet data rows limit',
      'A worksheet may have at most 1000 data rows.',
      'Mỗi sheet tối đa 1000 dòng dữ liệu.',
    ],
    [
      'Worksheet columns limit',
      'A worksheet may have at most 50 columns.',
      'Mỗi sheet tối đa 50 cột.',
    ],
    [
      'Cell characters limit',
      'A cell may have at most 32767 characters.',
      'Mỗi ô tối đa 32767 ký tự.',
    ],
    [
      'Shared string characters limit',
      'A shared string may have at most 32767 characters.',
      'Mỗi ô tối đa 32767 ký tự.',
    ],
    [
      'Excel cell error',
      'Excel cell error: #VALUE!.',
      'Ô đang báo lỗi Excel (#VALUE!). Sửa công thức hoặc nhập giá trị.',
    ],
    [
      'Date serial contains time',
      'A date serial must not contain a time.',
      'Ô ngày không được có giờ.',
    ],
    [
      'Invalid date serial',
      'Invalid date serial.',
      'Ngày không hợp lệ.',
    ],
  ]

  it.each(cases)('%s: "%s" → "%s"', (_name, input, expected) => {
    expect(translateImportMessage(input)).toBe(expected)
  })

  it('câu lạ → trả nguyên câu gốc (đã trim)', () => {
    const unknown = 'Some random backend internal error.'
    expect(translateImportMessage(unknown)).toBe(unknown)
  })

  it('null/undefined/"" → ""', () => {
    expect(translateImportMessage(null)).toBe('')
    expect(translateImportMessage(undefined)).toBe('')
    expect(translateImportMessage('')).toBe('')
    expect(translateImportMessage('   ')).toBe('')
  })

  it('khoảng trắng thừa ở đầu/cuối được trim trước khi dịch', () => {
    expect(translateImportMessage('  Required, but the cell is empty.  ')).toBe(
      'Ô bắt buộc đang trống.'
    )
  })
})
