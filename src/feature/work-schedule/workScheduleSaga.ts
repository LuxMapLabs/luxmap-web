import { all, call, put, select, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import { workScheduleAPI, type GetWorkOrdersFilter } from './workScheduleAPI'
import type {
  WorkOrderItemPagedResult,
  WorkOrderAssigneePagedResult,
  WorkOrderDetail,
  CreateWorkOrderRequest,
  PatchWorkOrderRequest,
  FollowUpWorkOrderRequest,
} from '../../types/workorders/orders'
import type { RootState } from '../../redux/rootReducer'
import {
  fetchWorkOrdersRequest,
  fetchWorkOrdersSuccess,
  fetchWorkOrdersFailure,
  fetchWorkOrderDetailRequest,
  fetchWorkOrderDetailSuccess,
  fetchWorkOrderDetailFailure,
  fetchAssigneesRequest,
  fetchAssigneesSuccess,
  fetchAssigneesFailure,
  createWorkOrderRequest,
  createWorkOrderSuccess,
  createWorkOrderFailure,
  patchWorkOrderRequest,
  patchWorkOrderSuccess,
  patchWorkOrderFailure,
  followUpWorkOrderRequest,
  followUpWorkOrderSuccess,
  followUpWorkOrderFailure,
  verifyWorkOrderRequest,
  verifyWorkOrderSuccess,
  verifyWorkOrderFailure,
  cancelWorkOrderRequest,
  cancelWorkOrderSuccess,
  cancelWorkOrderFailure,
  returnWorkOrderRequest,
  returnWorkOrderSuccess,
  returnWorkOrderFailure,
  rejectCancellationRequest,
  rejectCancellationSuccess,
  rejectCancellationFailure,
  closeCaseDetail,
} from './workScheduleSlice'

function extractApiErrorMessage(err: any, fallbackMessage: string): string {
  const errData = err?.response?.data
  const apiError = errData?.error
  if (typeof apiError === 'string') return apiError
  if (apiError?.message) {
    if (apiError.details && typeof apiError.details === 'object') {
      const detailEntries = Object.entries(apiError.details).filter(([k]) => k !== 'correlation_id')
      if (detailEntries.length > 0) {
        const detailStr = detailEntries
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('; ')
        return `${apiError.message} (${detailStr})`
      }
    }
    return apiError.message
  }
  if (apiError?.code) return apiError.code
  if (errData?.message) return errData.message
  if (errData?.title) return errData.title
  if (err?.message) return err.message
  return fallbackMessage
}

/**
 * Worker saga tải danh sách lệnh công tác / lịch làm việc
 */
function* handleFetchWorkOrders(action: PayloadAction<GetWorkOrdersFilter | undefined>) {
  try {
    let effectiveFilter = action.payload
    if (!effectiveFilter) {
      const state: RootState = yield select()
      const { currentMonth, currentYear } = state.workSchedule
      const startOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate()
      const endOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
        lastDay
      ).padStart(2, '0')}`
      effectiveFilter = {
        scheduled_from: startOfMonth,
        scheduled_to: endOfMonth,
      }
    }
    const result: WorkOrderItemPagedResult = yield call(workScheduleAPI.getWorkOrders, effectiveFilter)
    yield put(fetchWorkOrdersSuccess(result))
  } catch (error: any) {
    const errorMsg = extractApiErrorMessage(error, 'Không thể tải lịch làm việc từ máy chủ')
    yield put(fetchWorkOrdersFailure(errorMsg))
  }
}

/**
 * Worker saga lấy chi tiết một lệnh công tác
 */
function* handleFetchWorkOrderDetail(action: PayloadAction<string>) {
  try {
    const result: WorkOrderDetail = yield call(workScheduleAPI.getWorkOrderDetail, action.payload)
    yield put(fetchWorkOrderDetailSuccess(result))
  } catch (error: any) {
    const errorMsg = extractApiErrorMessage(error, 'Không thể tải chi tiết lệnh công tác từ máy chủ')
    yield put(fetchWorkOrderDetailFailure(errorMsg))
  }
}

/**
 * Worker saga tải danh sách kỹ sư hiện trường
 */
function* handleFetchAssignees(action: PayloadAction<string | undefined>) {
  try {
    let communeId = action.payload
    if (!communeId) {
      const state: RootState = yield select()
      communeId = state.auth.user?.commune_ids?.[0]
    }
    if (!communeId) {
      yield put(fetchAssigneesSuccess([]))
      return
    }
    const result: WorkOrderAssigneePagedResult = yield call(workScheduleAPI.getAssignees, communeId)
    yield put(fetchAssigneesSuccess(result.items || []))
  } catch (error: any) {
    const errorMsg = extractApiErrorMessage(error, 'Không thể tải danh sách kỹ sư')
    yield put(fetchAssigneesFailure(errorMsg))
  }
}

/**
 * Worker saga tạo mới lệnh công tác
 */
function* handleCreateWorkOrder(action: PayloadAction<CreateWorkOrderRequest>) {
  try {
    yield call(workScheduleAPI.createWorkOrder, action.payload)
    yield put(createWorkOrderSuccess())
    toast.success('Đã tạo thành công lệnh công tác mới trên máy chủ!')
    yield put(fetchWorkOrdersRequest(undefined))
  } catch (error: any) {
    const errorMsg = extractApiErrorMessage(error, 'Không thể tạo lệnh công tác trên máy chủ')
    yield put(createWorkOrderFailure(errorMsg))
    toast.error(errorMsg)
  }
}

/**
 * Worker saga chỉnh sửa lịch công tác
 */
function* handlePatchWorkOrder(
  action: PayloadAction<{
    workOrderId: string
    payload: PatchWorkOrderRequest
    newAssigneeId?: string
  }>
) {
  const { workOrderId, payload, newAssigneeId } = action.payload
  try {
    yield call(workScheduleAPI.patchWorkOrder, workOrderId, payload)
    if (newAssigneeId) {
      yield call(workScheduleAPI.assignWorkOrder, workOrderId, { assigned_to: newAssigneeId })
    }
    yield put(patchWorkOrderSuccess())
    toast.success('Đã cập nhật lịch làm việc thành công trên máy chủ!')
    yield put(fetchWorkOrdersRequest(undefined))
  } catch (error: any) {
    const errorMsg = extractApiErrorMessage(error, 'Không thể cập nhật lịch làm việc trên máy chủ')
    yield put(patchWorkOrderFailure(errorMsg))
    toast.error(errorMsg)
  }
}

/**
 * Worker saga mở tiếp giai đoạn mới (follow-up)
 */
function* handleFollowUpWorkOrder(
  action: PayloadAction<{
    parentWorkOrderId: string
    payload: FollowUpWorkOrderRequest
    nextPhaseLabel?: string
  }>
) {
  const { parentWorkOrderId, payload, nextPhaseLabel } = action.payload
  try {
    yield call(workScheduleAPI.followUpWorkOrder, parentWorkOrderId, payload)
    yield put(followUpWorkOrderSuccess())
    yield put(closeCaseDetail())
    toast.success(`✓ Đã mở tiếp ${nextPhaseLabel || 'giai đoạn tiếp theo'} cho mã lệnh công tác trên máy chủ!`)
    yield put(fetchWorkOrdersRequest(undefined))
  } catch (error: any) {
    const errorMsg = extractApiErrorMessage(error, 'Không thể mở giai đoạn tiếp theo trên máy chủ')
    yield put(followUpWorkOrderFailure(errorMsg))
    toast.error(errorMsg)
  }
}

/**
 * Worker saga nghiệm thu và chuyển Superior
 */
function* handleVerifyWorkOrder(
  action: PayloadAction<{
    workOrderId: string
    note?: string
    materials_note?: string
  }>
) {
  const { workOrderId, note, materials_note } = action.payload
  try {
    yield call(workScheduleAPI.verifyWorkOrder, workOrderId, { note, materials_note })
    yield put(verifyWorkOrderSuccess())
    if (materials_note) {
      yield put(closeCaseDetail())
      toast.success('🎉 Đã duyệt nghiệm thu sửa chữa và gửi báo cáo lên Cấp trên thành công!')
    } else {
      toast.success('🎉 Đã duyệt nghiệm thu báo cáo công tác thành công!')
    }
    yield put(fetchWorkOrdersRequest(undefined))
  } catch (error: any) {
    const errorMsg = extractApiErrorMessage(error, 'Không thể duyệt nghiệm thu trên máy chủ')
    yield put(verifyWorkOrderFailure(errorMsg))
    toast.error(errorMsg)
  }
}

/**
 * Worker saga hủy lệnh công tác / đóng sự vụ
 */
function* handleCancelWorkOrder(
  action: PayloadAction<{
    workOrderId: string
    note?: string
    successMessage?: string
  }>
) {
  const { workOrderId, note, successMessage } = action.payload
  try {
    yield call(workScheduleAPI.cancelWorkOrder, workOrderId, { note })
    yield put(cancelWorkOrderSuccess())
    yield put(closeCaseDetail())
    toast.info(successMessage || `Đã hủy lịch công tác [${workOrderId}] thành công!`)
    yield put(fetchWorkOrdersRequest(undefined))
  } catch (error: any) {
    const errorMsg = extractApiErrorMessage(error, 'Không thể hủy sự vụ trên máy chủ')
    yield put(cancelWorkOrderFailure(errorMsg))
    toast.error(errorMsg)
  }
}

/**
 * Worker saga yêu cầu kỹ sư làm lại
 */
function* handleReturnWorkOrder(
  action: PayloadAction<{
    workOrderId: string
    note: string
  }>
) {
  const { workOrderId, note } = action.payload
  try {
    yield call(workScheduleAPI.returnWorkOrder, workOrderId, { note })
    yield put(returnWorkOrderSuccess())
    yield put(closeCaseDetail())
    toast.success('✓ Đã gửi yêu cầu làm lại cho Kỹ sư hiện trường trên máy chủ!')
    yield put(fetchWorkOrdersRequest(undefined))
  } catch (error: any) {
    const errorMsg = extractApiErrorMessage(error, 'Không thể gửi yêu cầu làm lại trên máy chủ')
    yield put(returnWorkOrderFailure(errorMsg))
    toast.error(errorMsg)
  }
}

/**
 * Worker saga từ chối (bác bỏ) yêu cầu xin hủy lịch của kỹ sư
 */
function* handleRejectCancellation(
  action: PayloadAction<{
    workOrderId: string
    rejectReason: string
  }>
) {
  const { workOrderId, rejectReason } = action.payload
  try {
    const updated: WorkOrderDetail = yield call(
      workScheduleAPI.rejectCancellation,
      workOrderId,
      rejectReason
    )
    yield put(rejectCancellationSuccess(updated))
    toast.success('✓ Đã gửi phản hồi từ chối yêu cầu hủy về cho Kỹ sư hiện trường!')
    yield put(fetchWorkOrdersRequest(undefined))
    yield put(fetchWorkOrderDetailRequest(workOrderId))
  } catch (error: any) {
    const errorMsg = extractApiErrorMessage(error, 'Không thể gửi phản hồi từ chối yêu cầu hủy')
    yield put(rejectCancellationFailure(errorMsg))
    toast.error(errorMsg)
  }
}

export default function* workScheduleSaga() {
  yield all([
    takeLatest(fetchWorkOrdersRequest.type, handleFetchWorkOrders),
    takeLatest(fetchWorkOrderDetailRequest.type, handleFetchWorkOrderDetail),
    takeLatest(fetchAssigneesRequest.type, handleFetchAssignees),
    takeLatest(createWorkOrderRequest.type, handleCreateWorkOrder),
    takeLatest(patchWorkOrderRequest.type, handlePatchWorkOrder),
    takeLatest(followUpWorkOrderRequest.type, handleFollowUpWorkOrder),
    takeLatest(verifyWorkOrderRequest.type, handleVerifyWorkOrder),
    takeLatest(cancelWorkOrderRequest.type, handleCancelWorkOrder),
    takeLatest(returnWorkOrderRequest.type, handleReturnWorkOrder),
    takeLatest(rejectCancellationRequest.type, handleRejectCancellation),
  ])
}
