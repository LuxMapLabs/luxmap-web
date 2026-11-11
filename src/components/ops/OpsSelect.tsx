import React, { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Filter } from 'lucide-react'

export interface OpsSelectOption {
  value: string
  label: string
  /** Nhãn dành riêng cho thẻ <option> ẩn (phục vụ khả năng truy cập & tương thích unit test) */
  nativeLabel?: string
  /** Mô tả phụ hiển thị bên dưới nhãn chính trong menu sổ xuống */
  subLabel?: string
  /** Huy hiệu số lượng hoặc đơn vị nằm bên phải mục chọn */
  badge?: string | number
  /** Màu chấm tròn trạng thái (ví dụ: 'bg-emerald-500') thay cho emoji mặc định của hệ điều hành */
  dotColor?: string
  /** Icon riêng cho từng mục chọn (nếu không dùng chấm tròn) */
  icon?: React.ReactNode
}

export interface OpsSelectProps {
  value: string
  onChange: (value: string) => void
  options: OpsSelectOption[]
  /** Icon bên trái nút bấm kích hoạt (mặc định là icon Filter) */
  icon?: React.ReactNode
  /** Tiêu đề nhỏ phía trên cùng của bảng Popover */
  headerLabel?: string
  /** Huy hiệu nhỏ góc phải tiêu đề Popover */
  headerBadge?: string
  /** Căn lề bảng Popover so với nút bấm */
  align?: 'left' | 'right'
  /** Class tùy chỉnh cho thẻ bao ngoài */
  className?: string
  /** Class tùy chỉnh độ rộng / chiều cao cho nút kích hoạt */
  triggerClassName?: string
  /** Class tùy chỉnh độ rộng cho bảng Popover */
  popoverClassName?: string
  /** Hiển thị huy hiệu số lượng (badge) ngay trên nút bấm kích hoạt */
  showTriggerBadge?: boolean
  /** Nhãn hỗ trợ trình đọc màn hình */
  ariaLabel?: string
  /** Tooltip khi rê chuột vào nút */
  title?: string
}

export const OpsSelect: React.FC<OpsSelectProps> = ({
  value,
  onChange,
  options,
  icon,
  headerLabel,
  headerBadge,
  align = 'left',
  className = '',
  triggerClassName = 'min-w-[175px]',
  popoverClassName = 'w-64 sm:w-72',
  showTriggerBadge = true,
  ariaLabel,
  title,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value) || options[0]
  const isFiltered = Boolean(selectedOption && selectedOption.value !== 'all' && selectedOption.value !== '')

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Thẻ select ẩn giữ nguyên khả năng tương thích với form và các bộ test tự động */}
      <select
        aria-label={ariaLabel || headerLabel}
        tabIndex={-1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only pointer-events-none absolute opacity-0 w-0 h-0"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.nativeLabel ?? opt.label}
          </option>
        ))}
      </select>

      {/* Nút kích hoạt Dropdown hiện đại */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={title || selectedOption?.label}
        className={`group flex items-center justify-between gap-2.5 rounded-xl border px-2.5 py-1.5 min-h-[38px] text-xs transition-all duration-150 cursor-pointer select-none shadow-2xs ${triggerClassName} ${
          isOpen
            ? 'border-blue-500 bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-300 ring-2 ring-blue-500/20 shadow-sm'
            : isFiltered
              ? 'border-blue-200 dark:border-blue-800/80 bg-blue-50/50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-400'
              : 'border-slate-200/90 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:border-blue-300 dark:hover:border-slate-600'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors ${
              isOpen || isFiltered
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 border border-slate-200/80 dark:border-slate-700 group-hover:border-blue-200 group-hover:bg-blue-50/80'
            }`}
          >
            {icon || <Filter className="h-3.5 w-3.5" />}
          </span>

          {selectedOption?.dotColor && (
            <span
              className={`h-2 w-2 shrink-0 rounded-full ring-2 ring-offset-1 ring-transparent ${selectedOption.dotColor}`}
            />
          )}

          <span
            data-label={selectedOption?.label}
            className="truncate font-bold text-slate-800 dark:text-slate-100 after:content-[attr(data-label)]"
          />

          {showTriggerBadge && selectedOption?.badge !== undefined && (
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold font-mono leading-none ${
                isOpen || isFiltered
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-sky-300'
                  : 'bg-slate-200/75 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
        </span>

        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600 dark:text-sky-400' : 'group-hover:text-slate-600'
          }`}
        />
      </button>

      {/* Bảng Popover danh sách lựa chọn */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute top-full mt-2 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${popoverClassName} rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white/98 dark:bg-slate-900/95 backdrop-blur-xl p-1.5 shadow-[0_18px_42px_-12px_rgba(15,23,42,0.22),0_4px_16px_-4px_rgba(15,23,42,0.08)] z-50 animate-in fade-in zoom-in-95 duration-150 select-none`}
        >
          {(headerLabel || headerBadge) && (
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
              {headerLabel && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {headerLabel}
                </span>
              )}
              {headerBadge && (
                <span className="text-[10px] font-bold text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900">
                  {headerBadge}
                </span>
              )}
            </div>
          )}

          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-0.5 pr-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/50 text-blue-900 dark:text-sky-200 ring-1 ring-blue-200/80 dark:ring-blue-800 shadow-2xs'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {opt.dotColor ? (
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-white dark:bg-slate-800 shadow-2xs ring-1 ring-blue-200/60 dark:ring-blue-800'
                            : 'bg-slate-100/80 dark:bg-slate-800'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${opt.dotColor}`} />
                      </div>
                    ) : (
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {opt.icon || icon || <Filter className="w-3.5 h-3.5" />}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div
                        className={`text-xs truncate ${
                          isSelected
                            ? 'font-extrabold text-blue-900 dark:text-sky-200'
                            : 'font-semibold text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {opt.label}
                      </div>
                      {opt.subLabel && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                          {opt.subLabel}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.badge !== undefined && (
                      <span
                        className={`text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-full border ${
                          isSelected
                            ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-300 border-blue-200 dark:border-blue-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-blue-600/10 dark:bg-sky-400/10 text-blue-600 dark:text-sky-400 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default OpsSelect

