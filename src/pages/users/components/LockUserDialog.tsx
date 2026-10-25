import React from 'react'
import { AlertTriangle, Lock, Unlock, X } from 'lucide-react'
import type { UserAccountItem } from '../../../types/admin/users'

export interface LockUserDialogProps {
  isOpen: boolean
  user: UserAccountItem | null
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: () => void
}

export const LockUserDialog: React.FC<LockUserDialogProps> = ({
  isOpen,
  user,
  isSubmitting = false,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !user) return null

  const isLocked = user.status === 'locked'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-2xs ${
                isLocked
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
              }`}
            >
              {isLocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isLocked ? 'Mở Khóa Tài Khoản' : 'Khóa Tài Khoản'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">@{user.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-xs text-slate-600 dark:text-slate-300 space-y-3">
          <p>
            Bạn có chắc chắn muốn {isLocked ? 'mở khóa' : 'khóa'} tài khoản của người dùng{' '}
            <strong className="text-slate-900 dark:text-white">
              {user.full_name || user.username}
            </strong>
            ?
          </p>
          {!isLocked && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Khi tài khoản bị khóa, người dùng sẽ không thể đăng nhập hoặc thực hiện bất kỳ tác
                nghiệp nào trên hệ thống.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-xs"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`px-5 py-2 rounded-xl font-bold text-white shadow-md transition cursor-pointer text-xs flex items-center gap-1.5 ${
              isLocked
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : isLocked ? (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Xác nhận Mở khóa</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Xác nhận Khóa</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
