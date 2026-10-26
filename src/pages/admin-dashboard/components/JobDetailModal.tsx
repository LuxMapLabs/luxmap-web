import React from 'react'
import { X, Cpu, Clock, CheckCircle2, AlertOctagon, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react'
import type { JobStatusItem } from '../../../types/admin/system'
import { formatFullDateTime, formatRelativeTime, formatFutureTime } from '../../../utils/admin-dashboard/formatters'

interface JobDetailModalProps {
  job: JobStatusItem | null
  isOpen: boolean
  onClose: () => void
  onRefresh: () => void
  isRefreshing: boolean
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  isOpen,
  onClose,
  onRefresh,
  isRefreshing,
}) => {
  if (!isOpen || !job) return null

  const renderBadge = (state?: string) => {
    switch (state) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>Đang chạy trực tiếp (Running)</span>
          </span>
        )
      case 'failing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            <span>Thất bại (Failing)</span>
          </span>
        )
      case 'stalled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Kẹt tiến trình (Stalled)</span>
          </span>
        )
      case 'ok':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bình thường (Healthy)</span>
          </span>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                {job.name || 'Job Details'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhật ký kiểm toán & trạng thái thực thi tác vụ nền
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Status Badge Row */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Trạng thái vận hành hiện tại:
            </span>
            {renderBadge(job.state)}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Tổng số lần chạy</span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                {job.run_count ?? 0}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Lỗi liên tiếp</span>
              <span
                className={`text-xl font-black font-mono mt-1 block ${
                  (job.consecutive_failures ?? 0) > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'
                }`}
              >
                {job.consecutive_failures ?? 0}
              </span>
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Lần bắt đầu gần nhất:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {formatFullDateTime(job.last_started_at)} ({formatRelativeTime(job.last_started_at)})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Lần kết thúc gần nhất:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {formatFullDateTime(job.last_finished_at)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 gap-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Thời gian dự kiến chạy tiếp theo:</span>
              </span>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {job.next_run_at ? formatFullDateTime(job.next_run_at) : 'Chưa xếp lịch'}
                </span>
                {job.next_run_at && (
                  <span className="text-[11px] font-sans font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                    {formatFutureTime(job.next_run_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Error Message Section */}
          {job.last_error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>Nhật ký lỗi gần nhất ({formatRelativeTime(job.last_failed_at)}):</span>
              </div>
              <p className="font-mono text-rose-800 dark:text-rose-200 text-[11px] bg-white/60 dark:bg-slate-900/80 p-2.5 rounded-xl border border-rose-200/50 break-words">
                {job.last_error}
              </p>
            </div>
          )}
        </div>

        {/* Footer: Gom về góc phải theo chuẩn UX Modal */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer shadow-2xs"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Kiểm tra lại tác vụ</span>
          </button>
        </div>
      </div>
    </div>
  )
}
