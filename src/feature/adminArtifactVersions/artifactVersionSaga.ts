import { call, put, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  artifactVersionAPI,
  ArtifactVersionQueryParams,
} from './artifactVersionAPI'
import {
  fetchArtifactVersionsRequest,
  fetchArtifactVersionsSuccess,
  fetchArtifactVersionsFailure,
  registerArtifactVersionRequest,
  registerArtifactVersionSuccess,
  registerArtifactVersionFailure,
  fetchArtifactVersionUsageRequest,
  fetchArtifactVersionUsageSuccess,
  fetchArtifactVersionUsageFailure,
} from './artifactVersionSlice'
import type {
  ArtifactVersionItem,
  ArtifactVersionItemPagedResult,
  ArtifactVersionUsage,
  RegisterArtifactVersionRequest,
} from '../../types/admin/artifact-versions'

function* handleFetchArtifactVersions(
  action: PayloadAction<ArtifactVersionQueryParams | undefined>
) {
  try {
    const data: ArtifactVersionItemPagedResult = yield call(
      artifactVersionAPI.getArtifactVersions,
      action.payload
    )
    yield put(fetchArtifactVersionsSuccess(data))
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.message ||
      error.message ||
      'Không thể tải danh sách phiên bản artifact'
    yield put(fetchArtifactVersionsFailure(errorMsg))
  }
}

function* handleRegisterArtifactVersion(
  action: PayloadAction<RegisterArtifactVersionRequest>
) {
  try {
    const data: ArtifactVersionItem = yield call(
      artifactVersionAPI.registerArtifactVersion,
      action.payload
    )
    yield put(registerArtifactVersionSuccess(data))
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.message ||
      error.message ||
      'Đăng ký phiên bản firmware thất bại'
    yield put(registerArtifactVersionFailure(errorMsg))
  }
}

function* handleFetchArtifactVersionUsage(action: PayloadAction<number>) {
  try {
    const data: ArtifactVersionUsage = yield call(
      artifactVersionAPI.getArtifactVersionUsage,
      action.payload
    )
    yield put(fetchArtifactVersionUsageSuccess(data))
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.message ||
      error.message ||
      'Không thể tải dữ liệu kiểm toán sử dụng của phiên bản này'
    yield put(fetchArtifactVersionUsageFailure(errorMsg))
  }
}

export default function* adminArtifactVersionSaga() {
  yield takeLatest(fetchArtifactVersionsRequest.type, handleFetchArtifactVersions)
  yield takeLatest(registerArtifactVersionRequest.type, handleRegisterArtifactVersion)
  yield takeLatest(fetchArtifactVersionUsageRequest.type, handleFetchArtifactVersionUsage)
}
