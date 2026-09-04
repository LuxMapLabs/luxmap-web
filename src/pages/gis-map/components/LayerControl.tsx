import React from 'react'
import { Layers, Eye, EyeOff } from 'lucide-react'

export interface LayerControlProps {
  showPoles: boolean
  onTogglePoles: () => void
  showFeeders: boolean
  onToggleFeeders: () => void
}

export const LayerControl: React.FC<LayerControlProps> = ({
  showPoles,
  onTogglePoles,
  showFeeders,
  onToggleFeeders,
}) => {
  return (
    <div className="absolute bottom-6 left-4 z-10 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-lg p-2.5 flex flex-col gap-1.5 select-none pointer-events-auto min-w-42.5">
      <div className="flex items-center gap-1.5 px-1 pb-1 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
        <Layers className="w-3.5 h-3.5 text-primary" />
        <span>Lớp Dữ Liệu</span>
      </div>

      {/* Lớp Cột Đèn */}
      <button
        type="button"
        onClick={onTogglePoles}
        className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
          showPoles
            ? 'bg-blue-50 text-primary font-bold'
            : 'text-slate-400 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" />
          <span>Cột đèn GIS</span>
        </div>
        {showPoles ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>

      {/* Lớp Tuyến Feeder */}
      <button
        type="button"
        onClick={onToggleFeeders}
        className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
          showFeeders
            ? 'bg-blue-50 text-primary font-bold'
            : 'text-slate-400 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 bg-blue-500 rounded-full" />
          <span>Tuyến đường dây</span>
        </div>
        {showFeeders ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}
