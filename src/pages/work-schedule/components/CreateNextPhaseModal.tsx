import React, { useState, useEffect } from 'react'
import { X, CheckCircle, Wrench, Search, Calendar, User, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { TaskKind, WorkOrderAssignee } from '../../../types/workSchedule'
import { PoleSelector } from './PoleSelector'
import { getPolesBySegment } from '../../../feature/work-schedule/poleUtils'

interface CreateNextPhaseModalProps {
  isOpen: boolean
  caseCode: string
  segment?: string
  defaultPoleIds?: string[]
  targetNextPhaseType: 'inspection' | 'repair'
  assignees: WorkOrderAssignee[]
  onClose: () => void
  onSubmit: (payload: {
    code: string
    nextPhaseType: TaskKind
    date: string
    assigneeId: string
    assigneeName: string
    materialsNote?: string
    notes?: string
    poleIds?: string[]
  }) => void
}

const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const CreateNextPhaseModal: React.FC<CreateNextPhaseModalProps> = ({
  isOpen,
  caseCode,
  segment = 'Tuyến A - Trục chính liên xã Phước Hậu (SEG-001)',
  defaultPoleIds = [],
  targetNextPhaseType,
  assignees,
  onClose,
  onSubmit,
}) => {
  const [assigneeId, setAssigneeId] = useState((assignees || [])[0]?.user_id || 'USR-004')
  const [date, setDate] = useState(getTodayStr())
  const [selectedPoleIds, setSelectedPoleIds] = useState<string[]>(defaultPoleIds)
  const [materialsNote, setMaterialsNote] = useState(
    '02 bóng LED 100W Rạng Đông, 01 aptomat 16A, 01 cuộn cáp mạ kẽm'
  )
  const [notes, setNotes] = useState('Thực hiện đúng quy chuẩn an toàn lao động và đo kiểm ban đêm.')

  useEffect(() => {
    if (isOpen) {
      setDate(getTodayStr())
      if (defaultPoleIds && defaultPoleIds.length > 0) {
        setSelectedPoleIds(defaultPoleIds)
      } else {
        const poles = getPolesBySegment(segment)
        if (poles.length > 0) {
          // Gợi ý chọn sẵn cột đầu tiên
          setSelectedPoleIds([poles[0].poleId])
        }
      }
    }
  }, [isOpen, segment, defaultPoleIds])

  if (!isOpen) return null

  const isRepair = targetNextPhaseType === 'repair'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedPoleIds.length === 0) {
      toast.warning(
        `Vui lòng chọn ít nhất 01 cột đèn cần ${isRepair ? 'sửa chữa' : 'kiểm tra'}!`
      )
      return
    }

    const selectedAssignee = assignees.find((a) => a.user_id === assigneeId)
    const assigneeName = selectedAssignee?.full_name ? selectedAssignee.full_name.split(' (')[0] : 'Khang Lê'

    onSubmit({
      code: caseCode,
      nextPhaseType: targetNextPhaseType,
      date,
      assigneeId,
      assigneeName,
      materialsNote: isRepair ? materialsNote : undefined,
      notes,
      poleIds: selectedPoleIds,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span
              className={`p-2 rounded-xl ${isRepair ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                }`}
            >
              {isRepair ? <Wrench className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
              Mở Giai Đoạn {isRepair ? '3: Sửa Chữa' : '2: Kiểm Tra'} [{caseCode}]
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

        {/* Form Body với thân cuộn mượt mà và footer cố định */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {/* Banner nguyên tắc tự đóng */}
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                Tiến trình cũ sẽ tự động <strong>chốt hoàn tất</strong>. Giữ nguyên mã{' '}
                <strong className="font-mono text-blue-700">{caseCode}</strong> và kế thừa toàn bộ hồ
                sơ cho giai đoạn mới.
              </div>
            </div>

            {/* Tuyến đường của sự vụ */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Tuyến đường:</label>
              <div className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-semibold text-slate-800">
                {segment}
              </div>
            </div>

            {/* Chọn cột đèn cần tác nghiệp */}
            <PoleSelector
              segmentStr={segment}
              selectedPoleIds={selectedPoleIds}
              onChange={setSelectedPoleIds}
              taskKindName={isRepair ? 'Sửa chữa' : 'Kiểm tra'}
            />

            {/* Chọn Kỹ sư */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Kỹ sư hiện trường phụ trách giai đoạn này (*):
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
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Ngày thực hiện (*):
              </label>
              <input
                type="date"
                min={getTodayStr()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* GHI CHÚ VẬT TƯ (NẾU LÀ SỬA CHỮA) - QUẢN LÝ TỰ NHẬP */}
            {isRepair && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                  Ghi chú thiết bị & vật tư mang theo (Quản lý tự do nhập):
                </label>
                <textarea
                  rows={2}
                  value={materialsNote}
                  onChange={(e) => setMaterialsNote(e.target.value)}
                  placeholder="Ví dụ: 02 bóng LED 100W Rạng Đông, 01 aptomat 16A..."
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Ghi chú kỹ thuật */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Ghi chú kỹ thuật:
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú kỹ thuật hoặc lưu ý an toàn..."
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Modal Footer - Cố định ở đáy modal */}
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
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition cursor-pointer active:scale-98 ${isRepair ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              ✓ Mở giai đoạn tiếp theo
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
