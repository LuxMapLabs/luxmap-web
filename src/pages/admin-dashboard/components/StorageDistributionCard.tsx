import React from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import type { StorageSummary } from '../../../types/admin/system'
import { formatBytes } from '../../../utils/admin-dashboard/formatters'
import { useCountUp } from '../../../hooks/useCountUp'

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

  const hasData = diskTotal > 0
  const [freeValue, ...freeUnit] = formatBytes(diskFree, 1).split(' ')
  const animatedFree = useCountUp(parseFloat(freeValue) || 0)

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
                {animatedFree.toFixed(1)}
                <span className="ml-1.5 text-xl font-medium text-slate-500 dark:text-slate-400">
                  {freeUnit.join(' ')}
                </span>
              </div>
              <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">
                còn trống trên {formatBytes(diskTotal, 0)}
              </p>
            </div>

            <div className="relative h-40 w-40 shrink-0" role="img" aria-label={`Đã dùng ${usedRatio}% dung lượng ổ cứng`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    innerRadius={54}
                    outerRadius={72}
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

          <dl className="mt-auto grid grid-cols-3 gap-3 pt-5 text-xs text-slate-500 dark:text-slate-400">
            <div>
              <dt>Trống</dt>
              <dd className="mt-0.5 text-[15px] font-semibold text-slate-900 dark:text-white">
                {formatBytes(diskFree, 0)}
              </dd>
            </div>
            <div>
              <dt>PostgreSQL</dt>
              <dd className="mt-0.5 text-[15px] font-semibold text-slate-900 dark:text-white">
                {formatBytes(dbBytes, 0)}
              </dd>
            </div>
            <div>
              <dt>MinIO S3</dt>
              <dd className="mt-0.5 text-[15px] font-semibold text-slate-900 dark:text-white">
                {formatBytes(s3Bytes, 0)}
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="mt-6 text-sm text-slate-400">Chưa có dữ liệu dung lượng.</p>
      )}
    </section>
  )
}
