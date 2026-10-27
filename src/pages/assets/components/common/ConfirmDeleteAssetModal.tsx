import React from 'react'
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react'

export interface ConfirmDeleteAssetModalProps {
  isOpen: boolean
  assetTypeLabel: string
  assetId: string | null
  assetName?: string | null
  warningMessage?: string
  isLoading?: boolean
  onClose: () => void
  onConfirm: () => void
}

export const ConfirmDeleteAssetModal: React.FC<ConfirmDeleteAssetModalProps> = ({
  isOpen,
  assetTypeLabel,
  assetId,
  assetName,
  warningMessage,
  isLoading = false,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !assetId) return null

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
                Xác Nhận Xóa {assetTypeLabel}
              </h3>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {assetName ? `${assetName} (${assetId})` : assetId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
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
                {warningMessage || (
                  <>
                    Bạn có chắc chắn muốn xóa {assetTypeLabel.toLowerCase()}{' '}
                    <strong className="font-mono text-rose-900 dark:text-rose-100">
                      {assetName || assetId}
                    </strong>
                    ? Thao tác này sẽ xóa vĩnh viễn và không thể hoàn tác.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xóa...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Xác nhận xóa</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
