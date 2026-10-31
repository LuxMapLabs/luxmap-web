import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, X, Loader2 } from 'lucide-react'
import type { FaultType, Severity } from '../../../types/common/enums'
import type { AcceptCitizenReportRequest } from '../../../types/citizen-reports/citizen-reports'

export interface CitizenReviewAcceptModalProps {
  isOpen: boolean
  submissionCount: number
  acceptableFaultTypes: FaultType[]
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (data: AcceptCitizenReportRequest) => void
}

const FAULT_TYPE_LABELS: Record<FaultType, string> = {
  lamp_out: 'Đèn tắt hoàn toàn / Cháy bóng (lamp_out)',
  lamp_dim: 'Đèn sáng yếu / Chập chờn (lamp_dim)',
  segment_outage: 'Mất điện toàn tuyến (segment_outage)',
  node_offline: 'Mất tín hiệu điều khiển (node_offline)',
  runtime_decline: 'Suy giảm hiệu năng (runtime_decline)',
}

const SEVERITY_OPTIONS: { id: Severity; label: string }[] = [
  { id: 'low', label: 'Thấp (Low)' },
  { id: 'medium', label: 'Trung bình (Medium - Mặc định)' },
  { id: 'high', label: 'Cao (High)' },
  { id: 'critical', label: 'Khẩn cấp (Critical)' },
]

export const CitizenReviewAcceptModal: React.FC<CitizenReviewAcceptModalProps> = ({
  isOpen,
  submissionCount,
  acceptableFaultTypes,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  // Mặc định chọn loại sự cố đầu tiên trong acceptableFaultTypes hoặc lamp_out
  const [faultType, setFaultType] = useState<FaultType>(
    acceptableFaultTypes.length > 0 ? acceptableFaultTypes[0] : 'lamp_out'
  )
  const [severity, setSeverity] = useState<Severity>('medium')
  const [note, setNote] = useState<string>('')

  // Đồng bộ lại faultType khi modal mở hoặc danh sách acceptableFaultTypes thay đổi
  useEffect(() => {
    if (isOpen && acceptableFaultTypes.length > 0) {
      if (!acceptableFaultTypes.includes(faultType)) {
        setFaultType(acceptableFaultTypes[0])
      }
    }
  }, [isOpen, acceptableFaultTypes, faultType])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      submission_count: submissionCount,
      fault_type: faultType,
      severity,
      note: note.trim() || null,
    })
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
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span>Chấp Thuận & Tạo Sự Cố (Fault)</span>
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
          {/* Cảnh báo concurrency check */}
          <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 text-[11px] leading-relaxed">
            Hệ thống sẽ đồng bộ <strong>{submissionCount} lượt gửi</strong> của người dân vào một Sự cố kỹ thuật mới để điều động đội bảo trì.
          </div>

          {/* Chọn loại sự cố từ acceptable_fault_types */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200">
              Loại sự cố chuyển hóa <span className="text-rose-500">*</span>
            </label>
            <select
              value={faultType}
              onChange={(e) => setFaultType(e.target.value as FaultType)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition cursor-pointer"
            >
              {acceptableFaultTypes.map((ft) => (
                <option key={ft} value={ft}>
                  {FAULT_TYPE_LABELS[ft] || ft}
                </option>
              ))}
            </select>
            <p className="text-[10.5px] text-slate-400">
              * Chỉ hiển thị các loại sự cố phù hợp với nội dung người dân đã báo.
            </p>
          </div>

          {/* Chọn mức độ nghiêm trọng */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200">
              Mức độ nghiêm trọng (Severity)
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition cursor-pointer"
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ghi chú thẩm định */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200">
              Ghi chú của Cán bộ Quản lý (Tùy chọn)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập hướng dẫn xử lý hoặc ghi chú bổ sung cho đội bảo trì..."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition resize-none"
            />
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Xác nhận Duyệt</span>
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

export default CitizenReviewAcceptModal
