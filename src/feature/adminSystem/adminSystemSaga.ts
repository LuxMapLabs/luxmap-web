import { call, put, takeLatest } from 'redux-saga/effects'
import { adminSystemAPI } from './adminSystemAPI'
import {
  fetchSystemStatusRequest,
  fetchSystemStatusSuccess,
  fetchSystemStatusFailure,
} from './adminSystemSlice'
import type { SystemStatusResponse } from '../../types/admin/system'

function* handleFetchSystemStatus() {
  try {
    const data: SystemStatusResponse = yield call(adminSystemAPI.getSystemStatus)
    yield put(fetchSystemStatusSuccess(data))
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.message ||
      error.message ||
      'Không thể tải dữ liệu trạng thái hệ thống'
    yield put(fetchSystemStatusFailure(errorMsg))
  }
}

export default function* adminSystemSaga() {
  yield takeLatest(fetchSystemStatusRequest.type, handleFetchSystemStatus)
}
