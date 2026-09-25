import React, { useState } from 'react'
import { Activity, Minus } from 'lucide-react'

interface PoleLegendIconProps {
  status: 'normal' | 'dim' | 'out' | 'unknown'
  size?: number
}

const PoleLegendIcon: React.FC<PoleLegendIconProps> = ({ status, size = 15 }) => {
  let cHighlight = '#86efac'
  let cBody = '#10b981'
  let cDeep = '#047857'
  let cShadow = '#022c22'

  if (status === 'dim') {
    cHighlight = '#fef08a'
    cBody = '#f59e0b'
    cDeep = '#b45309'
    cShadow = '#451a03'
  } else if (status === 'out') {
    cHighlight = '#fecdd3'
    cBody = '#f43f5e'
    cDeep = '#be123c'
    cShadow = '#4c0519'
  } else if (status === 'unknown') {
    cHighlight = '#f1f5f9'
    cBody = '#64748b'
    cDeep = '#334155'
    cShadow = '#0f172a'
  }

  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full"
      style={{ width: size, height: size, filter: 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.35))' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <radialGradient id={`leg-sphere-${status}`} cx="32%" cy="28%" r="75%">
            <stop offset="0%" stopColor={cHighlight} />
            <stop offset="35%" stopColor={cBody} />
            <stop offset="75%" stopColor={cDeep} />
            <stop offset="100%" stopColor={cShadow} />
          </radialGradient>
          <linearGradient id={`leg-rim-${status}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id={`leg-gloss-${status}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        <circle cx="12" cy="12" r="9.5" fill={`url(#leg-sphere-${status})`} stroke={`url(#leg-rim-${status})`} strokeWidth="1.3" />
        <ellipse cx="12" cy="7" rx="5" ry="2.2" fill={`url(#leg-gloss-${status})`} />

      </svg>
    </div>
  )
}

interface CabinetLegendIconProps {
  color?: string
  size?: number
  isRoot?: boolean
  isFault?: boolean
}

