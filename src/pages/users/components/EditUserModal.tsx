import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSelector } from 'react-redux'
import { X, Save, Shield, Mail, User, MapPin, Globe } from 'lucide-react'
import type { RootState } from '../../../redux/rootReducer'
import type { UserAccountItem, UpdateUserRequest } from '../../../types/admin/users'
import type { UserRole } from '../../../types/common/enums'
import { USER_ROLE_LABELS } from '../../../constants/enums'
import { ConfirmModal } from '../../iot-bridge/components/IotBridgeModal'
import { UserAvatar } from '../../../components/UserAvatar'

export interface EditUserModalProps {
  isOpen: boolean
  user: UserAccountItem | null
  isSubmitting?: boolean
  isSelf?: boolean
  onClose: () => void
  onSubmit: (id: string, payload: UpdateUserRequest) => void
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  user,
  isSubmitting = false,
  isSelf = false,
  onClose,
  onSubmit,
}) => {
  const communes = useSelector((state: RootState) => state.adminCommunes.communes)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('field_engineer')
  const [selectedCommune, setSelectedCommune] = useState<string>('')
  const [confirmPayload, setConfirmPayload] = useState<UpdateUserRequest | null>(null)
  const wasSubmitting = useRef(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const initialRole = (user?.role as UserRole) || 'field_engineer'
  const initialCommune =
    initialRole === 'system_admin'
      ? ''
      : (user?.commune_ids || []).find((id) => Boolean(id) && id !== '*' && id !== 'all') || ''

  useEffect(() => {
    setConfirmPayload(null)
    if (user) {
      setEmail(user.email || '')
      setFullName(user.full_name || '')
      setRole(initialRole)
      setSelectedCommune(initialCommune)
      setErrors({})
    }
  }, [user, isOpen, initialRole, initialCommune])

  useEffect(() => {
    if (wasSubmitting.current && !isSubmitting) setConfirmPayload(null)
    wasSubmitting.current = isSubmitting
  }, [isSubmitting])

  if (!isOpen || !user) return null

  const handleSelectCommune = (code: string) => {
    setSelectedCommune(code)
    if (errors.communes) {
      setErrors((prev) => ({ ...prev, communes: '' }))
    }
  }

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole)
    if (newRole === 'system_admin') {
      setSelectedCommune('')
    }
    if (errors.communes) {
      setErrors((prev) => ({ ...prev, communes: '' }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!email.trim()) {
      newErrors.email = 'Email không được để trống'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Định dạng email không hợp lệ'
    }

    if (!fullName.trim()) {
      newErrors.fullName = 'Họ và tên không được để trống'
    }

    if (role !== 'system_admin' && !selectedCommune) {
      newErrors.communes = 'Vui lòng chọn 1 địa bàn quản lý cho vai trò này'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const effectiveCommune = role === 'system_admin' ? '' : selectedCommune
  const roleChanged = role !== initialRole
  const communeChanged = effectiveCommune !== initialCommune
  const nameChanged = fullName.trim() !== (user.full_name || '').trim()
  const emailChanged = email.trim() !== (user.email || '').trim()
  const hasChanges = roleChanged || communeChanged || nameChanged || emailChanged
  const communeLabel = (id: string, userRole: string) =>
    userRole === 'system_admin'
      ? 'Phạm vi toàn hệ thống'
      : communes.find((c) => c.commune_id === id)?.name || id || '-'
  const changes = [
    ...(nameChanged ? [{
      label: 'Họ và tên',
      old: (user.full_name || '').trim() || '-',
      next: fullName.trim() || '-',
    }] : []),
    ...(emailChanged ? [{
      label: 'Email',
      old: (user.email || '').trim() || '-',
      next: email.trim() || '-',
    }] : []),
    ...(roleChanged ? [{
      label: 'Vai trò',
      old: USER_ROLE_LABELS[initialRole] || '-',
      next: USER_ROLE_LABELS[role] || '-',
    }] : []),
    ...(communeChanged ? [{
      label: 'Địa bàn',
      old: communeLabel(initialCommune, initialRole),
      next: communeLabel(effectiveCommune, role),
    }] : []),
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting || confirmPayload || !hasChanges || !validate() || !user.user_id) return

    const payload: UpdateUserRequest = {
      email: email.trim(),
      full_name: fullName.trim(),
      role,
      // system_admin bao quát mọi địa bàn: backend yêu cầu không gửi commune_ids (ACCT-1)
      ...(role === 'system_admin' ? {} : { commune_ids: [selectedCommune] }),
    }
    if (roleChanged || communeChanged) {
      setConfirmPayload(payload)
    } else {
      onSubmit(user.user_id, payload)
    }
  }

  const selectedCommuneObj = communes.find((c) => c.commune_id === selectedCommune)
  const selectedCommuneLabel = selectedCommuneObj
    ? selectedCommuneObj.name || selectedCommuneObj.commune_id || '-'
    : ''

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white/80 backdrop-blur-2xl dark:bg-slate-900 rounded-[28px] border border-white/80 dark:border-slate-800 shadow-2xl shadow-primary/30 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <UserAvatar
              avatarUrl={user.avatar_url}
              initials={<User className="w-5 h-5" />}
              alt={user.full_name || user.username || ''}
              className="w-10 h-10 rounded-2xl bg-secondary/10 dark:bg-primary text-primary dark:text-secondary flex items-center justify-center shadow-2xs"
            />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Cập nhật thông tin tài khoản
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                @{user.username}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Username (Readonly) */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tên đăng nhập (Cố định)
            </label>
            <input
              type="text"
              disabled
              value={user.username || ''}
              className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 font-mono cursor-not-allowed"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              className={`w-full px-3.5 py-2.5 bg-white/50 dark:bg-slate-800/80 border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition ${
                errors.fullName
                  ? 'border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-secondary focus:border-secondary'
              }`}
            />
            {errors.fullName ? (
              <p className="text-rose-500 mt-1 text-[11px]">{errors.fullName}</p>
            ) : null}
          </div>

          {/* Email */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Địa chỉ Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nguyenvana@gmail.com"
                className={`w-full pl-9 pr-3.5 py-2.5 bg-white/50 dark:bg-slate-800/80 border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition ${
                  errors.email
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-secondary focus:border-secondary'
                }`}
              />
            </div>
            {errors.email ? (
              <p className="text-rose-500 mt-1 text-[11px]">{errors.email}</p>
            ) : null}
          </div>

          {/* Role */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Vai trò <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                disabled={isSelf}
                aria-describedby={isSelf ? 'self-role-hint' : undefined}
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-white/50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {Object.entries(USER_ROLE_LABELS).map(([k, label]) => (
                  <option key={k} value={k} className="dark:bg-slate-900">
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {isSelf && (
              <p id="self-role-hint" className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Không thể đổi vai trò của chính bạn
              </p>
            )}
          </div>

          {/* Commune Scope */}
          {role === 'system_admin' ? (
            <div className="p-3.5 bg-secondary/10 dark:bg-primary border border-secondary/30 dark:border-primary rounded-2xl flex items-start gap-3">
              <div className="p-2 rounded-xl bg-secondary/20 dark:bg-primary text-primary dark:text-secondary shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-primary dark:text-secondary/30 flex items-center gap-1.5">
                  <span>Phạm vi toàn hệ thống</span>
                </div>
                <p className="text-[11px] text-primary dark:text-secondary/50 mt-0.5 leading-relaxed">
                  Vai trò Quản trị hệ thống tự động có quyền bao quát toàn bộ địa bàn và mọi trạm đèn trên toàn hệ thống. Không cần và không phân bổ địa bàn riêng lẻ.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>Phạm vi địa bàn quản lý</span>
                  <span className="text-rose-500">*</span>
                </label>
                {selectedCommuneLabel ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/10 dark:bg-primary text-primary dark:text-secondary/50 text-[10px] font-semibold border border-secondary/30 dark:border-primary max-w-[180px] truncate">
                    {selectedCommuneLabel}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Chưa chọn địa bàn</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                Chọn 1 xã/phường duy nhất mà tài khoản này phụ trách quản lý
              </p>
              <div
                role="radiogroup"
                aria-label="Phạm vi địa bàn quản lý"
                className={`max-h-36 overflow-y-auto p-2 bg-white/50 dark:bg-slate-800/50 border rounded-xl grid grid-cols-2 gap-1.5 ${
                  errors.communes
                    ? 'border-rose-400 dark:border-rose-500'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {communes.length === 0 ? (
                  <div className="col-span-2 py-4 text-center text-slate-400 text-xs">
                    Chưa có danh mục địa bàn nào trong hệ thống.
                  </div>
                ) : (
                  communes.map((c) => {
                    const code = c.commune_id || ''
                    const isSelected = selectedCommune === code
                    return (
                      <button
                        key={code}
                        type="button"
                        role="radio"
                        disabled={isSelf}
                        aria-checked={isSelected}
                        onClick={() => handleSelectCommune(code)}
                        className={`px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-[11px] ${
                          isSelected
                            ? 'bg-secondary/10 dark:bg-primary text-primary dark:text-secondary/50 font-semibold border border-secondary/50 dark:border-primary shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <span className="truncate">{c.name || code || '-'}</span>
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? 'border-primary dark:border-secondary bg-primary dark:bg-secondary'
                              : 'border-slate-300 dark:border-slate-600 bg-transparent'
                          }`}
                        >
                          {isSelected ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          ) : null}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
              {errors.communes ? (
                <p className="text-rose-500 mt-1 text-[11px]">{errors.communes}</p>
              ) : null}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasChanges}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary active:scale-95 text-white font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      {confirmPayload && (
        <ConfirmModal
          title="Xác nhận thay đổi quyền?"
          message={`${communeChanged ? 'Phạm vi dữ liệu tài khoản được phép xem sẽ thay đổi theo địa bàn mới. ' : ''}Quyền mới có hiệu lực khi người dùng đăng nhập lại hoặc trong tối đa 60 phút. Phiên đăng nhập hiện tại không bị thu hồi ngay.`}
          confirmLabel="Xác nhận"
          tone="primary"
          busy={isSubmitting}
          onCancel={() => setConfirmPayload(null)}
          onConfirm={() => {
            if (!isSubmitting && user.user_id) onSubmit(user.user_id, confirmPayload)
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead>
                <tr>
                  <th scope="col">Thông tin</th>
                  <th scope="col">Trước</th>
                  <th scope="col" aria-label="Thay đổi" />
                  <th scope="col">Sau</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((change) => (
                  <tr key={change.label} className="border-t border-slate-200">
                    <th scope="row" className="py-2 pr-2">{change.label}</th>
                    <td className="py-2 break-words">{change.old}</td>
                    <td className="px-2">→</td>
                    <td className="py-2 break-words">{change.next}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ConfirmModal>
      )}
    </div>,
    document.body
  )
}
