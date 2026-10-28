import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check, Zap, X, SearchX } from 'lucide-react'
import type { CabinetListItem } from '../../../../types/assets/cabinets'

export interface CabinetSearchSelectProps {
  cabinets: CabinetListItem[]
  value: string
  onChange: (cabinetId: string) => void
  placeholder?: string
  disabled?: boolean
  disabledPlaceholder?: string
  emptyText?: string
  allowClear?: boolean
  accentColor?: 'emerald' | 'amber' | 'indigo' | 'blue'
  className?: string
  getId?: (cab: CabinetListItem) => string
  isOptionDisabled?: (cab: CabinetListItem) => boolean
  getOptionBadge?: (cab: CabinetListItem) => string | null
}

const removeVietnameseTones = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

export const CabinetSearchSelect: React.FC<CabinetSearchSelectProps> = ({
  cabinets,
  value,
  onChange,
  placeholder = '-- Chọn tủ điện quản lý --',
  disabled = false,
  disabledPlaceholder = '-- Chưa khả dụng --',
  emptyText = 'Không tìm thấy tủ điện phù hợp',
  allowClear = false,
  accentColor = 'indigo',
  className = '',
  getId = (c) => c.cabinet_id || c.external_ref || '',
  isOptionDisabled,
  getOptionBadge,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Tìm tủ đang chọn
  const selectedCabinet = useMemo(() => {
    if (!value) return null
    return cabinets.find(
      (c) =>
        (c.cabinet_id && c.cabinet_id === value) ||
        (c.external_ref && c.external_ref === value) ||
        getId(c) === value
    ) || null
  }, [cabinets, value, getId])

  // Lọc danh sách tủ theo từ khóa tìm kiếm (chỉ tìm thông tin tủ: tên, mã/ref, id)
  const filteredCabinets = useMemo(() => {
    if (!searchQuery.trim()) return cabinets
    const q = removeVietnameseTones(searchQuery)
    return cabinets.filter((cab) => {
      const name = removeVietnameseTones(cab.cabinet_name || '')
      const ext = removeVietnameseTones(cab.external_ref || '')
      const id = removeVietnameseTones(cab.cabinet_id || '')
      return name.includes(q) || ext.includes(q) || id.includes(q)
    })
  }, [cabinets, searchQuery])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearchQuery('')
    }
  }, [isOpen])

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Accent styling mappings
  const colorMap = {
    emerald: {
      borderFocus: 'focus:border-emerald-500',
      activeRing: 'ring-2 ring-emerald-500/20 border-emerald-500',
      itemActive: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
      icon: 'text-emerald-600 dark:text-emerald-400',
      searchFocus: 'focus:border-emerald-500 focus:ring-emerald-500/20',
    },
    amber: {
      borderFocus: 'focus:border-amber-500',
      activeRing: 'ring-2 ring-amber-500/20 border-amber-500',
      itemActive: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
      icon: 'text-amber-600 dark:text-amber-400',
      searchFocus: 'focus:border-amber-500 focus:ring-amber-500/20',
    },
    indigo: {
      borderFocus: 'focus:border-indigo-500',
      activeRing: 'ring-2 ring-indigo-500/20 border-indigo-500',
      itemActive: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
      icon: 'text-indigo-600 dark:text-indigo-400',
      searchFocus: 'focus:border-indigo-500 focus:ring-indigo-500/20',
    },
    blue: {
      borderFocus: 'focus:border-blue-500',
      activeRing: 'ring-2 ring-blue-500/20 border-blue-500',
      itemActive: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      icon: 'text-blue-600 dark:text-blue-400',
      searchFocus: 'focus:border-blue-500 focus:ring-blue-500/20',
    },
  }[accentColor]

  const handleSelect = (cab: CabinetListItem) => {
    const id = getId(cab)
    onChange(id)
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setIsOpen(false)
  }

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative w-full text-xs ${className}`}
    >
      {/* Hidden Native Select for WCAG Accessibility & Form/Test Compatibility */}
      <select
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only absolute pointer-events-none opacity-0 w-0 h-0 -z-50"
      >
        <option value="">{placeholder}</option>
        {cabinets.map((cab) => {
          const id = getId(cab)
          const name = cab.cabinet_name || cab.external_ref || cab.cabinet_id || 'Tủ điện'
          const ref = cab.external_ref || cab.cabinet_id
          return (
            <option key={id || Math.random().toString()} value={id}>
              ⚡ {name} {ref ? `(${ref})` : ''}
            </option>
          )
        })}
      </select>

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full min-h-[42px] px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl flex items-center justify-between gap-2 text-left transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900 ${
          isOpen
            ? colorMap.activeRing
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Zap className={`w-4 h-4 shrink-0 ${selectedCabinet ? colorMap.icon : 'text-slate-400'}`} />

          {disabled ? (
            <span className="text-slate-400 italic truncate">{disabledPlaceholder}</span>
          ) : selectedCabinet ? (
            <div className="flex items-center gap-1.5 flex-wrap truncate">
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                {selectedCabinet.cabinet_name || selectedCabinet.external_ref || selectedCabinet.cabinet_id}
              </span>
              {(selectedCabinet.external_ref || selectedCabinet.cabinet_id) && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                  {selectedCabinet.external_ref || selectedCabinet.cabinet_id}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-normal truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {allowClear && selectedCabinet && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleClear(e as unknown as React.MouseEvent)
                }
              }}
              title="Xóa lựa chọn"
              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header Search Box */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên hoặc mã tủ điện..."
                className={`w-full pl-8 pr-16 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${colorMap.searchFocus}`}
              />
              <div className="absolute right-2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <span className="text-[10px] text-slate-400 font-mono">
                  {filteredCabinets.length}
                </span>
              </div>
            </div>
          </div>

          {/* List of Cabinets */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            {filteredCabinets.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-1.5">
                <SearchX className="w-6 h-6 mx-auto stroke-1 text-slate-400/80" />
                <p className="text-xs font-medium">{emptyText}</p>
                {searchQuery && (
                  <p className="text-[11px] text-slate-400/80 italic">
                    Từ khóa: &quot;{searchQuery}&quot;
                  </p>
                )}
              </div>
            ) : (
              filteredCabinets.map((cab) => {
                const cabId = getId(cab)
                const isSelected = selectedCabinet && getId(selectedCabinet) === cabId
                const displayName = cab.cabinet_name || cab.external_ref || cab.cabinet_id || 'Tủ điện'
                const refCode = cab.external_ref || cab.cabinet_id
                const isDisabled = isOptionDisabled ? isOptionDisabled(cab) : false
                const badgeText = getOptionBadge ? getOptionBadge(cab) : null

                return (
                  <div
                    key={cabId || Math.random().toString()}
                    onClick={() => {
                      if (!isDisabled) {
                        handleSelect(cab)
                      }
                    }}
                    className={`w-full p-2 rounded-xl flex items-center justify-between gap-2 text-left transition-colors duration-100 ${
                      isDisabled
                        ? 'opacity-40 cursor-not-allowed bg-slate-50/50 dark:bg-slate-900/50 text-slate-400'
                        : isSelected
                        ? colorMap.itemActive
                        : 'cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Zap
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? colorMap.icon : isDisabled ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'
                        }`}
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate text-xs">
                            {displayName}
                          </span>
                          {badgeText && (
                            <span className="px-1.5 py-0.5 bg-rose-100/80 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[9px] font-bold rounded">
                              {badgeText}
                            </span>
                          )}
                        </div>
                        {refCode && (
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                            Mã: {refCode}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className={`w-4 h-4 shrink-0 ${colorMap.icon}`} />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
export default CabinetSearchSelect
