import React, { useState, useEffect } from 'react'
import { X, Calendar, MapPin, User, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { TaskKind, WorkOrderAssignee } from '../../../types/workSchedule'
import { PoleSelector } from './PoleSelector'
import { getPolesBySegment } from '../../../feature/work-schedule/poleUtils'

interface CreateManualModalProps {
  isOpen: boolean
  defaultDate?: string
  isDateLocked?: boolean
  assignees: WorkOrderAssignee[]
  onClose: () => void
  onSubmit: (payload: {
    title: string
    segment: string
    initPhase: TaskKind
    assigneeId: string
    assigneeName: string
    date: string
    notes?: string
    poleIds?: string[]
  }) => void
}

const SEGMENTS = [
  'Tuyến A - Trục chính liên xã Phước Hậu (SEG-001)',
  'Tuyến B - Đường liên thôn Mỹ Hạnh Bắc (SEG-002)',
  'Tuyến C - Tuyến đường ra cầu (SEG-003)',
]

const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const CreateManualModal: React.FC<CreateManualModalProps> = ({
  isOpen,
  defaultDate,
  assignees,
  onClose,
  onSubmit,
}) => {
  const [initPhase, setInitPhase] = useState<TaskKind>('survey')
  const [title, setTitle] = useState('')
  const [segment, setSegment] = useState(SEGMENTS[0])
  const [selectedPoleIds, setSelectedPoleIds] = useState<string[]>([])
  const [assigneeId, setAssigneeId] = useState((assignees || [])[0]?.user_id || 'USR-004')
  const [date, setDate] = useState(defaultDate || getTodayStr())
  const [notes, setNotes] = useState('')

  // Đồng bộ ngày khi mở modal từ ô lịch hoặc nút tạo mới
  useEffect(() => {
    if (isOpen) {
      const todayStr = getTodayStr()
      const effectiveDate = defaultDate && defaultDate >= todayStr ? defaultDate : todayStr
      setDate(effectiveDate)
    }
  }, [defaultDate, isOpen])

  // Cập nhật danh sách cột khi thay đổi tuyến đường hoặc giai đoạn
  useEffect(() => {
    if (initPhase === 'survey') {
      setSelectedPoleIds([])
    } else {
      const poles = getPolesBySegment(segment)
      if (poles.length > 0) {
        setSelectedPoleIds([poles[0].poleId])
      }
    }
  }, [segment, initPhase])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const todayStr = getTodayStr()
    if (date < todayStr) {
      toast.error(
        `Không thể tạo lịch cho ngày trong quá khứ (${date}). Vui lòng chọn từ ngày hôm nay (${todayStr}) trở đi.`
      )
      return
    }

    if (initPhase !== 'survey' && selectedPoleIds.length === 0) {
      toast.warning(
        `Vui lòng chọn ít nhất 01 cột đèn cần ${initPhase === 'inspection' ? 'kiểm tra' : 'sửa chữa'}!`
      )
      return
    }

    const selectedAssignee = assignees.find((a) => a.user_id === assigneeId)
    const assigneeName = selectedAssignee?.full_name ? selectedAssignee.full_name.split(' (')[0] : 'Khang Lê'

    onSubmit({
      title: title.trim() || 'Sự cố chiếu sáng mới',
      segment,
      initPhase,
      assigneeId,
      assigneeName,
      date,
      notes: notes.trim(),
      poleIds: initPhase === 'survey' ? undefined : selectedPoleIds,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                <Calendar className="w-4 h-4" />
              </span>
              Tạo Lịch Làm Việc Mới
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Phân công nhiệm vụ khảo sát, kiểm tra hoặc sửa chữa
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {/* Giai đoạn khởi đầu */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Khởi động tại giai đoạn (*):</label>
              <select
                value={initPhase}
                onChange={(e) => setInitPhase(e.target.value as TaskKind)}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="survey">🟡 1. Khảo sát</option>
                <option value="inspection">🔵 2. Kiểm tra</option>
                <option value="repair">🟢 3. Sửa chữa</option>
              </select>
            </div>

            {/* Tiêu đề vụ việc */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Tiêu đề sự vụ (*):</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Sự cố mất sáng đoạn qua UBND xã Phước Hậu"
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tuyến đường */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Tuyến đường (*):
              </label>
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SEGMENTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Chọn cột đèn theo tuyến đường: Tự động hiển thị khi loại việc là Kiểm tra hoặc Sửa chữa */}
            {initPhase !== 'survey' && (
              <PoleSelector
                segmentStr={segment}
                selectedPoleIds={selectedPoleIds}
                onChange={setSelectedPoleIds}
                taskKindName={initPhase === 'inspection' ? 'Kiểm tra' : 'Sửa chữa'}
              />
            )}

            {/* Kỹ sư phụ trách */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Kỹ sư hiện trường phụ trách (*):
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {assignees.map((a) => (
                  <option key={a.user_id || ''} value={a.user_id || ''}>
                    {a.full_name || a.user_id || ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Ngày thực hiện - Không khóa, luôn cho phép chọn trực tiếp */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Ngày bắt đầu (*):
              </label>
              <input
                type="date"
                required
                min={getTodayStr()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="p-2.5 rounded-xl text-xs font-bold outline-none transition-all bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* Ghi chú */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Ghi chú:
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Yêu cầu kiểm tra an toàn hoặc phạm vi công tác..."
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Footer Buttons - Cố định ở đáy modal */}
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer active:scale-98"
            >
              + Tạo sự vụ
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
