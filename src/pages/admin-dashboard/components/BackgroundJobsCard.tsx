import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { Cpu, ExternalLink } from 'lucide-react'
import type { JobStatusItem } from '../../../types/admin/system'
import { formatRelativeTime, formatFutureTime } from '../../../utils/admin-dashboard/formatters'

interface BackgroundJobsCardProps {
  jobs: JobStatusItem[]
  onSelectJob: (job: JobStatusItem) => void
}

export const BackgroundJobsCard: React.FC<BackgroundJobsCardProps> = ({ jobs, onSelectJob }) => {
  const totalRuns = jobs.reduce((sum, j) => sum + (j.run_count ?? 0), 0)
  const okCount = jobs.filter((j) => j.state === 'ok' || !j.state).length

  const chartData = jobs.map((j) => {
    const state = j.state || 'ok'
    let gradientId = 'barOkGrad'
    let color = '#06b6d4'

    if (state === 'failing') {
      gradientId = 'barFailGrad'
      color = '#f43f5e'
    } else if (state === 'stalled') {
      gradientId = 'barStallGrad'
      color = '#f59e0b'
    }

    return {
      name: j.name || 'worker',
      displayName: (j.name || '').replace(/_/g, ' '),
      runs: j.run_count ?? 0,
      state,
      gradientId,
      color,
      lastRun: formatRelativeTime(j.last_started_at ?? undefined),
      nextRun: j.next_run_at ? formatFutureTime(j.next_run_at) : 'Theo chu kỳ',
      rawJob: j,
    }
  })

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/90 dark:border-slate-800 rounded-2xl p-3 shadow-xl text-xs space-y-1.5 z-50 pointer-events-none min-w-[200px]">
          <div className="flex items-center justify-between gap-4 pb-1 border-b border-slate-100 dark:border-slate-800">
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              #{data.name}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                data.state === 'ok'
                  ? 'bg-emerald-500 animate-pulse'
                  : data.state === 'failing'
                  ? 'bg-rose-500 animate-ping'
                  : 'bg-amber-500'
              }`}
            />
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px]">
            <span className="text-slate-400">Lượt thực thi:</span>
            <strong className="font-mono text-sm font-bold" style={{ color: data.color }}>
              {data.runs.toLocaleString()}
            </strong>
          </div>
          <div className="flex items-center justify-between gap-4 text-[10px] text-slate-500">
            <span>Chạy gần nhất:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">{data.lastRun}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[10px] text-slate-500">
            <span>Lịch tiếp theo:</span>
            <span className="font-mono text-indigo-600 font-semibold">{data.nextRun}</span>
          </div>
          <div className="pt-1 text-[10px] text-indigo-500 font-medium flex items-center gap-1 border-t border-slate-100 dark:border-slate-800">
            <ExternalLink className="w-3 h-3" />
            <span>Nhấp vào cột để xem chi tiết & audit log</span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/90 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between transition-all duration-300 outline-none focus:outline-none select-none">
      <div>
        {/* Minimal Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100/60 shadow-2xs">
              <Cpu className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Lượt thực thi Worker (Nhấp vào cột để xem chi tiết)
              </span>
              <div className="flex items-baseline gap-2.5 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                  {totalRuns.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  ↑ {okCount}/{jobs.length} sẵn sàng
                </span>
              </div>
            </div>
          </div>

          <span className="text-[11px] font-mono text-slate-400 bg-slate-100/70 dark:bg-slate-800/60 px-3 py-1 rounded-full">
            {jobs.length} tiến trình nền
          </span>
        </div>

        {/* Biểu đồ Cột/Trụ (Bar Chart) tương tác click 100% */}
        <div className="h-64 w-full pt-4 outline-none focus:outline-none [&_*]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="barOkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <linearGradient id="barFailGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#e11d48" />
                </linearGradient>
                <linearGradient id="barStallGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'monospace' }}
                axisLine={{ stroke: '#f1f5f9' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomBarTooltip />}
                isAnimationActive={false}
                cursor={{ fill: 'rgba(99, 102, 241, 0.05)', radius: 10 }}
              />
              <Bar
                dataKey="runs"
                barSize={48}
                radius={[10, 10, 0, 0]}
                animationDuration={1000}
                className="cursor-pointer"
                onClick={(entry: any) => {
                  if (entry?.rawJob) {
                    onSelectJob(entry.rawJob)
                  }
                }}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={`url(#${entry.gradientId})`}
                    className="cursor-pointer transition-opacity duration-200 hover:opacity-85"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4 Interactive Worker Summary Chips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80">
        {chartData.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => onSelectJob(item.rawJob)}
            className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 text-left cursor-pointer group shadow-2xs hover:shadow-xs active:scale-98"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                #{item.name}
              </span>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  item.state === 'ok'
                    ? 'bg-emerald-500'
                    : item.state === 'failing'
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`}
              />
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <strong className="text-sm font-mono font-bold" style={{ color: item.color }}>
                {item.runs.toLocaleString()}
              </strong>
              <span className="text-[10px] text-slate-400 group-hover:text-indigo-500 font-medium flex items-center gap-0.5">
                Xem <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