const CabinetLegendIcon: React.FC<CabinetLegendIconProps> = ({
  size = 16,
  isRoot = false,
  isFault = false,
}) => {
  const typeKey = isFault ? 'fault' : isRoot ? 'root' : 'norm'
  let cHighlight = '#6ee7b7'
  let cBody = '#059669'
  let cDeep = '#047857'
  let cShadow = '#064e3b'

  if (isFault) {
    cHighlight = '#fda4af'
    cBody = '#e11d48'
    cDeep = '#be123c'
    cShadow = '#4c0519'
  } else if (isRoot) {
    cHighlight = '#fde047'
    cBody = '#d97706'
    cDeep = '#b45309'
    cShadow = '#451a03'
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      style={{ filter: 'drop-shadow(0 1.5px 3px rgba(0,0,0,0.35))' }}
    >
      <defs>
        <linearGradient id={`leg-cab-body-${typeKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={cHighlight} />
          <stop offset="28%" stopColor={cBody} />
          <stop offset="72%" stopColor={cDeep} />
          <stop offset="100%" stopColor={cShadow} />
        </linearGradient>
        <linearGradient id={`leg-cab-rim-${typeKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={`leg-cab-gloss-${typeKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      <rect
        x="3"
        y="2.5"
        width="18"
        height="19"
        rx="4"
        fill={`url(#leg-cab-body-${typeKey})`}
        stroke={`url(#leg-cab-rim-${typeKey})`}
        strokeWidth="1.2"
      />
      <rect x="4.5" y="3.8" width="15" height="4.2" rx="2" fill={`url(#leg-cab-gloss-${typeKey})`} />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.9" />
      <line x1="3.5" y1="10.4" x2="20.5" y2="10.4" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
      <circle
        cx="6.8"
        cy="6.2"
        r="1.4"
        fill={isFault ? '#fee2e2' : isRoot ? '#fef3c7' : '#d1fae5'}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.5"
      />
      <path
        d="M12.5 11L8.5 15.5H11.8L10.5 20L15.5 14.5H12.2L13 11Z"
        fill="#ffffff"
        style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }}
      />
      {isRoot && (
        <>
          <circle
            cx="17.8"
            cy="5.5"
            r="3.2"
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth="1"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}
          />
          <path
            d="M17.8 3.8L18.4 5H19.7L18.7 5.9L19.1 7.2L17.8 6.4L16.5 7.2L16.6 5.9L15.9 5H17.2L17.8 3.8Z"
            fill="#ffffff"
          />
        </>
      )}
    </svg>
  )
}

export const GisMapLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true)

  // Nút mở dạng icon khi đang thu nhỏ / ẩn
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="absolute bottom-4 left-4 z-30 h-9 px-2.5 rounded-xl bg-white/95 hover:bg-slate-50 text-blue-600 hover:text-blue-700 backdrop-blur-md shadow-lg border border-slate-200 flex items-center gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer pointer-events-auto group select-none"
        title="Mở chú giải bản đồ"
      >
        <Activity className="w-4 h-4 text-blue-600 group-hover:text-blue-700 transition-colors" />
        <span className="text-[11px] font-semibold text-slate-700 hidden group-hover:inline transition-all duration-200 pr-0.5">
          Chú giải
        </span>
      </button>
    )
  }

  return (
    <div className="absolute bottom-4 left-4 z-30 bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 rounded-2xl p-3 text-[11.5px] text-slate-600 space-y-2.5 pointer-events-auto min-w-58 select-none transition-all duration-200">
      <div className="font-bold text-slate-800 text-xs flex items-center justify-between border-b border-slate-200 pb-1.5">
        <div className="flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-blue-600" />
          <span>Chú giải bản đồ</span>
        </div>
        {/* Nút thu nhỏ / ẩn chú thích */}
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="w-5 h-5 -mr-0.5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Thu nhỏ chú thích"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-3.5 gap-y-2">
        {/* Pole states */}
        <div className="flex items-center gap-2">
          <PoleLegendIcon status="normal" size={14} />
          <span className="font-medium text-slate-700">Đạt chuẩn</span>
        </div>
        <div className="flex items-center gap-2">
          <PoleLegendIcon status="dim" size={14} />
          <span className="font-medium text-slate-700">Đèn mờ</span>
        </div>
        <div className="flex items-center gap-2">
          <PoleLegendIcon status="out" size={14} />
          <span className="font-medium text-slate-700">Hỏng / Tắt</span>
        </div>
        <div className="flex items-center gap-2">
          <PoleLegendIcon status="unknown" size={14} />
          <span className="font-medium text-slate-700">Chưa quét</span>
        </div>

        {/* POI alert */}
        <div className="flex items-center gap-2 col-span-2 pt-0.5">
          <span className="w-3.5 h-3.5 rounded-full bg-violet-600 text-[8px] text-white flex items-center justify-center font-bold shrink-0 border border-white shadow-2xs">
            !
          </span>
          <span className="font-medium text-slate-700">Gần trường, cầu</span>
        </div>

        {/* Cabinets */}
        <div className="flex items-center gap-2 col-span-2 pt-1.5 border-t border-slate-200">
          <div className="flex items-center gap-1.5 shrink-0">
            <CabinetLegendIcon color="#059669" size={15} isRoot={false} />
            <CabinetLegendIcon color="#e11d48" size={15} isRoot={false} isFault={true} />
          </div>
          <span className="font-medium text-slate-700 text-[11px]">Tủ điện điều khiển (Cấp điện / Ngắt)</span>
        </div>

        {/* Electrical Feeder lines */}
        <div className="col-span-2 pt-1.5 border-t border-slate-200 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-4 h-[2.5px] rounded-full bg-sky-500 shrink-0" />
            <span className="font-medium text-slate-700 text-[11px]">Lộ điện Tủ A</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-[2.5px] rounded-full bg-purple-500 shrink-0" />
            <span className="font-medium text-slate-700 text-[11px]">Lộ điện Tủ B</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-[2.5px] rounded-full bg-rose-500 shrink-0" />
            <span className="font-medium text-slate-700 text-[11px]">Lộ ngắt điện / Mất điện</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-[2px] border-b border-dashed border-slate-400 shrink-0" />
            <span className="font-medium text-slate-500 text-[11px]">Tuyến đường giao thông</span>
          </div>
        </div>
      </div>
    </div>
  )
}
