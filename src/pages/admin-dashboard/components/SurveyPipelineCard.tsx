import React from 'react'
import { Activity, AlertTriangle, CheckCircle, Clock, PlayCircle, XCircle } from 'lucide-react'
import type { SurveyProcessingSummary } from '../../../types/admin/system'
import { formatRelativeTime } from '../utils/formatters'

interface SurveyPipelineCardProps {
  survey?: SurveyProcessingSummary
}

export const SurveyPipelineCard: React.FC<SurveyPipelineCardProps> = ({ survey }) => {
  const counts = survey?.by_status
  const notStarted = counts?.not_started ?? 0
  const queued = counts?.queued ?? 0
  const processing = counts?.processing ?? 0
  const succeeded = counts?.succeeded ?? 0
  const failed = counts?.failed ?? 0
  const stuck = survey?.stuck ?? 0
  const recentFailures = survey?.recent_failures || []

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Activity className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Đường Ống Khảo Sát Trắc Đạc & AI (Survey Pipeline)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Giám sát tiến trình bóc tách video trinh sát trắc đạc, phát hiện bóng đèn và lập bản đồ
            </p>
          </div>
        </div>
        {stuck > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{stuck} lượt kẹt lease</span>
          </span>
        )}
      </div>

      {/* 1. Thanh pipeline 5 bước */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5">
        {/* Chưa bắt đầu */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
          <Clock className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <span className="text-[11px] text-slate-400 block font-medium">Chờ kích hoạt</span>
          <span className="text-lg font-black font-mono text-slate-700 dark:text-slate-300 mt-0.5 block">
            {notStarted}
          </span>
        </div>

        {/* Trong hàng đợi */}
        <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-center">
          <PlayCircle className="w-4 h-4 text-blue-500 mx-auto mb-1" />
          <span className="text-[11px] text-blue-600 dark:text-blue-400 block font-medium">Hàng đợi (Queue)</span>
          <span className="text-lg font-black font-mono text-blue-700 dark:text-blue-300 mt-0.5 block">
            {queued}
          </span>
        </div>

        {/* Đang xử lý */}
        <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-center">
          <Activity className="w-4 h-4 text-indigo-500 mx-auto mb-1 animate-pulse" />
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 block font-medium">Đang xử lý</span>
          <span className="text-lg font-black font-mono text-indigo-700 dark:text-indigo-300 mt-0.5 block">
            {processing}
          </span>
        </div>

        {/* Thành công */}
        <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-center">
          <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium">Thành công</span>
          <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-300 mt-0.5 block">
            {succeeded}
          </span>
        </div>

        {/* Thất bại */}
        <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 text-center col-span-2 sm:col-span-1">
          <XCircle className="w-4 h-4 text-rose-500 mx-auto mb-1" />
          <span className="text-[11px] text-rose-600 dark:text-rose-400 block font-medium">Thất bại</span>
          <span className="text-lg font-black font-mono text-rose-700 dark:text-rose-300 mt-0.5 block">
            {failed}
          </span>
        </div>
      </div>

      {/* 2. Cảnh báo các lần xử lý thất bại gần nhất */}
      <div className="flex-1 flex flex-col min-h-0">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Các lần xử lý lỗi gần nhất ({recentFailures.length})
        </span>

        <div className="flex-1 overflow-x-auto custom-scrollbar">
          {recentFailures.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-1.5">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span>Không có lỗi xử lý khảo sát nào gần đây. Hệ thống vận hành tối ưu!</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2.5 pr-3">Mã đợt quét (Sweep ID)</th>
                  <th className="pb-2.5 px-3">Giai đoạn</th>
                  <th className="pb-2.5 px-3">Lần thử</th>
                  <th className="pb-2.5 px-3">Mã lỗi</th>
                  <th className="pb-2.5 pl-3 text-right">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {recentFailures.map((rf, idx) => (
                  <tr key={rf.sweep_id ? `${rf.sweep_id}-${idx}` : idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 pr-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {rf.sweep_id || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {rf.stage || 'unknown'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                      #{rf.attempt ?? 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-rose-600 dark:text-rose-400 text-[11px]">
                      {rf.error_code || 'ERROR'}
                    </td>
                    <td className="py-2.5 pl-3 text-right text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                      {formatRelativeTime(rf.finished_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
