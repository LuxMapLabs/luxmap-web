import { all, call, put, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import { communeAPI as adminCommuneAPI, type CommuneQueryParams } from './communeAPI'
import type {
  CommuneItemPagedResult,
  CommuneItem,
  CreateCommuneRequest,
} from '../../types/admin/communes'
import {
  fetchCommunesRequest,
  fetchCommunesSuccess,
  fetchCommunesFailure,
  fetchCommuneDetailRequest,
  fetchCommuneDetailSuccess,
  fetchCommuneDetailFailure,
  createCommuneRequest,
  createCommuneSuccess,
  createCommuneFailure,
  updateCommuneRequest,
  updateCommuneSuccess,
  updateCommuneFailure,
  type UpdateCommunePayload,
} from './communeSlice'

/**
 * Worker saga tải danh sách địa bàn
 */
function* handleFetchCommunes(action: PayloadAction<CommuneQueryParams | undefined>) {
  try {
    const result: CommuneItemPagedResult = yield call(adminCommuneAPI.getCommunes, action.payload)
    yield put(fetchCommunesSuccess(result))
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error?.message ||
      'Không thể tải danh sách địa bàn từ hệ thống.'
    yield put(fetchCommunesFailure(errorMsg))
  }
}

/**
 * Worker saga tải chi tiết địa bàn
 */
function* handleFetchCommuneDetail(action: PayloadAction<string>) {
  try {
    const result: CommuneItem = yield call(adminCommuneAPI.getCommuneDetail, action.payload)
    yield put(fetchCommuneDetailSuccess(result))
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error?.message ||
      'Không thể tải chi tiết địa bàn.'
    yield put(fetchCommuneDetailFailure(errorMsg))
  }
}

/**
 * Worker saga tạo mới địa bàn
 */
function* handleCreateCommune(action: PayloadAction<CreateCommuneRequest>) {
  try {
    const result: CommuneItem = yield call(adminCommuneAPI.createCommune, action.payload)
    yield put(createCommuneSuccess(result))
    toast.success(`Đã thêm địa bàn "${result.name || result.commune_id}" thành công!`)
    // Tải lại danh sách
    yield put(fetchCommunesRequest())
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.name?.[0] ||
      error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error?.message ||
      'Lỗi khi thêm địa bàn mới.'
    yield put(createCommuneFailure(errorMsg))
    toast.error(`Thêm địa bàn thất bại: ${errorMsg}`)
  }
}

/**
 * Worker saga cập nhật địa bàn
 */
function* handleUpdateCommune(action: PayloadAction<UpdateCommunePayload>) {
  const { id, data } = action.payload
  try {
    const result: CommuneItem = yield call(adminCommuneAPI.updateCommune, id, data)
    yield put(updateCommuneSuccess(result))
    toast.success(`Cập nhật địa bàn "${result.name || result.commune_id}" thành công!`)
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.name?.[0] ||
      error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error?.message ||
      'Lỗi khi cập nhật địa bàn.'
    yield put(updateCommuneFailure(errorMsg))
    toast.error(`Cập nhật thất bại: ${errorMsg}`)
  }
}

export function* adminCommuneSaga() {
  yield all([
    takeLatest(fetchCommunesRequest.type, handleFetchCommunes),
    takeLatest(fetchCommuneDetailRequest.type, handleFetchCommuneDetail),
    takeLatest(createCommuneRequest.type, handleCreateCommune),
    takeLatest(updateCommuneRequest.type, handleUpdateCommune),
  ])
}

export default adminCommuneSaga
