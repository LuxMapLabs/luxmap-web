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
import { fetchDashboardDataRequest } from '../dashboard/dashboardSlice'
import { fetchAssetsRequest } from '../assets/assetSlice'
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
  fetchBusyGpsPolesRequest,
  fetchBusyGpsPolesSuccess,
  fetchBusyGpsPolesFailure,
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

interface ApiErrorDetailPole {
  pole_id?: string
  segment_id?: string
  distance_m?: number
  corridor_m?: number
}

interface ApiErrorPayload {
  code?: string
  message?: string
  details?: Record<string, unknown>
}

interface ApiResponseErrorShape {
  response?: {
    data?: {
      error?: string | ApiErrorPayload
      message?: string
      title?: string
    }
  }
  message?: string
}

function formatDetailValue(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) {
    return value.map((item) => formatDetailValue(item)).filter(Boolean).join(', ')
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

function formatOffSegmentPoles(rawPoles: unknown): string {
  if (!Array.isArray(rawPoles) || rawPoles.length === 0) return ''
  return rawPoles
    .map((item) => {
      if (typeof item !== 'object' || item === null) return String(item)
      const p = item as ApiErrorDetailPole
      const poleId = p.pole_id || 'Không rõ'
      if (typeof p.distance_m === 'number' && typeof p.corridor_m === 'number') {
        return `${poleId} (lệch ${p.distance_m}m / tối đa ${p.corridor_m}m)`
      }
      if (typeof p.distance_m === 'number') {
        return `${poleId} (lệch ${p.distance_m}m)`
      }
      return poleId
    })
    .join(', ')
}

function extractApiErrorMessage(err: unknown, fallbackMessage: string): string {
  const errObj = (err && typeof err === 'object' ? err : {}) as ApiResponseErrorShape
  const errData = errObj.response?.data
  const apiError = errData?.error
  if (typeof apiError === 'string') return apiError

  if (apiError && typeof apiError === 'object') {
    const details = apiError.details && typeof apiError.details === 'object' ? apiError.details : undefined
    const code = apiError.code

    if (code === 'POLE_OFF_SEGMENT') {
      const polesText = formatOffSegmentPoles(details?.poles)
      return polesText
        ? `Cột nằm ngoài phạm vi tuyến đường: ${polesText}`
        : 'Tọa độ cột nằm ngoài phạm vi tuyến đường cho phép.'
    }
    if (code === 'POLE_ALREADY_IN_WORK_ORDER') {
      const poleId = typeof details?.pole_id === 'string' ? details.pole_id : ''
      const woId = typeof details?.work_order_id === 'string' ? details.work_order_id : ''
      if (poleId && woId) {
        return `Cột ${poleId} đang nằm trong một phiếu công tác khác (${woId}).`
      }
      return 'Cột được chọn đang nằm trong một phiếu công tác khác chưa đóng.'
    }
    if (code === 'FAULT_ALREADY_IN_WORK_ORDER') {
      const faultId = typeof details?.fault_id === 'string' ? details.fault_id : ''
      const woId = typeof details?.work_order_id === 'string' ? details.work_order_id : ''
      if (faultId && woId) {
        return `Sự cố ${faultId} đang nằm trong một phiếu công tác khác (${woId}).`
      }
      return 'Sự cố được chọn đang được xử lý trong một phiếu công tác khác.'
    }

    const mappedByCode: Record<string, string> = {
      INVALID_STATE_TRANSITION: 'Trạng thái phiếu công tác hiện tại không cho phép thực hiện thao tác này.',
      CONCURRENT_MODIFICATION: 'Phiếu công tác vừa được cập nhật ở nơi khác. Vui lòng tải lại và thử lại.',
      AFTER_EVIDENCE_REQUIRED: 'Cần có ảnh chụp sau sửa chữa trước khi hoàn tất phiếu.',
      NOTHING_TO_FOLLOW_UP: 'Không có sự cố hoặc hạng mục nào đủ điều kiện để tạo bước tiếp theo.',
      CROSS_COMMUNE_REFERENCE: 'Dữ liệu được chọn không thuộc cùng địa bàn xã/phường.',
      WORK_ORDER_NOT_FOUND: 'Không tìm thấy phiếu công tác.',
      ASSET_NOT_FOUND: 'Không tìm thấy tuyến đường hoặc cột đèn trong hệ thống.',
      FAULT_NOT_FOUND: 'Không tìm thấy sự cố được chọn.',
      FAULT_STATUS_NOT_ELIGIBLE: 'Trạng thái sự cố hiện tại không hợp lệ để thực hiện thao tác này.',
      VALIDATION_FAILED: 'Dữ liệu gửi lên không hợp lệ.',
    }

    if (code && mappedByCode[code]) {
      return mappedByCode[code]
    }

    if (apiError.message) {
      if (details) {
        const detailEntries = Object.entries(details).filter(([k]) => k !== 'correlation_id')
        if (detailEntries.length > 0) {
          const detailStr = detailEntries
            .map(([k, v]) => `${k}: ${formatDetailValue(v)}`)
            .join('; ')
          return `${apiError.message} (${detailStr})`
        }
      }
      return apiError.message
    }
    if (code) return code
  }

  if (errData?.message) return errData.message
  if (errData?.title) return errData.title
  if (errObj.message) return errObj.message
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
    const firstPage: WorkOrderItemPagedResult = yield call(
      workScheduleAPI.getWorkOrders,
      effectiveFilter
    )
    const allItems = [...(firstPage.items || [])]
    const total = firstPage.total ?? allItems.length
    const pageSize = firstPage.page_size || 50
    let currentPage = firstPage.page || 1

    // Tải tiếp các trang còn lại nếu tháng có nhiều hơn 1 trang lệnh công tác (tối đa 10 trang)
    while (allItems.length < total && currentPage < 10) {
      currentPage += 1
      const nextPage: WorkOrderItemPagedResult = yield call(workScheduleAPI.getWorkOrders, {
        ...effectiveFilter,
        page: currentPage,
      })
      const nextItems = nextPage.items || []
      if (nextItems.length === 0) break
      allItems.push(...nextItems)
      if (nextItems.length < pageSize) break
    }

    yield put(
      fetchWorkOrdersSuccess({
        ...firstPage,
        items: allItems,
        total,
      })
    )
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
function* handleCreateWorkOrder(
  action: PayloadAction<{ request: CreateWorkOrderRequest; attachmentFiles?: File[] }>
) {
  try {
    const { request: requestPayload, attachmentFiles } = action.payload
    const created: WorkOrderDetail = yield call(workScheduleAPI.createWorkOrder, requestPayload)

    let failedUploads = 0
    if (attachmentFiles && attachmentFiles.length > 0 && created?.work_order_id) {
      for (const file of attachmentFiles) {
        try {
          yield call(workScheduleAPI.uploadAttachment, created.work_order_id, file)
        } catch {
          failedUploads += 1
        }
      }
    }

    yield put(createWorkOrderSuccess())
    if (failedUploads > 0) {
      toast.warning(
        `Đã tạo lệnh công tác nhưng có ${failedUploads}/${attachmentFiles?.length || 0} file PDF tải lên thất bại.`
      )
    } else {
      toast.success('Đã tạo thành công lệnh công tác mới trên máy chủ!')
    }
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
    yield put(fetchWorkOrderDetailRequest(workOrderId))
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
    // 1. Nếu mở từ ca khảo sát, tự động xác nhận toàn bộ ảnh cột đèn sang backend để tạo lỗi detected
    yield call([workScheduleAPI, workScheduleAPI.confirmAllPendingPolePhotos], parentWorkOrderId)

    yield call(workScheduleAPI.followUpWorkOrder, parentWorkOrderId, payload)
    yield put(followUpWorkOrderSuccess())
    yield put(closeCaseDetail())
    toast.success(`✓ Đã mở tiếp ${nextPhaseLabel || 'giai đoạn tiếp theo'} cho mã lệnh công tác trên máy chủ!`)
    yield put(fetchWorkOrdersRequest(undefined))
    // Đồng bộ lại dữ liệu lỗi và bản đồ GIS
    yield put(fetchDashboardDataRequest())
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
    // 1. Tự động xác nhận ảnh khảo sát cột đèn (nếu có) để Backend kích hoạt chuyển cột thành 'out' và tạo fault 'detected'
    yield call([workScheduleAPI, workScheduleAPI.confirmAllPendingPolePhotos], workOrderId)

    // 2. Nghiệm thu lệnh công tác trên Backend (Inspection -> faults thành confirmed; Repair -> faults thành resolved/verified)
    yield call(workScheduleAPI.verifyWorkOrder, workOrderId, { note, materials_note })
    yield put(verifyWorkOrderSuccess())
    if (materials_note) {
      yield put(closeCaseDetail())
      toast.success('🎉 Đã duyệt nghiệm thu sửa chữa và gửi báo cáo lên Cấp trên thành công!')
    } else {
      toast.success('🎉 Đã duyệt nghiệm thu báo cáo công tác thành công!')
    }
    yield put(fetchWorkOrdersRequest(undefined))
    yield put(fetchWorkOrderDetailRequest(workOrderId))
    // Đồng bộ lại dữ liệu lỗi, tài sản cột đèn (GPS) và bản đồ GIS
    yield put(fetchDashboardDataRequest())
    yield put(fetchAssetsRequest())
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

/**
 * Worker saga tải danh sách cột đang nằm trong phiếu pole_gps_update chưa đóng theo tuyến
 */
function* handleFetchBusyGpsPoles(action: PayloadAction<string>) {
  const segmentId = action.payload
  try {
    const busy = new Set<string>()
    let page = 1
    while (page <= 20) {
      const res: WorkOrderItemPagedResult = yield call(workScheduleAPI.getWorkOrders, {
        task_kind: 'pole_gps_update',
        segment_id: segmentId,
        page,
      })
      const items = res.items || []
      for (const wo of items) {
        if (wo.wo_status !== 'verified' && wo.wo_status !== 'cancelled') {
          for (const pid of wo.pole_ids || []) {
            if (pid) busy.add(pid)
          }
        }
      }
      const pageSize = res.page_size || 50
      const total = res.total ?? 0
      if (items.length === 0 || page * pageSize >= total) break
      page += 1
    }
    yield put(fetchBusyGpsPolesSuccess(Array.from(busy)))
  } catch (error: any) {
    const errorMsg = extractApiErrorMessage(
      error,
      'Không thể kiểm tra các cột đang nằm trong phiếu cập nhật vị trí khác'
    )
    yield put(fetchBusyGpsPolesFailure(errorMsg))
  }
}

export default function* workScheduleSaga() {
  yield all([
    takeLatest(fetchWorkOrdersRequest.type, handleFetchWorkOrders),
    takeLatest(fetchWorkOrderDetailRequest.type, handleFetchWorkOrderDetail),
    takeLatest(fetchAssigneesRequest.type, handleFetchAssignees),
    takeLatest(fetchBusyGpsPolesRequest.type, handleFetchBusyGpsPoles),
    takeLatest(createWorkOrderRequest.type, handleCreateWorkOrder),
    takeLatest(patchWorkOrderRequest.type, handlePatchWorkOrder),
    takeLatest(followUpWorkOrderRequest.type, handleFollowUpWorkOrder),
    takeLatest(verifyWorkOrderRequest.type, handleVerifyWorkOrder),
    takeLatest(cancelWorkOrderRequest.type, handleCancelWorkOrder),
    takeLatest(returnWorkOrderRequest.type, handleReturnWorkOrder),
    takeLatest(rejectCancellationRequest.type, handleRejectCancellation),
  ])
}
