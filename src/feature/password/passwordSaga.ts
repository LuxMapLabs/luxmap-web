import { call, put, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import passwordAPI from './passwordAPI'
import type { SetPasswordRequest } from '../../types/auth/password'
import { setPasswordRequest, setPasswordSuccess, setPasswordFailure } from './passwordSlice'

function getSetPasswordErrorMessage(error: any): string {
  const status = error?.response?.status
  if (!error?.response) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng rồi thử lại.'
  }
  if (status === 400) {
    return 'Liên kết đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu gửi lại liên kết mới.'
  }
  if (status === 429) {
    return 'Bạn thử quá nhiều lần. Vui lòng đợi một lát rồi thử lại.'
  }
  if (status >= 500) {
    return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
  }
  return 'Không thể đặt mật khẩu. Vui lòng thử lại.'
}

function* handleSetPassword(action: PayloadAction<SetPasswordRequest>) {
  try {
    yield call(passwordAPI.setPassword, action.payload)
    yield put(setPasswordSuccess())
    toast.success('Đặt mật khẩu thành công! Bạn có thể đăng nhập ngay.')
  } catch (error: any) {
    const message = getSetPasswordErrorMessage(error)
    // Lỗi hiển thị ngay trong thẻ form nên không bật thêm toast trùng nội dung
    yield put(setPasswordFailure(message))
  }
}

export default function* passwordSaga() {
  yield takeLatest(setPasswordRequest.type, handleSetPassword)
}
