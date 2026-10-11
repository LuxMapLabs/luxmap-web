import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import { RootState } from '../../redux/rootReducer'
import {
  setCurrentMonth,
  setFilterPhase,
  openCaseDetail,
  closeCaseDetail,
  setViewingPhaseIndex,
  createNewCase,
  advanceNextPhase,
  endCaseNormally,
  approveRepairAndSubmitSuperior,
  returnPhaseToEngineer,
  fetchWorkOrdersThunk,
  fetchAssigneesThunk,
  createWorkOrderBackendThunk,
  followUpWorkOrderBackendThunk,
  verifyWorkOrderBackendThunk,
  cancelWorkOrderBackendThunk,
  returnWorkOrderBackendThunk,
} from '../../feature/work-schedule/workScheduleSlice'
import { ScheduleFilterBar } from './components/ScheduleFilterBar'
import { CalendarGrid } from './components/CalendarGrid'
import { CaseDetailModal } from './components/CaseDetailModal'
import { CreateNextPhaseModal } from './components/CreateNextPhaseModal'
import { CreateManualModal } from './components/CreateManualModal'
import { CalendarDays } from 'lucide-react'

export const WorkSchedulePage: React.FC = () => {
  const dispatch = useDispatch()
  const {
    cases,
    currentMonth,
    currentYear,
    filterPhase,
    assignees,
    selectedCaseCode,
    viewingPhaseIndex,
  } = useSelector((state: RootState) => state.workSchedule)

  // Tự động tải danh sách lịch làm việc và danh sách kỹ sư từ máy chủ theo tháng được chọn
  useEffect(() => {
    try {
      const startOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate()
      const endOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
        lastDay
      ).padStart(2, '0')}`

      dispatch(
        fetchWorkOrdersThunk({
          scheduled_from: startOfMonth,
          scheduled_to: endOfMonth,
        }) as any
      )

      // Tải danh sách kỹ sư hiện trường theo địa bàn xã (COM-001)
      dispatch(fetchAssigneesThunk('COM-001') as any)
    } catch (e) {
      console.warn('Lỗi khi tải lịch làm việc từ máy chủ:', e)
    }
  }, [dispatch, currentMonth, currentYear])

  // Modals state
  const [isCreateManualOpen, setIsCreateManualOpen] = useState(false)
  const [manualDefaultDate, setManualDefaultDate] = useState('2026-10-10')
  const [isDateLockedFromCell, setIsDateLockedFromCell] = useState(false)

  const [isNextPhaseModalOpen, setIsNextPhaseModalOpen] = useState(false)
  const [targetNextPhaseType, setTargetNextPhaseType] = useState<'inspection' | 'repair'>('inspection')

  const selectedCase = (cases || []).find((c) => c?.code === selectedCaseCode) || null

  // Xử lý tạo mới sự vụ: từ ô lịch (lấy ngày của ô đó) hoặc từ nút Header (tự chọn ngày)
  const handleOpenCreateManual = (dateStr?: string) => {
    if (dateStr) {
      setManualDefaultDate(dateStr)
      setIsDateLockedFromCell(true) // Khóa và lấy đúng ngày của ô vừa bấm
    } else {
      setManualDefaultDate('2026-10-10')
      setIsDateLockedFromCell(false) // Tự do chọn ngày bất kỳ
    }
    setIsCreateManualOpen(true)
  }

  const handleCreateNewCaseSubmit = (payload: any) => {
    // 1. Cập nhật giao diện & lưu trữ bền vững tức thì
    dispatch(createNewCase(payload))
    setIsCreateManualOpen(false)
    toast.success(`Đã tạo thành công sự vụ mới khởi đầu tại ${payload.initPhase}!`)

    // 2. Trích xuất mã tuyến đường từ chuỗi segment (ví dụ: 'SEG-001')
    const segmentIdMatch = payload.segment?.match(/SEG-\d+/i)
    const segmentId = segmentIdMatch ? segmentIdMatch[0].toUpperCase() : 'SEG-001'

    const backendPayload: any = {
      task_kind: payload.initPhase,
      title: payload.title,
      scheduled_date: payload.date,
      due_date: payload.date,
      assigned_to: payload.assigneeId,
      note: payload.notes,
      materials_note: payload.materialsNote,
    }

    if (payload.initPhase === 'survey') {
      // Backend Survey: Yêu cầu commune_id và segment_ids[]
      backendPayload.commune_id = 'COM-001'
      backendPayload.segment_ids = [segmentId]
    } else if (payload.initPhase === 'inspection') {
      // Backend Inspection: Yêu cầu segment_id
      backendPayload.segment_id = segmentId
    } else if (payload.initPhase === 'repair') {
      // Backend Repair: Yêu cầu fault_ids[]
      backendPayload.fault_ids = payload.poleIds || []
    }

    // 3. Đồng bộ lên Backend ASP.NET Core
    dispatch(createWorkOrderBackendThunk(backendPayload) as any)
  }

  // Xử lý mở giai đoạn tiếp theo (giữ nguyên mã SCH, tự đóng bước cũ)
  const handleOpenCreateNextPhase = (_code: string, phaseType: 'inspection' | 'repair') => {
    setTargetNextPhaseType(phaseType)
    setIsNextPhaseModalOpen(true)
  }

  const handleNextPhaseSubmit = (payload: any) => {
    // 1. Cập nhật giao diện & localStorage tức thì
    dispatch(advanceNextPhase(payload))
    setIsNextPhaseModalOpen(false)
    dispatch(closeCaseDetail())
    toast.success(
      `✓ Đã đóng tiến trình cũ và mở tiếp ${
        payload.nextPhaseType === 'repair' ? 'Sửa chữa' : 'Kiểm tra'
      } cho mã ${payload.code}!`
    )

    // 2. Đồng bộ lên Backend (gọi POST /api/v1/work-orders/{id}/follow-up)
    const currentPhase = selectedCase?.phases[selectedCase.currentPhaseIndex]
    const parentWorkOrderId = currentPhase?.workOrderId || 'WO-0002'

    dispatch(
      followUpWorkOrderBackendThunk({
        parentWorkOrderId,
        payload: {
          task_kind: payload.nextPhaseType,
          scheduled_date: payload.date,
          assigned_to: payload.assigneeId,
          note: payload.notes,
          materials_note: payload.materialsNote,
        },
      }) as any
    )
  }

  // Xử lý Quản lý Yêu cầu làm lại (POST /api/v1/work-orders/{id}/return)
  const handleReturnPhase = (code: string, note: string) => {
    // 1. Cập nhật Redux & LocalStorage ngay lập tức (không bao giờ mất khi reload F5)
    dispatch(returnPhaseToEngineer({ code, reviewNote: note }))
    dispatch(closeCaseDetail())
    toast.success(`✓ Đã gửi yêu cầu làm lại cho Kỹ sư hiện trường! Lệnh chuyển về Đang thực hiện.`)

    // 2. Đồng bộ lên Backend qua API POST /api/v1/work-orders/{id}/return
    const currentPhase = selectedCase?.phases[selectedCase.currentPhaseIndex]
    const workOrderId = currentPhase?.workOrderId || 'WO-0003'

    dispatch(
      returnWorkOrderBackendThunk({
        workOrderId,
        note,
      }) as any
    )
  }

  // Xử lý đóng thông thường (Khi kiểm tra/khảo sát không phát hiện lỗi)
  const handleEndNormally = (code: string, reason: string) => {
    dispatch(endCaseNormally({ code, reason }))
    dispatch(closeCaseDetail())
    toast.info(`Đã đóng sự vụ [${code}] thành công.`)

    const currentPhase = selectedCase?.phases[selectedCase.currentPhaseIndex]
    const workOrderId = currentPhase?.workOrderId || 'WO-0001'

    dispatch(
      cancelWorkOrderBackendThunk({
        workOrderId,
        note: reason,
      }) as any
    )
  }

  // Xử lý Quản lý duyệt sửa chữa & gửi Superior
  const handleSubmitSuperior = (code: string, editedMaterialsNote: string) => {
    dispatch(approveRepairAndSubmitSuperior({ code, editedMaterialsNote }))
    dispatch(closeCaseDetail())
    toast.success(`🎉 ĐÃ GỬI BÁO CÁO NGHIỆM THU [${code}] LÊN SUPERIOR THÀNH CÔNG!`)

    const currentPhase = selectedCase?.phases[selectedCase.currentPhaseIndex]
    const workOrderId = currentPhase?.workOrderId || 'WO-0002'

    dispatch(
      verifyWorkOrderBackendThunk({
        workOrderId,
        note: 'Quản lý đã nghiệm thu đạt tiêu chuẩn và chuyển hồ sơ lên Superior.',
        materialsNote: editedMaterialsNote,
      }) as any
    )
  }

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar bg-slate-50 select-none">
      {/* Vùng nội dung toàn trang: Tự do giãn nở và cuộn mượt mà */}
      <div className="p-4 sm:p-6 flex flex-col gap-4 pb-24">
        {/* Header Title */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <CalendarDays className="w-6 h-6 text-blue-600" />
              Lịch Làm Việc Chiếu Sáng
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Điều phối, phân lịch khảo sát, kiểm tra, sửa chữa và thẩm định báo cáo nghiệm thu
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="shrink-0">
          <ScheduleFilterBar
            currentMonth={currentMonth}
            currentYear={currentYear}
            filterPhase={filterPhase}
            onSelectMonthYear={(m, y) => dispatch(setCurrentMonth({ month: m, year: y }))}
            onResetToday={() => dispatch(setCurrentMonth({ month: 9, year: 2026 }))}
            onFilterChange={(phase) => dispatch(setFilterPhase(phase))}
            onOpenCreateModal={() => handleOpenCreateManual()}
          />
        </div>

        {/* Calendar Grid: Tự do giãn nở chiều cao theo số lượng thẻ, không bị che khuất */}
        <CalendarGrid
          currentMonth={currentMonth}
          currentYear={currentYear}
          cases={cases}
          filterPhase={filterPhase}
          onSelectCase={(code, phaseIndex) => dispatch(openCaseDetail({ code, phaseIndex }))}
          onAddOnDate={(dateStr) => handleOpenCreateManual(dateStr)}
        />
      </div>

      {/* ============================================================== */}
      {/* CÁC MODAL NGHIỆP VỤ CỦA QUẢN LÝ */}
      {/* ============================================================== */}

      {/* Modal 1: Chi tiết sự vụ & Stepper 4 bước */}
      <CaseDetailModal
        isOpen={Boolean(selectedCaseCode)}
        caseItem={selectedCase}
        viewingPhaseIndex={viewingPhaseIndex}
        onClose={() => dispatch(closeCaseDetail())}
        onSwitchViewingPhase={(idx) => dispatch(setViewingPhaseIndex(idx))}
        onReturnCurrentPhase={handleReturnPhase}
        onEndNormally={handleEndNormally}
        onOpenCreateNextPhaseModal={handleOpenCreateNextPhase}
        onSubmitSuperior={handleSubmitSuperior}
      />

      {/* Modal 2: Tạo giai đoạn tiếp theo (giữ nguyên mã SCH) */}
      <CreateNextPhaseModal
        isOpen={isNextPhaseModalOpen}
        caseCode={selectedCaseCode || ''}
        segment={selectedCase?.segment}
        defaultPoleIds={selectedCase?.poleIds || selectedCase?.phases[selectedCase.currentPhaseIndex]?.poleIds}
        targetNextPhaseType={targetNextPhaseType}
        assignees={assignees}
        onClose={() => setIsNextPhaseModalOpen(false)}
        onSubmit={handleNextPhaseSubmit}
      />

      {/* Modal 3: Tạo sự vụ mới từ đầu */}
      <CreateManualModal
        isOpen={isCreateManualOpen}
        defaultDate={manualDefaultDate}
        isDateLocked={isDateLockedFromCell}
        assignees={assignees}
        onClose={() => setIsCreateManualOpen(false)}
        onSubmit={handleCreateNewCaseSubmit}
      />
    </div>
  )
}
