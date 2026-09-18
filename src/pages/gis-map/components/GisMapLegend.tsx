import React, { useState } from 'react'
import { Activity, Minus } from 'lucide-react'

interface PoleLegendIconProps {
  status: 'normal' | 'dim' | 'out' | 'unknown'
  size?: number
}

const PoleLegendIcon: React.FC<PoleLegendIconProps> = ({ status, size = 14 }) => {
  let highlight = '#a7f3d0'
  let core = '#10b981'
  let perimeter = '#047857'
  let bezel = 'rgba(52, 211, 153, 0.65)'
  let glow = '0 0 6px rgba(16, 185, 129, 0.55)'

  if (status === 'dim') {
    highlight = '#fef08a'
    core = '#f59e0b'
    perimeter = '#b45309'
    bezel = 'rgba(251, 191, 36, 0.65)'
    glow = '0 0 6px rgba(245, 158, 11, 0.6)'
  } else if (status === 'out') {
    highlight = '#fecdd3'
    core = '#f43f5e'
    perimeter = '#9f1239'
    bezel = 'rgba(244, 63, 94, 0.75)'
    glow = '0 0 6px rgba(244, 63, 94, 0.65)'
  } else if (status === 'unknown') {
    highlight = '#e2e8f0'
    core = '#64748b'
    perimeter = '#334155'
    bezel = 'rgba(148, 163, 184, 0.5)'
    glow = '0 0 4px rgba(100, 116, 139, 0.35)'
  }

  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full"
      style={{ width: size, height: size, boxShadow: glow }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <radialGradient id={`legend-pole-${status}`} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={highlight} />
            <stop offset="50%" stopColor={core} />
            <stop offset="100%" stopColor={perimeter} />
          </radialGradient>
        </defs>

        {/* Outer Protective Bezel */}
        <circle cx="10" cy="10" r="9" fill="rgba(11, 19, 34, 0.85)" stroke={bezel} strokeWidth="1.2" />

        {/* Main Diode Dome */}
        <circle cx="10" cy="10" r="6.8" fill={`url(#legend-pole-${status})`} />

        {/* Specular Highlight Glint */}
        <circle cx="7.2" cy="7.2" r="1.6" fill="#ffffff" opacity="0.85" />

        {/* Status Out X mark */}
        {status === 'out' && (
          <>
            <line x1="8" y1="8" x2="12" y2="12" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.95" />
            <line x1="12" y1="8" x2="8" y2="12" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.95" />
          </>
        )}
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
  color = '#10b981',
  size = 17,
  isRoot = false,
  isFault = false,
}) => {
  const enclosureBorder = isFault ? '#f43f5e' : isRoot ? '#f59e0b' : color
  const boltColor = isFault ? '#f43f5e' : isRoot ? '#fbbf24' : '#34d399'
  const ledColor = isFault ? '#f43f5e' : isRoot ? '#f59e0b' : '#10b981'
  const glow = isFault
    ? '0 0 5px rgba(244, 63, 94, 0.65)'
    : isRoot
    ? '0 0 5px rgba(245, 158, 11, 0.65)'
    : '0 0 5px rgba(16, 185, 129, 0.55)'

  return (
    <div
      className="shrink-0 flex items-center justify-center"
      style={{ width: size, height: size, filter: `drop-shadow(${glow})` }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={`cab-legend-body-${isRoot ? 'root' : isFault ? 'fault' : 'norm'}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#152646" />
            <stop offset="100%" stopColor="#080f1d" />
          </linearGradient>
          <linearGradient id="cab-legend-sheen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Chassis Enclosure */}
        <rect
          x="2.5"
          y="2.5"
          width="23"
          height="23"
          rx="5.5"
          fill={`url(#cab-legend-body-${isRoot ? 'root' : isFault ? 'fault' : 'norm'})`}
          stroke={enclosureBorder}
          strokeWidth="1.8"
        />
        {/* Upper Sheen */}
        <rect x="3.5" y="3.5" width="21" height="9" rx="4" fill="url(#cab-legend-sheen)" />

        {/* Ventilation Grill Line */}
        <line
          x1="6.5"
          y1="7.5"
          x2="21.5"
          y2="7.5"
          stroke={enclosureBorder}
          strokeWidth="1.2"
          strokeOpacity="0.4"
          strokeDasharray="2 1.5"
        />

        {/* Center Lightning Bolt */}
        <path
          d="M15 8.5L9.5 15.5H14L13 21L18.5 14H14L15 8.5Z"
          fill={boltColor}
          style={{ filter: `drop-shadow(0 0 2.5px ${boltColor})` }}
        />

        {/* Status LED Dot */}
        <circle
          cx="21"
          cy="21"
          r="1.8"
          fill={ledColor}
          stroke="#0b1322"
          strokeWidth="0.6"
          style={{ filter: `drop-shadow(0 0 2px ${ledColor})` }}
        />

        {/* Root Master Badge */}
        {isRoot && (
          <g transform="translate(16, 2)">
            <rect x="0" y="0" width="10" height="7.5" rx="2" fill="#f59e0b" stroke="#0b1322" strokeWidth="0.8" />
            <text
              x="5"
              y="5.8"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize="5.5"
              fontWeight="900"
              fill="#0b1322"
              textAnchor="middle"
            >
              M
            </text>
          </g>
        )}
      </svg>
    </div>
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
        className="absolute bottom-4 left-4 z-30 h-9 px-2.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-blue-400 hover:text-white backdrop-blur-md shadow-xl border border-slate-800 flex items-center gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer pointer-events-auto group select-none"
        title="Mở chú giải bản đồ"
      >
        <Activity className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
        <span className="text-[11px] font-semibold text-slate-300 hidden group-hover:inline transition-all duration-200 pr-0.5">
          Chú giải
        </span>
      </button>
    )
  }

  return (
    <div className="absolute bottom-4 left-4 z-30 bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-800 rounded-2xl p-3 text-[11.5px] text-slate-300 space-y-2.5 pointer-events-auto min-w-58 select-none transition-all duration-200">
      <div className="font-bold text-slate-100 text-xs flex items-center justify-between border-b border-slate-800 pb-1.5">
        <div className="flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-blue-400" />
          <span>Chú giải bản đồ</span>
        </div>
        {/* Nút thu nhỏ / ẩn chú thích */}
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="w-5 h-5 -mr-0.5 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          title="Thu nhỏ chú thích"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-3.5 gap-y-2">
        {/* Pole states */}
        <div className="flex items-center gap-2">
          <PoleLegendIcon status="normal" size={14} />
          <span className="font-medium text-slate-200">Đạt chuẩn</span>
        </div>
        <div className="flex items-center gap-2">
          <PoleLegendIcon status="dim" size={14} />
          <span className="font-medium text-slate-200">Đèn mờ</span>
        </div>
        <div className="flex items-center gap-2">
          <PoleLegendIcon status="out" size={14} />
          <span className="font-medium text-slate-200">Hỏng / Tắt</span>
        </div>
        <div className="flex items-center gap-2">
          <PoleLegendIcon status="unknown" size={14} />
          <span className="font-medium text-slate-200">Chưa quét</span>
        </div>

        {/* POI alert */}
        <div className="flex items-center gap-2 col-span-2 pt-0.5">
          <span className="w-3.5 h-3.5 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 text-[8px] text-white flex items-center justify-center font-black shrink-0 border border-[#0b1322] shadow-[0_0_6px_rgba(168,85,247,0.7)]">
            !
          </span>
          <span className="font-medium text-slate-200">Gần trường học</span>
        </div>

        {/* Cabinets */}
        <div className="flex items-center gap-2 col-span-2 pt-1.5 border-t border-slate-800">
          <div className="flex items-center gap-1.5 shrink-0">
            <CabinetLegendIcon color="#f59e0b" size={17} isRoot={true} />
          </div>
          <span className="font-medium text-slate-200 text-[11px]">Tủ đỉnh (Nguồn chính)</span>
        </div>

        <div className="flex items-center gap-2 col-span-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <CabinetLegendIcon color="#10b981" size={16} isRoot={false} />
            <CabinetLegendIcon color="#f43f5e" size={16} isRoot={false} isFault={true} />
          </div>
          <span className="font-medium text-slate-200 text-[11px]">Tủ nhánh (Bình thường / Lỗi)</span>
        </div>

        {/* Feeder lines */}
        <div className="col-span-2 pt-1.5 border-t border-slate-800/80 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-4 h-[2.5px] rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.85)] shrink-0" />
            <span className="font-medium text-slate-200 text-[11px]">Tuyến cáp bình thường</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-[2.5px] rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.85)] shrink-0" />
            <span className="font-medium text-slate-200 text-[11px]">Tuyến cáp sự cố / mất điện</span>
          </div>
        </div>
      </div>
    </div>
  )
}

