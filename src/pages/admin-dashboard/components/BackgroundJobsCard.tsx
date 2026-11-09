import React from 'react'
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip } from 'recharts'
import type { JobStatusItem } from '../../../types/admin/system'
import { formatRelativeTime } from '../../../utils/admin-dashboard/formatters'
import { useCountUp } from '../../../hooks/useCountUp'

interface BackgroundJobsCardProps {
  jobs: JobStatusItem[]
  onSelectJob: (job: JobStatusItem) => void
}

const stateColor = (state: JobStatusItem['state']): string => {
  if (state === 'failing') return '#d64545'
  if (state === 'stalled') return '#e9a23b'
  return '#3e86c9'
}

export const BackgroundJobsCard: React.FC<BackgroundJobsCardProps> = ({ jobs, onSelectJob }) => {
  const totalRuns = jobs.reduce((sum, j) => sum + (j.run_count ?? 0), 0)
  const okCount = jobs.filter((j) => j.state === 'ok' || !j.state).length
  const animatedTotal = useCountUp(totalRuns)

  const chartData = jobs.map((job) => ({
    name: job.name || '-',
    runs: job.run_count ?? 0,
    color: stateColor(job.state),
    job,
  }))

  return (
    <section className="glass-tile glass-lift p-5 h-full select-none">
      <h2 className="text-[13px] text-slate-500 dark:text-slate-400">Lượt thực thi worker</h2>
      <div className="admin-display mt-2 text-3xl font-semibold leading-none text-slate-900 dark:text-white">
        {Math.round(animatedTotal).toLocaleString()}
      </div>
      <p className="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400">
        {okCount}/{jobs.length} tiến trình nền sẵn sàng
      </p>

      {jobs.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">Chưa có tiến trình nền nào.</p>
      ) : (
        <>
          {/* Trục dùng căn bậc hai để cột nhỏ vẫn nhìn thấy; số thật hiện ở tooltip và danh sách bên dưới */}
          <div className="mt-3 h-36 w-full" role="img" aria-label="Biểu đồ số lượt thực thi của từng worker">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <XAxis dataKey="name" hide />
                <YAxis hide scale="sqrt" domain={[0, 'dataMax']} />
                <Tooltip
                  cursor={{ fill: 'rgba(62, 134, 201, 0.08)' }}
                  formatter={(value) => [Number(value).toLocaleString(), 'Lượt chạy']}
                  contentStyle={{
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.8)',
                    background: 'rgba(255,255,255,0.92)',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="runs" radius={[10, 10, 4, 4]} maxBarSize={44} animationDuration={1100}>
                  {chartData.map((d) => (
                    <Cell
                      key={d.name}
                      fill={d.color}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      onClick={() => onSelectJob(d.job)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-3 grid grid-cols-1 gap-y-1">
            {chartData.map((d) => (
              <li key={d.name}>
                <button
                  type="button"
                  onClick={() => onSelectJob(d.job)}
                  title={`Chạy gần nhất: ${formatRelativeTime(d.job.last_started_at)}. Nhấp để xem chi tiết và nhật ký`}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 text-left text-[12px] text-slate-600 hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-secondary"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{d.name}</span>
                  <strong className="font-semibold text-slate-900">{d.runs.toLocaleString()}</strong>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
