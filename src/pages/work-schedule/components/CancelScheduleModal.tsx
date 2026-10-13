import React, { useState } from 'react'
import { X, AlertTriangle, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CancelScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  caseCode: string
  workOrderId: string
  onSubmit: (reason: string) => Promise<void>
}

export const CancelScheduleModal: React.FC<CancelScheduleModalProps> = ({
  isOpen,
  onClose,
  caseCode,
  workOrderId,
  onSubmit,
}) => {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason.trim()) {
      toast.warning('Vui lòng nhập lý do hủy lịch công tác!')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(reason.trim())
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-rose-950 text-base">Hủy Lịch Công Tác</h3>
              <p className="text-xs text-rose-700/80 font-medium">
                Mã sự vụ: <span className="font-mono font-bold">{caseCode}</span>
                {workOrderId && ` (${workOrderId})`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong>Cảnh báo hủy lịch:</strong> Lệnh công tác sẽ chuyển sang trạng thái{' '}
              <span className="font-bold text-rose-700">Đã hủy</span>, các sự cố và cột đèn liên
              quan sẽ được giải phóng trở lại hệ thống. Hành động này sẽ được lưu vết vào nhật ký
              kiểm toán.
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">
              Lý do hủy lịch công tác (*)
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Lịch bị trùng với kế hoạch bảo trì lưới điện EVN; hoặc thời tiết bão không thể triển khai..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white resize-none transition"
              autoFocus
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xác nhận hủy lịch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
