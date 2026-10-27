import React, { useState } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { HardDrive, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { StorageSummary } from '../../../types/admin/system'
import { formatBytes } from '../../../utils/admin-dashboard/formatters'

interface StorageDistributionCardProps {
  storage?: StorageSummary
}

export const StorageDistributionCard: React.FC<StorageDistributionCardProps> = ({ storage }) => {
  const disk = storage?.disk
  const diskTotal = disk?.total_bytes ?? 0
  const diskFree = disk?.free_bytes ?? 0
  const diskUsed = diskTotal > diskFree ? diskTotal - diskFree : 0
  const usedRatio = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0
  const freeRatio = Math.max(0, 100 - usedRatio)

  const dbBytes = storage?.database_bytes ?? 0
  const buckets = storage?.buckets || []
  const s3Bytes = buckets.reduce((acc, b) => acc + (b.bytes ?? 0), 0)

  // State cập nhật số liệu động tại tâm tròn (Khử 100% tooltip bay từ trái sang đè chữ)
  const [hoveredSlice, setHoveredSlice] = useState<{
    name: string
    value: number
    color: string
    percent: number
  } | null>(null)

  const donutData = [
    {
      name: 'Khả dụng',
      value: diskFree,
      fill: 'url(#freeGrad)',
      color: '#10b981',
      percent: freeRatio,
    },
    {
      name: 'Đã sử dụng',
      value: diskUsed,
      fill: 'url(#usedGrad)',
      color: '#3b82f6',
      percent: usedRatio,
    },
  ]

  return (
    <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/90 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between h-full transition-all duration-300 outline-none focus:outline-none select-none">
      <div>
        {/* Minimal Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100/60 shadow-2xs">
              <HardDrive className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Bộ nhớ máy chủ
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                  {usedRatio}%
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  / {formatBytes(diskTotal, 0)}
                </span>
              </div>
            </div>
          </div>

          {disk?.low ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Sắp đầy</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>An toàn</span>
            </span>
          )}
        </div>

        {/* 3D Glass Donut Chart (Dynamic Center - 0 Tooltip Bay Đè Lên Tâm) */}
        <div className="h-56 relative flex items-center justify-center my-2 outline-none focus:outline-none [&_*]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none">
          {diskTotal > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="freeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                    <linearGradient id="usedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={donutData}
                    innerRadius={72}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    animationDuration={1200}
                    stroke="none"
                    onMouseLeave={() => setHoveredSlice(null)}
                  >
                    {donutData.map((entry, index) => (
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

              {/* Dynamic In-Place Center Text (Đổi số tại chỗ, sạch 100%, không bị đè) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-200">
                <span
                  className="text-2xl sm:text-3xl font-black font-mono leading-none drop-shadow-xs transition-colors duration-200"
                  style={{ color: hoveredSlice ? hoveredSlice.color : undefined }}
                >
                  {formatBytes(hoveredSlice ? hoveredSlice.value : diskFree, 1)}
                </span>
                <span className="text-[11px] font-bold tracking-wider mt-1.5 uppercase transition-colors duration-200 text-slate-500 dark:text-slate-400">
                  {hoveredSlice ? `${hoveredSlice.name} (${hoveredSlice.percent}%)` : 'Khả dụng'}
                </span>
              </div>
            </>
          ) : (
            <div className="text-center text-slate-400 text-xs">Đang nạp dữ liệu...</div>
          )}
        </div>
      </div>

      {/* 3 Minimal Bottom Chips */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <div
          onMouseEnter={() =>
            setHoveredSlice({
              name: 'Khả dụng',
              value: diskFree,
              color: '#10b981',
              percent: freeRatio,
            })
          }
          onMouseLeave={() => setHoveredSlice(null)}
          className="p-2.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 text-center border border-emerald-100/60 shadow-2xs cursor-pointer hover:bg-emerald-50 transition-colors"
        >
          <span className="text-[10px] text-slate-400 block font-medium">Trống</span>
          <strong className="text-sm font-mono text-emerald-700 dark:text-emerald-300 font-bold block mt-0.5">
            {formatBytes(diskFree, 0)}
          </strong>
        </div>

        <div className="p-2.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 text-center border border-indigo-100/60 shadow-2xs">
          <span className="text-[10px] text-slate-400 block font-medium">PostgreSQL</span>
          <strong className="text-sm font-mono text-indigo-700 dark:text-indigo-300 font-bold block mt-0.5">
            {formatBytes(dbBytes, 0)}
          </strong>
        </div>

        <div className="p-2.5 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 text-center border border-violet-100/60 shadow-2xs">
          <span className="text-[10px] text-slate-400 block font-medium">MinIO S3</span>
          <strong className="text-sm font-mono text-violet-700 dark:text-violet-300 font-bold block mt-0.5">
            {formatBytes(s3Bytes, 0)}
          </strong>
        </div>
      </div>
    </div>
  )
}
