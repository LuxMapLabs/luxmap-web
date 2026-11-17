import React from 'react'
import { X, AlertTriangle, Trash2, Ban, ArrowRight } from 'lucide-react'

export interface SurveyPoleConflict {
  poleId: string
  workOrderId: string
  faultId: string
  photoId?: string | null
  canRejectPhoto: boolean
}

interface SurveyConflictModalProps {
  isOpen: boolean
  conflicts: SurveyPoleConflict[]
  freePoleIds: string[]
  isProcessing: boolean
  onClose: () => void
  onRequestCancelOtherOrder: (workOrderId: string, poleId: string) => void
  onRejectPolePhoto: (conflict: SurveyPoleConflict) => void
  onProceedWithFreePoles?: () => void
}

/**
 * Popup cảnh báo và xử lý khi có cột đèn trong báo cáo khảo sát
 * đang nằm trong một phiếu công tác khác chưa đóng.
 */
export const SurveyConflictModal: React.FC<SurveyConflictModalProps> = ({
  isOpen,
  conflicts,
  freePoleIds,
  isProcessing,
  onClose,
  onRequestCancelOtherOrder,
  onRejectPolePhoto,
  onProceedWithFreePoles,
}) => {
  if (!isOpen || conflicts.length === 0) return null

  const hasFreePoles = freePoleIds.length > 0

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-200 bg-amber-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-amber-950 text-sm sm:text-base">
                Phát Hiện Cột Đèn Đang Nằm Trong Phiếu Khác
              </h3>
              <p className="text-xs text-amber-800/90 font-medium">
                {hasFreePoles
                  ? `Có ${conflicts.length} cột đang bận và ${freePoleIds.length} cột sẵn sàng tạo lịch kiểm tra.`
                  : 'Tất cả cột ghi nhận sự cố đều đang nằm trong phiếu công tác chưa đóng.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-full flex items-center justify-center text-amber-600 hover:text-amber-900 hover:bg-amber-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            Để đưa các cột dưới đây vào lịch kiểm tra mới, Quản lý cần{' '}
            <strong>hủy phiếu công tác đang giữ cột</strong> hoặc{' '}
            <strong>từ chối cột đó khỏi báo cáo khảo sát</strong> (nếu chưa duyệt nghiệm thu).
          </p>

          <div className="flex flex-col gap-2">
            {conflicts.map((c) => (
              <div
                key={`${c.poleId}-${c.workOrderId}`}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-300 font-mono font-black text-slate-900">
                      {c.poleId}
                    </span>
                    <span className="text-slate-600">đang nằm trong phiếu</span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-mono font-bold">
                      {c.workOrderId}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/70 flex-wrap">
                  {c.canRejectPhoto && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => onRejectPolePhoto(c)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[11px] transition cursor-pointer disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5 text-slate-600" />
                      <span>Từ chối cột khỏi khảo sát</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => onRequestCancelOtherOrder(c.workOrderId, c.poleId)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hủy phiếu {c.workOrderId}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            Đóng
          </button>

          {hasFreePoles && onProceedWithFreePoles && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={onProceedWithFreePoles}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <span>Bỏ qua cột bận, tạo lịch cho {freePoleIds.length} cột còn lại</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
