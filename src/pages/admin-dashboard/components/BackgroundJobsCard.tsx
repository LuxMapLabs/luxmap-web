import React, { useState } from 'react'
import { Cpu, RefreshCw, CheckCircle2, AlertOctagon, Clock, AlertTriangle, ChevronRight } from 'lucide-react'
import type { JobStatusItem } from '../../../types/admin/system'
import { formatRelativeTime, formatFutureTime } from '../utils/formatters'

interface BackgroundJobsCardProps {
  jobs: JobStatusItem[]
  onSelectJob: (job: JobStatusItem) => void
}

type FilterState = 'all' | 'ok' | 'running' | 'alert'

export const BackgroundJobsCard: React.FC<BackgroundJobsCardProps> = ({ jobs, onSelectJob }) => {
  const [filter, setFilter] = useState<FilterState>('all')

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'all') return true
    if (filter === 'ok') return job.state === 'ok'
    if (filter === 'running') return job.state === 'running'
    if (filter === 'alert') return job.state === 'failing' || job.state === 'stalled'
    return true
  })

  const alertJobsCount = jobs.filter((j) => j.state === 'failing' || j.state === 'stalled').length
  const runningJobsCount = jobs.filter((j) => j.state === 'running').length

  const renderJobStateBadge = (state?: string) => {
    switch (state) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
            <span>Đang chạy</span>
          </span>
        )
      case 'failing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertOctagon className="w-3 h-3 text-rose-600" />
            <span>Lỗi</span>
          </span>
        )
      case 'stalled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Bị nghẽn</span>
          </span>
        )
      case 'ok':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Bình thường</span>
          </span>
        )
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Cpu className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Tiến Trình Chạy Ngầm (Background Jobs)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Nhấn vào từng tiến trình để kiểm tra nhật ký lỗi & lịch sử chi tiết
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl self-start sm:self-auto text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer text-[11px] ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Tất cả ({jobs.length})
          </button>
          <button
            onClick={() => setFilter('ok')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer text-[11px] ${
              filter === 'ok'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Bình thường
          </button>
          {runningJobsCount > 0 && (
            <button
              onClick={() => setFilter('running')}
              className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer text-[11px] ${
                filter === 'running'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Đang chạy ({runningJobsCount})
            </button>
          )}
          {alertJobsCount > 0 && (
            <button
              onClick={() => setFilter('alert')}
              className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer text-[11px] ${
                filter === 'alert'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 shadow-2xs'
                  : 'text-rose-500 hover:text-rose-700'
              }`}
            >
              Lỗi / Nghẽn ({alertJobsCount})
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="pb-3 pr-4">Tên tác vụ</th>
              <th className="pb-3 px-3">Trạng thái</th>
              <th className="pb-3 px-3">Lần chạy cuối</th>
              <th className="pb-3 px-3">Dự kiến tiếp theo</th>
              <th className="pb-3 px-3 text-right">Lần chạy</th>
              <th className="pb-3 pl-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Không có tiến trình nào khớp với bộ lọc.
                </td>
              </tr>
            ) : (
              filteredJobs.map((job, idx) => (
                <tr
                  key={job.name || idx}
                  onClick={() => onSelectJob(job)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
                  title="Nhấn để xem nhật ký kiểm toán và chi tiết tác vụ"
                >
                  <td className="py-3 pr-4">
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      {job.name || 'Unnamed Job'}
                    </span>
                    {job.last_error && (
                      <p className="text-[10px] text-rose-500 truncate max-w-xs mt-0.5">
                        {job.last_error}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {renderJobStateBadge(job.state)}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatRelativeTime(job.last_started_at)}
                  </td>
                  <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {job.next_run_at ? (
                      <span className="flex items-center gap-1 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                        <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                        {formatFutureTime(job.next_run_at)}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Không có lịch</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                    {(job.run_count ?? 0).toLocaleString()}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition text-[11px] font-semibold">
                      <span>Xem log</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
