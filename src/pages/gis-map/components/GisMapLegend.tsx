import React from 'react'
import { Activity } from 'lucide-react'
interface CabinetLegendIconProps {
  color: string
  size?: number
  isRoot?: boolean
}

const CabinetLegendIcon: React.FC<CabinetLegendIconProps> = ({
  color,
  size = 16,
  isRoot = false,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0"
  >
    {/* Cabinet enclosure body */}
    <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" fill="#ffffff" stroke={color} strokeWidth="2" />
    {/* Top canopy / header divider */}
    <path d="M3.5 8H20.5" stroke={color} strokeWidth="1.5" />
    {/* Center electrical lightning bolt */}
    <path d="M13 9L8.5 14H12L11 18L15.5 13H12L13 9Z" fill={color} />
    {/* Root cabinet golden star badge */}
    {isRoot && (
      <>
        <circle cx="17.5" cy="6.5" r="3.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
        <path
          d="M17.5 4.8L18.1 6.2H19.5L18.4 7.1L18.8 8.5L17.5 7.6L16.2 8.5L16.6 7.1L15.5 6.2H16.9L17.5 4.8Z"
          fill="#ffffff"
        />
      </>
    )}
  </svg>
)

export const GisMapLegend: React.FC = () => {
  return (
    <div className="absolute bottom-4 left-4 z-30 bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 rounded-2xl p-3 text-[11.5px] text-slate-700 space-y-2 pointer-events-auto min-w-56">
      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
        <Activity className="w-4 h-4 text-blue-600" />
        <span>Chú giải bản đồ</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3.5 gap-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shrink-0 shadow-2xs" />
          <span>Đạt chuẩn</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white shrink-0 shadow-2xs" />
          <span>Đèn mờ</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white shrink-0 shadow-2xs" />
          <span>Hỏng / Tắt</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-dashed border-slate-600 shrink-0" />
          <span>Chưa quét</span>
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <span className="w-3.5 h-3.5 rounded-full bg-violet-600 text-[8px] text-white flex items-center justify-center font-bold shrink-0">!</span>
          <span>Gần trường, cầu</span>
        </div>
        <div className="flex items-center gap-2 col-span-2 pt-1.5 border-t border-slate-100">
          <div className="flex items-center gap-1 shrink-0">
            <CabinetLegendIcon color="#059669" size={16} isRoot={true} />
            <CabinetLegendIcon color="#e11d48" size={16} isRoot={true} />
          </div>
          <span className="font-medium text-slate-800 text-[11px]">Tủ đỉnh</span>
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <div className="flex items-center gap-1 shrink-0">
            <CabinetLegendIcon color="#059669" size={15} isRoot={false} />
            <CabinetLegendIcon color="#e11d48" size={15} isRoot={false} />
          </div>
          <span className="font-medium text-slate-800 text-[11px]">Tủ nhánh</span>
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <div className="flex items-center gap-1 shrink-0">
            <span className="w-4 h-1 rounded-full bg-emerald-500 shadow-2xs" />
            <span className="w-4 h-1 rounded-full bg-rose-500 shadow-2xs" />
          </div>
          <span className="font-medium text-slate-800 text-[11px]">Đường dây</span>
        </div>
      </div>
    </div>
  )
}
