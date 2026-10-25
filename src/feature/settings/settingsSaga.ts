import { all, call, put, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import settingsAPI from './settingsAPI'
import type { SettingItem, SettingsResponse } from '../../types/admin/settings'
import {
  fetchSettingsRequest,
  fetchSettingsSuccess,
  fetchSettingsFailure,
  updateSettingRequest,
  updateSettingSuccess,
  updateSettingFailure,
  type UpdateSettingPayload,
} from './settingsSlice'

/**
 * Worker saga: Tải danh sách cấu hình hệ thống
 */
function* handleFetchSettings() {
  try {
    const result: SettingsResponse = yield call(settingsAPI.getSettings)
    yield put(fetchSettingsSuccess(result))
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error?.message ||
      'Không thể tải danh sách cấu hình hệ thống.'
    yield put(fetchSettingsFailure(errorMsg))
    toast.error(errorMsg)
  }
}

/**
 * Worker saga: Cập nhật một thông số cấu hình
 */
function* handleUpdateSetting(action: PayloadAction<UpdateSettingPayload>) {
  try {
    const { key, data } = action.payload
    const result: SettingItem = yield call(settingsAPI.updateSetting, key, data)
    yield put(updateSettingSuccess(result))
    toast.success(`Cập nhật cấu hình "${key}" thành công!`)
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error?.message ||
      'Cập nhật cấu hình thất bại.'
    yield put(updateSettingFailure(errorMsg))
    toast.error(errorMsg)
  }
}

export default function* settingsSaga() {
  yield all([
    takeLatest(fetchSettingsRequest.type, handleFetchSettings),
    takeLatest(updateSettingRequest.type, handleUpdateSetting),
  ])
}
