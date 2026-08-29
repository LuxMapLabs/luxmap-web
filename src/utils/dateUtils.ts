/**
 * LuxMap Date & Date Range Utilities
 * Xử lý chính xác ngày, tháng, năm, năm nhuận, so sánh mốc thời gian không phụ thuộc múi giờ
 */

export interface DateRange {
  startDate: Date | null
  endDate: Date | null
}

export interface DateRangePreset {
  id: string
  label: string
  getRange: () => { startDate: Date; endDate: Date }
}

export interface CalendarDay {
  date: Date
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  isRangeStart: boolean
  isRangeEnd: boolean
  isInRange: boolean
  isDisabled: boolean
}

/**
 * Đưa thời gian về đầu ngày (00:00:00.000) để so sánh thuần ngày tháng năm
 */
export const startOfDay = (date: Date | string | number): Date => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Đưa thời gian về cuối ngày (23:59:59.999)
 */
export const endOfDay = (date: Date | string | number): Date => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Kiểm tra xem 2 ngày có cùng ngày/tháng/năm hay không
 */
export const isSameDay = (date1: Date | null | undefined, date2: Date | null | undefined): boolean => {
  if (!date1 || !date2) return false
  const d1 = startOfDay(date1)
  const d2 = startOfDay(date2)
  return d1.getTime() === d2.getTime()
}

/**
 * Kiểm tra date1 có trước date2 (theo ngày) hay không
 */
export const isBeforeDay = (date1: Date | null | undefined, date2: Date | null | undefined): boolean => {
  if (!date1 || !date2) return false
  const d1 = startOfDay(date1)
  const d2 = startOfDay(date2)
  return d1.getTime() < d2.getTime()
}

/**
 * Kiểm tra date1 có sau date2 (theo ngày) hay không
 */
export const isAfterDay = (date1: Date | null | undefined, date2: Date | null | undefined): boolean => {
  if (!date1 || !date2) return false
  const d1 = startOfDay(date1)
  const d2 = startOfDay(date2)
  return d1.getTime() > d2.getTime()
}

/**
 * Kiểm tra xem ngày có bị vô hiệu hóa (disabled) dựa theo minDate và maxDate hay không
 * - Nếu có minDate: Các ngày TRƯỚC minDate sẽ bị disable (chỉ được chọn từ minDate trở đi)
 * - Nếu có maxDate: Các ngày SAU maxDate sẽ bị disable (chỉ được chọn tới maxDate)
 * - Nếu có cả minDate & maxDate: Chỉ các ngày nằm trong [minDate, maxDate] mới hợp lệ
 */
export const isDateDisabled = (
  date: Date,
  minDate?: Date | null,
  maxDate?: Date | null,
  disabledDates?: Date[]
): boolean => {
  const target = startOfDay(date)

  if (minDate && isBeforeDay(target, minDate)) {
    return true
  }

  if (maxDate && isAfterDay(target, maxDate)) {
    return true
  }

  if (disabledDates && disabledDates.some((d) => isSameDay(d, target))) {
    return true
  }

  return false
}

/**
 * Kiểm tra ngày có nằm trong khoảng [startDate, endDate] (bao gồm cả 2 đầu mút)
 */
export const isDateInRange = (
  date: Date,
  startDate: Date | null | undefined,
  endDate: Date | null | undefined
): boolean => {
  if (!startDate || !endDate) return false
  const d = startOfDay(date).getTime()
  const start = startOfDay(startDate).getTime()
  const end = startOfDay(endDate).getTime()
  return d >= start && d <= end
}

/**
 * Format ngày tháng sang chuỗi hiển thị
 * Mặc định: DD/MM/YYYY
 */
export const formatDate = (date: Date | string | null | undefined, format = 'DD/MM/YYYY'): string => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = String(d.getFullYear())

  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year)
}

/**
 * Parse chuỗi ngày dạng DD/MM/YYYY hoặc YYYY-MM-DD thành Date object an toàn
 */
export const parseDate = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null
  const trimmed = dateStr.trim()

  // Format DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [dayStr, monthStr, yearStr] = trimmed.split('/')
    const day = parseInt(dayStr, 10)
    const month = parseInt(monthStr, 10) - 1
    const year = parseInt(yearStr, 10)
    const d = new Date(year, month, day)
    if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
      return startOfDay(d)
    }
  }

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [yearStr, monthStr, dayStr] = trimmed.split('-')
    const day = parseInt(dayStr, 10)
    const month = parseInt(monthStr, 10) - 1
    const year = parseInt(yearStr, 10)
    const d = new Date(year, month, day)
    if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
      return startOfDay(d)
    }
  }

  const d = new Date(trimmed)
  return isNaN(d.getTime()) ? null : startOfDay(d)
}

