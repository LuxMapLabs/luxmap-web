import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { GitMerge, X, Loader2, AlertCircle } from 'lucide-react'
import type { CitizenReportOpenFault, MergeCitizenReportRequest } from '../../../types/citizen-reports/citizen-reports'

export interface CitizenReviewMergeModalProps {
  isOpen: boolean
  submissionCount: number
  openFaults: CitizenReportOpenFault[]
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (data: MergeCitizenReportRequest) => void
}

export const CitizenReviewMergeModal: React.FC<CitizenReviewMergeModalProps> = ({
  isOpen,
  submissionCount,
  openFaults,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [selectedFaultId, setSelectedFaultId] = useState<string>(
    openFaults.length > 0 && openFaults[0].fault_id ? openFaults[0].fault_id : ''
  )
  const [note, setNote] = useState<string>('')

  // Đồng bộ lại selectedFaultId khi modal mở hoặc danh sách openFaults thay đổi
  useEffect(() => {
    if (isOpen && openFaults.length > 0) {
      if (!selectedFaultId || !openFaults.some((f) => f.fault_id === selectedFaultId)) {
        setSelectedFaultId(openFaults[0].fault_id || '')
      }
    }
  }, [isOpen, openFaults, selectedFaultId])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFaultId) return

    onSubmit({
      submission_count: submissionCount,
      fault_id: selectedFaultId,
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
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <GitMerge className="w-5 h-5" />
            </div>
            <span>Gộp Phản Ánh Vào Sự Cố Có Sẵn</span>
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
          {openFaults.length === 0 ? (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Cột đèn này hiện chưa có sự cố nào đang mở để gộp. Vui lòng sử dụng tính năng <strong>Chấp thuận (Accept)</strong> để tạo sự cố mới.
              </span>
            </div>
          ) : (
            <>
              {/* Chọn sự cố đang mở */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  Chọn Sự cố đang mở trên cột đèn <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {openFaults.map((f) => {
                    const id = f.fault_id || ''
                    const isSelected = selectedFaultId === id

                    return (
                      <div
                        key={id}
                        onClick={() => setSelectedFaultId(id)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-mono text-xs">Mã sự cố: {id}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                            Loại: {f.fault_type} · Mức độ: {f.severity} · Trạng thái: {f.fault_status}
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="selectedFault"
                          checked={isSelected}
                          onChange={() => setSelectedFaultId(id)}
                          className="w-4 h-4 text-blue-600 cursor-pointer"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Ghi chú gộp */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  Ghi chú gộp sự cố (Tùy chọn)
                </label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nhập lý do hoặc thông tin đối chiếu khi gộp..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition resize-none"
                />
              </div>
            </>
          )}

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
              disabled={isSubmitting || openFaults.length === 0 || !selectedFaultId}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <GitMerge className="w-3.5 h-3.5" />
                  <span>Xác nhận Gộp</span>
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

export default CitizenReviewMergeModal
