import React from 'react'
import { X, Trash2, AlertTriangle } from 'lucide-react'

export interface ConfirmDeleteIotNodeModalProps {
  isOpen: boolean
  nodeId: string | null
  onClose: () => void
  onConfirm: (nodeId: string) => void
}

export const ConfirmDeleteIotNodeModal: React.FC<ConfirmDeleteIotNodeModalProps> = ({
  isOpen,
  nodeId,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !nodeId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-800">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Xác Nhận Xóa Thiết Bị IoT
              </h3>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {nodeId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 dark:text-rose-200 space-y-1">
              <p className="font-bold">Cảnh báo hành động:</p>
              <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                Bạn có chắc chắn muốn xóa thiết bị IoT{' '}
                <strong className="font-mono text-rose-900 dark:text-rose-100">{nodeId}</strong>{' '}
                không? Thao tác này sẽ gỡ bỏ thiết bị khỏi tủ điện và không thể hoàn tác.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm(nodeId)
                onClose()
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xác Nhận Xóa</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
