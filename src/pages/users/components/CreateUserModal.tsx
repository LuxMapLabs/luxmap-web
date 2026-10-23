import React, { useState } from 'react'
import { X, UserPlus, Shield, Mail, User, Check, MapPin } from 'lucide-react'
import type { CreateUserRequest } from '../../../types/admin/users'
import type { UserRole } from '../../../types/common/enums'
import { USER_ROLE_LABELS } from '../../../constants/enums'
import { CU_CHI_COMMUNES_MAP } from '../../../constants/communes'

export interface CreateUserModalProps {
  isOpen: boolean
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (payload: CreateUserRequest) => void
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit,
}) => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('field_engineer')
  const [selectedCommunes, setSelectedCommunes] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const handleToggleCommune = (code: string) => {
    setSelectedCommunes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!username.trim()) {
      newErrors.username = 'Tên đăng nhập không được để trống'
    } else if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username.trim())) {
      newErrors.username = 'Tên đăng nhập chỉ chứa chữ cái, số, dấu gạch (3-30 ký tự)'
    }

    if (!email.trim()) {
      newErrors.email = 'Email không được để trống'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Định dạng email không hợp lệ'
    }

    if (!fullName.trim()) {
      newErrors.fullName = 'Họ và tên không được để trống'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    onSubmit({
      username: username.trim(),
      email: email.trim(),
      full_name: fullName.trim(),
      role,
      commune_ids: selectedCommunes.length > 0 ? selectedCommunes : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Thêm Tài Khoản Người Dùng Mới
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tạo tài khoản tác nghiệp và gửi thư mời kích hoạt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Username */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tên đăng nhập (Username) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ví dụ: engineer_cuchi01"
                className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition ${
                  errors.username
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              />
            </div>
            {errors.username && <p className="text-rose-500 mt-1 text-[11px]">{errors.username}</p>}
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
              className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition ${
                errors.fullName
                  ? 'border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            />
            {errors.fullName && <p className="text-rose-500 mt-1 text-[11px]">{errors.fullName}</p>}
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
                className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition ${
                  errors.email
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              />
            </div>
            {errors.email && <p className="text-rose-500 mt-1 text-[11px]">{errors.email}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Vai trò (Phân quyền tác nghiệp) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer"
              >
                {Object.entries(USER_ROLE_LABELS).map(([k, label]) => (
                  <option key={k} value={k} className="dark:bg-slate-900">
                    {label} ({k})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Commune Scope (Multi-select) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Phạm vi địa bàn quản lý (Huyện Củ Chi)</span>
              </label>
              <span className="text-[10px] text-slate-400">
                Đã chọn: {selectedCommunes.length} xã/thị trấn
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
              (Nếu không chọn xã nào, tài khoản sẽ có phạm vi toàn huyện / toàn hệ thống)
            </p>
            <div className="max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl grid grid-cols-2 gap-1.5">
              {Object.entries(CU_CHI_COMMUNES_MAP)
                .filter(([code]) => code.startsWith('COM-'))
                .map(([code, name]) => {
                  const isChecked = selectedCommunes.includes(code)
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleToggleCommune(code)}
                      className={`px-2 py-1.5 rounded-lg text-left flex items-center justify-between transition cursor-pointer text-[11px] ${
                        isChecked
                          ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{name}</span>
                      {isChecked && <Check className="w-3 h-3 text-indigo-600 shrink-0 ml-1" />}
                    </button>
                  )
                })}
            </div>
          </div>

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
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Tạo tài khoản</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
