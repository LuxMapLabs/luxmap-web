import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { XCircle, X, Loader2, AlertCircle } from 'lucide-react'
import type { RejectCitizenReportRequest } from '../../../types/citizen-reports/citizen-reports'

export interface CitizenReviewRejectModalProps {
  isOpen: boolean
  submissionCount: number
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (data: RejectCitizenReportRequest) => void
}

const COMMON_REJECT_REASONS = [
  'Ảnh hiện trường không phản ánh đúng cột đèn được quét.',
  'Kiểm tra hệ thống SCADA cho thấy tuyến đèn vẫn hoạt động bình thường.',
  'Thông tin phản ánh không rõ ràng / trùng lặp thử nghiệm.',
  'Cột đèn thuộc phạm vi quản lý của dự án khác.',
]

export const CitizenReviewRejectModal: React.FC<CitizenReviewRejectModalProps> = ({
  isOpen,
  submissionCount,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState<string>('')
  const [errorText, setErrorText] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanReason = reason.trim()
    if (!cleanReason) {
      setErrorText('Vui lòng nhập lý do từ chối phản ánh.')
      return
    }
    if (cleanReason.length < 5) {
      setErrorText('Lý do từ chối cần tối thiểu 5 ký tự để đảm bảo tính minh bạch.')
      return
    }

    setErrorText(null)
    onSubmit({
      submission_count: submissionCount,
      reason: cleanReason,
    })
  }

  const handleSelectTemplate = (tmpl: string) => {
    setReason(tmpl)
    setErrorText(null)
  }

  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm sm:text-base">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
            <span>Từ Chối Phản Ánh Công Dân</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form nội dung */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 text-rose-900 dark:text-rose-200 text-[11px] leading-relaxed">
            Hành động này sẽ đánh dấu <strong>{submissionCount} lượt gửi</strong> là không hợp lệ và đóng phản ánh.
          </div>

          {/* Gợi ý lý do phổ biến */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Chọn nhanh lý do mẫu:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_REJECT_REASONS.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-[10.5px] transition text-left cursor-pointer"
                >
                  {tmpl}
                </button>
              ))}
            </div>
          </div>

          {/* Nhập lý do từ chối (bắt buộc) */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200">
              Lý do từ chối chi tiết <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              maxLength={1000}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (errorText) setErrorText(null)
              }}
              placeholder="Nhập lý do thẩm định không chấp nhận phản ánh..."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 transition resize-none"
            />
            {errorText && (
              <div className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorText}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Xác nhận Từ Chối</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default CitizenReviewRejectModal
