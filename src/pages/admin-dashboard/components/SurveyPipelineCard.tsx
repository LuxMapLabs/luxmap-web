import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import type { SurveyProcessingSummary } from '../../../types/admin/system'
import { formatRelativeTime } from '../../../utils/admin-dashboard/formatters'

interface SurveyPipelineCardProps {
  survey?: SurveyProcessingSummary
}

export const SurveyPipelineCard: React.FC<SurveyPipelineCardProps> = ({ survey }) => {
  const counts = survey?.by_status
  const stuck = survey?.stuck ?? 0
  const recentFailures = survey?.recent_failures || []

  const steps = [
    { label: 'Chờ kích hoạt', value: counts?.not_started ?? 0, dot: 'bg-slate-400' },
    { label: 'Hàng đợi', value: counts?.queued ?? 0, dot: 'bg-blue-500' },
    { label: 'Đang xử lý', value: counts?.processing ?? 0, dot: 'bg-secondary' },
    { label: 'Thành công', value: counts?.succeeded ?? 0, dot: 'bg-emerald-500' },
    { label: 'Thất bại', value: counts?.failed ?? 0, dot: 'bg-danger' },
  ]

  return (
    <section className="glass-tile p-5 select-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="admin-display text-[15px] font-semibold text-slate-900 dark:text-white">
            Đường ống khảo sát trắc đạc và AI
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
            Tiến trình bóc tách video trắc đạc, phát hiện bóng đèn và lập bản đồ.
          </p>
        </div>
        {stuck > 0 && <span className="glass-badge glass-badge-warning">{stuck} lượt kẹt</span>}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {steps.map((s) => (
          <li key={s.label} className="glass-item px-3.5 py-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
              {s.label}
            </div>
            <div className="admin-display mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
              {s.value.toLocaleString()}
            </div>
          </li>
        ))}
      </ul>

      <h3 className="mb-2 mt-5 text-[13px] font-semibold text-slate-700 dark:text-slate-300">
        Lần xử lý lỗi gần nhất ({recentFailures.length})
      </h3>

      {recentFailures.length === 0 ? (
        <div className="glass-item flex items-center gap-2.5 px-4 py-3.5 text-[13px] text-slate-500 dark:text-slate-400">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          Không có lỗi xử lý khảo sát nào gần đây.
        </div>
      ) : (
        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/70 text-slate-500 dark:border-slate-700">
                <th className="pb-2 pr-3 font-medium">Mã đợt quét</th>
                <th className="px-3 pb-2 font-medium">Giai đoạn</th>
                <th className="px-3 pb-2 font-medium">Lần thử</th>
                <th className="px-3 pb-2 font-medium">Mã lỗi</th>
                <th className="pb-2 pl-3 text-right font-medium">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
              {recentFailures.map((rf, idx) => (
                <tr key={rf.sweep_id ? `${rf.sweep_id}-${idx}` : idx}>
                  <td className="py-2.5 pr-3 font-medium text-slate-900 dark:text-slate-100">{rf.sweep_id || '-'}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{rf.stage || '-'}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">#{rf.attempt ?? 1}</td>
                  <td className="px-3 py-2.5 font-medium text-danger">{rf.error_code || '-'}</td>
                  <td className="whitespace-nowrap py-2.5 pl-3 text-right text-slate-500 dark:text-slate-400">
                    {formatRelativeTime(rf.finished_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
