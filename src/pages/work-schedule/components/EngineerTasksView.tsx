import React from 'react'
import { FileEdit, CheckCircle, MapPin, Calendar, Zap } from 'lucide-react'
import { ScheduleCase } from '../../../types/workSchedule'

interface EngineerTasksViewProps {
  cases: ScheduleCase[]
  currentEngineerId?: string
  onOpenReportModal: (code: string) => void
}

export const EngineerTasksView: React.FC<EngineerTasksViewProps> = ({
  cases,
  currentEngineerId = '',
  onOpenReportModal,
}) => {
  // Lọc các vụ việc mà phase đang active được giao cho kỹ sư này
  const myTasks = cases
    .filter((sc) => !sc.isTerminated)
    .map((sc) => {
      const activePhase = sc.phases[sc.currentPhaseIndex]
      return {
        caseItem: sc,
        phase: activePhase,
      }
    })
    .filter((item) => item.phase && item.phase.assigneeId === currentEngineerId)

  return (
    <div className="flex flex-col gap-4">
      {/* Banner kỹ sư */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-amber-900 text-sm">
            Bảng Nhiệm Vụ Hiện Trường (Field Crew)
          </h3>
          <p className="text-xs text-amber-700 mt-0.5">
            Các lịch công tác được Quản lý phân công đến bạn. Nộp báo cáo sau khi hoàn tất khảo sát/kiểm tra/sửa chữa.
          </p>
        </div>
        <div className="px-3 py-1.5 bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-xs">
          {myTasks.filter((t) => t.phase.status === 'pending').length} việc cần làm
        </div>
      </div>

      {/* Danh sách nhiệm vụ */}
      {myTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
          Bạn chưa có nhiệm vụ nào cần thực hiện hôm nay.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myTasks.map(({ caseItem, phase }) => {
            const isPending = phase.status === 'pending'

            let phaseBadge = 'bg-amber-100 text-amber-800'
            if (phase.phaseType === 'inspection') phaseBadge = 'bg-blue-100 text-blue-800'
            if (phase.phaseType === 'repair') phaseBadge = 'bg-emerald-100 text-emerald-800'

            return (
              <div
                key={caseItem.code}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between gap-4 hover:shadow-md transition"
              >
                <div className="flex flex-col gap-2.5">
                  {/* Dòng mã và trạng thái */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-blue-600 text-xs tracking-tight">
                      {caseItem.code}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${phaseBadge}`}>
                      {phase.name}
                    </span>
                  </div>

                  {/* Tiêu đề */}
                  <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
                    {caseItem.title}
                  </h4>

                  {/* Metadata */}
                  <div className="flex flex-col gap-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {caseItem.segment}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Ngày thực hiện: {phase.date}
                    </span>
                  </div>

                  {/* Vị trí cột đèn cần tác nghiệp (đặc thù cho Kiểm tra hoặc Sửa chữa) */}
                  {phase.phaseType !== 'survey' && (phase.poleIds?.length || caseItem.poleIds?.length) ? (
                    <div className="p-2.5 bg-amber-50/80 border border-amber-200/90 rounded-xl flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-600" />
                          Vị trí cột cần {phase.phaseType === 'repair' ? 'sửa chữa' : 'kiểm tra'} ({phase.poleIds?.length || caseItem.poleIds?.length} cột):
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                        {(phase.poleIds || caseItem.poleIds || []).map((pId) => (
                          <span
                            key={pId}
                            className="px-2 py-0.5 bg-white border border-amber-300 text-amber-950 font-mono text-[11px] font-bold rounded-md shadow-2xs"
                          >
                            {pId}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Chỉ đạo kỹ thuật */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                    <strong>Chỉ đạo của Quản lý:</strong>{' '}
                    {phase.notes || 'Thực hiện nghiêm túc quy chuẩn an toàn.'}
                  </div>
                </div>

                {/* Footer action button */}
                <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                  {isPending ? (
                    <button
                      type="button"
                      onClick={() => onOpenReportModal(caseItem.code)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer active:scale-95"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Nộp Báo Cáo Giai Đoạn Này</span>
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200">
                      <CheckCircle className="w-3.5 h-3.5 text-sky-600" />
                      Đã nộp báo cáo — Chờ Quản lý duyệt
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
