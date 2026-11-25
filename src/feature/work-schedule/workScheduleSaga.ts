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
import { fetchSegmentsList } from '../dashboard/dashboardAPI'
import type { SegmentListItem, SegmentDetail } from '../../types/assets/segments'
import type { SetPoleLocationRequest, PoleListItem, PoleListItemPagedResult } from '../../types/assets/poles'
import { fetchAssetsRequest } from '../assets/assetSlice'
import assetAPI from '../assets/assetAPI'
import { fetchMapLayersRequest } from '../map/mapSlice'
import {
  isSameLine,
  orderPolesByChain,
  orderedPolesOfSegment,
  VERTEX_MATCH_METERS,
  type OrderedPole,
} from '../../utils/gis-map/segmentPoleOrder'
import {
  calculateDistanceMeters,
  calculateRouteLengthMeters,
  parseLineStringWkt,
  projectPointOnSegment,
} from '../../utils/gis-map/routeUtils'
import {
  fetchWorkOrdersRequest,
  fetchWorkOrdersSuccess,
  fetchSegmentNamesSuccess,
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
  clearEditedGpsLocations,
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
      if (polesText) {
        return `Cột nằm ngoài hành lang tuyến đường cho phép: ${polesText}. Vui lòng mở Xem GIS để điều chỉnh lại.`
      }
      const distM = typeof details?.distance_m === 'number' ? details.distance_m : undefined
      const corrM = typeof details?.corridor_m === 'number' ? details.corridor_m : undefined
      if (distM !== undefined && corrM !== undefined) {
        return `Vị trí cột điều chỉnh cách tuyến ${distM.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} m, nằm ngoài hành lang cho phép (${corrM.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} m) quanh tuyến đường.`
      }
      if (distM !== undefined) {
        return `Vị trí cột điều chỉnh cách tuyến ${distM.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} m, nằm ngoài hành lang tuyến đường cho phép.`
      }
      return 'Tọa độ cột nằm ngoài phạm vi hành lang tuyến đường cho phép (tối đa 25 m).'
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

    if (code === 'VALIDATION_FAILED') {
      const field = typeof details?.field === 'string' ? details.field : ''
      const fieldMessages: Record<string, string> = {
        pole_ids: 'Danh sách cột được chọn không hợp lệ (từ 1 đến 200 cột thuộc cùng tuyến đường).',
        segment_id: 'Tuyến đường được chọn không hợp lệ.',
        segment_ids: 'Danh sách tuyến đường khảo sát không hợp lệ.',
        title: 'Tiêu đề phiếu công tác không hợp lệ (từ 1 đến 200 ký tự).',
        scheduled_date: 'Ngày thực hiện không hợp lệ (không được sau hạn hoàn thành).',
        due_date: 'Hạn hoàn thành không hợp lệ.',
        pole_locations: 'Dữ liệu tọa độ GPS báo cáo không hợp lệ.',
        lat: 'Vĩ độ (Lat) của cột đèn không hợp lệ (phải nằm trong khoảng -90 đến 90).',
        lng: 'Kinh độ (Lng) của cột đèn không hợp lệ (phải nằm trong khoảng -180 đến 180).',
        fault_ids: 'Danh sách sự cố được chọn không hợp lệ.',
        fault_outcomes: 'Kết quả kiểm tra sự cố không hợp lệ.',
        note: 'Nội dung ghi chú không hợp lệ (từ 1 đến 500 ký tự).',
      }
      if (field && fieldMessages[field]) {
        return fieldMessages[field]
      }
      return 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại các trường thông tin.'
    }

    if (code === 'POLE_VIDEO_NOT_VIEWED') {
      return 'Còn video báo cáo hiện trường chưa được mở xem. Vui lòng bấm "Xem Báo Cáo Hiện Trường Thực Địa" và phát video trước khi duyệt nghiệm thu.'
    }
    if (code === 'POLE_PHOTO_INCONCLUSIVE') {
      return 'Còn báo cáo cột đèn chưa được Kỹ sư hiện trường chốt trạng thái (Đèn sáng / Đèn tắt). Vui lòng bấm "Yêu cầu làm lại" để Kỹ sư cập nhật kết luận.'
    }
    if (
      code === 'POLE_PHOTOS_UNDECIDED' ||
      code === 'UNDECIDED_POLE_PHOTOS' ||
      code === 'POLE_PHOTO_UNDECIDED' ||
      Array.isArray(details?.photo_ids)
    ) {
      return 'Còn báo cáo ảnh/video cột đèn trong phiếu khảo sát chưa được xác nhận. Vui lòng kiểm tra báo cáo hiện trường hoặc yêu cầu kỹ sư cập nhật trước khi nghiệm thu.'
    }

    const mappedByCode: Record<string, string> = {
      INVALID_STATE_TRANSITION: 'Trạng thái phiếu công tác hiện tại không cho phép thực hiện thao tác này.',
      CONCURRENT_MODIFICATION: 'Phiếu công tác vừa được cập nhật ở nơi khác. Vui lòng tải lại và thử lại.',
      AFTER_EVIDENCE_REQUIRED: 'Cần có ảnh chụp sau sửa chữa trước khi hoàn tất phiếu.',
      NOTHING_TO_FOLLOW_UP: 'Không có cột đèn nào ghi nhận sự cố hợp lệ từ bước trước để tạo lịch tiếp theo.',
      POLE_PHOTO_ALREADY_DECIDED: 'Báo cáo cột đèn này đã được phê duyệt trước đó.',
      POLE_PHOTO_NOT_FOUND: 'Không tìm thấy dữ liệu ảnh/video báo cáo cột đèn.',
      POLE_PHOTO_TARGET_CHANGED: 'Thông tin cột đèn của báo cáo đã thay đổi trên hệ thống.',
      CROSS_COMMUNE_REFERENCE: 'Dữ liệu được chọn không thuộc cùng địa bàn xã/phường.',
      WORK_ORDER_NOT_FOUND: 'Không tìm thấy phiếu công tác hoặc bạn không có quyền truy cập.',
      ASSET_NOT_FOUND: 'Không tìm thấy tuyến đường hoặc cột đèn trong hệ thống.',
      POLE_NOT_FOUND: 'Không tìm thấy cột đèn trong hệ thống.',
      POLE_NOT_IN_WORK_ORDER: 'Cột đèn không nằm trong danh sách của phiếu công tác này.',
      WORK_ORDER_NOT_IN_PROGRESS: 'Phiếu công tác chưa ở trạng thái đang thực hiện.',
      EVIDENCE_KIND_NOT_ALLOWED: 'Loại ảnh bằng chứng không hợp lệ cho loại phiếu công tác này.',
      ATTACHMENT_NOT_ALLOWED: 'Loại phiếu công tác này không hỗ trợ đính kèm file PDF.',
      ATTACHMENT_LIMIT_REACHED: 'Đã đạt giới hạn tối đa 10 file PDF đính kèm cho phiếu này.',
      ATTACHMENT_NOT_FOUND: 'Không tìm thấy file đính kèm.',
      UPLOAD_TOO_LARGE: 'Dung lượng file tải lên vượt quá giới hạn cho phép.',
      UNSUPPORTED_MEDIA_TYPE: 'Định dạng file tải lên không hợp lệ (chỉ chấp nhận file PDF chuẩn).',
      UNSUPPORTED_IMAGE_FORMAT: 'Định dạng ảnh không hợp lệ (chỉ chấp nhận ảnh JPEG).',
      FAULT_NOT_FOUND: 'Không tìm thấy sự cố được chọn.',
      FAULT_STATUS_NOT_ELIGIBLE: 'Trạng thái sự cố hiện tại không hợp lệ để thực hiện thao tác này.',
      SERVER_OWNED_FIELD: 'Yêu cầu chứa trường dữ liệu do máy chủ quản lý không hợp lệ.',
      COMMUNE_FORBIDDEN: 'Bạn không có quyền thao tác trên địa bàn xã/phường này.',
      UNAUTHENTICATED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
      SURVEY_SCHEDULE_NOT_FOUND: 'Không tìm thấy lịch khảo sát định kỳ.',
      SURVEY_SCHEDULE_EXISTS: 'Tuyến đường này đã có lịch khảo sát định kỳ trùng ngày.',
      IDEMPOTENCY_CONFLICT: 'Thao tác bị trùng lặp hoặc xung đột dữ liệu. Vui lòng thử lại.',
      SERVER_BUSY: 'Máy chủ đang bận xử lý. Vui lòng thử lại sau giây lát.',
      INTERNAL_ERROR: 'Đã xảy ra lỗi hệ thống trên máy chủ. Vui lòng thử lại sau.',
    }

    if (code && mappedByCode[code]) {
      return mappedByCode[code]
    }

    return fallbackMessage
  }

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
    // Tên tuyến chỉ để hiển thị: không tải được thì lịch hiện mã tuyến
    const [firstPage, segments]: [WorkOrderItemPagedResult, SegmentListItem[]] = yield all([
      call(workScheduleAPI.getWorkOrders, effectiveFilter),
      call(fetchSegmentsList),
    ])
    const segmentNames: Record<string, string> = {}
    segments.forEach((s) => {
      if (s.segment_id && s.segment_name) segmentNames[s.segment_id] = s.segment_name
    })
    yield put(fetchSegmentNamesSuccess(segmentNames))
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
    if (requestPayload.task_kind === 'pole_gps_update' && requestPayload.segment_id) {
      yield put(fetchBusyGpsPolesRequest(requestPayload.segment_id))
    }
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
    // 1. Nếu mở từ ca khảo sát (chuyển tiếp sang inspection), tự động xác nhận toàn bộ ảnh cột đèn sang backend để tạo lỗi detected
    if (payload.task_kind === 'inspection') {
      yield call([workScheduleAPI, workScheduleAPI.confirmAllPendingPolePhotos], parentWorkOrderId)
    }

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

