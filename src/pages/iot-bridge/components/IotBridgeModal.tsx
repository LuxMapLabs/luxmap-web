import React from 'react'
import { X } from 'lucide-react'

/** Khung modal dùng chung của trang IoT Bridge. */
export const IotBridgeModal: React.FC<{
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}> = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
    <div role="dialog" aria-label={title} className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 bg-slate-50/50">
        <div>
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          {subtitle && <p className="text-[11px] font-mono text-slate-500">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Đóng"
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  </div>
)

export const fieldClass =
  'mt-1 w-full px-3 py-2 font-normal bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary focus:bg-white'
export const labelClass = 'block text-xs font-bold text-slate-700 mb-1'
export const primaryButtonClass =
  'px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition cursor-pointer'
export const secondaryButtonClass =
  'px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer'
