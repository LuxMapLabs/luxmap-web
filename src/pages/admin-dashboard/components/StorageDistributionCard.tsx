import React from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { HardDrive, Database, Layers, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { StorageSummary } from '../../../types/admin/system'
import { formatBytes } from '../utils/formatters'

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
  const buckets = storage?.buckets || []
  const s3Bytes = buckets.reduce((acc, b) => acc + (b.bytes ?? 0), 0)
  const totalS3Files = buckets.reduce((acc, b) => acc + (b.object_count ?? 0), 0)

  // Dữ liệu biểu đồ Donut: 100% từ storage.disk của Backend
  const physicalDiskDonutData = [
    {
      name: 'Dung lượng khả dụng (Free Space)',
      value: diskFree,
      color: '#10b981', // emerald-500
    },
    {
      name: 'Đã sử dụng (Used Space)',
      value: diskUsed,
      color: '#3b82f6', // blue-500
    },
  ]

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <HardDrive className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Phân Bổ Tài Nguyên Lưu Trữ
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Bộ nhớ đĩa vật lý máy chủ, PostgreSQL và MinIO S3 Object Storage
              </p>
            </div>
          </div>

          {disk?.low ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Sắp đầy đĩa</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/60">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Bộ nhớ an toàn</span>
            </span>
          )}
        </div>

        {/* Donut Chart + Storage Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Donut Chart */}
          <div className="md:col-span-5 h-48 relative flex items-center justify-center">
            {diskTotal > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={physicalDiskDonutData}
                      innerRadius={56}
                      outerRadius={76}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {physicalDiskDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Đã dùng
                  </span>
                  <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                    {usedRatio}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Tổng {formatBytes(diskTotal, 0)}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-400 text-xs">Đang tải dữ liệu lưu trữ...</div>
            )}
          </div>

          {/* Breakdown List */}
          <div className="md:col-span-7 space-y-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Dung lượng khả dụng:</span>
                </span>
                <strong className="font-mono text-slate-900 dark:text-white">
                  {formatBytes(diskFree)}
                </strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  <span>Đã sử dụng:</span>
                </span>
                <strong className="font-mono text-slate-900 dark:text-white">
                  {formatBytes(diskUsed)}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold mb-0.5">
                  <Database className="w-3.5 h-3.5" />
                  <span>PostgreSQL</span>
                </div>
                <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                  {formatBytes(dbBytes)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-violet-50/50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/50">
                <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 text-[11px] font-bold mb-0.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>MinIO ({totalS3Files} tệp)</span>
                </div>
                <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                  {formatBytes(s3Bytes)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Chi tiết phân rã MinIO S3 Buckets (Lấp đầy tự nhiên, 100% dữ liệu thực từ Backend) */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Phân vùng MinIO S3 Buckets ({buckets.length})
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Tổng {totalS3Files} tệp • {formatBytes(s3Bytes)}
            </span>
          </div>

          <div className="space-y-1.5">
            {buckets.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                Chưa phát sinh bucket lưu trữ ngoài.
              </div>
            ) : (
              buckets.map((b, idx) => (
                <div
                  key={b.bucket || idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {b.bucket || `bucket-${idx + 1}`}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                      ({b.object_count ?? 0} files)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {b.reconciliation?.orphan_count !== undefined && b.reconciliation.orphan_count > 0 && (
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md">
                        {b.reconciliation.orphan_count} orphan
                      </span>
                    )}
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatBytes(b.bytes)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
