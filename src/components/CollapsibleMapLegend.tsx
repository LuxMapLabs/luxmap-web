import React, { useState } from 'react'
import { X } from 'lucide-react'

interface CollapsibleMapLegendProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}

/** Chú thích góc trên-trái của bản đồ trong form, thu gọn được để không che bản đồ (cùng kiểu bản đồ tủ điện). */
export const CollapsibleMapLegend: React.FC<CollapsibleMapLegendProps> = ({ title, icon, children }) => {
  const [isOpen, setIsOpen] = useState(true)

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Hiện chú thích"
        className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-md border border-blue-100 rounded-lg px-2 py-1 shadow-md text-[10px] font-semibold text-slate-700 hover:bg-white cursor-pointer select-none"
      >
        {icon}
        <span>Chú thích</span>
      </button>
    )
  }

  return (
    <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-md border border-blue-100 rounded-xl p-2.5 shadow-lg text-[11px] text-slate-800 space-y-1.5 select-none">
      <div className="flex items-center justify-between gap-2 font-bold text-xs text-amber-700">
        <div className="flex items-center gap-1.5">
          {icon}
          <span>{title}</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          title="Ẩn chú thích"
          aria-label="Ẩn chú thích"
          className="p-0.5 rounded text-slate-500 hover:text-slate-800 hover:bg-blue-50 cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      {children}
    </div>
  )
}
