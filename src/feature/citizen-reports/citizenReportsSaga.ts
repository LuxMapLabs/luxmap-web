import { call, put, takeLatest } from 'redux-saga/effects'
import { toast } from 'sonner'
import {
  citizenReportsAPI,
  CitizenReportsListParams,
} from './citizenReportsAPI'
import {
  fetchReportsRequest,
  fetchReportsSuccess,
  fetchReportsFailure,
  fetchPendingCountRequest,
  fetchPendingCountSuccess,
  fetchReportDetailRequest,
  fetchReportDetailSuccess,
  fetchReportDetailFailure,
  acceptReportRequest,
  acceptReportSuccess,
  acceptReportFailure,
  mergeReportRequest,
  mergeReportSuccess,
  mergeReportFailure,
  rejectReportRequest,
  rejectReportSuccess,
  rejectReportFailure,
} from './citizenReportsSlice'
import type {
  CitizenReportItemPagedResult,
  CitizenReportDetail,
} from '../../types/citizen-reports/citizen-reports'

// 1. Worker fetch toàn bộ danh sách phản ánh công dân (hỗ trợ lọc client-side)
function* handleFetchReports(): Generator<any, void, any> {
  try {
    const params: CitizenReportsListParams = {
      status: 'pending,accepted,merged,rejected',
      page: 1,
      page_size: 200,
    }
    const result: CitizenReportItemPagedResult = yield call(citizenReportsAPI.list, params)

    yield put(
      fetchReportsSuccess({
        items: result.items || [],
        total: result.total || (result.items ? result.items.length : 0),
        page: 1,
        pageSize: 10,
      })
    )
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error?.message ||
      'Không thể tải danh sách phản ánh công dân.'
    yield put(fetchReportsFailure(msg))
    toast.error(msg)
  }
}

// 2. Worker fetch số lượng pending cho badge
function* handleFetchPendingCount(): Generator<any, void, any> {
  try {
    const result: CitizenReportItemPagedResult = yield call(citizenReportsAPI.list, {
      status: 'pending',
      page: 1,
      page_size: 1,
    })
    yield put(fetchPendingCountSuccess(result.total || 0))
  } catch (error) {
    // Silent fail cho badge để không làm gián đoạn UI
  }
}

// 3. Worker fetch chi tiết phản ánh
function* handleFetchReportDetail(
  action: ReturnType<typeof fetchReportDetailRequest>
): Generator<any, void, any> {
  try {
    const detail: CitizenReportDetail = yield call(citizenReportsAPI.detail, action.payload)
    yield put(fetchReportDetailSuccess(detail))
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error?.message ||
      'Không thể tải chi tiết phản ánh công dân.'
    yield put(fetchReportDetailFailure(msg))
    toast.error(msg)
  }
}

// 4. Worker xử lý Chấp thuận (Accept)
function* handleAcceptReport(
  action: ReturnType<typeof acceptReportRequest>
): Generator<any, void, any> {
  const { reportId, data } = action.payload
  try {
    const updated: CitizenReportDetail = yield call(citizenReportsAPI.accept, reportId, data)
    yield put(acceptReportSuccess(updated))
    toast.success('Đã chấp thuận phản ánh và tạo sự cố chiếu sáng thành công!')
    // Tải lại danh sách và badge
    yield put(fetchReportsRequest())
    yield put(fetchPendingCountRequest())
  } catch (error: any) {
    const status = error?.response?.status
    const errorData = error?.response?.data

    if (status === 409) {
      if (errorData?.code === 'CITIZEN_REPORT_CHANGED' || errorData?.detail?.includes('changed')) {
        toast.warning(
          'Nội dung phản ánh vừa có thêm lượt gửi mới từ người dân. Đang tự động cập nhật lại thông tin...'
        )
        yield put(fetchReportDetailRequest(reportId))
        yield put(acceptReportFailure('Dữ liệu đã thay đổi, vui lòng kiểm tra lại.'))
        return
      }

      if (errorData?.code === 'OPEN_FAULT_EXISTS' || errorData?.detail?.includes('already has open fault')) {
        const msg = 'Cột đèn này đã có sự cố mở cùng loại. Vui lòng chuyển sang tính năng Gộp (Merge)!'
        toast.error(msg)
        yield put(acceptReportFailure(msg))
        return
      }
    }

    const msg =
      errorData?.message ||
      errorData?.detail ||
      error?.message ||
      'Không thể chấp thuận phản ánh công dân.'
    yield put(acceptReportFailure(msg))
    toast.error(msg)
  }
}

