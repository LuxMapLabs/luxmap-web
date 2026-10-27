import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'
import { FolderGit2, Video, Image, Camera, AlertCircle } from 'lucide-react'
import type { StorageSummary, BucketUsage } from '../../../types/admin/system'
import { formatBytes } from '../../../utils/admin-dashboard/formatters'

interface StorageBucketsCardProps {
  storage?: StorageSummary
}

interface BucketMeta {
  key: string
  label: string
  shortLabel: string
  icon: React.ElementType
  color: string
  gradientId: string
  startColor: string
  endColor: string
}

const BUCKET_CONFIG: Record<string, BucketMeta> = {
  video: {
    key: 'video',
    label: 'Video khảo sát',
    shortLabel: 'Video',
    icon: Video,
    color: '#8b5cf6',
    gradientId: 'vidGrad',
    startColor: '#8b5cf6',
    endColor: '#a855f7',
  },
  survey: {
    key: 'survey',
    label: 'Ảnh trắc đạc AI',
    shortLabel: 'Trắc đạc',
    icon: Camera,
    color: '#06b6d4',
    gradientId: 'survGrad',
    startColor: '#06b6d4',
    endColor: '#3b82f6',
  },
  evidence: {
    key: 'evidence',
    label: 'Ảnh sự cố & sửa chữa',
    shortLabel: 'Sự cố',
    icon: AlertCircle,
    color: '#f59e0b',
    gradientId: 'evidGrad',
    startColor: '#f59e0b',
    endColor: '#f97316',
  },
  citizen: {
    key: 'citizen',
    label: 'Ảnh người dân phản ánh',
    shortLabel: 'Dân phản ánh',
    icon: Image,
    color: '#ec4899',
    gradientId: 'citGrad',
    startColor: '#ec4899',
    endColor: '#f43f5e',
  },
}

export const StorageBucketsCard: React.FC<StorageBucketsCardProps> = ({ storage }) => {
  const buckets: BucketUsage[] = storage?.buckets || []

  // Đảm bảo đủ 4 phân vùng chính ngay cả khi bucket rỗng
  const defaultKeys = ['video', 'survey', 'evidence', 'citizen']
  const bucketMap = new Map<string, BucketUsage>()
  buckets.forEach((b) => {
    if (b.bucket) bucketMap.set(b.bucket, b)
  })

  const totalBytes = buckets.reduce((acc, b) => acc + (b.bytes ?? 0), 0)
  const totalObjects = buckets.reduce((acc, b) => acc + (b.object_count ?? 0), 0)

  const chartData = defaultKeys.map((key) => {
    const usage = bucketMap.get(key)
    const meta = BUCKET_CONFIG[key] || {
      key,
      label: key,
      shortLabel: key,
      icon: Image,
      color: '#64748b',
      gradientId: `${key}Grad`,
      startColor: '#64748b',
      endColor: '#94a3b8',
    }
    const bytes = usage?.bytes ?? 0
    const count = usage?.object_count ?? 0
    const percent = totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0

    return {
      key,
      name: meta.shortLabel,
      fullName: meta.label,
      bytes,
      count,
      percent,
      color: meta.color,
      gradientId: meta.gradientId,
      startColor: meta.startColor,
      endColor: meta.endColor,
      Icon: meta.icon,
    }
  })

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/80 dark:border-slate-800 rounded-2xl p-3 shadow-xl text-xs z-50 pointer-events-none min-w-[160px]">
          <span className="font-bold text-slate-900 dark:text-white block mb-1">
            {data.fullName}
          </span>
          <div className="flex items-center justify-between gap-4 font-mono">
            <span className="text-slate-400">Dung lượng:</span>
            <strong className="font-bold" style={{ color: data.color }}>
              {formatBytes(data.bytes)}
            </strong>
          </div>
          <div className="flex items-center justify-between gap-4 font-mono mt-0.5">
            <span className="text-slate-400">Số tệp:</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              {data.count.toLocaleString()} tệp
            </span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/90 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between h-full transition-all duration-300 outline-none focus:outline-none select-none">
      <div>
        {/* Minimal Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100/60 shadow-2xs">
              <FolderGit2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Phân vùng tệp MinIO S3
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                  {formatBytes(totalBytes)}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  / {totalObjects.toLocaleString()} tệp đa phương tiện
                </span>
              </div>
            </div>
          </div>

          <span className="text-xs font-mono font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800/60 px-3 py-1 rounded-full">
            4 Phân vùng
          </span>
        </div>

        {/* Horizontal Bar Chart with Glowing Gradients */}
        <div className="h-56 relative flex items-center justify-center my-2 outline-none focus:outline-none [&_*]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
            >
              <defs>
                {chartData.map((d) => (
                  <linearGradient key={d.gradientId} id={d.gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={d.startColor} />
                    <stop offset="100%" stopColor={d.endColor} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                width={85}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar
                dataKey="bytes"
                radius={[0, 8, 8, 0]}
                animationDuration={1200}
                barSize={18}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={`url(#${entry.gradientId})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4 Minimal Interactive Bottom Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        {chartData.map((item) => {
          const ItemIcon = item.Icon
          return (
            <div
              key={item.key}
              className="p-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center transition-all duration-300 hover:scale-105 shadow-2xs"
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <ItemIcon className="w-3 h-3" style={{ color: item.color }} />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                  {item.name}
                </span>
              </div>
              <strong className="text-xs font-mono font-bold block" style={{ color: item.color }}>
                {formatBytes(item.bytes, 1)}
              </strong>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                {item.count} tệp
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
