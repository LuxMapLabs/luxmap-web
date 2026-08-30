import React, { useState } from 'react'
import { Search, X } from 'lucide-react'

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  onClear?: () => void
  placeholder?: string
  fullWidth?: boolean
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value: controlledValue,
  onChange,
  onClear,
  placeholder = 'Tìm kiếm mã cột, tuyến đường, sự cố...',
  fullWidth = true,
  className = '',
  ...props
}) => {
  const [internalValue, setInternalValue] = useState('')
  const isControlled = controlledValue !== undefined
  const currentValue = isControlled ? controlledValue : internalValue

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!isControlled) setInternalValue(val)
    onChange?.(val)
  }

  const handleClear = () => {
    if (!isControlled) setInternalValue('')
    onChange?.('')
    onClear?.()
  }

  return (
    <div className={`relative flex items-center ${fullWidth ? 'w-full' : ''}`}>
      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
      <input
        type="text"
        value={currentValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full text-xs text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-slate-300 transition-all ${className}`}
        {...props}
      />
      {currentValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          title="Xóa tìm kiếm"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

