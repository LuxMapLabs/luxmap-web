import React from 'react'
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import type { UserAccountItem } from '../../../types/admin/users'
import { useCountUp } from '../../../hooks/useCountUp'

interface RbacOverviewCardProps {
  users: UserAccountItem[]
}

export const RbacOverviewCard: React.FC<RbacOverviewCardProps> = ({ users }) => {
  const activeUsers = users.filter((u) => u.status === 'active').length
  const invitedUsers = users.filter((u) => u.status === 'invited').length
  const lockedUsers = users.filter((u) => u.status === 'locked').length

  const total = Math.max(users.length, 1)
  const animatedUsers = useCountUp(users.length, 800)

  const roles = [
    { key: 'field_engineer', name: 'Kỹ sư', dot: 'bg-cyan-500' },
    { key: 'manager', name: 'Quản lý', dot: 'bg-blue-500' },
    { key: 'superior', name: 'Cấp giám sát', dot: 'bg-amber-500' },
    { key: 'system_admin', name: 'Admin', dot: 'bg-violet-500' },
  ].map((r) => {
    const count = users.filter((u) => u.role === r.key).length
    return { ...r, count, percent: Math.round((count / total) * 100) }
  })

  const maxCount = Math.max(1, ...roles.map((r) => r.count))

  return (
    <section className="glass-tile glass-lift p-5 h-full select-none">
      <h2 className="text-[13px] text-slate-500 dark:text-slate-400">Nhân sự tác nghiệp</h2>

      {users.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">Chưa có tài khoản nào.</p>
      ) : (
        <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
          <div className="min-w-0 flex-1 self-stretch">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="admin-display text-4xl font-semibold leading-none text-slate-900 dark:text-white">
                {Math.round(animatedUsers)}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="glass-badge glass-badge-ok">{activeUsers} hoạt động</span>
                {invitedUsers > 0 && (
                  <span className="glass-badge glass-badge-warning">{invitedUsers} chờ kích hoạt</span>
                )}
                {lockedUsers > 0 && <span className="glass-badge glass-badge-danger">{lockedUsers} tạm khóa</span>}
              </div>
            </div>

            <ul className="mt-5 flex flex-wrap gap-2">
              {roles.map((r) => (
                <li
                  key={r.key}
                  className="glass-chip flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300"
                  title={`${r.percent}% tổng số tài khoản`}
                >
                  <span className={`h-2 w-2 rounded-full ${r.dot}`} aria-hidden="true" />
                  {r.name}
                  <strong className="font-semibold text-slate-900 dark:text-white">{r.count}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="h-44 w-full shrink-0 sm:w-56" role="img" aria-label="Biểu đồ số tài khoản theo vai trò">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="68%" data={roles}>
                <PolarGrid gridType="polygon" stroke="rgba(29, 36, 51, 0.15)" />
                <PolarAngleAxis dataKey="name" tick={{ fill: '#5d6676', fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, maxCount]} tick={false} axisLine={false} />
                <Radar
                  dataKey="count"
                  stroke="var(--color-secondary)"
                  strokeWidth={2}
                  fill="var(--color-secondary)"
                  fillOpacity={0.28}
                  dot={{ r: 3, fill: 'var(--color-secondary)', stroke: '#fff', strokeWidth: 1.5 }}
                  animationDuration={1100}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  )
}
