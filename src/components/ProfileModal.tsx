import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Shield, Mail, MapPin, Globe, X, Camera, AtSign, User as UserIcon, Trash2, Loader2 } from 'lucide-react'
import type { CurrentUserResponse } from '../types/auth/me'
import type { RootState } from '../redux/rootReducer'
import { uploadAvatarRequest, removeAvatarRequest } from '../feature/avatar/avatarSlice'
import { UserAvatar } from './UserAvatar'
import { convertToJpeg } from '../utils/imageUtils'
import { getRoleName, isAdmin as checkIsAdmin, isManagementAgency, isMaintenanceEngineer, isFieldCrew } from '../utils/roleUtils'

export interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: CurrentUserResponse | null
}

// Backend nhận JPEG hoặc PNG tối đa 1 MB và tự thu về cạnh dài 512 px. Ảnh được thu nhỏ ngay trên trình duyệt
// trước khi gửi, nên người dùng chọn ảnh dung lượng bao nhiêu cũng được.
const MAX_AVATAR_BYTES = 1024 * 1024
const AVATAR_TYPES = ['image/jpeg', 'image/png']
const AVATAR_MAX_EDGE = 1024

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user }) => {
  const dispatch = useDispatch()
  const isAvatarSubmitting = useSelector((state: RootState) => state.avatar.isSubmitting)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const isAvatarBusy = isPreparing || isAvatarSubmitting
  const fileRef = useRef<HTMLInputElement>(null)

  // Xoá lỗi ảnh cũ mỗi lần mở / đổi người dùng
  useEffect(() => {
    if (!isOpen) return
    setAvatarError(null)
  }, [isOpen, user?.user_id])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !user) return null

  const roleName = getRoleName(user.role).replace(/\s*\([^)]*\)\s*$/, '')
  const isAdmin = checkIsAdmin(user.role)

  let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200'
  if (isAdmin) badgeColor = 'bg-primary/10 text-primary border-primary/20'
  else if (isManagementAgency(user.role)) badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200'
  else if (isMaintenanceEngineer(user.role)) badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'
  else if (isFieldCrew(user.role)) badgeColor = 'bg-amber-50 text-amber-800 border-amber-200'

  const displayName = user.full_name || user.username || 'Người dùng'
  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .slice(-2)
      .join('')
      .toUpperCase() || 'U'

  const hasAllCommunes = isAdmin || (user.commune_ids && user.commune_ids.includes('*'))
  const communeLabels: string[] =
    user.communes && user.communes.length > 0
      ? user.communes.map((c) => c.name || c.commune_id || '').filter(Boolean)
      : (user.commune_ids || []).filter((c) => c !== '*')

  const handlePickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarError('Chỉ chấp nhận ảnh JPEG hoặc PNG.')
      return
    }
    setAvatarError(null)
    setIsPreparing(true)
    try {
      const resized = await convertToJpeg(file, 0.85, AVATAR_MAX_EDGE)
      if (resized.size > MAX_AVATAR_BYTES) {
        setAvatarError('Ảnh quá lớn, vui lòng chọn ảnh khác.')
        return
      }
      dispatch(uploadAvatarRequest(resized))
    } catch {
      setAvatarError('Không đọc được ảnh này, vui lòng chọn ảnh khác.')
    } finally {
      setIsPreparing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className={`fixed inset-0 animate-in fade-in duration-200 ${isAdmin ? 'bg-slate-900/30 backdrop-blur-md' : 'bg-slate-900/50 backdrop-blur-xs'}`} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hồ sơ cá nhân"
        className={`relative shadow-2xl border w-full max-w-md z-10 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 ${isAdmin ? 'bg-white/80 backdrop-blur-2xl rounded-[28px] border-white/80 shadow-primary/30' : 'bg-white rounded-2xl border-slate-200'}`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Đóng"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto">
          {/* Danh tính + ảnh đại diện (lưu ngay khi chọn) */}
          <div className="px-6 pt-8 pb-5 flex flex-col items-center text-center border-b border-slate-100">
            <div className="relative">
              <UserAvatar
                avatarUrl={user.avatar_url}
                initials={initials}
                alt={displayName}
                className={`w-24 h-24 rounded-full ${isAdmin ? 'bg-gradient-to-br from-secondary to-primary' : 'bg-gradient-to-br from-blue-500 to-indigo-600'} text-white text-3xl font-bold flex items-center justify-center ring-4 ring-slate-100`}
              />
              {isAvatarBusy && (
                <div className="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                </div>
              )}
              <button
                type="button"
                disabled={isAvatarBusy}
                onClick={() => fileRef.current?.click()}
                className="disabled:opacity-50 absolute bottom-0 right-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center border-2 border-white hover:bg-slate-700 transition cursor-pointer"
                title="Đổi ảnh đại diện"
                aria-label="Đổi ảnh đại diện"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={handlePickAvatar} className="hidden" />
            </div>
            {avatarError ? (
              <p className="mt-2 text-[11px] text-rose-600 font-medium">{avatarError}</p>
            ) : (
              <p className="mt-2 text-[11px] text-slate-400">Ảnh JPEG hoặc PNG</p>
            )}
            {user.avatar_url && (
              <button
                type="button"
                disabled={isAvatarBusy}
                onClick={() => dispatch(removeAvatarRequest())}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Gỡ ảnh đại diện
              </button>
            )}

            <h3 className="mt-3 text-lg font-bold text-slate-900 break-words max-w-full">{displayName}</h3>
            <p className="text-xs text-slate-400 mt-0.5">@{user.username || user.user_id}</p>
            <span className={`mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
              <Shield className="w-3 h-3" />
              {roleName}
            </span>
          </div>

          {/* Thông tin tài khoản — chỉ xem; họ tên và email do Quản trị viên quản lý */}
          <dl className="p-6 space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <UserIcon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <dt className="text-[11px] text-slate-400 font-medium">Họ và tên</dt>
                <dd className="font-semibold text-slate-900 break-words">{user.full_name || 'Chưa cập nhật'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <dt className="text-[11px] text-slate-400 font-medium">Email công vụ</dt>
                <dd className="font-semibold text-slate-900 break-all">{user.email || 'Chưa cập nhật'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AtSign className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <dt className="text-[11px] text-slate-400 font-medium">Tên đăng nhập</dt>
                <dd className="font-semibold text-slate-900">{user.username || '-'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <dt className="text-[11px] text-slate-400 font-medium">
                  {hasAllCommunes || communeLabels.length > 1 ? 'Địa bàn quản lý' : 'Xã phụ trách'}
                </dt>
                <dd className="font-semibold text-slate-900">
                  {hasAllCommunes ? (
                    <span className="inline-flex items-center gap-1.5 text-primary">
                      <Globe className="w-3.5 h-3.5" />
                      Toàn bộ địa bàn
                    </span>
                  ) : communeLabels.length > 0 ? (
                    communeLabels.join(', ')
                  ) : (
                    <span className="text-slate-400 italic text-xs font-normal">Chưa được phân công. Liên hệ Quản trị viên.</span>
                  )}
                </dd>
              </div>
            </div>
          </dl>
        </div>

        {/* Hành động */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className={`px-5 h-9 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold cursor-pointer`}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfileModal
