import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Shield, Mail, MapPin, Globe, X, Camera, Pencil, User as UserIcon, Info, Trash2, Loader2 } from 'lucide-react'
import type { CurrentUserResponse } from '../types/auth/me'
import type { RootState } from '../redux/rootReducer'
import { uploadAvatarRequest, removeAvatarRequest } from '../feature/avatar/avatarSlice'
import { UserAvatar } from './UserAvatar'
import { getRoleName, isAdmin as checkIsAdmin, isManagementAgency, isMaintenanceEngineer, isFieldCrew } from '../utils/roleUtils'

export interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: CurrentUserResponse | null
  /** Lưu hồ sơ. Chưa truyền (backend chưa có PATCH /auth/me) thì nút Lưu bị khóa. Ảnh đại diện được lưu riêng qua API avatar. */
  onSave?: (data: { full_name: string; email: string }) => void
  isSaving?: boolean
}

// Backend chỉ nhận JPEG, tối đa 1 MB
const MAX_AVATAR_BYTES = 1024 * 1024

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onSave, isSaving = false }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const dispatch = useDispatch()
  const isAvatarSubmitting = useSelector((state: RootState) => state.avatar.isSubmitting)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Đặt lại form mỗi lần mở / đổi người dùng
  useEffect(() => {
    if (!isOpen) return
    setIsEditing(false)
    setFullName(user?.full_name || '')
    setEmail(user?.email || '')
    setAvatarError(null)
  }, [isOpen, user?.user_id, user?.full_name, user?.email])

  // Escape: thoát chế độ sửa trước, rồi mới đóng hộp thoại
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (isEditing) setIsEditing(false)
      else onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, isEditing, onClose])

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

  const handlePickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.type !== 'image/jpeg') {
      setAvatarError('Chỉ chấp nhận ảnh JPEG (.jpg).')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Ảnh tối đa 1 MB.')
      return
    }
    setAvatarError(null)
    dispatch(uploadAvatarRequest(file))
  }

  const nameInvalid = fullName.trim().length === 0
  const canSave = Boolean(onSave) && !nameInvalid && !isSaving

  const handleSave = () => {
    if (!onSave || nameInvalid) return
    onSave({ full_name: fullName.trim(), email: email.trim() })
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
          {/* Danh tính */}
          <div className="px-6 pt-8 pb-5 flex flex-col items-center text-center border-b border-slate-100">
            <div className="relative">
              <UserAvatar
                avatarUrl={user.avatar_url}
                initials={initials}
                alt={displayName}
                className={`w-24 h-24 rounded-full ${isAdmin ? 'bg-gradient-to-br from-secondary to-primary' : 'bg-gradient-to-br from-blue-500 to-indigo-600'} text-white text-3xl font-bold flex items-center justify-center ring-4 ring-slate-100`}
              />
              {isAvatarSubmitting && (
                <div className="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                </div>
              )}
              {isEditing && (
                <>
                  <button
                    type="button"
                    disabled={isAvatarSubmitting}
                    onClick={() => fileRef.current?.click()}
                    className="disabled:opacity-50 absolute bottom-0 right-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center border-2 border-white hover:bg-slate-700 transition cursor-pointer"
                    title="Đổi ảnh đại diện"
                    aria-label="Đổi ảnh đại diện"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/jpeg" onChange={handlePickAvatar} className="hidden" />
                </>
              )}
            </div>
            {isEditing && user.avatar_url && (
              <button
                type="button"
                disabled={isAvatarSubmitting}
                onClick={() => dispatch(removeAvatarRequest())}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Gỡ ảnh đại diện
              </button>
            )}
            {avatarError && <p className="mt-2 text-[11px] text-rose-600 font-medium">{avatarError}</p>}

            {!isEditing && (
              <>
                <h3 className="mt-3 text-lg font-bold text-slate-900 break-words max-w-full">{displayName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">@{user.username || user.user_id}</p>
                <span className={`mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                  <Shield className="w-3 h-3" />
                  {roleName}
                </span>
              </>
            )}
          </div>

          {/* Nội dung */}
          {isEditing ? (
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="profile-full-name" className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  id="profile-full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={100}
                  className={`w-full h-10 px-3 rounded-xl border text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${
                    nameInvalid ? 'border-rose-300' : 'border-slate-200'
                  }`}
                />
                {nameInvalid && <p className="mt-1 text-[11px] text-rose-600">Họ và tên không được để trống.</p>}
              </div>
              <div>
                <label htmlFor="profile-email" className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Email công vụ
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
              {!onSave && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11.5px] text-amber-800">
                  <Info className="w-4 h-4 shrink-0 mt-px" />
                  <span>Ảnh đại diện (JPEG, tối đa 1 MB) được lưu ngay khi chọn. Chức năng lưu họ tên và email sẽ dùng được khi hệ thống bổ sung API tương ứng.</span>
                </div>
              )}
            </div>
          ) : (
            <dl className="p-6 space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <dt className="text-[11px] text-slate-400 font-medium">Email công vụ</dt>
                  <dd className="font-semibold text-slate-900 break-all">{user.email || 'Chưa cập nhật'}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <UserIcon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
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
          )}
        </div>

        {/* Hành động */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2 shrink-0">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                title={!onSave ? 'Chờ hệ thống bổ sung API lưu hồ sơ' : undefined}
                className={`px-4 h-9 rounded-xl ${isAdmin ? 'bg-primary hover:bg-primary/90' : 'bg-blue-600 hover:bg-blue-700'} text-white text-xs font-bold disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer`}
              >
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                Chỉnh sửa hồ sơ
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`px-5 h-9 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold cursor-pointer`}
              >
                Đóng
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfileModal
