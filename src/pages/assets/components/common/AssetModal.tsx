import React from 'react'
import { createPortal } from 'react-dom'
import { X, AlertCircle, Loader2 } from 'lucide-react'

/**
 * Bộ khung chung cho mọi modal Thêm/Sửa của trang Tài sản,
 * để header, footer, nút bấm và thông báo lỗi đồng bộ với nhau.
 * Ô icon trên header dùng chung một tông màu theme để các modal đồng bộ.
 */

export type AssetModalAccent = 'purple' | 'amber' | 'blue' | 'indigo' | 'emerald' | 'cyan'

// Theme Manager dùng một tông hồng duy nhất; các tên accent giữ lại để không phải đổi chỗ gọi.
const ACCENT_TILE =
  'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60'

const ACCENT_CLASSES: Record<AssetModalAccent, string> = {
  purple: ACCENT_TILE,
  amber: ACCENT_TILE,
  blue: ACCENT_TILE,
  indigo: ACCENT_TILE,
  emerald: ACCENT_TILE,
  cyan: ACCENT_TILE,
}

interface AssetModalFrameProps {
  /** Lớp chiều rộng tối đa của hộp thoại, ví dụ `max-w-lg` */
  widthClass?: string
  children: React.ReactNode
}

export const AssetModalFrame: React.FC<AssetModalFrameProps> = ({ widthClass = 'max-w-lg', children }) =>
  createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in select-none">
      <div
        className={`relative w-full ${widthClass} max-h-[92vh] flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95`}
      >
        {children}
      </div>
    </div>,
    document.body
  )

interface AssetModalHeaderProps {
  icon: React.ReactNode
  accent: AssetModalAccent
  title: React.ReactNode
  subtitle?: React.ReactNode
  onClose: () => void
}

export const AssetModalHeader: React.FC<AssetModalHeaderProps> = ({ icon, accent, title, subtitle, onClose }) => (
  <div className="px-5 py-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0">
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${ACCENT_CLASSES[accent]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base truncate">{title}</h3>
        {subtitle ? <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p> : null}
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      aria-label="Đóng"
      className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer shrink-0"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
)

interface AssetModalFooterProps {
  onCancel: () => void
  submitLabel: React.ReactNode
  submitIcon?: React.ReactNode
  disabled?: boolean
  loading?: boolean
  /** Nút gửi nằm ngoài thẻ <form> thì truyền id form vào đây */
  formId?: string
}

export const AssetModalFooter: React.FC<AssetModalFooterProps> = ({
  onCancel,
  submitLabel,
  submitIcon,
  disabled = false,
  loading = false,
  formId,
}) => (
  <div className="px-5 py-3.5 sm:px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-end gap-2.5 shrink-0">
    <button
      type="button"
      onClick={onCancel}
      className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
    >
      Hủy bỏ
    </button>
    <button
      type="submit"
      form={formId}
      disabled={disabled || loading}
      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : submitIcon}
      <span>{submitLabel}</span>
    </button>
  </div>
)

export const AssetModalError: React.FC<{ message: string | null | undefined }> = ({ message }) =>
  message ? (
    <div
      role="alert"
      className="mx-5 sm:mx-6 mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 shrink-0 animate-in slide-in-from-top-1"
    >
      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
      <span>{message}</span>
    </div>
  ) : null
