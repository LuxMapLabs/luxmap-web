import { call, put, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import { reportsAPI } from './reportsAPI'
import type { SuperiorReportItem } from '../../types/reports/report'
import {
  fetchReportsRequest,
  fetchReportsSuccess,
  fetchReportsFailure,
  openReportRequest,
  openReportDetailSuccess,
  type FetchReportsRequest,
} from './reportsSlice'

/** Tải danh sách lệnh công tác đã nghiệm thu của tháng đang chọn (lọc theo loại công tác ở trình duyệt) */
export function* handleFetchReports(action: PayloadAction<FetchReportsRequest>) {
  const { month, year, searchQuery, communeNames } = action.payload
  try {
    const reports: SuperiorReportItem[] = yield call(
      [reportsAPI, reportsAPI.getVerifiedReports],
      { taskKind: 'all', searchQuery, month, year },
      communeNames
    )
    yield put(fetchReportsSuccess(reports))
  } catch {
    yield put(fetchReportsFailure())
    toast.error('Không thể đồng bộ danh sách báo cáo từ máy chủ')
  }
}

/** Bổ sung chi tiết (ghi chú, mốc thời gian, ảnh hiện trường); lỗi thì giữ nguyên bản tóm tắt */
export function* handleOpenReport(action: PayloadAction<SuperiorReportItem>) {
  try {
    const detail: SuperiorReportItem = yield call([reportsAPI, reportsAPI.getReportDetail], action.payload)
    yield put(openReportDetailSuccess(detail))
  } catch {
    // Giữ nguyên thông tin tóm tắt
  }
}

export default function* reportsSaga() {
  yield takeLatest(fetchReportsRequest.type, handleFetchReports)
  yield takeLatest(openReportRequest.type, handleOpenReport)
}
