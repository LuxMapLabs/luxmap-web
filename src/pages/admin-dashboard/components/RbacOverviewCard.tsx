import React from 'react'
import { ShieldCheck, MapPin, CheckCircle2, Lock, Mail } from 'lucide-react'
import type { UserAccountItem } from '../../../types/admin/users'
import type { CommuneItem } from '../../../types/admin/communes'

interface RbacOverviewCardProps {
  users: UserAccountItem[]
  communes: CommuneItem[]
}

export const RbacOverviewCard: React.FC<RbacOverviewCardProps> = ({ users, communes }) => {
  // Thống kê tài khoản theo trạng thái
  const activeUsers = users.filter((u) => u.status === 'active').length
  const invitedUsers = users.filter((u) => u.status === 'invited').length
  const lockedUsers = users.filter((u) => u.status === 'locked').length

  // Thống kê theo vai trò
  const systemAdmins = users.filter((u) => u.role === 'system_admin').length
  const superiors = users.filter((u) => u.role === 'superior').length
  const managers = users.filter((u) => u.role === 'manager').length
  const engineers = users.filter((u) => u.role === 'field_engineer').length

  // Thống kê địa bàn
  const totalCommunes = communes.length
  const withBbox = communes.filter((c) => Boolean(c.bbox)).length
  const withoutBbox = totalCommunes - withBbox

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Phân Quyền RBAC & Địa Bàn GIS
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Cơ cấu tài khoản tác nghiệp và tiến độ số hóa ranh giới bản đồ
              </p>
            </div>
          </div>
        </div>

        {/* 1. Tình trạng tài khoản */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-600 font-semibold mb-0.5">
              <CheckCircle2 className="w-3 h-3" />
              <span>Hoạt động</span>
            </div>
            <span className="text-base font-black font-mono text-slate-900 dark:text-white">
              {activeUsers}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-blue-600 font-semibold mb-0.5">
              <Mail className="w-3 h-3" />
              <span>Chờ kích hoạt</span>
            </div>
            <span className="text-base font-black font-mono text-slate-900 dark:text-white">
              {invitedUsers}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-rose-600 font-semibold mb-0.5">
              <Lock className="w-3 h-3" />
              <span>Bị khóa</span>
            </div>
            <span className="text-base font-black font-mono text-slate-900 dark:text-white">
              {lockedUsers}
            </span>
          </div>
        </div>

        {/* 2. Cơ cấu theo vai trò */}
        <div className="space-y-1.5 mb-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Cơ cấu vai trò ({users.length} tài khoản)
          </span>

          <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50/60 dark:bg-slate-800/30">
            <span className="text-slate-600 dark:text-slate-300 font-medium">Quản trị hệ thống</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{systemAdmins}</span>
          </div>
          <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50/60 dark:bg-slate-800/30">
            <span className="text-slate-600 dark:text-slate-300 font-medium">Lãnh đạo cấp trên (Giám sát)</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{superiors}</span>
          </div>
          <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50/60 dark:bg-slate-800/30">
            <span className="text-slate-600 dark:text-slate-300 font-medium">Cán bộ quản lý vận hành</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{managers}</span>
          </div>
          <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50/60 dark:bg-slate-800/30">
            <span className="text-slate-600 dark:text-slate-300 font-medium">Kỹ sư hiện trường</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{engineers}</span>
          </div>
        </div>

        {/* 3. Tình trạng BBox địa bàn */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>Tiến độ số hóa BBox địa bàn</span>
            </span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {withBbox}/{totalCommunes}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${totalCommunes ? (withBbox / totalCommunes) * 100 : 0}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>{withoutBbox === 0 ? 'Đã số hóa 100% ranh giới địa bàn' : `Còn ${withoutBbox} xã chưa có BBox`}</span>
            <span className="font-mono font-medium">{totalCommunes > 0 ? Math.round((withBbox / totalCommunes) * 100) : 0}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
