import React from 'react'
import { Activity } from 'lucide-react'

export const GisMapLegend: React.FC = () => {
  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 rounded-2xl p-3 text-[11.5px] text-slate-700 space-y-2 pointer-events-auto min-w-60">
      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
        <Activity className="w-4 h-4 text-blue-600" />
        <span>Chú Giải Bản Đồ GIS</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shrink-0 shadow-2xs" />
          <span>Sáng đạt chuẩn</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white shrink-0 shadow-2xs" />
          <span>Đèn mờ (Dim)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white shrink-0 shadow-2xs" />
          <span>Hỏng / Tắt (Out)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-dashed border-slate-600 shrink-0" />
          <span>Chưa quét (Unknown)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-rose-600 text-[8px] text-white flex items-center justify-center font-bold shrink-0">!</span>
          <span>Gần trường/cầu (POI)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-[8px] text-white flex items-center justify-center font-bold shrink-0">⚡</span>
          <span>Nốt IoT mẫu</span>
        </div>
      </div>
    </div>
  )
}
