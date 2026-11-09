import React from 'react'
import type { StorageSummary, BucketUsage } from '../../../types/admin/system'
import { formatBytes } from '../../../utils/admin-dashboard/formatters'
import { GlassRing } from './GlassRing'
import { enterDelay } from '../../../utils/admin-dashboard/motion'

interface StorageBucketsCardProps {
  storage?: StorageSummary
}

// 4 phân vùng chính, luôn hiển thị đủ kể cả khi bucket rỗng
const BUCKETS: { key: string; label: string }[] = [
  { key: 'video', label: 'Video' },
  { key: 'survey', label: 'Trắc đạc' },
  { key: 'evidence', label: 'Sự cố' },
  { key: 'citizen', label: 'Dân phản ánh' },
]

export const StorageBucketsCard: React.FC<StorageBucketsCardProps> = ({ storage }) => {
  const buckets: BucketUsage[] = storage?.buckets || []

  const bucketMap = new Map<string, BucketUsage>()
  buckets.forEach((b) => {
    if (b.bucket) bucketMap.set(b.bucket, b)
  })

  const totalBytes = buckets.reduce((acc, b) => acc + (b.bytes ?? 0), 0)
  const totalObjects = buckets.reduce((acc, b) => acc + (b.object_count ?? 0), 0)

  const items = BUCKETS.map(({ key, label }) => {
    const usage = bucketMap.get(key)
    const bytes = usage?.bytes ?? 0
    const count = usage?.object_count ?? 0
    const percent = totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0
    return { key, label, bytes, count, percent }
  })

  return (
    <section className="select-none">
      <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
        <h2 className="admin-display text-[15px] font-semibold text-slate-900 dark:text-white">
          Phân vùng tệp MinIO S3
        </h2>
        <span className="text-[13px] text-slate-500 dark:text-slate-400">
          {formatBytes(totalBytes)}, {totalObjects.toLocaleString()} tệp
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item, idx) => (
          <article
            key={item.key}
            style={enterDelay(4 + idx)}
            className="glass-tile glass-lift glass-enter relative flex flex-col items-center px-4 pb-5 pt-9 text-center"
          >
            <span className="glass-chip absolute right-3.5 top-3.5 px-2.5 py-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {item.count.toLocaleString()} tệp
            </span>
            <GlassRing percent={item.percent} tone={item.percent > 0 ? 'primary' : 'muted'}>
              <span className="admin-display text-[17px] font-semibold text-slate-900 dark:text-white">
                {item.percent}%
              </span>
            </GlassRing>
            <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{item.label}</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatBytes(item.bytes, 1)}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
