import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X } from 'lucide-react'

/** Khung modal dùng chung của trang IoT Bridge. */
export const IotBridgeModal: React.FC<{
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}> = ({ title, subtitle, onClose, children }) => {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const firstButton = dialogRef.current?.querySelector<HTMLButtonElement>('button')
    firstButton?.focus()
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
            {subtitle && <p className="text-[11px] font-mono text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Đóng"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">{children}</div>
      </div>
    </div>,
    document.body
  )
}

export const fieldClass =
  'mt-1 w-full px-3 py-2 font-normal bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:bg-white focus-visible:ring-2 ring-primary/40'
export const labelClass = 'block text-xs font-bold text-slate-700 mb-1'
export const primaryButtonClass =
  'px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none'
export const secondaryButtonClass =
  'px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer focus-visible:ring-2 ring-primary/40 focus:outline-none'

/** Ô nhập của form IoT Bridge dạng AssetModal (đăng ký server, đăng ký node). */
export const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed'

export const Field: React.FC<{ label: string; hint?: React.ReactNode; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block space-y-1.5">
    <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
    {children}
    {hint && <span className="block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{hint}</span>}
  </label>
)

export interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel: string
  tone?: 'danger' | 'primary'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmLabel,
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const confirmClass =
    tone === 'danger'
      ? 'px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1.5 focus-visible:ring-2 ring-primary/40 focus:outline-none'
      : `${primaryButtonClass} inline-flex items-center gap-1.5`

  return (
    <IotBridgeModal title={title} onClose={busy ? () => {} : onCancel}>
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className={secondaryButtonClass}
        >
          Huỷ
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={confirmClass}
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </IotBridgeModal>
  )
}
