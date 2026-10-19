import React, { useState, useEffect } from 'react'
import { X, Calendar, MapPin, User, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { TaskKind, WorkOrderAssignee } from '../../../types/workSchedule'
import { PoleSelector } from './PoleSelector'

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
    faultIds?: string[]
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
  const [selectedFaultIds, setSelectedFaultIds] = useState<string[]>([])
  const [assigneeId, setAssigneeId] = useState((assignees || [])[0]?.user_id || '')
  const [date, setDate] = useState(defaultDate || getTodayStr())
  const [notes, setNotes] = useState('')

  // Đồng bộ kỹ sư khi danh sách assignees tải xong từ API
  useEffect(() => {
    if (!assigneeId && assignees && assignees.length > 0) {
      setAssigneeId(assignees[0].user_id || '')
    }
  }, [assignees, assigneeId])

  // Đồng bộ ngày khi mở modal từ ô lịch hoặc nút tạo mới
  useEffect(() => {
    if (isOpen) {
      const todayStr = getTodayStr()
      const effectiveDate = defaultDate && defaultDate >= todayStr ? defaultDate : todayStr
      setDate(effectiveDate)
    }
  }, [defaultDate, isOpen])

  // Reset khi đổi tuyến đường hoặc giai đoạn
  useEffect(() => {
    setSelectedPoleIds([])
    setSelectedFaultIds([])
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

    if (initPhase === 'repair' && selectedFaultIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 01 sự cố cần sửa chữa trên tuyến này!')
      return
    }

    const selectedAssignee = assignees.find((a) => a.user_id === assigneeId)
    const assigneeName = selectedAssignee?.full_name ? selectedAssignee.full_name.split(' (')[0] : 'Kỹ sư hiện trường'

    // Xây dựng tiêu đề và ghi chú thông minh
    let effectiveTitle = title.trim()
    let effectiveNotes = notes.trim()
    const segmentShortName = segment.split(' (')[0]

    if (initPhase === 'inspection') {
      if (selectedPoleIds.length > 0) {
        if (!effectiveTitle) {
          effectiveTitle = `Kiểm tra cột ${selectedPoleIds.join(', ')} - ${segmentShortName}`
        }
        const poleNote = `[Chỉ định kiểm tra trọng tâm]: ${selectedPoleIds.join(', ')}`
        effectiveNotes = effectiveNotes ? `${effectiveNotes}\n${poleNote}` : poleNote
      } else {
        if (!effectiveTitle) {
          effectiveTitle = `Kiểm tra toàn tuyến ${segmentShortName}`
        }
      }
    } else if (initPhase === 'repair') {
      if (!effectiveTitle) {
        effectiveTitle = `Sửa chữa cột ${selectedPoleIds.join(', ')} - ${segmentShortName}`
      }
    } else {
      if (!effectiveTitle) {
        effectiveTitle = `Khảo sát đêm tuyến ${segmentShortName}`
      }
    }

    onSubmit({
      title: effectiveTitle,
      segment,
      initPhase,
      assigneeId,
      assigneeName,
      date,
      notes: effectiveNotes,
      poleIds: selectedPoleIds,
      faultIds: selectedFaultIds,
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

            {/* 1. Với Khảo sát: Áp dụng toàn tuyến */}
            {initPhase === 'survey' && (
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 flex items-center gap-2">
                <span className="font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">Khảo sát đêm:</span>
                <span>Thu thập dữ liệu đo lux và video trên toàn bộ tuyến đường đã chọn.</span>
              </div>
            )}

            {/* 2. Với Kiểm tra: Chọn cột đèn có sự cố trên tuyến */}
            {initPhase === 'inspection' && (
              <PoleSelector
                segmentStr={segment}
                selectedPoleIds={selectedPoleIds}
                onChange={(poleIds, faultIds) => {
                  setSelectedPoleIds(poleIds)
                  if (faultIds) setSelectedFaultIds(faultIds)
                }}
                taskKindName="Kiểm tra"
                allowEmpty={false}
              />
            )}

            {/* 3. Với Sửa chữa: Chọn cột đèn có sự cố trên tuyến */}
            {initPhase === 'repair' && (
              <PoleSelector
                segmentStr={segment}
                selectedPoleIds={selectedPoleIds}
                onChange={(poleIds, faultIds) => {
                  setSelectedPoleIds(poleIds)
                  if (faultIds) setSelectedFaultIds(faultIds)
                }}
                taskKindName="Sửa chữa"
                allowEmpty={false}
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
                {assignees.length === 0 ? (
                  <option value="">Chưa có kỹ sư thuộc địa bàn này</option>
                ) : (
                  assignees.map((a) => (
                    <option key={a.user_id || ''} value={a.user_id || ''}>
                      {a.full_name || a.user_id || ''}
                    </option>
                  ))
                )}
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
