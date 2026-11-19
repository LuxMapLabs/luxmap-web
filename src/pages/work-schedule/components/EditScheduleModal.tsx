import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { X, Edit3, Calendar, User, MapPin, FileText, Wrench, Loader2, AlertTriangle, Cpu } from 'lucide-react'
import { toast } from 'sonner'
import type { RootState } from '../../../redux/rootReducer'
import type { ScheduleCase, SchedulePhase } from '../../../feature/work-schedule/workScheduleSlice'
import type { WorkOrderAssignee } from '../../../types/workorders/orders'
import { OpsSelect } from '../../../components/ops/OpsSelect'
import { getPhaseOverdueInfo, getLocalTodayYmd } from '../../../utils/work-schedule/scheduleRules'

interface EditScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  caseItem: ScheduleCase | null
  currentPhase: SchedulePhase | null
  assignees: WorkOrderAssignee[]
  onSubmit: (payload: {
    title: string
    scheduledDate: string
    dueDate: string
    newAssigneeId: string
    materialsNote?: string
  }) => Promise<void>
}

export const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
  isOpen,
  onClose,
  caseItem,
  currentPhase,
  assignees,
  onSubmit,
}) => {
  const [title, setTitle] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [materialsNote, setMaterialsNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const workOrderDetail = useSelector((state: RootState) => state.workSchedule.workOrderDetail)

  const todayYmd = getLocalTodayYmd()
  const overdueInfo = getPhaseOverdueInfo(currentPhase, caseItem?.isTerminated, undefined, todayYmd)
  const isScheduledDateLocked = overdueInfo.isOverdue

  useEffect(() => {
    if (isOpen && currentPhase && caseItem) {
      const todayStr = getLocalTodayYmd()
      setTitle(caseItem.title || 'Lệnh công tác')
      const initialDate = currentPhase.date || todayStr
      setScheduledDate(initialDate)
      const currentDue = currentPhase.dueDate || initialDate
      setDueDate(currentDue < todayStr ? todayStr : currentDue)
      setAssigneeId(currentPhase.assigneeId || assignees[0]?.user_id || '')
      setMaterialsNote(currentPhase.materialsNote || '')
    }
  }, [isOpen, currentPhase, caseItem, assignees])

  if (!isOpen || !caseItem || !currentPhase) return null

  const normalizedSeg = (caseItem.segment || '').trim()
  const hasSegment = Boolean(
    normalizedSeg && normalizedSeg !== '-' && normalizedSeg !== '—'
  )
  const isIotOrder =
    !hasSegment &&
    (currentPhase.phaseType === 'inspection' || currentPhase.phaseType === 'repair')
  const detailFaults =
    workOrderDetail &&
    (workOrderDetail.work_order_id === currentPhase.workOrderId ||
      workOrderDetail.work_order_id === caseItem.code)
      ? workOrderDetail.faults || []
      : []
  const iotCabinets = Array.from(
    new Set(detailFaults.map((f) => f.cabinet_id).filter((v): v is string => Boolean(v)))
  )
  const iotFeeders = Array.from(
    new Set(detailFaults.map((f) => f.feeder_id).filter((v): v is string => Boolean(v)))
  )
  const iotNodes = Array.from(
    new Set(detailFaults.map((f) => f.origin_node_id).filter((v): v is string => Boolean(v)))
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.warning('Vui lòng nhập tiêu đề lệnh công tác!')
      return
    }

    if (!scheduledDate) {
      toast.warning('Vui lòng chọn ngày thực hiện!')
      return
    }

    if (dueDate && dueDate < scheduledDate) {
      toast.warning('Hạn chót hoàn thành không được trước ngày thực hiện!')
      return
    }

    if (isScheduledDateLocked && dueDate < todayYmd) {
      toast.warning('Vui lòng chọn hạn chót hoàn thành từ ngày hôm nay trở đi để gia hạn phiếu quá hạn!')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        scheduledDate,
        dueDate: dueDate || scheduledDate,
        newAssigneeId: assigneeId,
        materialsNote: materialsNote.trim(),
      })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Edit3 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-blue-600 text-xs sm:text-sm">
                  {caseItem.code}
                </span>
                <span className="text-slate-400">•</span>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Chỉnh Sửa Lịch Công Tác
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {currentPhase.name} • Lệnh: {currentPhase.workOrderId || caseItem.code}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 custom-scrollbar">
          {/* Tiêu đề */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Tiêu đề công tác (*)
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề hoặc nội dung yêu cầu..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Đối tượng phụ trách: Thiết bị IoT & Tủ điện hoặc Tuyến đường (Chỉ đọc) */}
          {isIotOrder ? (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2 text-xs">
              <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                <span>Thiết bị IoT &amp; Tủ điện phụ trách</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="px-2.5 py-2 rounded-xl bg-white border border-indigo-100">
                  <span className="block text-[10px] font-semibold text-slate-400">Tủ điện</span>
                  <span className="font-mono font-bold text-indigo-950">
                    {iotCabinets.length > 0 ? iotCabinets.join(', ') : '-'}
                  </span>
                </div>
                <div className="px-2.5 py-2 rounded-xl bg-white border border-indigo-100">
                  <span className="block text-[10px] font-semibold text-slate-400">Mạch (Feeder)</span>
                  <span className="font-mono font-bold text-indigo-950">
                    {iotFeeders.length > 0 ? iotFeeders.join(', ') : '-'}
                  </span>
                </div>
                <div className="px-2.5 py-2 rounded-xl bg-white border border-indigo-100">
                  <span className="block text-[10px] font-semibold text-slate-400">Node IoT</span>
                  <span className="font-mono font-bold text-indigo-950">
                    {iotNodes.length > 0 ? iotNodes.join(', ') : '-'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Tuyến đường phụ trách
              </label>
              <input
                type="text"
                disabled
                value={caseItem.segment}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none cursor-not-allowed select-none"
              />
            </div>
          )}

          {/* Thông báo khóa Ngày thực hiện khi phiếu đã quá hạn */}
          {isScheduledDateLocked && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Phiếu đã quá hạn ({overdueInfo.overdueDays} ngày):</strong> Ô{' '}
                <strong>Ngày thực hiện</strong> được khóa cố định để giữ nguyên lịch sử giao ca trên bảng lịch. Quản lý chỉ cần cập nhật{' '}
                <strong>Hạn chót hoàn thành mới</strong> (và đổi Kỹ sư phụ trách nếu cần).
              </div>
            </div>
          )}

          {/* Ngày thực hiện & Hạn chót */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                {isScheduledDateLocked ? 'Ngày thực hiện (Đã khóa)' : 'Ngày thực hiện (*)'}
              </label>
              <input
                type="date"
                required
                disabled={isScheduledDateLocked}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold outline-none transition ${
                  isScheduledDateLocked
                    ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed select-none'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer'
                }`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Hạn chót hoàn thành (*)
              </label>
              <input
                type="date"
                required
                min={isScheduledDateLocked ? todayYmd : scheduledDate}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition cursor-pointer"
              />
            </div>
          </div>

          {/* Kỹ sư phụ trách */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              Kỹ sư hiện trường phụ trách
            </label>
            <OpsSelect
              value={assigneeId}
              onChange={(val) => setAssigneeId(val)}
              icon={<User className="w-3.5 h-3.5" />}
              headerLabel="Kỹ sư hiện trường"
              headerBadge={`${assignees.length} kỹ sư`}
              ariaLabel="Kỹ sư hiện trường phụ trách"
              className="w-full"
              triggerClassName="w-full min-h-[42px] px-3 py-2"
              popoverClassName="w-full"
              showTriggerBadge={false}
              options={
                assignees.length === 0
                  ? [{ value: '', label: 'Chưa có kỹ sư thuộc địa bàn này' }]
                  : assignees.map((a) => ({
                      value: a.user_id || '',
                      label: a.full_name || a.user_id || '',
                      nativeLabel: a.full_name || a.user_id || '',
                      dotColor: 'bg-blue-500',
                    }))
              }
            />
          </div>

          {/* Ghi chú vật tư / yêu cầu kỹ thuật */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-emerald-600" />
              Ghi chú vật tư & yêu cầu kỹ thuật
            </label>
            <textarea
              rows={3}
              value={materialsNote}
              onChange={(e) => setMaterialsNote(e.target.value)}
              placeholder={
                isIotOrder
                  ? 'Ví dụ: Kiểm tra nguồn tủ, cầu chì, cảm biến dòng/áp, kết nối Node IoT...'
                  : 'Ví dụ: Cần mang theo thang nâng 12m, 02 bóng LED 100W, đồng hồ đo Lux...'
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none transition"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5 mt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
