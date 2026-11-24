import { all, call, put, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import passwordAPI from './passwordAPI'
import type { ChangePasswordRequest, SetPasswordRequest } from '../../types/auth/password'
import {
  setPasswordRequest,
  setPasswordSuccess,
  setPasswordFailure,
  changePasswordRequest,
  changePasswordSuccess,
  changePasswordFailure,
} from './passwordSlice'

function getSetPasswordErrorMessage(error: unknown): string {
  const err = error as { response?: { status?: number } }
  const status = err?.response?.status
  if (!err?.response) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng rồi thử lại.'
  }
  if (status === 400) {
    return 'Liên kết đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu gửi lại liên kết mới.'
  }
  if (status === 429) {
    return 'Bạn thử quá nhiều lần. Vui lòng đợi một lát rồi thử lại.'
  }
  if (typeof status === 'number' && status >= 500) {
    return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
  }
  return 'Không thể đặt mật khẩu. Vui lòng thử lại.'
}

function getChangePasswordErrorMessage(error: unknown): string {
  const err = error as {
    response?: {
      status?: number
      data?: {
        detail?: string
        title?: string
      }
    }
  }
  const status = err?.response?.status
  if (!err?.response) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng rồi thử lại.'
  }
  if (status === 400) {
    const serverMsg = err.response.data?.detail || err.response.data?.title
    return serverMsg || 'Mật khẩu hiện tại không đúng hoặc mật khẩu mới không hợp lệ.'
  }
  if (status === 429) {
    return 'Bạn thử quá nhiều lần. Vui lòng đợi một lát rồi thử lại.'
  }
  if (typeof status === 'number' && status >= 500) {
    return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
  }
  return 'Không thể đổi mật khẩu. Vui lòng thử lại.'
}

function* handleSetPassword(action: PayloadAction<SetPasswordRequest>) {
  try {
    yield call(passwordAPI.setPassword, action.payload)
    yield put(setPasswordSuccess())
    toast.success('Đặt mật khẩu thành công! Bạn có thể đăng nhập ngay.')
  } catch (error: unknown) {
    const message = getSetPasswordErrorMessage(error)
    // Lỗi hiển thị ngay trong thẻ form nên không bật thêm toast trùng nội dung
    yield put(setPasswordFailure(message))
  }
}

function* handleChangePassword(action: PayloadAction<ChangePasswordRequest>) {
  try {
    yield call(passwordAPI.changePassword, action.payload)
    yield put(changePasswordSuccess())
    toast.success('Đổi mật khẩu thành công.')
  } catch (error: unknown) {
    const message = getChangePasswordErrorMessage(error)
    // Lỗi hiển thị ngay trong form nên không bật thêm toast trùng nội dung
    yield put(changePasswordFailure(message))
  }
}

export default function* passwordSaga() {
  yield all([
    takeLatest(setPasswordRequest.type, handleSetPassword),
    takeLatest(changePasswordRequest.type, handleChangePassword),
  ])
}
