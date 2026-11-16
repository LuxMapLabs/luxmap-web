import React, { useState } from 'react'
import { X, Send, Video, Search, Wrench, FileText } from 'lucide-react'
import type { ScheduleCase } from '../../../feature/work-schedule/workScheduleSlice'

interface EngineerReportModalProps {
  isOpen: boolean
  caseItem: ScheduleCase | null
  onClose: () => void
  onSubmit: (payload: {
    code: string
    summary: string
    suggestedMaterialsNote?: string
    usedMaterialsNote?: string
    luxMeasured?: string
  }) => void
}

export const EngineerReportModal: React.FC<EngineerReportModalProps> = ({
  isOpen,
  caseItem,
  onClose,
  onSubmit,
}) => {
  const [summary, setSummary] = useState('')
  const [suggestedMaterialsNote, setSuggestedMaterialsNote] = useState('')
  const [usedMaterialsNote, setUsedMaterialsNote] = useState('')
  const [luxMeasured, setLuxMeasured] = useState('')

  if (!isOpen || !caseItem) return null

  const currentPhase = caseItem.phases[caseItem.currentPhaseIndex]
  if (!currentPhase) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      code: caseItem.code,
      summary: summary.trim() || 'Kỹ sư hiện trường đã hoàn thành nhiệm vụ theo quy trình.',
      suggestedMaterialsNote:
        currentPhase.phaseType === 'inspection' ? suggestedMaterialsNote : undefined,
      usedMaterialsNote: currentPhase.phaseType === 'repair' ? usedMaterialsNote : undefined,
      luxMeasured: currentPhase.phaseType === 'inspection' ? luxMeasured : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Send className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Nộp Báo Cáo Hiện Trường [{caseItem.code}]
              </h3>
              <p className="text-xs text-slate-500 font-medium">{currentPhase.name}</p>
            </div>
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
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Phase 1: Survey Form */}
          {currentPhase.phaseType === 'survey' && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <Video className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                Ảnh chụp và video quét thực địa được đồng bộ trực tiếp từ ứng dụng di động của kỹ sư hiện trường.
              </div>
            </div>
          )}

          {/* Phase 2: Inspection Form */}
          {currentPhase.phaseType === 'inspection' && (
            <>
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                <Search className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>Kiểm tra đo đạc luxmeter và đề xuất danh mục vật tư cần mang theo sửa chữa.</div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Kết quả đo Lux thực tế:</label>
                <input
                  type="text"
                  value={luxMeasured}
                  onChange={(e) => setLuxMeasured(e.target.value)}
                  placeholder="Ví dụ: 12 Lux hoặc 0 Lux (Mất sáng hoàn toàn)..."
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Ô GHI CHÚ VẬT TƯ ĐỀ XUẤT - TỰ DO NHẬP */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Ghi chú thiết bị & vật tư đề xuất thay thế (Kỹ sư tự do nhập):
                </label>
                <textarea
                  rows={2}
                  value={suggestedMaterialsNote}
                  onChange={(e) => setSuggestedMaterialsNote(e.target.value)}
                  placeholder="Nhập ghi chú vật tư cần mang theo..."
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Phase 3: Repair Form */}
          {currentPhase.phaseType === 'repair' && (
            <>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                <Wrench className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>Báo cáo hoàn tất sửa chữa kèm danh mục vật tư đã sử dụng thực tế.</div>
              </div>

              {/* Ô GHI CHÚ VẬT TƯ THỰC TẾ ĐÃ DÙNG - TỰ DO NHẬP */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Ghi chú thiết bị & vật tư thực tế đã sử dụng (Kỹ sư tự do nhập):
                </label>
                <textarea
                  rows={2}
                  value={usedMaterialsNote}
                  onChange={(e) => setUsedMaterialsNote(e.target.value)}
                  placeholder="Nhập ghi chú vật tư thực tế đã thay thế..."
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </>
          )}

          {/* Tóm tắt chung */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Tóm tắt nghiệm thu / phát hiện của Kỹ sư (*):
            </label>
            <textarea
              rows={3}
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Mô tả kết quả công việc hiện trường..."
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi báo cáo lên quản lý</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
