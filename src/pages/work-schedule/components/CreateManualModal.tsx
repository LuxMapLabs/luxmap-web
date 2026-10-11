import React, { useState, useEffect } from 'react'
import { X, Plus, Calendar, MapPin, User, FileText, Sparkles, Lock } from 'lucide-react'
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
  'Tuyến C - Đường liên thôn Đức Hòa Đông (SEG-003)',
  'Tuyến D - Đường bờ kênh ấp 4 (SEG-004)',
]

export const CreateManualModal: React.FC<CreateManualModalProps> = ({
  isOpen,
  defaultDate = '2026-10-10',
  isDateLocked = false,
  assignees,
  onClose,
  onSubmit,
}) => {
  const [initPhase, setInitPhase] = useState<TaskKind>('survey')
  const [title, setTitle] = useState('')
  const [segment, setSegment] = useState(SEGMENTS[0])
  const [selectedPoleIds, setSelectedPoleIds] = useState<string[]>([])
  const [assigneeId, setAssigneeId] = useState((assignees || [])[0]?.user_id || 'USR-004')
  const [date, setDate] = useState(defaultDate)
  const [isLocked, setIsLocked] = useState(Boolean(isDateLocked))
  const [notes, setNotes] = useState('')

  // Đồng bộ ngày chính xác khi mở modal từ ô lịch hoặc nút tạo mới
  useEffect(() => {
    if (isOpen) {
      setDate(defaultDate || '2026-10-10')
      setIsLocked(Boolean(isDateLocked))
    }
  }, [defaultDate, isDateLocked, isOpen])

  // Cập nhật danh sách cột khi thay đổi tuyến đường hoặc giai đoạn
  useEffect(() => {
    if (initPhase === 'survey') {
      setSelectedPoleIds([])
    } else {
      const polesOnSegment = getPolesBySegment(segment)
      // Gợi ý chọn sẵn 1-2 cột đầu tiên nếu đang rỗng
      if (polesOnSegment.length > 0) {
        setSelectedPoleIds([polesOnSegment[0].poleId])
      } else {
        setSelectedPoleIds([])
      }
    }
  }, [segment, initPhase])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Bắt buộc chọn ít nhất 01 cột đèn nếu là Kiểm tra hoặc Sửa chữa
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
      notes,
      poleIds: initPhase !== 'survey' ? selectedPoleIds : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Plus className="w-5 h-5" />
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
              Tạo Lịch Làm Việc (Sự Vụ Mới)
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body với phần nội dung cuộn mượt mà và footer cố định */}
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
                <option value="survey">🟡 1. Khảo sát (Survey - Quét video AI ban đêm)</option>
                <option value="inspection">
                  🔵 2. Kiểm tra (Inspection - Khi có tin báo Dân/IoT)
                </option>
                <option value="repair">🟢 3. Sửa chữa (Repair - Phân công trực tiếp)</option>
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
            {initPhase === 'survey' ? (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-900 animate-in fade-in duration-200">
                <span className="p-1 rounded-lg bg-indigo-100 text-indigo-700 mt-0.5 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <p className="font-bold text-indigo-950">Quy trình Khảo sát toàn tuyến:</p>
                  <p className="text-[11.5px] text-indigo-700/90 leading-relaxed mt-0.5">
                    Kỹ sư sẽ di chuyển dọc tuyến đường để ghi hình quét video bằng camera chuyên dụng & xử lý AI Computer Vision nhận diện toàn bộ các cột, không cần chọn thủ công từng cột.
                  </p>
                </div>
              </div>
            ) : (
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

            {/* Ngày thực hiện */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Ngày bắt đầu (*):
                </label>
                {isLocked ? (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    <Lock className="w-3 h-3 text-blue-600" />
                    <span>Đã lấy theo ô ngày {date}</span>
                    <button
                      type="button"
                      onClick={() => setIsLocked(false)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 underline ml-1 cursor-pointer font-normal"
                      title="Bấm nếu bạn muốn đổi sang ngày khác"
                    >
                      (Đổi ngày)
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">
                    Tự do chọn ngày bất kỳ
                  </span>
                )}
              </div>
              <input
                type="date"
                required
                value={date}
                readOnly={isLocked}
                onChange={(e) => setDate(e.target.value)}
                className={`p-2.5 rounded-xl text-xs font-bold outline-none transition-all ${
                  isLocked
                    ? 'bg-slate-100 border border-slate-300 text-slate-700 cursor-not-allowed select-none'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer'
                }`}
              />
            </div>

            {/* Ghi chú */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Ghi chú chỉ đạo:
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Yêu cầu kiểm tra an toàn hoặc phạm vi công tác..."
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
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
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer active:scale-98"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ Tạo sự vụ & Cấp mã SCH</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
