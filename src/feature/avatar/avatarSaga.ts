import { call, put, takeEvery, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import avatarAPI from './avatarAPI'
import {
  fetchAvatarRequest,
  fetchAvatarSuccess,
  fetchAvatarFailure,
  uploadAvatarRequest,
  removeAvatarRequest,
  avatarSubmitDone,
} from './avatarSlice'
import { setAvatarUrl } from '../auth/authSlice'
import type { AvatarResponse } from '../../types/auth/me'

function* handleFetchAvatar(action: PayloadAction<string>) {
  const url = action.payload
  try {
    const blob: Blob = yield call(avatarAPI.fetchBlob, url)
    yield put(fetchAvatarSuccess({ url, objectUrl: URL.createObjectURL(blob) }))
  } catch {
    yield put(fetchAvatarFailure(url))
  }
}

const uploadErrorMessage = (status?: number): string => {
  if (status === 413) return 'Ảnh vượt quá dung lượng cho phép (tối đa 1 MB).'
  if (status === 415) return 'Chỉ chấp nhận ảnh định dạng JPEG.'
  if (status === 400) return 'Ảnh không hợp lệ hoặc quá lớn (tối đa 512px cạnh dài, 16 triệu điểm ảnh).'
  if (status === 503) return 'Kho lưu trữ ảnh đang tạm thời không khả dụng. Vui lòng thử lại sau.'
  return 'Không thể cập nhật ảnh đại diện. Vui lòng thử lại.'
}

function* handleUpload(action: PayloadAction<File>) {
  try {
    const res: AvatarResponse = yield call(avatarAPI.upload, action.payload)
    yield put(setAvatarUrl(res.avatar_url ?? null))
    toast.success('Đã cập nhật ảnh đại diện')
  } catch (error: unknown) {
    toast.error(uploadErrorMessage((error as { response?: { status?: number } })?.response?.status))
  } finally {
    yield put(avatarSubmitDone())
  }
}

function* handleRemove() {
  try {
    yield call(avatarAPI.remove)
    yield put(setAvatarUrl(null))
    toast.success('Đã gỡ ảnh đại diện')
  } catch {
    toast.error('Không thể gỡ ảnh đại diện. Vui lòng thử lại.')
  } finally {
    yield put(avatarSubmitDone())
  }
}

export default function* avatarSaga() {
  yield takeEvery(fetchAvatarRequest.type, handleFetchAvatar)
  yield takeLatest(uploadAvatarRequest.type, handleUpload)
  yield takeLatest(removeAvatarRequest.type, handleRemove)
}
