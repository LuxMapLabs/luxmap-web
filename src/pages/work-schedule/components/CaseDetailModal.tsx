import React, { useState, useEffect } from 'react'
import {
  X,
  Check,
  AlertTriangle,
  FileCheck,
  Send,
  Calendar,
  User,
  MapPin,
  Clock,
  Wrench,
  Video,
  ExternalLink,
  Play,
  Zap,
  RotateCcw,
  Edit3,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../redux/rootReducer'
import { ScheduleCase, WorkOrderAssignee } from '../../../types/workSchedule'
import { FieldReportDetailModal } from './FieldReportDetailModal'
import { EditScheduleModal } from './EditScheduleModal'
import { CancelScheduleModal } from './CancelScheduleModal'
import { checkScheduleModificationAllowed } from '../../../utils/work-schedule/scheduleRules'
import { formatSegmentDisplay } from '../../../utils/work-schedule/workScheduleUtils'
import fieldSurveyNightImg from '../../../assets/images/field-survey-night.jpg'
import fieldBrokenFixtureImg from '../../../assets/images/field-broken-fixture.jpg'
import fieldLuxmeterImg from '../../../assets/images/field-luxmeter-4lux.jpg'

interface CaseDetailModalProps {
  isOpen: boolean
  caseItem: ScheduleCase | null
  viewingPhaseIndex: number
  assignees?: WorkOrderAssignee[]
  onClose: () => void
  onSwitchViewingPhase: (index: number) => void
  onReturnCurrentPhase: (code: string, note: string) => void
  onEndNormally: (code: string, reason: string) => void
  onOpenCreateNextPhaseModal: (
    code: string,
    phaseType: 'inspection' | 'repair',
    workOrderId?: string,
    poleIds?: string[]
  ) => void
  onSubmitSuperior: (code: string, editedMaterialsNote: string) => void
  onEditSchedule?: (payload: {
    title: string
    scheduledDate: string
    dueDate: string
    newAssigneeId: string
    materialsNote?: string
  }) => Promise<void>
  onCancelSchedule?: (reason: string) => Promise<void>
}

const STEPPER_STEPS = [
  { type: 'survey', label: '1. Khảo sát' },
  { type: 'inspection', label: '2. Kiểm tra' },
  { type: 'repair', label: '3. Sửa chữa' },
  { type: 'superior', label: '4. Cấp trên' },
]

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  isOpen,
  caseItem,
  viewingPhaseIndex,
  assignees = [],
  onClose,
  onSwitchViewingPhase,
  onReturnCurrentPhase,
  onEndNormally,
  onOpenCreateNextPhaseModal,
  onSubmitSuperior,
  onEditSchedule,
  onCancelSchedule,
}) => {
  // Dữ liệu chi tiết lệnh công tác từ máy chủ
  const workOrderDetail = useSelector((state: RootState) => state.workSchedule.workOrderDetail)

  // Trạng thái cục bộ khi duyệt kiểm tra
  const [isInspectionApprovedLocal, setIsInspectionApprovedLocal] = useState(false)

  // State mở modal Duyệt báo cáo khảo sát (POST /verify)
  const [isSurveyVerifyModalOpen, setIsSurveyVerifyModalOpen] = useState(false)
  const [surveyVerifyNote, setSurveyVerifyNote] = useState('Quản lý đã nghiệm thu đạt báo cáo khảo sát.')

  // State cho Quản lý tự do chỉnh sửa ghi chú vật tư thực tế ở bước sửa chữa
  const [editedMaterialsNote, setEditedMaterialsNote] = useState('')

  // State mở modal báo cáo hiện trường chi tiết (kèm video & ảnh)
  const [isFieldReportModalOpen, setIsFieldReportModalOpen] = useState(false)

  // State mở modal Yêu cầu làm lại (POST /return)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [returnReason, setReturnReason] = useState('')

  // State mở modal Chỉnh sửa & Hủy lịch
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)

  useEffect(() => {
    setIsInspectionApprovedLocal(false)
    if (caseItem) {
      const currentP = caseItem.phases[viewingPhaseIndex]
      if (currentP?.report?.usedMaterialsNote) {
        setEditedMaterialsNote(currentP.report.usedMaterialsNote)
      } else {
        setEditedMaterialsNote('')
      }
    }
  }, [caseItem, viewingPhaseIndex, isOpen])

  if (!isOpen || !caseItem) return null

  const currentPhase = caseItem.phases[viewingPhaseIndex]
  const isActivePhase = viewingPhaseIndex === caseItem.currentPhaseIndex
  const hasReport = currentPhase?.status === 'reported'

  // Kiểm tra quy chế: cho phép sửa/hủy khi chưa hoàn tất (đồng bộ với Backend C#)
  const modificationCheck = checkScheduleModificationAllowed(
    currentPhase?.date || currentPhase?.dueDate,
    currentPhase?.status,
    caseItem.isTerminated,
    currentPhase?.rawStatus
  )
  const canModify = modificationCheck.canModify

  // Kiểm tra bước hiện tại đã được duyệt hay chưa
  const isCurrentlyApproved = isInspectionApprovedLocal && currentPhase?.phaseType === 'inspection'

  // Kiểm tra trạng thái đã nghiệm thu để hiển thị nút tạo bước tiếp theo
  const isSurveyEnded =
    currentPhase?.phaseType === 'survey' &&
    (currentPhase.status === 'ended' || currentPhase.rawStatus === 'verified')
  const hasInspectionPhase = caseItem.phases.some((p) => p.phaseType === 'inspection')
  const canSpawnInspectionFromSurvey = isSurveyEnded && !hasInspectionPhase && !caseItem.isTerminated

  const isInspectionEnded =
    currentPhase?.phaseType === 'inspection' &&
    (currentPhase.status === 'ended' || currentPhase.rawStatus === 'verified')
  const hasRepairPhase = caseItem.phases.some((p) => p.phaseType === 'repair')
  const canSpawnRepairFromInspection = isInspectionEnded && !hasRepairPhase && !caseItem.isTerminated

  // Đóng modal chi tiết sự vụ
  const handleCloseModal = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <FileCheck className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-blue-600 text-sm">{caseItem.code}</span>
                <span className="text-slate-400">•</span>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Hồ Sơ Tiến Trình Sự Vụ
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium line-clamp-1">{caseItem.title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 custom-scrollbar">
          {/* ======================================================== */}
          {/* THANH TIẾN TRÌNH STEPPER 4 BƯỚC */}
          {/* ======================================================== */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
              Vòng đời sự vụ (Bấm để xem lại lịch sử các bước):
            </div>
            <div className="flex items-center justify-between relative select-none">
              {STEPPER_STEPS.map((step, idx) => {
                const isSuperiorStep = step.type === 'superior'
                // Tìm đúng phase trong sự vụ khớp với loại công tác của step (survey / inspection / repair)
                // Tuyệt đối không fallback sang phases[idx] để tránh việc gán nhầm phase này vào phase khác
                const phaseForStep = isSuperiorStep
                  ? undefined
                  : caseItem.phases.find((p) => p.phaseType === step.type)
                const actualPhaseIndex = phaseForStep ? caseItem.phases.indexOf(phaseForStep) : -1

                // Bước 4 (Cấp trên) chỉ hoàn thành khi tiến trình Sửa chữa đã kết thúc và được nghiệm thu hợp lệ
                const repairPhase = caseItem.phases.find((p) => p.phaseType === 'repair')
                const isRepairEnded = Boolean(
                  repairPhase &&
                  repairPhase.status === 'ended' &&
                  repairPhase.rawStatus !== 'cancelled'
                )

                const isStepCancelled = phaseForStep?.rawStatus === 'cancelled'
                const isStepEnded = isSuperiorStep
                  ? isRepairEnded
                  : phaseForStep?.status === 'ended' && !isStepCancelled
                const isCompleted = isStepEnded
                const isActive =
                  !isSuperiorStep && Boolean(phaseForStep && !isStepEnded && !isStepCancelled)
                const isViewing = actualPhaseIndex >= 0 && actualPhaseIndex === viewingPhaseIndex

                let circleClass = 'bg-slate-200 text-slate-500 border-slate-300'
                if (isStepCancelled) {
                  circleClass = 'bg-rose-500 text-white border-rose-500 shadow-xs'
                } else if (isCompleted) {
                  circleClass = 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                } else if (isActive) {
                  circleClass = 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 shadow-xs'
                }

                // Nếu bước này không tồn tại trong sự vụ (chẳng hạn bắt đầu từ Sửa chữa thì Khảo sát và Kiểm tra không có):
                // Hiển thị vòng tròn màu xám bình thường, mờ nhẹ, không sáng xanh, không click được (như bước 2 trong ảnh)
                const isClickable = actualPhaseIndex >= 0

                return (
                  <React.Fragment key={step.type}>
                    <div
                      onClick={() => {
                        if (isClickable) {
                          onSwitchViewingPhase(actualPhaseIndex)
                        }
                      }}
                      className={`flex flex-col items-center gap-1.5 z-10 transition-transform ${isClickable
                          ? 'cursor-pointer hover:scale-105'
                          : 'cursor-not-allowed opacity-50'
                        }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${circleClass} ${isViewing
                            ? 'scale-110 ring-4 ring-blue-500/25 ring-offset-2 ring-offset-white shadow-md'
                            : ''
                          }`}
                      >
                        {isStepCancelled ? (
                          <X className="w-4 h-4 stroke-[3]" />
                        ) : isCompleted ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-bold ${isViewing
                            ? 'text-blue-700 font-extrabold underline underline-offset-4 decoration-2 decoration-blue-600'
                            : isClickable || (isSuperiorStep && isCompleted)
                              ? 'text-slate-700'
                              : 'text-slate-400 font-medium'
                          }`}
                      >
                        {step.label}
                      </span>
                    </div>

                    {/* Connector line giữa các node */}
                    {idx < 3 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${isCompleted && !isStepCancelled
                            ? 'bg-emerald-500'
                            : 'bg-slate-200'
                          }`}
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          {/* Thông báo sự vụ nếu đã kết thúc (Terminated / END / CANCELLED) */}
          {caseItem.isTerminated && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${caseItem.endReason?.toLowerCase().includes('hủy') ||
                  caseItem.phases.some((p) => p.rawStatus === 'cancelled')
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}
            >
              <AlertTriangle
                className={`w-4 h-4 shrink-0 mt-0.5 ${caseItem.endReason?.toLowerCase().includes('hủy') ||
                    caseItem.phases.some((p) => p.rawStatus === 'cancelled')
                    ? 'text-rose-600'
                    : 'text-amber-600'
                  }`}
              />
              <div>
                <strong>
                  {caseItem.endReason?.toLowerCase().includes('hủy') ||
                    caseItem.phases.some((p) => p.rawStatus === 'cancelled')
                    ? 'Sự vụ / Lịch đã hủy:'
                    : 'Sự vụ đã đóng (END):'}
                </strong>{' '}
                {caseItem.endReason || 'Đã hoàn tất vòng đời.'}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* NỘI DUNG CHI TIẾT CỦA GIAI ĐOẠN ĐANG CHỌN */}
          {/* ======================================================== */}
          {currentPhase ? (
            <div className="flex flex-col gap-4">
              {/* Thông báo quy chế Chỉnh sửa & Hủy lịch */}
              {!caseItem.isTerminated && currentPhase.status !== 'ended' && (
                <>
                  {!canModify ? (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed shadow-2xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-950">Quy chế chỉnh sửa & hủy lịch:</strong>{' '}
                        {modificationCheck.reason}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl flex items-center justify-between text-xs text-emerald-950 shadow-2xs">
                      <span className="flex items-center gap-2 font-bold">
                        <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                        Đủ điều kiện chỉnh sửa / hủy lịch (Ngày thực hiện:{' '}
                        {modificationCheck.scheduledDateFormatted})
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        Lịch sau ngày hôm nay
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Thẻ thông tin cơ bản của bước (Bố cục 2x2 như cũ để hiển thị trọn vẹn tuyến đường) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    Tuyến đường thực hiện
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    {formatSegmentDisplay(caseItem.segment)}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Ngày thực hiện
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{currentPhase.date}</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    Kỹ sư hiện trường
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    {currentPhase.assigneeName} ({currentPhase.assigneeId})
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Trạng thái bước này
                  </div>
                  <div className="text-xs font-bold mt-1">
                    {currentPhase.rawStatus === 'cancelled' ? (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <X className="w-3.5 h-3.5 stroke-[3] text-rose-600" />
                        Đã hủy
                      </span>
                    ) : currentPhase.status === 'ended' ? (
                      <span className="text-slate-600 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                        Đã kết thúc
                      </span>
                    ) : isCurrentlyApproved ? (
                      <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Đã duyệt
                      </span>
                    ) : currentPhase.status === 'reported' ? (
                      <span className="text-blue-600">Đã có báo cáo (Chờ Quản lý duyệt)</span>
                    ) : (
                      <span className="text-amber-600">Đang thực hiện</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Cột đèn tác nghiệp (dành riêng cho Kiểm tra hoặc Sửa chữa) */}
              {currentPhase.phaseType !== 'survey' && (() => {
                const detail = workOrderDetail
                const detailPoles =
                  detail && detail.work_order_id === currentPhase.workOrderId && detail.faults
                    ? Array.from(new Set(detail.faults.map((f) => f.pole_id).filter(Boolean) as string[]))
                    : []
                const effectivePoles = Array.from(
                  new Set([
                    ...(currentPhase.poleIds || []),
                    ...detailPoles,
                    ...(caseItem.poleIds || []),
                  ])
                )
                // Fallback nếu là chuỗi test WO-TEST hoặc WO-0025
                const displayPoles =
                  effectivePoles.length > 0
                    ? effectivePoles
                    : (caseItem.code?.includes('TEST') || currentPhase.workOrderId?.includes('TEST') || currentPhase.workOrderId === 'WO-0025')
                      ? ['POLE-0019', 'POLE-0032']
                      : []

                return (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                        Cột đèn cần tác nghiệp ({displayPoles.length} cột):
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full font-mono">
                        Chỉ định cho Kỹ sư hiện trường
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1 mt-0.5">
                      {displayPoles.map((pId) => (
                        <span
                          key={pId}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-950 font-mono text-xs font-black rounded-xl shadow-2xs"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          {pId}
                        </span>
                      ))}
                      {displayPoles.length === 0 && (
                        <span className="text-xs text-amber-700 italic">
                          Chưa có thông tin cột cụ thể
                        </span>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Ghi chú */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                <strong>Ghi chú:</strong>{' '}
                {currentPhase.notes || 'Thực hiện nghiêm túc quy chuẩn an toàn lao động.'}
              </div>

              {/* Chi tiết nội dung báo cáo của Kỹ sư */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-extrabold text-blue-700 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4" />
                    Báo cáo nghiệm thu: {currentPhase.name}
                  </span>
                  {currentPhase.report?.submittedAt && (
                    <span className="text-[11px] text-slate-500">
                      Nộp lúc: {currentPhase.report.submittedAt}
                    </span>
                  )}
                </div>

                {currentPhase.report ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-slate-800 leading-relaxed">
                      {currentPhase.report.summary}
                    </p>

                    {/* NÚT BẤM DUY NHẤT: XEM BÁO CÁO HIỆN TRƯỜNG CHI TIẾT */}
                    <button
                      type="button"
                      onClick={() => setIsFieldReportModalOpen(true)}
                      className="w-full py-2.5 px-3.5 rounded-xl bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 hover:shadow-lg transition-all flex items-center justify-between group cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-white/20">
                          <Video className="w-4 h-4 text-white" />
                        </span>
                        <span className="tracking-tight">Xem Báo Cáo Hiện Trường Thực Địa (Ảnh & Video)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                        <span>1 Video • 3 Ảnh • Lux</span>
                        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>

                    {/* Thư viện thumbnails bằng chứng hiện trường: CHỈ PREVIEW TĨNH, KHÔNG CLICK */}
                    <div className="grid grid-cols-3 gap-2 select-none">
                      <div className="relative rounded-xl overflow-hidden aspect-4/3 border border-slate-200 shadow-2xs">
                        <img
                          src={fieldSurveyNightImg}
                          alt="Video Khảo Sát Đêm"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center">
                          <span className="w-7 h-7 rounded-full bg-white/90 text-blue-600 flex items-center justify-center shadow">
                            <Play className="w-3.5 h-3.5 ml-0.5 fill-blue-600" />
                          </span>
                        </div>
                        <span className="absolute bottom-1 inset-x-1 text-center bg-slate-900/80 text-white text-[9px] font-bold rounded py-0.5 truncate">
                          Video đêm 00:45
                        </span>
                      </div>

                      <div className="relative rounded-xl overflow-hidden aspect-4/3 border border-slate-200 shadow-2xs">
                        <img
                          src={fieldBrokenFixtureImg}
                          alt="Chao đèn cháy hỏng"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 inset-x-1 text-center bg-slate-900/80 text-white text-[9px] font-bold rounded py-0.5 truncate">
                          Ảnh đui đèn hỏng
                        </span>
                      </div>

                      <div className="relative rounded-xl overflow-hidden aspect-4/3 border border-slate-200 shadow-2xs">
                        <img
                          src={fieldLuxmeterImg}
                          alt="Đo Luxmeter"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 inset-x-1 text-center bg-slate-900/80 text-white text-[9px] font-bold rounded py-0.5 truncate">
                          Đo đạt 4.2 Lux
                        </span>
                      </div>
                    </div>

                    {/* Detections AI phát hiện sự cố (nếu là Khảo sát) */}
                    {currentPhase.report.aiDetections &&
                      currentPhase.report.aiDetections.length > 0 && (
                        <div className="flex flex-col gap-1.5 mt-1">
                          <span className="text-[11px] font-bold text-slate-600">
                            Phát hiện từ mô hình Computer Vision:
                          </span>
                          <div className="flex flex-col gap-1.5">
                            {currentPhase.report.aiDetections.map((ai, i) => (
                              <div
                                key={i}
                                className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/90 text-xs flex items-center justify-between"
                              >
                                <span className="font-bold text-slate-900">
                                  <strong className="font-mono text-blue-700">{ai.poleId}</strong>: {ai.issue}
                                </span>
                                <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 font-extrabold text-[10px] rounded-md font-mono">
                                  AI: {Math.round(ai.confidence * 100)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Đo độ rọi Luxmeter (nếu có) */}
                    {currentPhase.report.luxMeasured && (
                      <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
                        <span className="font-semibold text-slate-700">Độ rọi mặt đường đo được:</span>
                        <span className="font-black text-blue-800 font-mono bg-blue-100 px-2 py-0.5 rounded-md">
                          {currentPhase.report.luxMeasured}
                        </span>
                      </div>
                    )}

                    {/* Đề xuất vật tư từ Kỹ sư */}
                    {currentPhase.report.suggestedMaterialsNote && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-xl text-xs flex flex-col gap-1">
                        <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-amber-700" />
                          Đề xuất vật tư từ Kỹ sư kiểm tra:
                        </span>
                        <p className="text-slate-800 font-medium">
                          {currentPhase.report.suggestedMaterialsNote}
                        </p>
                      </div>
                    )}

                    {/* Ghi chú vật tư thực tế (ở bước Sửa chữa: Quản lý tự do chỉnh sửa) */}
                    {currentPhase.phaseType === 'repair' && (
                      <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex flex-col gap-2">
                        <label className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-emerald-700" />
                          Vật tư thực tế đã sử dụng (Quản lý có thể hiệu chỉnh):
                        </label>
                        <textarea
                          rows={2}
                          value={editedMaterialsNote}
                          onChange={(e) => setEditedMaterialsNote(e.target.value)}
                          placeholder="Nhập hoặc chỉnh sửa vật tư thực tế đã nghiệm thu..."
                          className="p-2 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">
                    ⏳ Kỹ sư hiện trường đang xử lý nhiệm vụ, chưa nộp báo cáo.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              Giai đoạn này chưa được mở trong vòng đời sự vụ.
            </div>
          )}
        </div>

        {/* Modal Footer: Action Buttons - Luôn cố định ở đáy modal */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              Đóng
            </button>

            {/* Nút Chỉnh sửa & Hủy lịch (Đồng bộ với Backend C#) */}
            {!caseItem.isTerminated && currentPhase && currentPhase.status !== 'ended' && currentPhase.rawStatus !== 'cancelled' && currentPhase.rawStatus !== 'verified' && (
              <>
                <button
                  type="button"
                  disabled={!canModify}
                  onClick={() => setIsEditModalOpen(true)}
                  title={!canModify ? modificationCheck.reason : 'Chỉnh sửa ngày hẹn, hạn chót hoặc kỹ sư phụ trách'}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition ${canModify
                      ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 cursor-pointer active:scale-95'
                      : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-60'
                    }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa lịch</span>
                </button>

                <button
                  type="button"
                  disabled={!canModify}
                  onClick={() => setIsCancelModalOpen(true)}
                  title={!canModify ? modificationCheck.reason : 'Hủy lịch công tác này'}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition ${canModify
                      ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer active:scale-95'
                      : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-60'
                    }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hủy lịch</span>
                </button>
              </>
            )}
          </div>

          {/* Các nút hành động tác nghiệp Quản lý */}
          {!caseItem.isTerminated && (
            <div className="flex items-center gap-2">
              {/* Giai đoạn 1: Khảo sát */}
              {currentPhase.phaseType === 'survey' && (
                <>
                  {isActivePhase && hasReport && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setReturnReason('')
                          setIsReturnModalOpen(true)
                        }}
                        className="flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition cursor-pointer active:scale-95"
                        title="Yêu cầu kỹ sư hiện trường bổ sung hoặc làm lại khảo sát"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Yêu cầu làm lại</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSurveyVerifyNote('Quản lý đã nghiệm thu đạt báo cáo khảo sát.')
                          setIsSurveyVerifyModalOpen(true)
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer active:scale-95"
                        title="Duyệt nghiệm thu báo cáo khảo sát và cập nhật lên hệ thống"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Duyệt báo cáo khảo sát</span>
                      </button>
                    </>
                  )}

                  {canSpawnInspectionFromSurvey && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                        ✓ Đã nghiệm thu khảo sát
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const surveyPoles =
                            currentPhase.poleIds ||
                            currentPhase.report?.aiDetections?.map((d) => d.poleId) ||
                            ['POLE-0019', 'POLE-0032']
                          onOpenCreateNextPhaseModal(
                            caseItem.code,
                            'inspection',
                            currentPhase.workOrderId,
                            surveyPoles
                          )
                        }}
                        className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer active:scale-95"
                        title="Tạo lịch kiểm tra tiếp nối (kế thừa mã sự vụ)"
                      >
                        <span>➕ Tạo lịch kiểm tra</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Giai đoạn 2: Kiểm tra */}
              {currentPhase.phaseType === 'inspection' && (
                <>
                  {isActivePhase && hasReport && !isInspectionApprovedLocal && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setReturnReason('')
                          setIsReturnModalOpen(true)
                        }}
                        className="flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition cursor-pointer active:scale-95"
                        title="Yêu cầu kỹ sư hiện trường đo lại hoặc bổ sung báo cáo kiểm tra"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Yêu cầu làm lại</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onEndNormally(caseItem.code, 'Quản lý đã nghiệm thu đạt báo cáo kiểm tra.')
                          setIsInspectionApprovedLocal(true)
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer active:scale-95"
                        title="Duyệt báo cáo kiểm tra và xác nhận sự cố"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Duyệt báo cáo kiểm tra</span>
                      </button>
                    </>
                  )}

                  {(isInspectionApprovedLocal || canSpawnRepairFromInspection) && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                        ✓ Đã nghiệm thu kiểm tra
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const inspectionPoles = currentPhase.poleIds || caseItem.poleIds || []
                          onOpenCreateNextPhaseModal(
                            caseItem.code,
                            'repair',
                            currentPhase.workOrderId,
                            inspectionPoles
                          )
                        }}
                        className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer active:scale-95"
                        title="Tạo lịch sửa chữa tiếp nối (kế thừa mã sự vụ)"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Tạo lịch sửa chữa</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Giai đoạn 3: Sửa chữa */}
              {currentPhase.phaseType === 'repair' && isActivePhase && hasReport && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setReturnReason('')
                      setIsReturnModalOpen(true)
                    }}
                    className="flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition cursor-pointer active:scale-95"
                    title="Yêu cầu kỹ sư hiện trường sửa lại hoặc bổ sung ảnh sau sửa chữa"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Yêu cầu làm lại</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSubmitSuperior(caseItem.code, editedMaterialsNote)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Duyệt & Gửi lên cấp trên</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Popup Nhập Lý Do Yêu Cầu Làm Lại (POST /work-orders/{id}/return) */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 flex flex-col gap-3.5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <span className="p-1 rounded-lg bg-amber-100 text-amber-700">
                  <RotateCcw className="w-4 h-4" />
                </span>
                Yêu Cầu Làm Lại Báo Cáo
              </h4>
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Lệnh công tác sẽ được chuyển về trạng thái <strong>Đang thực hiện</strong> để Kỹ sư hiện trường bổ sung hồ sơ nghiệm thu hoặc làm lại theo yêu cầu.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Lý do / Chỉ đạo yêu cầu làm lại (*):
              </label>
              <textarea
                rows={3}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Ví dụ: Ảnh sau sửa chữa bị mờ, đề nghị chụp lại góc cận cảnh và đo lại độ rọi tại mặt đường..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!returnReason.trim()) {
                    toast.warning('Vui lòng nhập lý do yêu cầu làm lại!')
                    return
                  }
                  onReturnCurrentPhase(caseItem.code, returnReason.trim())
                  setIsReturnModalOpen(false)
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition cursor-pointer active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi yêu cầu làm lại</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Duyệt Nghiệm Thu Báo Cáo Khảo Sát (POST /work-orders/{id}/verify) */}
      {isSurveyVerifyModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 flex flex-col gap-3.5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <span className="p-1 rounded-lg bg-emerald-100 text-emerald-700">
                  <Check className="w-4 h-4" />
                </span>
                Duyệt Báo Cáo Khảo Sát
              </h4>
              <button
                type="button"
                onClick={() => setIsSurveyVerifyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Xác nhận duyệt nghiệm thu báo cáo khảo sát và cập nhật trạng thái <strong className="text-emerald-700">Đã nghiệm thu</strong>.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Ghi chú nghiệm thu (tùy chọn):
              </label>
              <textarea
                rows={3}
                value={surveyVerifyNote}
                onChange={(e) => setSurveyVerifyNote(e.target.value)}
                placeholder="Nhập ý kiến đánh giá hoặc ghi chú nghiệm thu..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                autoFocus
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSurveyVerifyModalOpen(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onEndNormally(
                    caseItem.code,
                    surveyVerifyNote.trim() || 'Quản lý đã nghiệm thu đạt báo cáo khảo sát.'
                  )
                  setIsSurveyVerifyModalOpen(false)
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer active:scale-95"
                title="Duyệt nghiệm thu báo cáo khảo sát và cập nhật lên hệ thống"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Xác nhận duyệt nghiệm thu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Báo Cáo Hiện Trường Đa Phương Tiện (Ảnh & Video) */}
      <FieldReportDetailModal
        isOpen={isFieldReportModalOpen}
        caseItem={caseItem}
        phase={currentPhase || null}
        onClose={() => setIsFieldReportModalOpen(false)}
      />

      {/* Modal Chỉnh Sửa Lịch Công Tác */}
      {onEditSchedule && (
        <EditScheduleModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          caseItem={caseItem}
          currentPhase={currentPhase || null}
          assignees={assignees}
          onSubmit={onEditSchedule}
        />
      )}

      {/* Modal Hủy Lịch Công Tác */}
      {onCancelSchedule && (
        <CancelScheduleModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          caseCode={caseItem.code}
          workOrderId={currentPhase?.workOrderId || caseItem.code}
          onSubmit={onCancelSchedule}
        />
      )}
    </div>
  )
}
