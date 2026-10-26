import React, { useState, useEffect } from 'react'
import { X, CheckCircle, UserCheck, Ban, AlertTriangle, Calendar, ArrowRight } from 'lucide-react'
import { WorkOrderAssignee } from '../../../types/workorders/orders'

interface ApproveCancellationModalProps {
  isOpen: boolean
  caseCode: string
  workOrderId: string
  currentAssigneeName: string
  currentAssigneeId?: string
  currentScheduledDate?: string
  currentDueDate?: string
  cancellationReason: string
  assignees: WorkOrderAssignee[]
  onClose: () => void
  onApproveReassign: (params: {
    newAssigneeId: string
    scheduledDate: string
    dueDate: string
    note?: string
  }) => void | Promise<void>
  onApproveCancel: (reason: string) => void | Promise<void>
}

export const ApproveCancellationModal: React.FC<ApproveCancellationModalProps> = ({
  isOpen,
  caseCode,
  currentAssigneeName,
  currentAssigneeId,
  currentScheduledDate,
  currentDueDate,
  cancellationReason,
  assignees = [],
  onClose,
  onApproveReassign,
  onApproveCancel,
}) => {
  const [resolutionType, setResolutionType] = useState<'reassign' | 'cancel'>('reassign')
  const [newAssigneeId, setNewAssigneeId] = useState<string>('')
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const [reassignNote, setReassignNote] = useState<string>('')
  const [cancelReason, setCancelReason] = useState<string>(
    'Duyệt theo đề xuất xin hủy của kỹ sư do điều kiện hiện trường không đảm bảo.'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Khởi tạo ngày hẹn mặc định khi mở modal
  useEffect(() => {
    if (isOpen) {
      const defaultDate = currentScheduledDate || new Date().toISOString().substring(0, 10)
      setScheduledDate(defaultDate)
      setDueDate(currentDueDate || defaultDate)
      setNewAssigneeId('')
      setReassignNote('')
    }
  }, [isOpen, currentScheduledDate, currentDueDate])

  if (!isOpen) return null

  // Danh sách kỹ sư khả dụng (loại trừ kỹ sư đang xin hủy nếu có thể so sánh)
  const availableAssignees = assignees.filter(
    (a) => a.full_name?.toLowerCase() !== currentAssigneeName.toLowerCase()
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (resolutionType === 'reassign') {
        if (!newAssigneeId) {
          alert('Vui lòng chọn một kỹ sư hiện trường tiếp quản nhiệm vụ (hoặc chọn giữ nguyên kỹ sư nếu chỉ dời ngày)!')
          setIsSubmitting(false)
          return
        }
        await onApproveReassign({
          newAssigneeId: newAssigneeId === '__current__' ? (currentAssigneeId || '') : newAssigneeId,
          scheduledDate: scheduledDate || currentScheduledDate || new Date().toISOString().substring(0, 10),
          dueDate: dueDate || scheduledDate || currentScheduledDate || new Date().toISOString().substring(0, 10),
          note: reassignNote.trim() || undefined,
        })
      } else {
        await onApproveCancel(cancelReason.trim())
      }
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
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-blue-700 text-xs px-2 py-0.5 bg-blue-50 rounded border border-blue-200">
                  {caseCode}
                </span>
                <span className="text-slate-300">•</span>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Duyệt Yêu Cầu Hủy Lịch
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Kỹ sư <strong>{currentAssigneeName}</strong> đề xuất xin dừng nhiệm vụ
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
          {/* Hộp đối chiếu lý do xin hủy của kỹ sư */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-extrabold text-amber-950">
                Lý do giải trình từ Kỹ sư {currentAssigneeName}:
              </span>
              <p className="text-amber-900 leading-relaxed font-medium bg-white/80 p-2.5 rounded-xl border border-amber-200/80 whitespace-pre-line">
                "{cancellationReason || 'Kỹ sư xin hủy lịch vì lý do phương tiện hoặc hiện trường bất khả kháng.'}"
              </p>
            </div>
          </div>

          {/* Lựa chọn phương án xử lý */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Chọn phương án điều phối sau khi duyệt hủy:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Điều chỉnh & Phân công lại */}
              <div
                onClick={() => setResolutionType('reassign')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  resolutionType === 'reassign'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`p-1.5 rounded-xl ${
                      resolutionType === 'reassign'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                  </span>
                  <span className="font-extrabold text-xs text-slate-900">
                    1. Điều chỉnh &amp; Phân công lại
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Dời ngày làm việc (khi mưa bão/sự cố) hoặc chỉ định kỹ sư khác tiếp quản nhiệm vụ.
                </p>
              </div>

              {/* Option 2: Hủy lịch hoàn toàn */}
              <div
                onClick={() => setResolutionType('cancel')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  resolutionType === 'cancel'
                    ? 'border-rose-600 bg-rose-50/50 shadow-xs ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`p-1.5 rounded-xl ${
                      resolutionType === 'cancel'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Ban className="w-4 h-4" />
                  </span>
                  <span className="font-extrabold text-xs text-slate-900">
                    2. Hủy bỏ hẳn lịch
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Đóng ca làm việc và giải phóng hoàn toàn các liên kết sự cố/cột đèn của phiếu này.
                </p>
              </div>
            </div>
          </div>

          {/* Form chi tiết theo từng phương án */}
          {resolutionType === 'reassign' ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-3.5 animate-in fade-in duration-150">
              {/* Chọn Kỹ sư */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Chỉ định Kỹ sư hiện trường tiếp quản (*):
                </label>
                <select
                  required
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                  className="p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn kỹ sư tiếp quản nhiệm vụ --</option>
                  {currentAssigneeName && (
                    <option value="__current__" className="text-blue-700 font-bold">
                      🔄 Giữ nguyên: {currentAssigneeName.replace(/^Kỹ sư\s+/i, '')}
                    </option>
                  )}
                  {(availableAssignees.length > 0 ? availableAssignees : assignees).map((a) => (
                    <option key={a.user_id} value={a.user_id || ''}>
                      👤 {a.full_name} ({a.user_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Chọn Ngày làm việc mới (Phương án B: 1 ô chọn duy nhất, tự động đồng bộ hạn chót) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ngày làm việc mới (*):</span>
                  </span>
                  <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-medium border border-blue-200/60">
                    Tự động đồng bộ hạn hoàn thành
                  </span>
                </label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => {
                    const newDate = e.target.value
                    setScheduledDate(newDate)
                    setDueDate(newDate)
                  }}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500 italic">
                  * Có thể chọn dời sang ngày khác nếu hôm nay thời tiết xấu (mưa bão) chưa thể tiếp cận hiện trường.
                </p>
              </div>

              {/* Ghi chú điều phối */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Ghi chú điều phối bổ sung (tùy chọn):
                </label>
                <input
                  type="text"
                  value={reassignNote}
                  onChange={(e) => setReassignNote(e.target.value)}
                  placeholder="Ví dụ: Dời lịch sang ngày mai do thời tiết mưa dông, ưu tiên xử lý trước 20h..."
                  className="p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-2xl flex flex-col gap-2 animate-in fade-in duration-150">
              <label className="text-xs font-bold text-rose-950">
                Ghi chú lý do hủy ca làm việc (*):
              </label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy bỏ ca làm việc..."
                className="p-2.5 bg-white border border-rose-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
              />
              <p className="text-[11px] text-rose-700">
                Lưu ý: Lịch này sẽ được chuyển sang trạng thái <strong>Đã hủy (Cancelled)</strong> và không thể tiếp tục thực hiện.
              </p>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              Hủy thao tác
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition cursor-pointer active:scale-95 ${
                resolutionType === 'reassign'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
              }`}
            >
              <span>{resolutionType === 'reassign' ? 'Xác nhận điều phối lại' : 'Xác nhận hủy lịch'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default ApproveCancellationModal