/**
 * Format khoảng thời gian startDate - endDate thành chuỗi hiển thị
 */
export const formatDateRange = (
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
  placeholder = 'Chọn khoảng thời gian'
): string => {
  if (!startDate && !endDate) return placeholder
  if (startDate && !endDate) return `${formatDate(startDate)} - Chọn ngày kết thúc`
  if (!startDate && endDate) return `Bắt đầu - ${formatDate(endDate)}`
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

/**
 * Lấy số ngày trong một tháng của một năm cụ thể (xử lý chuẩn năm nhuận tháng 2)
 */
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Sinh danh sách ngày hiển thị trong lưới lịch (Calendar Grid) 6 tuần x 7 ngày = 42 ô
 */
export const generateCalendarMonth = (
  year: number,
  month: number,
  selectedRange?: DateRange,
  minDate?: Date | null,
  maxDate?: Date | null,
  disabledDates?: Date[]
): CalendarDay[] => {
  const today = startOfDay(new Date())
  const daysInCurrentMonth = getDaysInMonth(year, month)
  
  // Thứ trong tuần của ngày 1 (0: CN, 1: T2, ..., 6: T7)
  // Đưa về chuẩn T2 = 0, T3 = 1, ..., CN = 6
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7
  
  const daysInPrevMonth = getDaysInMonth(year, month - 1)
  const calendarDays: CalendarDay[] = []

  const startDate = selectedRange?.startDate ? startOfDay(selectedRange.startDate) : null
  const endDate = selectedRange?.endDate ? startOfDay(selectedRange.endDate) : null

  // 1. Các ngày của tháng trước để lấp đầy hàng đầu
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNumber = daysInPrevMonth - i
    const date = new Date(year, month - 1, dayNumber)
    const disabled = isDateDisabled(date, minDate, maxDate, disabledDates)
    
    calendarDays.push({
      date,
      dayNumber,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      isSelected: isSameDay(date, startDate) || isSameDay(date, endDate),
      isRangeStart: isSameDay(date, startDate),
      isRangeEnd: isSameDay(date, endDate),
      isInRange: isDateInRange(date, startDate, endDate),
      isDisabled: disabled,
    })
  }

  // 2. Các ngày trong tháng hiện tại
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const date = new Date(year, month, d)
    const disabled = isDateDisabled(date, minDate, maxDate, disabledDates)

    calendarDays.push({
      date,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      isSelected: isSameDay(date, startDate) || isSameDay(date, endDate),
      isRangeStart: isSameDay(date, startDate),
      isRangeEnd: isSameDay(date, endDate),
      isInRange: isDateInRange(date, startDate, endDate),
      isDisabled: disabled,
    })
  }

  // 3. Các ngày của tháng sau để lấp đầy lưới 35 hoặc 42 ô
  const totalSlots = calendarDays.length > 35 ? 42 : 35
  const remainingSlots = totalSlots - calendarDays.length
  for (let d = 1; d <= remainingSlots; d++) {
    const date = new Date(year, month + 1, d)
    const disabled = isDateDisabled(date, minDate, maxDate, disabledDates)

    calendarDays.push({
      date,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      isSelected: isSameDay(date, startDate) || isSameDay(date, endDate),
      isRangeStart: isSameDay(date, startDate),
      isRangeEnd: isSameDay(date, endDate),
      isInRange: isDateInRange(date, startDate, endDate),
      isDisabled: disabled,
    })
  }

  return calendarDays
}

/**
 * Danh sách các Preset chọn nhanh khoảng thời gian thông dụng
 */
export const getDateRangePresets = (): DateRangePreset[] => {
  const today = startOfDay(new Date())

  return [
    {
      id: 'today',
      label: 'Hôm nay',
      getRange: () => ({
        startDate: today,
        endDate: today,
      }),
    },
    {
      id: 'yesterday',
      label: 'Hôm qua',
      getRange: () => {
        const yesterday = new Date(today)
        yesterday.setDate(today.getDate() - 1)
        return { startDate: yesterday, endDate: yesterday }
      },
    },
    {
      id: 'last7days',
      label: '7 ngày qua',
      getRange: () => {
        const start = new Date(today)
        start.setDate(today.getDate() - 6)
        return { startDate: start, endDate: today }
      },
    },
    {
      id: 'last30days',
      label: '30 ngày qua',
      getRange: () => {
        const start = new Date(today)
        start.setDate(today.getDate() - 29)
        return { startDate: start, endDate: today }
      },
    },
  ]
}

/**
 * Tên các thứ trong tuần bằng Tiếng Việt
 */
export const WEEKDAYS_VN = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/**
 * Tên các tháng trong năm bằng Tiếng Việt
 */
export const MONTHS_VN = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
]
