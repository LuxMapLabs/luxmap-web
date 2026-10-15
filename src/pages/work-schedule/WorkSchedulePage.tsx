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
  fetchWorkOrdersThunk,
  fetchAssigneesThunk,
  createWorkOrderBackendThunk,
  patchWorkOrderBackendThunk,
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
  const currentUser = useSelector((state: RootState) => state.auth.user)
  const activeCommuneId = currentUser?.administrativeUnitId || currentUser?.communeIds?.[0] || 'COM-001'

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

      // Tải danh sách kỹ sư hiện trường theo địa bàn xã của người dùng
      dispatch(fetchAssigneesThunk(activeCommuneId) as any)
    } catch (e) {
      console.warn('Lỗi khi tải lịch làm việc từ máy chủ:', e)
    }
  }, [dispatch, currentMonth, currentYear, activeCommuneId])

  const getTodayStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // Modals state
  const [isCreateManualOpen, setIsCreateManualOpen] = useState(false)
  const [manualDefaultDate, setManualDefaultDate] = useState(getTodayStr)
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
      setManualDefaultDate(getTodayStr())
      setIsDateLockedFromCell(false) // Tự do chọn ngày bất kỳ
    }
    setIsCreateManualOpen(true)
  }

  const handleCreateNewCaseSubmit = async (payload: any) => {
    // 1. Trích xuất mã tuyến đường từ chuỗi segment (ví dụ: 'SEG-001')
    const segmentIdMatch = payload.segment?.match(/SEG-\d+/i)
    const segmentId = segmentIdMatch ? segmentIdMatch[0].toUpperCase() : 'SEG-001'

    const backendPayload: any = {
      task_kind: payload.initPhase,
      title: payload.title?.trim() || 'Lệnh công tác mới',
      scheduled_date: payload.date,
      due_date: payload.date,
      assigned_to: payload.assigneeId || undefined,
      note: payload.notes?.trim() || undefined,
      materials_note: payload.materialsNote?.trim() || undefined,
    }

    if (payload.initPhase === 'survey') {
      // Backend Survey: Yêu cầu commune_id và segment_ids[]
      backendPayload.commune_id = activeCommuneId
      backendPayload.segment_ids = [segmentId]
    } else if (payload.initPhase === 'inspection') {
      // Backend Inspection: Yêu cầu segment_id
      backendPayload.segment_id = segmentId
    } else if (payload.initPhase === 'repair') {
      // Backend Repair: Yêu cầu fault_ids[]
      backendPayload.fault_ids = payload.poleIds || []
    }

    try {
      await (dispatch(createWorkOrderBackendThunk(backendPayload) as any) as any).unwrap()
      setIsCreateManualOpen(false)
      toast.success(`Đã tạo thành công lệnh công tác mới trên máy chủ!`)
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Không thể tạo lệnh công tác trên máy chủ')
    }
  }

  // Xử lý mở giai đoạn tiếp theo (gọi API /follow-up trên máy chủ)
  const handleOpenCreateNextPhase = (_code: string, phaseType: 'inspection' | 'repair') => {
    setTargetNextPhaseType(phaseType)
    setIsNextPhaseModalOpen(true)
  }

  const handleNextPhaseSubmit = async (payload: any) => {
    const currentPhase = selectedCase?.phases[selectedCase.currentPhaseIndex]
    const parentWorkOrderId = currentPhase?.workOrderId

    if (!parentWorkOrderId) {
      toast.error('Không tìm thấy mã lệnh công tác để chuyển tiếp trên máy chủ.')
      return
    }

    try {
      await (dispatch(
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
      ) as any).unwrap()

      setIsNextPhaseModalOpen(false)
      dispatch(closeCaseDetail())
      toast.success(
        `✓ Đã mở tiếp ${payload.nextPhaseType === 'repair' ? 'Sửa chữa' : 'Kiểm tra'
        } cho mã lệnh công tác trên máy chủ!`
      )
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Không thể mở giai đoạn tiếp theo trên máy chủ')
    }
  }

  // Xử lý Quản lý Yêu cầu làm lại (POST /api/v1/work-orders/{id}/return)
  const handleReturnPhase = async (_code: string, note: string) => {
    const currentPhase = selectedCase?.phases[selectedCase.currentPhaseIndex]
    const workOrderId = currentPhase?.workOrderId

    if (!workOrderId) {
      toast.error('Không tìm thấy mã lệnh công tác để yêu cầu làm lại.')
      return
    }

    try {
      await (dispatch(
        returnWorkOrderBackendThunk({
          workOrderId,
          note,
        }) as any
      ) as any).unwrap()

      dispatch(closeCaseDetail())
      toast.success(`✓ Đã gửi yêu cầu làm lại cho Kỹ sư hiện trường trên máy chủ!`)
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Không thể gửi yêu cầu làm lại trên máy chủ')
    }
  }

  // Xử lý đóng thông thường (Khi kiểm tra/khảo sát không phát hiện lỗi - POST /api/v1/work-orders/{id}/cancel)
  const handleEndNormally = async (_code: string, reason: string) => {
    const currentPhase = selectedCase?.phases[selectedCase.currentPhaseIndex]
    const workOrderId = currentPhase?.workOrderId

    if (!workOrderId) {
      toast.error('Không tìm thấy mã lệnh công tác để hủy.')
      return
    }

    try {
      await (dispatch(
        cancelWorkOrderBackendThunk({
          workOrderId,
          note: reason,
        }) as any
      ) as any).unwrap()

      dispatch(closeCaseDetail())
      toast.info(`Đã đóng sự vụ thành công trên máy chủ.`)
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Không thể hủy sự vụ trên máy chủ')
    }
  }

  // Xử lý Quản lý duyệt sửa chữa & gửi Superior (POST /api/v1/work-orders/{id}/verify)
  const handleSubmitSuperior = async (_code: string, editedMaterialsNote: string) => {
    const currentPhase = selectedCase?.phases[selectedCase.currentPhaseIndex]
    const workOrderId = currentPhase?.workOrderId

    if (!workOrderId) {
      toast.error('Không tìm thấy mã lệnh công tác để nghiệm thu.')
      return
    }

    try {
      await (dispatch(
        verifyWorkOrderBackendThunk({
          workOrderId,
          note: 'Quản lý đã nghiệm thu đạt tiêu chuẩn và chuyển hồ sơ lên Superior.',
          materialsNote: editedMaterialsNote,
        }) as any
      ) as any).unwrap()

      dispatch(closeCaseDetail())
      toast.success(`🎉 Đã duyệt nghiệm thu và gửi báo cáo lên Superior thành công!`)
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Không thể duyệt nghiệm thu trên máy chủ')
    }
  }

  // Xử lý Quản lý chỉnh sửa lịch (PATCH /api/v1/work-orders/{id} và PUT /assignee nếu đổi kỹ sư)
  const handleEditSchedule = async (payload: {
    title: string
    scheduledDate: string
    dueDate: string
    newAssigneeId: string
    materialsNote?: string
  }) => {
    const currentPhase =
      selectedCase?.phases[viewingPhaseIndex] ||
      selectedCase?.phases[selectedCase.currentPhaseIndex]
    const workOrderId = currentPhase?.workOrderId

    if (!workOrderId) {
      toast.error('Không tìm thấy mã lệnh công tác để cập nhật trên máy chủ.')
      return
    }

    try {
      await (dispatch(
        patchWorkOrderBackendThunk({
          workOrderId,
          payload: {
            title: payload.title,
            scheduled_date: payload.scheduledDate,
            due_date: payload.dueDate,
            materials_note: payload.materialsNote,
          },
          newAssigneeId: payload.newAssigneeId,
          currentAssigneeId: currentPhase.assigneeId,
        }) as any
      ) as any).unwrap()

      toast.success('Đã cập nhật lịch làm việc thành công trên máy chủ!')
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Không thể cập nhật lịch làm việc trên máy chủ')
      throw err
    }
  }

  // Xử lý Quản lý hủy lịch (POST /api/v1/work-orders/{id}/cancel)
  const handleCancelSchedule = async (reason: string) => {
    const currentPhase =
      selectedCase?.phases[viewingPhaseIndex] ||
      selectedCase?.phases[selectedCase.currentPhaseIndex]
    const workOrderId = currentPhase?.workOrderId

    if (!workOrderId) {
      toast.error('Không tìm thấy mã lệnh công tác để hủy.')
      return
    }

    try {
      await (dispatch(
        cancelWorkOrderBackendThunk({
          workOrderId,
          note: reason,
        }) as any
      ) as any).unwrap()

      dispatch(closeCaseDetail())
      toast.success(`Đã hủy lịch công tác [${workOrderId}] thành công!`)
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Không thể hủy lịch trên máy chủ')
      throw err
    }
  }

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar bg-slate-50 select-none">
      {/* Vùng nội dung toàn trang: Tự do giãn nở và cuộn mượt mà */}
      <div className="p-4 sm:p-6 flex flex-col gap-4 pb-24">
        {/* Filter Bar */}
        <div className="shrink-0">
          <ScheduleFilterBar
            currentMonth={currentMonth}
            currentYear={currentYear}
            filterPhase={filterPhase}
            onSelectMonthYear={(m, y) => dispatch(setCurrentMonth({ month: m, year: y }))}
            onResetToday={() => {
              const d = new Date()
              dispatch(setCurrentMonth({ month: d.getMonth(), year: d.getFullYear() }))
            }}
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
        assignees={assignees}
        onClose={() => dispatch(closeCaseDetail())}
        onSwitchViewingPhase={(idx) => dispatch(setViewingPhaseIndex(idx))}
        onReturnCurrentPhase={handleReturnPhase}
        onEndNormally={handleEndNormally}
        onOpenCreateNextPhaseModal={handleOpenCreateNextPhase}
        onSubmitSuperior={handleSubmitSuperior}
        onEditSchedule={handleEditSchedule}
        onCancelSchedule={handleCancelSchedule}
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
