import React from 'react'
import {
  Shield,
  Mail,
  MapPin,
  IdCard,
  CheckCircle2,
  Lock,
  Globe,
  RefreshCw,
  X,
} from 'lucide-react'
import { User as UserType, UserRole } from '../types/auth'
import { getRoleName } from '../utils/roleUtils'

export interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserType | null
  onRefresh?: () => void
  isRefreshing?: boolean
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onRefresh,
  isRefreshing = false,
}) => {
  if (!isOpen || !user) return null

  const roleName = getRoleName(user.role)
  const isAdmin = user.role === UserRole.Admin
  const isAgency = user.role === UserRole.ManagementAgency
  const isEngineer = user.role === UserRole.MaintenanceEngineer
  const isCrew = user.role === UserRole.FieldCrew

  // Màu sắc badge vai trò
  let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200'
  let roleGlow = 'from-blue-600 to-indigo-600'
  if (isAdmin) {
    badgeColor = 'bg-purple-50 text-purple-700 border-purple-200'
    roleGlow = 'from-purple-600 to-indigo-700'
  } else if (isAgency) {
    badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200'
    roleGlow = 'from-indigo-600 to-blue-700'
  } else if (isEngineer) {
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'
    roleGlow = 'from-emerald-600 to-teal-700'
  } else if (isCrew) {
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-200'
    roleGlow = 'from-amber-600 to-orange-600'
  }

  const initials = user.fullName
    ? user.fullName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : 'U'

  const hasAllCommunes = isAdmin || (user.communeIds && user.communeIds.includes('*'))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-lg z-10 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Top Header Card with Vibrant Gradient */}
        <div className={`p-6 bg-gradient-to-r ${roleGlow} text-white relative shrink-0`}>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-lg shadow-black/10">
              {initials}
            </div>
            <div className="space-y-1 min-w-0 pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold tracking-tight truncate">
                  {user.fullName}
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Đang hoạt động
                </span>
              </div>
              <p className="text-xs text-white/80 font-medium">
                @{user.username || user.userId} • ID: {user.userId || user.id}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 leading-relaxed">
          {/* Thông tin định danh */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <IdCard className="w-3.5 h-3.5 text-slate-500" />
              Thông tin chức vụ & phân quyền
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Vai trò */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white shadow-2xs text-blue-600 shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Vai trò hệ thống</span>
                  <span className={`inline-block mt-1 font-bold text-xs px-2.5 py-0.5 rounded-md border ${badgeColor}`}>
                    {roleName}
                  </span>
                </div>
              </div>

              {/* Email */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white shadow-2xs text-indigo-600 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 block font-medium">Hộp thư công vụ</span>
                  <span className="font-semibold text-slate-900 block truncate mt-1" title={user.email || 'Chưa cập nhật'}>
                    {user.email || 'Chưa cập nhật'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Phân vùng địa bàn GIS */}
          <div className="space-y-3 pt-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              Phạm vi quản lý địa bàn & Không gian GIS
            </h4>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Quyền hạn truy cập:</span>
                <span className="font-bold text-slate-900">
                  {hasAllCommunes
                    ? 'Toàn bộ địa bàn (Toàn hệ thống)'
                    : `${user.communeIds?.length || 0} xã/phường được phân công`}
                </span>
              </div>

              {hasAllCommunes ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 text-purple-800 text-[11.5px] font-medium">
                  <Globe className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Tài khoản có quyền giám sát và can thiệp toàn bộ địa bàn trên bản đồ.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                    {user.communeIds && user.communeIds.length > 0 ? (
                      user.communeIds.map((cid, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold shadow-2xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {cid}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic text-[11.5px]">
                        Chưa được phân công xã cụ thể. Vui lòng liên hệ Quản trị viên để gán địa bàn.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tiêu chuẩn an toàn & Phiên làm việc */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[11.5px] font-bold text-emerald-900 block leading-tight">
                  Phiên đăng nhập an toàn (Contract v1.5)
                </span>
                <span className="text-[10.5px] text-emerald-700">
                  Dữ liệu hồ sơ đồng bộ trực tiếp từ CSDL thời gian thực
                </span>
              </div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Đang cập nhật...' : 'Làm mới quyền'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm ml-auto"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfileModal
