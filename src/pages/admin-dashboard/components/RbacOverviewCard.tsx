import React from 'react'
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
} from 'recharts'
import { ShieldCheck, Users } from 'lucide-react'
import type { UserAccountItem } from '../../../types/admin/users'

interface RbacOverviewCardProps {
  users: UserAccountItem[]
}

export const RbacOverviewCard: React.FC<RbacOverviewCardProps> = ({ users }) => {
  const activeUsers = users.filter((u) => u.status === 'active').length
  const invitedUsers = users.filter((u) => u.status === 'invited').length
  const lockedUsers = users.filter((u) => u.status === 'locked').length

  const systemAdmins = users.filter((u) => u.role === 'system_admin').length
  const superiors = users.filter((u) => u.role === 'superior').length
  const managers = users.filter((u) => u.role === 'manager').length
  const engineers = users.filter((u) => u.role === 'field_engineer').length

  const total = Math.max(users.length, 1)

  const roles = [
    {
      key: 'field_engineer',
      name: 'Kỹ sư hiện trường',
      shortName: 'Kỹ sư',
      count: engineers,
      percent: Math.round((engineers / total) * 100),
      color: '#06b6d4',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      dotColor: 'bg-cyan-500',
    },
    {
      key: 'manager',
      name: 'Quản lý vận hành',
      shortName: 'Quản lý',
      count: managers,
      percent: Math.round((managers / total) * 100),
      color: '#3b82f6',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
      dotColor: 'bg-blue-500',
    },
    {
      key: 'superior',
      name: 'Lãnh đạo cấp trên',
      shortName: 'Lãnh đạo',
      count: superiors,
      percent: Math.round((superiors / total) * 100),
      color: '#f59e0b',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200/80',
      dotColor: 'bg-amber-500',
    },
    {
      key: 'system_admin',
      name: 'Quản trị hệ thống',
      shortName: 'Admin',
      count: systemAdmins,
      percent: Math.round((systemAdmins / total) * 100),
      color: '#8b5cf6',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
      dotColor: 'bg-purple-500',
    },
  ]

  // Cấu hình 4 trục mạng nhện (Radar Chart)
  const radarData = [
    {
      role: 'Kỹ sư',
      fullName: 'Kỹ sư hiện trường',
      count: engineers,
      percent: Math.round((engineers / total) * 100),
      color: '#06b6d4',
    },
    {
      role: 'Quản lý',
      fullName: 'Quản lý vận hành',
      count: managers,
      percent: Math.round((managers / total) * 100),
      color: '#3b82f6',
    },
    {
      role: 'Lãnh đạo',
      fullName: 'Lãnh đạo cấp trên',
      count: superiors,
      percent: Math.round((superiors / total) * 100),
      color: '#f59e0b',
    },
    {
      role: 'Admin',
      fullName: 'Quản trị hệ thống',
      count: systemAdmins,
      percent: Math.round((systemAdmins / total) * 100),
      color: '#8b5cf6',
    },
  ]

  const maxCount = Math.max(1, ...radarData.map((d) => d.count))

  const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/90 dark:border-slate-800 rounded-2xl p-3 shadow-xl text-xs z-50 pointer-events-none min-w-[160px]">
          <span className="font-bold text-slate-900 dark:text-white block mb-1">
            {data.fullName}
          </span>
          <div className="flex items-center justify-between gap-4 font-mono">
            <span className="text-slate-400">Số lượng:</span>
            <strong className="font-bold text-sm" style={{ color: data.color }}>
              {data.count} tài khoản
            </strong>
          </div>
          <div className="flex items-center justify-between gap-4 font-mono mt-0.5">
            <span className="text-slate-400">Tỷ lệ:</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{data.percent}%</span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/90 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between h-full transition-all duration-300 outline-none focus:outline-none select-none">
      <div>
        {/* Minimal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-500/10 to-indigo-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-100/60 shadow-2xs shrink-0 mt-0.5 sm:mt-0">
              <ShieldCheck className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Nhân sự tác nghiệp
              </span>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white leading-none">
                  {users.length}
                </span>

                {/* Trạng thái phân bổ tài khoản trực quan */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60"
                    title={`${activeUsers} tài khoản đang hoạt động bình thường`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{activeUsers} hoạt động</span>
                  </span>

                  {invitedUsers > 0 && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/60"
                      title={`${invitedUsers} tài khoản đang chờ kích hoạt qua email mời`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{invitedUsers} chờ kích hoạt</span>
                    </span>
                  )}

                  {lockedUsers > 0 && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200/60 dark:border-rose-800/60"
                      title={`${lockedUsers} tài khoản đang bị tạm khóa`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>{lockedUsers} tạm khóa</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <span className="text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
            <Users className="w-3.5 h-3.5" />
            <span>Độ phủ 4 vai trò</span>
          </span>
        </div>

        {/* Biểu đồ Radar (Mạng nhện) 4 trục độc đáo */}
        <div className="h-56 relative flex items-center justify-center my-2 outline-none focus:outline-none [&_*]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
              <defs>
                <linearGradient id="radarAreaGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.65} />
                  <stop offset="50%" stopColor="#6366f1" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <PolarGrid
                gridType="polygon"
                stroke="#cbd5e1"
                className="dark:stroke-slate-700"
                strokeOpacity={0.6}
              />
              <PolarAngleAxis
                dataKey="role"
                tick={{
                  fill: '#64748b',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
              <PolarRadiusAxis
                angle={45}
                domain={[0, maxCount]}
                tick={false}
                axisLine={false}
              />
              <Tooltip content={<CustomRadarTooltip />} isAnimationActive={false} />
              <Radar
                name="Nhân sự"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#radarAreaGrad)"
                fillOpacity={0.6}
                dot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2.5 }}
                animationDuration={1200}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4 Interactive Role Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        {roles.map((r) => (
          <div
            key={r.key}
            className="p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-center transition-all duration-300 hover:scale-105 shadow-2xs"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className={`w-2 h-2 rounded-full ${r.dotColor} shrink-0`} />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                {r.shortName}
              </span>
            </div>
            <strong className="text-base font-black font-mono block leading-tight" style={{ color: r.color }}>
              {r.count}
            </strong>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
              {r.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
