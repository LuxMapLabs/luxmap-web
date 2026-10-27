import React, { useState } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Map, MapPin, Compass, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { CommuneItem } from '../../../types/admin/communes'

interface GisCoverageCardProps {
  communes: CommuneItem[]
}

export const GisCoverageCard: React.FC<GisCoverageCardProps> = ({ communes }) => {
  const total = communes.length

  // Thống kê chuẩn 100% từ dữ liệu thực Backend (KHÔNG MOCK)
  const withBbox = communes.filter(
    (c) => Boolean(c.bbox && c.bbox.min_lat !== undefined && c.bbox.min_lat !== null)
  ).length
  const withoutBbox = Math.max(0, total - withBbox)

  const withCenter = communes.filter(
    (c) => Boolean(c.center && c.center.lat !== undefined && c.center.lat !== null)
  ).length

  const coverageRatio = total > 0 ? Math.round((withBbox / total) * 100) : 0
  const unmappedRatio = Math.max(0, 100 - coverageRatio)

  // State hiển thị số liệu động tại tâm tròn (Khử 100% tooltip bay từ trái sang)
  const [hoveredSlice, setHoveredSlice] = useState<{
    name: string
    value: number
    color: string
    percent: number
  } | null>(null)

  const chartData = [
    {
      name: 'Đã số hóa',
      value: withBbox,
      fill: 'url(#gisActiveGrad)',
      color: '#06b6d4',
      percent: coverageRatio,
    },
    {
      name: 'Chưa có ranh giới',
      value: withoutBbox,
      fill: 'url(#gisInactiveGrad)',
      color: '#94a3b8',
      percent: unmappedRatio,
    },
  ]

  return (
    <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/90 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between h-full transition-all duration-300 outline-none focus:outline-none select-none">
      <div>
        {/* Minimal Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/10 to-teal-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-100/60 shadow-2xs">
              <Map className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Độ phủ bản đồ & GIS
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                  {coverageRatio}%
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({withBbox}/{total} địa bàn số hóa)
                </span>
              </div>
            </div>
          </div>

          {coverageRatio === 100 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Toàn vẹn</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Chưa đồng bộ hết</span>
            </span>
          )}
        </div>

        {/* 3D Glass Donut Chart (Dynamic In-Place Center) */}
        <div className="h-56 relative flex items-center justify-center my-2 outline-none focus:outline-none [&_*]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none">
          {total > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="gisActiveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                    <linearGradient id="gisInactiveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#cbd5e1" />
                      <stop offset="100%" stopColor="#94a3b8" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={chartData}
                    innerRadius={72}
                    outerRadius={90}
                    paddingAngle={withoutBbox > 0 ? 5 : 0}
                    dataKey="value"
                    animationDuration={1200}
                    stroke="none"
                    onMouseLeave={() => setHoveredSlice(null)}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill}
                        className="cursor-pointer transition-opacity duration-200 hover:opacity-90"
                        onMouseEnter={() =>
                          setHoveredSlice({
                            name: entry.name,
                            value: entry.value,
                            color: entry.color,
                            percent: entry.percent,
                          })
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Dynamic In-Place Center Badge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-200">
                <span
                  className="text-2xl sm:text-3xl font-black font-mono leading-none drop-shadow-xs transition-colors duration-200"
                  style={{ color: hoveredSlice ? hoveredSlice.color : undefined }}
                >
                  {hoveredSlice ? `${hoveredSlice.value}/${total}` : `${withBbox}/${total}`}
                </span>
                <span className="text-[11px] font-bold tracking-wider mt-1.5 uppercase transition-colors duration-200 text-slate-500 dark:text-slate-400">
                  {hoveredSlice ? `${hoveredSlice.name} (${hoveredSlice.percent}%)` : 'Đã số hóa'}
                </span>
              </div>
            </>
          ) : (
            <div className="text-center text-slate-400 text-xs">Chưa có dữ liệu địa bàn...</div>
          )}
        </div>
      </div>

      {/* 3 Minimal Bottom Chips */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="p-2.5 rounded-2xl bg-cyan-50/50 dark:bg-cyan-950/20 text-center border border-cyan-100/60 shadow-2xs">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
            <Compass className="w-3 h-3 text-cyan-600" />
            <span className="text-[10px] font-medium">Tổng địa bàn</span>
          </div>
          <strong className="text-sm font-mono text-cyan-700 dark:text-cyan-300 font-bold block">
            {total}
          </strong>
        </div>

        <div
          onMouseEnter={() =>
            setHoveredSlice({
              name: 'Đã số hóa',
              value: withBbox,
              color: '#06b6d4',
              percent: coverageRatio,
            })
          }
          onMouseLeave={() => setHoveredSlice(null)}
          className="p-2.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 text-center border border-blue-100/60 shadow-2xs cursor-pointer hover:bg-blue-50 transition-colors"
        >
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
            <Map className="w-3 h-3 text-blue-600" />
            <span className="text-[10px] font-medium">Ranh giới BBox</span>
          </div>
          <strong className="text-sm font-mono text-blue-700 dark:text-blue-300 font-bold block">
            {withBbox}
          </strong>
        </div>

        <div className="p-2.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 text-center border border-emerald-100/60 shadow-2xs">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
            <MapPin className="w-3 h-3 text-emerald-600" />
            <span className="text-[10px] font-medium">Tọa độ tâm</span>
          </div>
          <strong className="text-sm font-mono text-emerald-700 dark:text-emerald-300 font-bold block">
            {withCenter}
          </strong>
        </div>
      </div>
    </div>
  )
}
