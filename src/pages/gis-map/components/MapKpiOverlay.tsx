import React from 'react'
import { Zap, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react'

export interface MapKpiProps {
  total: number
  normal: number
  dim: number
  out: number
  unknown: number
  activeFilter: string
  onFilterClick: (status: string) => void
}

export const MapKpiOverlay: React.FC<MapKpiProps> = ({
  total,
  normal,
  dim,
  out,
  unknown,
  activeFilter,
  onFilterClick,
}) => {
  return (
    <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 select-none pointer-events-auto">
      
      {/* Tất cả */}
      <button
        type="button"
        onClick={() => onFilterClick('all')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md backdrop-blur-md cursor-pointer ${
          activeFilter === 'all'
            ? 'bg-slate-900 text-white ring-2 ring-slate-900/30'
            : 'bg-white/95 text-slate-700 hover:bg-white border border-slate-200/80 hover:shadow-lg'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        <span>Tất cả:</span>
        <span className="font-extrabold">{total}</span>
      </button>

      {/* Bình thường */}
      <button
        type="button"
        onClick={() => onFilterClick('normal')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md backdrop-blur-md cursor-pointer ${
          activeFilter === 'normal'
            ? 'bg-emerald-700 text-white ring-2 ring-emerald-600/30'
            : 'bg-white/95 text-emerald-800 hover:bg-white border border-emerald-200/80 hover:shadow-lg'
        }`}
      >
        <Zap className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
        <span>Bình thường:</span>
        <span className="font-extrabold">{normal}</span>
      </button>

      {/* Đèn Mờ */}
      <button
        type="button"
        onClick={() => onFilterClick('dim')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md backdrop-blur-md cursor-pointer ${
          activeFilter === 'dim'
            ? 'bg-amber-600 text-white ring-2 ring-amber-500/30'
            : 'bg-white/95 text-amber-800 hover:bg-white border border-amber-200/80 hover:shadow-lg'
        }`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
        <span>Đèn mờ:</span>
        <span className="font-extrabold">{dim}</span>
      </button>

      {/* Đèn Tắt */}
      <button
        type="button"
        onClick={() => onFilterClick('out')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md backdrop-blur-md cursor-pointer ${
          activeFilter === 'out'
            ? 'bg-rose-700 text-white ring-2 ring-rose-600/30'
            : 'bg-white/95 text-rose-800 hover:bg-white border border-rose-200/80 hover:shadow-lg'
        }`}
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
        <span>Đèn tắt:</span>
        <span className="font-extrabold">{out}</span>
      </button>

      {/* Chưa quét */}
      {unknown > 0 && (
        <button
          type="button"
          onClick={() => onFilterClick('unknown')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md backdrop-blur-md cursor-pointer ${
            activeFilter === 'unknown'
              ? 'bg-slate-700 text-white ring-2 ring-slate-600/30'
              : 'bg-white/95 text-slate-600 hover:bg-white border border-slate-200 hover:shadow-lg'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>Chưa rõ:</span>
          <span className="font-extrabold">{unknown}</span>
        </button>
      )}

    </div>
  )
}