// 5. Worker xử lý Gộp (Merge)
function* handleMergeReport(
  action: ReturnType<typeof mergeReportRequest>
): Generator<any, void, any> {
  const { reportId, data } = action.payload
  try {
    const updated: CitizenReportDetail = yield call(citizenReportsAPI.merge, reportId, data)
    yield put(mergeReportSuccess(updated))
    toast.success('Đã gộp phản ánh vào sự cố đang mở thành công!')
    // Tải lại danh sách và badge
    yield put(fetchReportsRequest())
    yield put(fetchPendingCountRequest())
  } catch (error: any) {
    const status = error?.response?.status
    const errorData = error?.response?.data

    if (status === 409 && (errorData?.code === 'CITIZEN_REPORT_CHANGED' || errorData?.detail?.includes('changed'))) {
      toast.warning(
        'Nội dung phản ánh vừa có thêm lượt gửi mới từ người dân. Đang tự động cập nhật lại thông tin...'
      )
      yield put(fetchReportDetailRequest(reportId))
      yield put(mergeReportFailure('Dữ liệu đã thay đổi, vui lòng kiểm tra lại.'))
      return
    }

    const msg =
      errorData?.message ||
      errorData?.detail ||
      error?.message ||
      'Không thể gộp phản ánh công dân.'
    yield put(mergeReportFailure(msg))
    toast.error(msg)
  }
}

// 6. Worker xử lý Từ chối (Reject)
function* handleRejectReport(
  action: ReturnType<typeof rejectReportRequest>
): Generator<any, void, any> {
  const { reportId, data } = action.payload
  try {
    const updated: CitizenReportDetail = yield call(citizenReportsAPI.reject, reportId, data)
    yield put(rejectReportSuccess(updated))
    toast.success('Đã từ chối phản ánh công dân thành công.')
    // Tải lại danh sách và badge
    yield put(fetchReportsRequest())
    yield put(fetchPendingCountRequest())
  } catch (error: any) {
    const status = error?.response?.status
    const errorData = error?.response?.data

    if (status === 409 && (errorData?.code === 'CITIZEN_REPORT_CHANGED' || errorData?.detail?.includes('changed'))) {
      toast.warning(
        'Nội dung phản ánh vừa có thêm lượt gửi mới từ người dân. Đang tự động cập nhật lại thông tin...'
      )
      yield put(fetchReportDetailRequest(reportId))
      yield put(rejectReportFailure('Dữ liệu đã thay đổi, vui lòng kiểm tra lại.'))
      return
    }

    const msg =
      errorData?.message ||
      errorData?.detail ||
      error?.message ||
      'Không thể từ chối phản ánh công dân.'
    yield put(rejectReportFailure(msg))
    toast.error(msg)
  }
}

export function* citizenReportsSaga() {
  yield takeLatest(fetchReportsRequest.type, handleFetchReports)
  yield takeLatest(fetchPendingCountRequest.type, handleFetchPendingCount)
  yield takeLatest(fetchReportDetailRequest.type, handleFetchReportDetail)
  yield takeLatest(acceptReportRequest.type, handleAcceptReport)
  yield takeLatest(mergeReportRequest.type, handleMergeReport)
  yield takeLatest(rejectReportRequest.type, handleRejectReport)
}
