import React, { useState, useRef, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  RotateCcw,
  Check,
} from 'lucide-react'
import {
  formatDate,
  generateCalendarMonth,
  isDateDisabled,
  startOfDay,
  WEEKDAYS_VN,
  MONTHS_VN,
} from '../../../utils/dateUtils'

export interface DatePickerProps {
  value?: Date | null
  onChange?: (date: Date | null) => void
  minDate?: Date | null
  maxDate?: Date | null
  disabledDates?: Date[]
  placeholder?: string
  label?: string
  helperText?: string
  error?: string
  fullWidth?: boolean
  className?: string
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value: controlledValue,
  onChange,
  minDate,
  maxDate,
  disabledDates,
  placeholder = 'Chọn ngày',
  label,
  helperText,
  error,
  fullWidth = false,
  className = '',
}) => {
  const [internalValue, setInternalValue] = useState<Date | null>(null)
  const currentDate = controlledValue !== undefined ? controlledValue : internalValue
  const [isOpen, setIsOpen] = useState(false)

  const initialDate = currentDate || new Date()
  const [viewYear, setViewYear] = useState(initialDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth())

  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false)
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsMonthDropdownOpen(false)
        setIsYearDropdownOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const calendarDays = generateCalendarMonth(
    viewYear,
    viewMonth,
    currentDate ? { startDate: currentDate, endDate: currentDate } : undefined,
    minDate,
    maxDate,
    disabledDates
  )

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const handleSelectDay = (date: Date) => {
    if (isDateDisabled(date, minDate, maxDate, disabledDates)) return

    const targetDate = startOfDay(date)
    if (controlledValue === undefined) setInternalValue(targetDate)
    onChange?.(targetDate)
  }

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (controlledValue === undefined) setInternalValue(null)
    onChange?.(null)
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 71 }, (_, i) => currentYear - 50 + i)

  return (
    <div className={`relative select-none ${fullWidth ? 'w-full' : 'w-full max-w-[240px]'}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          {label}
        </label>
      )}

      {/* Input Box Display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 bg-white border rounded-xl cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-xs group ${
          isOpen
            ? 'border-primary ring-4 ring-primary/10 shadow-sm'
            : 'border-slate-200 hover:border-slate-300'
        } ${error ? 'border-rose-300 ring-4 ring-rose-500/10 text-rose-900' : ''} ${className}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            isOpen || currentDate ? 'bg-primary text-white shadow-2xs' : 'bg-slate-100 text-slate-400 group-hover:text-slate-600'
          }`}>
            <CalendarIcon className="w-4 h-4" />
          </div>
          
          <span className={`text-xs truncate ${currentDate ? 'text-slate-900 font-bold tracking-tight' : 'text-slate-400 font-normal'}`}>
            {currentDate ? formatDate(currentDate) : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {currentDate && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-95"
              title="Xóa ngày"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p className="text-[11px] font-semibold text-rose-600 mt-1.5 flex items-center gap-1 animate-fadeIn">
          <span>⚠️</span>
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 mt-1.5">{helperText}</p>
      ) : null}

      {/* Single Calendar Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-2 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 animate-scaleUp w-[280px] sm:w-[290px]">
          <div className="space-y-3">
            {/* Header: Month / Year Navigation */}
            <div className="flex items-center justify-between px-1 relative">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-primary hover:bg-slate-100 transition-colors active:scale-90 cursor-pointer"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded-xl border border-slate-200/80 relative">
                {/* Month Dropdown Pill */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMonthDropdownOpen(!isMonthDropdownOpen)
                      setIsYearDropdownOpen(false)
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-slate-800 px-2 py-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
                  >
                    <span>{MONTHS_VN[viewMonth]}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {isMonthDropdownOpen && (
                    <div className="absolute top-full mt-1 left-0 z-60 bg-white rounded-xl border border-slate-200 shadow-xl py-1 max-h-48 overflow-y-auto custom-scrollbar w-28 animate-scaleUp">
                      {MONTHS_VN.map((m, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setViewMonth(idx)
                            setIsMonthDropdownOpen(false)
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between transition-colors ${
                            viewMonth === idx ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{m}</span>
                          {viewMonth === idx && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Year Dropdown Pill */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsYearDropdownOpen(!isYearDropdownOpen)
                      setIsMonthDropdownOpen(false)
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-primary px-2 py-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
                  >
                    <span>{viewYear}</span>
                    <ChevronDown className="w-3 h-3 text-primary/60" />
                  </button>

                  {isYearDropdownOpen && (
                    <div className="absolute top-full mt-1 right-0 z-60 bg-white rounded-xl border border-slate-200 shadow-xl py-1 max-h-48 overflow-y-auto custom-scrollbar w-24 animate-scaleUp">
                      {yearOptions.map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => {
                            setViewYear(y)
                            setIsYearDropdownOpen(false)
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between transition-colors ${
                            viewYear === y ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{y}</span>
                          {viewYear === y && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-primary hover:bg-slate-100 transition-colors active:scale-90 cursor-pointer"
                title="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday Names */}
            <div className="grid grid-cols-7 text-center">
              {WEEKDAYS_VN.map((day) => (
                <span key={day} className="text-[11px] font-bold text-slate-400 py-1">
                  {day}
                </span>
              ))}
            </div>

            {/* Day Slots Grid */}
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {calendarDays.map((day, idx) => {
                let btnStyle = 'text-slate-700 hover:bg-slate-100 hover:scale-105'

                if (!day.isCurrentMonth) {
                  btnStyle = 'text-slate-300 font-normal'
                }

                if (day.isDisabled) {
                  btnStyle = 'text-slate-300 cursor-not-allowed select-none font-normal'
                } else if (day.isSelected) {
                  btnStyle = 'bg-primary text-white font-bold shadow-xs scale-105 z-10'
                }

                return (
                  <div key={idx} className="p-0.5 relative">
                    <button
                      type="button"
                      disabled={day.isDisabled}
                      onClick={() => handleSelectDay(day.date)}
                      className={`w-8 h-8 mx-auto rounded-lg text-xs flex items-center justify-center transition-all duration-150 select-none cursor-pointer ${btnStyle}`}
                    >
                      {day.dayNumber}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleClear()}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition flex items-center gap-1 active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Xác nhận & Đóng</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker
