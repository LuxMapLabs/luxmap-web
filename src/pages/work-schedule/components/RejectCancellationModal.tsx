import React, { useState } from 'react'
import { X, Send, XCircle, AlertTriangle, MessageSquare } from 'lucide-react'

interface RejectCancellationModalProps {
  isOpen: boolean
  caseCode: string
  workOrderId: string
  currentAssigneeName: string
  cancellationReason: string
  onClose: () => void
  onReject: (rejectReason: string) => void
}

const QUICK_REJECT_REASONS = [
  'Ca xử lý sự cố chập điện khẩn cấp, yêu cầu tiếp cận hiện trường đúng hẹn.',
  'Hiện tại không có kỹ sư dự phòng thay thế, đề nghị khắc phục phương tiện để tiếp tục.',
  'Thời tiết tại địa bàn đã ngớt mưa, đủ điều kiện an toàn lao động để tác nghiệp.',
  'Nhiệm vụ ưu tiên cao của UBND xã, bắt buộc hoàn thành trong ngày hôm nay.',
]

export const RejectCancellationModal: React.FC<RejectCancellationModalProps> = ({
  isOpen,
  caseCode,
  currentAssigneeName,
  cancellationReason,
  onClose,
  onReject,
}) => {
  const [rejectReason, setRejectReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối để gửi thông báo giải thích cho Kỹ sư!')
      return
    }

    setIsSubmitting(true)
    try {
      await onReject(rejectReason.trim())
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-rose-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
              <XCircle className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-rose-700 text-xs px-2 py-0.5 bg-rose-100 rounded border border-rose-200">
                  {caseCode}
                </span>
                <span className="text-slate-300">•</span>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Bác Bỏ Yêu Cầu Hủy Lịch
                </h3>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Yêu cầu Kỹ sư <strong>{currentAssigneeName}</strong> tiếp tục thực hiện nhiệm vụ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
          {/* Lý do kỹ sư đã gửi */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 flex-1">
              <span className="font-extrabold text-amber-950">
                Lý do Kỹ sư {currentAssigneeName} đề xuất xin hủy:
              </span>
              <p className="text-amber-900 leading-relaxed font-medium bg-white/80 p-2.5 rounded-xl border border-amber-200/80 whitespace-pre-line">
                "{cancellationReason || 'Kỹ sư xin hủy lịch vì lý do phương tiện hoặc thiết bị.'}"
              </p>
            </div>
          </div>

          {/* Ô nhập lý do từ chối bắt buộc */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Lý do từ chối &amp; chỉ đạo kỹ thuật gửi về điện thoại Kỹ sư (*):
            </label>
            <textarea
              rows={3}
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do tại sao không thể hủy lịch này để kỹ sư nắm rõ..."
              className="p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Gợi ý lý do nhanh */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">
              Gợi ý phản hồi nhanh (bấm để điền):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REJECT_REASONS.map((reason, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRejectReason(reason)}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded-lg transition text-left cursor-pointer"
                >
                  • {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-500/20 transition cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi phản hồi từ chối về Kỹ sư</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default RejectCancellationModal
