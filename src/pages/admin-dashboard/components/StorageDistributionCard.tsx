import React from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import type { StorageSummary } from '../../../types/admin/system'
import { formatBytes } from '../../../utils/admin-dashboard/formatters'
import { useCountUp } from '../../../hooks/useCountUp'

const formatShare = (ratio: number): string =>
  ratio > 0 && ratio < 0.01 ? '<1%' : `${Math.round(ratio * 100)}%`

interface StorageDistributionCardProps {
  storage?: StorageSummary
}

export const StorageDistributionCard: React.FC<StorageDistributionCardProps> = ({ storage }) => {
  const disk = storage?.disk
  const diskTotal = disk?.total_bytes ?? 0
  const diskFree = disk?.free_bytes ?? 0
  const diskUsed = diskTotal > diskFree ? diskTotal - diskFree : 0
  const usedRatio = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0

  const dbBytes = storage?.database_bytes ?? 0
  const s3Bytes = (storage?.buckets || []).reduce((acc, b) => acc + (b.bytes ?? 0), 0)

  const luxMapBytes = dbBytes + s3Bytes
  const otherBytes = Math.max(0, diskUsed - luxMapBytes)
  const hasData = diskTotal > 0
  const [usedValue, usedUnit] = formatBytes(diskUsed, 1).split(' ')
  const animatedUsed = useCountUp(parseFloat(usedValue) || 0)
  const freeShare = disk?.free_ratio == null ? '-' : formatShare(disk.free_ratio)
  const breakdown = [
    {
      name: 'Dữ liệu LuxMap',
      bytes: luxMapBytes,
      detail: `PostgreSQL ${formatBytes(dbBytes, 1)} · Ảnh MinIO ${formatBytes(s3Bytes, 1)}`,
    },
    {
      name: 'Hệ thống & khác',
      bytes: otherBytes,
      detail: 'Hệ điều hành, Docker, log…',
    },
    { name: 'Trống', bytes: diskFree },
  ]

  const donutData = [
    { name: 'Đã dùng', value: diskUsed, fill: disk?.low ? '#d64545' : 'var(--color-secondary)' },
    { name: 'Trống', value: diskFree, fill: 'rgba(29, 36, 51, 0.1)' },
  ]

  return (
    <section className="glass-tile glass-lift p-5 flex flex-col h-full select-none">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] text-slate-500 dark:text-slate-400">Bộ nhớ máy chủ</h2>
        {hasData &&
          (disk?.low ? (
            <span className="glass-badge glass-badge-danger">Sắp đầy</span>
          ) : (
            <span className="glass-badge glass-badge-ok">An toàn</span>
          ))}
      </div>

      {hasData ? (
        <>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="admin-display text-5xl font-semibold leading-none text-slate-900 dark:text-white">
                {Number(animatedUsed.toFixed(1))}{' '}
                <span className="ml-1.5 text-xl font-medium text-slate-500 dark:text-slate-400">
                  {usedUnit}
                </span>
              </div>
              <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">
                đã dùng trên {formatBytes(diskTotal, 1)}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Còn trống {freeShare}
              </p>
            </div>

            <div className="relative h-32 w-32 shrink-0" role="img" aria-label={`Đã dùng ${usedRatio}% dung lượng ổ cứng`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    innerRadius={44}
                    outerRadius={58}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={2}
                    cornerRadius={8}
                    stroke="none"
                    animationDuration={1200}
                  >
                    {donutData.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="admin-display text-xl font-semibold text-slate-900 dark:text-white">{usedRatio}%</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">đã dùng</span>
              </div>
            </div>
          </div>

          <dl className="mt-4 space-y-3 border-t border-slate-200/60 pt-4 text-xs text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
            {breakdown.map((item) => (
              <div key={item.name} className="flex items-start justify-between gap-3">
                <dt className="min-w-0">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                  {item.detail && <span className="mt-1 block text-[11px]">{item.detail}</span>}
                </dt>
                <dd className="shrink-0 text-right">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatBytes(item.bytes, 1)}
                  </span>
                  <span className="mt-0.5 block">{formatShare(item.bytes / diskTotal)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="mt-6 text-sm text-slate-400">Chưa có dữ liệu dung lượng.</p>
      )}
    </section>
  )
}
