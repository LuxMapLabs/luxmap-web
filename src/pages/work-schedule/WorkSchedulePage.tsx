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
  fetchWorkOrdersRequest,
  fetchAssigneesRequest,
  createWorkOrderRequest,
  patchWorkOrderRequest,
  followUpWorkOrderRequest,
  verifyWorkOrderRequest,
  cancelWorkOrderRequest,
  returnWorkOrderRequest,
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
    const startOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate()
    const endOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
      lastDay
    ).padStart(2, '0')}`

    dispatch(
      fetchWorkOrdersRequest({
        scheduled_from: startOfMonth,
        scheduled_to: endOfMonth,
      })
    )

    // Tải danh sách kỹ sư hiện trường theo địa bàn xã của người dùng
    dispatch(fetchAssigneesRequest(activeCommuneId))
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

  const handleCreateNewCaseSubmit = (payload: any) => {
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
      // Backend Inspection: Nếu có fault_ids từ các cột đã chọn thì gửi fault_ids, nếu không có thì gửi segment_id
      if (payload.faultIds && payload.faultIds.length > 0) {
        backendPayload.fault_ids = payload.faultIds
      } else {
        backendPayload.segment_id = segmentId
      }
    } else if (payload.initPhase === 'repair') {
      // Backend Repair: Yêu cầu fault_ids[] của các sự cố đã xác nhận
      backendPayload.fault_ids = payload.faultIds || []
    }

    dispatch(createWorkOrderRequest(backendPayload))
    setIsCreateManualOpen(false)
  }

  // Xử lý mở giai đoạn tiếp theo (gọi API /follow-up trên máy chủ)
  const handleOpenCreateNextPhase = (_code: string, phaseType: 'inspection' | 'repair') => {
    setTargetNextPhaseType(phaseType)
    setIsNextPhaseModalOpen(true)
  }

  const handleNextPhaseSubmit = (payload: any) => {
    const currentPhase = selectedCase?.phases[selectedCase.currentPhaseIndex]
    const parentWorkOrderId = currentPhase?.workOrderId

    if (!parentWorkOrderId) {
      toast.error('Không tìm thấy mã lệnh công tác để chuyển tiếp trên máy chủ.')
      return
    }

    const followUpPayload: any = {
      task_kind: payload.nextPhaseType,
      scheduled_date: payload.date,
      assigned_to: payload.assigneeId,
      note: payload.notes,
      materials_note: payload.materialsNote,
    }

    if (payload.faultIds && payload.faultIds.length > 0) {
      followUpPayload.fault_ids = payload.faultIds
    }

    dispatch(
      followUpWorkOrderRequest({
        parentWorkOrderId,
        payload: followUpPayload,
        nextPhaseLabel: payload.nextPhaseType === 'repair' ? 'Sửa chữa' : 'Kiểm tra',
      })
    )
    setIsNextPhaseModalOpen(false)
  }

  // Xử lý Quản lý Yêu cầu làm lại (POST /api/v1/work-orders/{id}/return)
  const handleReturnPhase = (_code: string, note: string) => {
    const currentPhase = selectedCase?.phases[selectedCase.currentPhaseIndex]
    const workOrderId = currentPhase?.workOrderId

    if (!workOrderId) {
      toast.error('Không tìm thấy mã lệnh công tác để yêu cầu làm lại.')
      return
    }

    dispatch(
      returnWorkOrderRequest({
        workOrderId,
        note,
      })
    )
  }

  // Xử lý hoàn tất / đóng sự vụ thông thường (Dùng verify nếu kỹ sư đã nộp báo cáo done, cancel nếu lệnh chưa chạy)
  const handleEndNormally = (_code: string, reason: string) => {
    const currentPhase =
      selectedCase?.phases[viewingPhaseIndex] ||
      selectedCase?.phases[selectedCase.currentPhaseIndex]
    const workOrderId = currentPhase?.workOrderId

    if (!workOrderId) {
      toast.error('Không tìm thấy mã lệnh công tác để hoàn tất.')
      return
    }

    // Nếu lệnh đang ở trạng thái 'done' (kỹ sư đã nộp báo cáo), duyệt nghiệm thu bằng verify
    if (currentPhase?.rawStatus === 'done' || currentPhase?.status === 'reported') {
      dispatch(
        verifyWorkOrderRequest({
          workOrderId,
          note: reason || 'Quản lý đã duyệt báo cáo và hoàn tất sự vụ.',
        })
      )
    } else {
      // Nếu lệnh chưa thực hiện (open, assigned, in_progress), hủy bằng cancel
      dispatch(
        cancelWorkOrderRequest({
          workOrderId,
          note: reason,
          successMessage: 'Đã đóng sự vụ thành công trên máy chủ.',
        })
      )
    }
  }

  // Xử lý Quản lý duyệt sửa chữa & gửi Superior (POST /api/v1/work-orders/{id}/verify)
  const handleSubmitSuperior = (_code: string, editedMaterialsNote: string) => {
    const currentPhase = selectedCase?.phases[selectedCase.currentPhaseIndex]
    const workOrderId = currentPhase?.workOrderId

    if (!workOrderId) {
      toast.error('Không tìm thấy mã lệnh công tác để nghiệm thu.')
      return
    }

    dispatch(
      verifyWorkOrderRequest({
        workOrderId,
        note: 'Quản lý đã nghiệm thu đạt tiêu chuẩn và chuyển hồ sơ lên Superior.',
        materials_note: editedMaterialsNote,
      })
    )
  }

  // Xử lý Quản lý chỉnh sửa lịch (PATCH /api/v1/work-orders/{id} và PUT /assignee nếu đổi kỹ sư)
  const handleEditSchedule = (payload: {
    title: string
    scheduledDate: string
    dueDate: string
    newAssigneeId: string
    materialsNote?: string
  }): Promise<void> => {
    const currentPhase =
      selectedCase?.phases[viewingPhaseIndex] ||
      selectedCase?.phases[selectedCase.currentPhaseIndex]
    const workOrderId = currentPhase?.workOrderId

    if (!workOrderId) {
      toast.error('Không tìm thấy mã lệnh công tác để cập nhật trên máy chủ.')
      return Promise.resolve()
    }

    dispatch(
      patchWorkOrderRequest({
        workOrderId,
        payload: {
          title: payload.title,
          scheduled_date: payload.scheduledDate,
          due_date: payload.dueDate,
          materials_note: payload.materialsNote,
        },
        newAssigneeId: payload.newAssigneeId,
      })
    )
    return Promise.resolve()
  }

  // Xử lý Quản lý hủy lịch (POST /api/v1/work-orders/{id}/cancel)
  const handleCancelSchedule = (reason: string): Promise<void> => {
    const currentPhase =
      selectedCase?.phases[viewingPhaseIndex] ||
      selectedCase?.phases[selectedCase.currentPhaseIndex]
    const workOrderId = currentPhase?.workOrderId

    if (!workOrderId) {
      toast.error('Không tìm thấy mã lệnh công tác để hủy.')
      return Promise.resolve()
    }

    dispatch(
      cancelWorkOrderRequest({
        workOrderId,
        note: reason,
      })
    )
    return Promise.resolve()
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
        defaultPoleIds={
          selectedCase?.poleIds ||
          selectedCase?.phases[selectedCase.currentPhaseIndex]?.poleIds ||
          selectedCase?.phases[viewingPhaseIndex]?.poleIds
        }
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
