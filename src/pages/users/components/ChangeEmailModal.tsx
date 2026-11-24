import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Mail, X } from 'lucide-react'

export interface ChangeEmailModalProps {
  isOpen: boolean
  currentEmail?: string | null
  username?: string | null
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (email: string) => void
}

/**
 * Modal nhỏ cho Admin đổi địa chỉ email của tài khoản người dùng (endpoint riêng PATCH /admin/users/{id}/email).
 */
export const ChangeEmailModal: React.FC<ChangeEmailModalProps> = ({
  isOpen,
  currentEmail,
  username,
  isSubmitting = false,
  onClose,
  onSubmit,
}) => {
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setNewEmail('')
      setError('')
    }
  }, [isOpen, currentEmail])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        if (!isSubmitting) onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isSubmitting) return

    const trimmed = newEmail.trim()
    const currentTrimmed = (currentEmail || '').trim()

    if (!trimmed) {
      setError('Email mới không được để trống')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Định dạng email không hợp lệ')
      return
    }
    if (currentTrimmed && trimmed.toLowerCase() === currentTrimmed.toLowerCase()) {
      setError('Email mới phải khác email hiện tại')
      return
    }

    setError('')
    onSubmit(trimmed)
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Đổi địa chỉ email"
        className="bg-white/90 backdrop-blur-2xl dark:bg-slate-900 rounded-[28px] border border-white/80 dark:border-slate-800 shadow-2xl shadow-primary/30 w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary/10 dark:bg-primary text-primary dark:text-secondary flex items-center justify-center shadow-2xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Đổi địa chỉ email
              </h3>
              {username && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  @{username}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form noValidate onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label
              htmlFor="change-email-current"
              className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Email hiện tại
            </label>
            <input
              id="change-email-current"
              type="text"
              readOnly
              disabled
              value={currentEmail || '-'}
              className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="change-email-new"
              className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Email mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="change-email-new"
                type="email"
                value={newEmail}
                disabled={isSubmitting}
                onChange={(e) => {
                  setNewEmail(e.target.value)
                  if (error) setError('')
                }}
                placeholder="emailmoi@example.com"
                className={`w-full pl-9 pr-3.5 py-2.5 bg-white/50 dark:bg-slate-800/80 border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition disabled:opacity-50 ${
                  error
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-secondary focus:border-secondary'
                }`}
              />
            </div>
            {error ? (
              <p className="text-rose-500 mt-1 text-[11px]">{error}</p>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-[11px] leading-relaxed">
                Thư thông báo gửi tới email mới, mật khẩu giữ nguyên.
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary active:scale-95 text-white font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>Xác nhận</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default ChangeEmailModal