/** Backend giới hạn page_size ở 200 cho /assets/poles: đọc lần lượt từng trang tới hết. */
function* fetchAllAssetPoles() {
  const allPoles: PoleListItem[] = []
  for (let page = 1; page <= 20; page++) {
    const res = (yield call(assetAPI.getPoles, {
      page,
      page_size: 200,
    })) as PoleListItemPagedResult
    const items = res.items ?? []
    allPoles.push(...items)
    const total = typeof res.total === 'number' ? res.total : allPoles.length
    if (items.length === 0 || allPoles.length >= total) break
  }
  return allPoles
}

/**
 * Worker saga nghiệm thu và chuyển Superior
 */
function* handleVerifyWorkOrder(
  action: PayloadAction<{
    workOrderId: string
    note?: string
    materials_note?: string
    editedPoleLocations?: Record<string, SetPoleLocationRequest>
  }>
) {
  const { workOrderId, note, materials_note, editedPoleLocations } = action.payload
  try {
    const state: RootState = yield select()
    const beforePoles: PoleListItem[] = state.assets.poles || []
    const savedEdits: Record<string, SetPoleLocationRequest> =
      editedPoleLocations || state.workSchedule.editedGpsByWorkOrder?.[workOrderId] || {}
    const savedOrderIds: string[] =
      state.workSchedule.orderedGpsPolesByWorkOrder?.[workOrderId] || []
    const editEntries = Object.entries(savedEdits).filter(
      ([poleId, loc]) => Boolean(poleId) && typeof loc?.lat === 'number' && typeof loc?.lng === 'number'
    )

    // 1. Lấy chi tiết lệnh công tác hiện tại
    const currentDetail: WorkOrderDetail =
      state.workSchedule.workOrderDetail?.work_order_id === workOrderId
        ? state.workSchedule.workOrderDetail
        : yield call(workScheduleAPI.getWorkOrderDetail, workOrderId)

    // 1a. Tự động xác nhận ảnh khảo sát cột đèn (chỉ áp dụng cho phiếu survey) để Backend kích hoạt chuyển cột thành 'out' và tạo fault 'detected'
    if (!currentDetail?.task_kind || currentDetail.task_kind === 'survey') {
      yield call([workScheduleAPI, workScheduleAPI.confirmAllPendingPolePhotos], workOrderId)
    }

    // 1b. Với phiếu cập nhật vị trí cột (pole_gps_update) hoặc khi Quản lý có chỉnh sửa tọa độ:

    const reportedPoleLocations = currentDetail?.pole_locations || []
    const isPoleGpsOrderInitial =
      currentDetail?.task_kind === 'pole_gps_update' ||
      reportedPoleLocations.length > 0 ||
      editEntries.length > 0

    const stagedRollbackPoles: Array<{ poleMeta: PoleListItem; fallbackLoc?: SetPoleLocationRequest }> = []
    let currentAssetPoles: PoleListItem[] = beforePoles

    if (isPoleGpsOrderInitial && reportedPoleLocations.length > 0) {
      const missingAnyMeta = reportedPoleLocations.some(
        (rp) => rp.pole_id && !currentAssetPoles.some((p) => p.pole_id === rp.pole_id)
      )
      if (currentAssetPoles.length === 0 || missingAnyMeta) {
        currentAssetPoles = yield* fetchAllAssetPoles()
      }

      // Kiểm tra chống dính cột (< 2m) giữa các cột báo cáo với nhau VÀ với các cột cũ đã có GPS trên cùng tuyến đường
      const finalReportedCoords = reportedPoleLocations
        .filter((rp) => rp.pole_id && typeof rp.lat === 'number' && typeof rp.lng === 'number')
        .map((rp) => {
          const pid = rp.pole_id!
          const edited = savedEdits[pid]
          const lat = typeof edited?.lat === 'number' ? edited.lat : rp.lat!
          const lng = typeof edited?.lng === 'number' ? edited.lng : rp.lng!
          return { id: pid, coord: [lng, lat] as [number, number] }
        })
      const reportedIdSet = new Set(finalReportedCoords.map((item) => item.id))
      const checkSegmentId =
        currentDetail?.segment_id || state.workSchedule.workOrderDetail?.segment_id
      const existingSegmentPoles = checkSegmentId
        ? currentAssetPoles
            .filter(
              (p) =>
                p.segment_id === checkSegmentId &&
                p.pole_id &&
                !reportedIdSet.has(p.pole_id) &&
                p.location &&
                typeof p.location.lat === 'number' &&
                typeof p.location.lng === 'number' &&
                Number.isFinite(p.location.lat) &&
                Number.isFinite(p.location.lng)
            )
            .map((p) => ({
              id: p.external_ref || p.pole_id!,
              coord: [p.location!.lng, p.location!.lat] as [number, number],
            }))
        : []

      for (let i = 0; i < finalReportedCoords.length; i++) {
        for (let j = i + 1; j < finalReportedCoords.length; j++) {
          const dist = calculateDistanceMeters(
            finalReportedCoords[i].coord,
            finalReportedCoords[j].coord
          )
          if (dist < 2) {
            const msg = `Cột ${finalReportedCoords[i].id} và ${finalReportedCoords[j].id} đang quá sát hoặc trùng vị trí (${dist.toFixed(1)} m < 2 m). Vui lòng mở "Xem GIS" để kéo tách vị trí từng cột trước khi Duyệt!`
            yield put(verifyWorkOrderFailure(msg))
            toast.error(msg)
            return
          }
        }
        for (const existingPole of existingSegmentPoles) {
          const dist = calculateDistanceMeters(finalReportedCoords[i].coord, existingPole.coord)
          if (dist < 2) {
            const msg = `Cột ${finalReportedCoords[i].id} đang quá sát hoặc trùng vị trí với cột ${existingPole.id} trên tuyến (${dist.toFixed(1)} m < 2 m). Vui lòng mở "Xem GIS" để kéo chỉnh lại vị trí trước khi Duyệt!`
            yield put(verifyWorkOrderFailure(msg))
            toast.error(msg)
            return
          }
        }
      }

      for (const reportedLoc of reportedPoleLocations) {
        const poleId = reportedLoc.pole_id
        if (
          !poleId ||
          typeof reportedLoc.lat !== 'number' ||
          typeof reportedLoc.lng !== 'number'
        ) {
          continue
        }
        const poleMeta = currentAssetPoles.find((p) => p.pole_id === poleId)
        if (!poleMeta) continue

        yield call(assetAPI.updatePole, poleId, {
          external_ref: poleMeta.external_ref,
          segment_id: poleMeta.segment_id,
          feeder_id: poleMeta.feeder_id,
          feeder_source: poleMeta.feeder_source,
          geom_wkt: `POINT(${reportedLoc.lng} ${reportedLoc.lat})`,
          near_sensitive_poi: poleMeta.near_sensitive_poi,
          data_source: poleMeta.data_source,
          note: poleMeta.note,
        })
        stagedRollbackPoles.push({
          poleMeta,
          fallbackLoc: savedEdits[poleId] || { lat: reportedLoc.lat, lng: reportedLoc.lng },
        })
      }
    }

    // 2. Nghiệm thu lệnh công tác trên Backend (nếu bị từ chối vì lý do khác, tự động hoàn tác vị trí các cột đã đồng bộ tạm ở bước 1b)
    let verifiedDetail: WorkOrderDetail
    try {
      verifiedDetail = yield call(workScheduleAPI.verifyWorkOrder, workOrderId, {
        note,
        materials_note,
      })
    } catch (verifyErr: unknown) {
      for (const item of stagedRollbackPoles) {
        if (item.poleMeta.pole_id) {
          try {
            const origLoc = item.poleMeta.location
            if (origLoc && typeof origLoc.lat === 'number' && typeof origLoc.lng === 'number') {
              yield call(assetAPI.updatePole, item.poleMeta.pole_id, {
                external_ref: item.poleMeta.external_ref,
                segment_id: item.poleMeta.segment_id,
                feeder_id: item.poleMeta.feeder_id,
                feeder_source: item.poleMeta.feeder_source,
                geom_wkt: `POINT(${origLoc.lng} ${origLoc.lat})`,
                near_sensitive_poi: item.poleMeta.near_sensitive_poi,
                data_source: item.poleMeta.data_source,
                note: item.poleMeta.note,
              })
            } else if (item.fallbackLoc) {
              yield call(assetAPI.setPoleLocation, item.poleMeta.pole_id, {
                lat: item.fallbackLoc.lat,
                lng: item.fallbackLoc.lng,
              })
            }
          } catch {
            // Bỏ qua lỗi phụ khi rollback
          }
        }
      }
      throw verifyErr
    }

    // 3. Nếu Quản lý có kéo thả tinh chỉnh tọa độ trong Xem GIS, cập nhật tạm bằng updatePole trước để tất cả cột nằm đúng trên đường tuyến mới khi gọi updateSegment
    for (const [poleId, loc] of editEntries) {
      const poleMeta = currentAssetPoles.find((p) => p.pole_id === poleId)
      if (poleMeta) {
        try {
          yield call(assetAPI.updatePole, poleId, {
            external_ref: poleMeta.external_ref,
            segment_id: poleMeta.segment_id,
            feeder_id: poleMeta.feeder_id,
            feeder_source: poleMeta.feeder_source,
            geom_wkt: `POINT(${loc.lng} ${loc.lat})`,
            near_sensitive_poi: poleMeta.near_sensitive_poi,
            data_source: poleMeta.data_source,
            note: poleMeta.note,
          })
        } catch {
          // Bỏ qua nếu không cập nhật tạm được
        }
      }
    }

    // 4. Với phiếu cập nhật vị trí cột (pole_gps_update), tự động nối tuần tự từng cột theo thứ tự Quản lý đã chọn và cập nhật lại hình học tuyến đường (geom_wkt)
    const targetSegmentId =
      verifiedDetail?.segment_id || currentDetail?.segment_id || state.workSchedule.workOrderDetail?.segment_id
    const isPoleGpsOrder =
      verifiedDetail?.task_kind === 'pole_gps_update' ||
      currentDetail?.task_kind === 'pole_gps_update' ||
      state.workSchedule.workOrderDetail?.task_kind === 'pole_gps_update'
    if (isPoleGpsOrder && targetSegmentId) {
      try {
        const [segDetail, allAfterPoles]: [SegmentDetail, PoleListItem[]] = yield all([
          call(assetAPI.getSegmentDetail, targetSegmentId),
          call(fetchAllAssetPoles),
        ])
        const previous = orderedPolesOfSegment(beforePoles, targetSegmentId)
        const after = orderedPolesOfSegment(allAfterPoles, targetSegmentId)

        // Xác định danh sách cột báo cáo theo đúng thứ tự tuần tự mà Quản lý đã chọn trong Xem GIS
        const rawReportedIds = reportedPoleLocations
          .map((rp) => rp.pole_id)
          .filter((id): id is string => Boolean(id))
        const orderedReportedIds =
          savedOrderIds.length > 0
            ? [
                ...savedOrderIds.filter((id) => rawReportedIds.includes(id)),
                ...rawReportedIds.filter((id) => !savedOrderIds.includes(id)),
              ]
            : rawReportedIds
        const reportedSet = new Set(orderedReportedIds)

        const baseLine = parseLineStringWkt(segDetail.geom_wkt)
        let newCoords: [number, number][] = []

        interface RouteNode {
          id?: string
          coord: [number, number]
        }

        let nodes: RouteNode[] = []
        if (baseLine.length >= 2) {
          const usedPrevIds = new Set<string>()
          nodes = baseLine.map((vertex) => {
            const matchedPrev = previous.find(
              (p) =>
                !usedPrevIds.has(p.id) &&
                calculateDistanceMeters(p.coord, vertex) <= VERTEX_MATCH_METERS
            )
            if (matchedPrev) {
              usedPrevIds.add(matchedPrev.id)
              return { id: matchedPrev.id, coord: vertex }
            }
            return { coord: vertex }
          })
          nodes = nodes.filter((n) => !n.id || !reportedSet.has(n.id))
        } else {
          const staticAfter = after.filter((p) => !reportedSet.has(p.id))
          if (staticAfter.length >= 2) {
            nodes = orderPolesByChain(staticAfter).map((p) => ({ id: p.id, coord: p.coord }))
          } else if (staticAfter.length === 1) {
            nodes = [{ id: staticAfter[0].id, coord: staticAfter[0].coord }]
          }
        }

        // Lần lượt nối từng cột báo cáo theo đúng thứ tự tuần tự (Bước 1 -> Bước 2 -> ...)
        const polesToInsert: OrderedPole[] =
          orderedReportedIds.length > 0
            ? orderedReportedIds
                .map((pid) => after.find((p) => p.id === pid))
                .filter((p): p is OrderedPole => Boolean(p))
            : after

        let chainDir: -1 | 1 = 1

        polesToInsert.forEach((pole, stepIdx) => {
          const existingIdx = nodes.findIndex((n) => n.id === pole.id)
          if (existingIdx !== -1) {
            nodes = nodes.filter((_, idx) => idx !== existingIdx)
          }
          if (nodes.length === 0) {
            nodes = [{ id: pole.id, coord: pole.coord }]
            return
          }
          if (nodes.length === 1) {
            nodes = [...nodes, { id: pole.id, coord: pole.coord }]
            chainDir = 1
            return
          }

          const prevStepPoleId = stepIdx > 0 ? polesToInsert[stepIdx - 1]?.id : null
          const prevNodeIdx = prevStepPoleId ? nodes.findIndex((n) => n.id === prevStepPoleId) : -1

          if (prevNodeIdx !== -1) {
            if (stepIdx === 1) {
              if (prevNodeIdx === nodes.length - 1) {
                chainDir = 1
              } else if (prevNodeIdx === 0) {
                chainDir = -1
              } else {
                const prevPt = nodes[prevNodeIdx - 1].coord
                const nextPt = nodes[prevNodeIdx + 1].coord
                const costAfter =
                  calculateDistanceMeters(nodes[prevNodeIdx].coord, pole.coord) +
                  calculateDistanceMeters(pole.coord, nextPt) -
                  calculateDistanceMeters(nodes[prevNodeIdx].coord, nextPt)
                const costBefore =
                  calculateDistanceMeters(prevPt, pole.coord) +
                  calculateDistanceMeters(pole.coord, nodes[prevNodeIdx].coord) -
                  calculateDistanceMeters(prevPt, nodes[prevNodeIdx].coord)
                chainDir = costBefore < costAfter ? -1 : 1
              }
            }

            if (chainDir === -1) {
              nodes = [
                ...nodes.slice(0, prevNodeIdx),
                { id: pole.id, coord: pole.coord },
                ...nodes.slice(prevNodeIdx),
              ]
            } else {
              nodes = [
                ...nodes.slice(0, prevNodeIdx + 1),
                { id: pole.id, coord: pole.coord },
                ...nodes.slice(prevNodeIdx + 1),
              ]
            }
            return
          }

          let bestIdx = 0
          let bestT = 0
          let bestDist = Infinity
          for (let i = 0; i < nodes.length - 1; i++) {
            const proj = projectPointOnSegment(pole.coord, nodes[i].coord, nodes[i + 1].coord)
            if (proj.dist < bestDist) {
              bestDist = proj.dist
              bestIdx = i
              bestT = proj.t
            }
          }
          const lastEdgeIdx = nodes.length - 2
          const dStart = calculateDistanceMeters(pole.coord, nodes[0].coord)
          const dEnd = calculateDistanceMeters(pole.coord, nodes[nodes.length - 1].coord)

          if (bestIdx === 0 && bestT <= 0) {
            nodes = [{ id: pole.id, coord: pole.coord }, ...nodes]
            chainDir = -1
          } else if (bestIdx === lastEdgeIdx && bestT >= 1) {
            nodes = [...nodes, { id: pole.id, coord: pole.coord }]
            chainDir = 1
          } else if (bestDist > 25 && (dStart <= dEnd ? bestIdx === 0 : bestIdx === lastEdgeIdx)) {
            if (dStart < dEnd) {
              nodes = [{ id: pole.id, coord: pole.coord }, ...nodes]
              chainDir = -1
            } else {
              nodes = [...nodes, { id: pole.id, coord: pole.coord }]
              chainDir = 1
            }
          } else {
            nodes = [
              ...nodes.slice(0, bestIdx + 1),
              { id: pole.id, coord: pole.coord },
              ...nodes.slice(bestIdx + 1),
            ]
            chainDir = 1
          }
        })

        // Khử các đỉnh trùng nhau liên tiếp (< 0.05m) để LineString WKT luôn hợp lệ trong PostGIS / NetTopologySuite
        const rawCoords = nodes.map((n) => n.coord)
        newCoords = rawCoords.filter(
          (pt, idx) => idx === 0 || calculateDistanceMeters(rawCoords[idx - 1], pt) >= 0.05
        )

        if (newCoords.length >= 2) {
          const newWkt = `LINESTRING(${newCoords.map((c) => `${c[0]} ${c[1]}`).join(', ')})`
          const newLengthM = Math.max(1, Math.round(calculateRouteLengthMeters(newCoords)))
          if (!isSameLine(newWkt, segDetail.geom_wkt)) {
            const seg = segDetail.segment
            yield call(assetAPI.updateSegment, targetSegmentId, {
              external_ref: seg.external_ref,
              segment_name: seg.segment_name,
              road_class: seg.road_class,
              length_m: newLengthM,
              geom_wkt: newWkt,
              data_source: seg.data_source,
            })
          }
        }
      } catch {
        // Nếu không cập nhật được hình tuyến phụ thì vẫn giữ kết quả duyệt cột thành công
      }
    }

    // 5. Ghi chính thức tọa độ Quản lý đã tinh chỉnh lên từng cột đèn qua PUT /poles/{id}/location kèm bản ghi Audit (lúc này đường tuyến đã nối qua cột nên luôn thỏa mãn <= 25m)
    let adjustedCount = 0
    const failedAdjustments: string[] = []
    for (const [poleId, loc] of editEntries) {
      try {
        yield call(assetAPI.setPoleLocation, poleId, { lat: loc.lat, lng: loc.lng })
        adjustedCount += 1
      } catch (locErr: unknown) {
        const locMsg = extractApiErrorMessage(
          locErr,
          `Không thể áp dụng tọa độ tinh chỉnh cho cột ${poleId}`
        )
        failedAdjustments.push(`${poleId}: ${locMsg}`)
      }
    }

    if (editEntries.length > 0 || savedOrderIds.length > 0) {
      yield put(clearEditedGpsLocations(workOrderId))
    }

    yield put(verifyWorkOrderSuccess())
    if (failedAdjustments.length > 0) {
      toast.warning(
        `Đã duyệt báo cáo nhưng không thể lưu tọa độ tinh chỉnh cho ${failedAdjustments.length} cột — ${failedAdjustments.join('; ')}`
      )
    } else if (
      currentDetail?.task_kind === 'repair' ||
      verifiedDetail?.task_kind === 'repair' ||
      materials_note
    ) {
      yield put(closeCaseDetail())
      toast.success('🎉 Đã duyệt nghiệm thu sửa chữa và gửi báo cáo lên Cấp trên thành công!')
    } else if (adjustedCount > 0) {
      toast.success(
        `🎉 Đã duyệt báo cáo GPS và cập nhật tọa độ tinh chỉnh của ${adjustedCount} cột lên bản đồ GIS!`
      )
    } else {
      toast.success('🎉 Đã duyệt nghiệm thu báo cáo công tác thành công!')
    }
    yield put(fetchWorkOrdersRequest(undefined))
    yield put(fetchWorkOrderDetailRequest(workOrderId))
    // Đồng bộ lại dữ liệu lỗi, tài sản cột đèn (GPS) và bản đồ GIS thật
    yield put(fetchDashboardDataRequest())
    yield put(fetchAssetsRequest())
    yield put(fetchMapLayersRequest())
  } catch (error: unknown) {
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
