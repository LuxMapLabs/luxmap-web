import { call, put, takeLatest, race, delay } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  lookupPublicQrRequest,
  lookupPublicQrSuccess,
  lookupPublicQrFailure,
  submitReportRequest,
  submitReportSuccess,
  submitReportFailure,
} from './citizenReportSlice'
import {
  citizenReportAPI,
  type PublicQrInfo,
  type PublicReportReceipt,
  type PublicReportSubmitPayload,
} from './citizenReportAPI'
import { showToast } from '../../utils/toastUtils'

/**
 * Worker Saga: Tra cứu thông tin cột đèn công khai từ mã QR
 * POST /api/v1/public/qr/lookup
 */
function* handleLookupPublicQr(action: PayloadAction<string>) {
  const code = (action.payload || '').trim()
  if (!code) {
    yield put(
      lookupPublicQrFailure(
        'Không tìm thấy mã tem QR. Vui lòng sử dụng camera điện thoại quét lại tem dán trên thân cột đèn.'
      )
    )
    return
  }

  try {
    const poleInfo: PublicQrInfo = yield call(citizenReportAPI.lookupPublicQr, { code })
    yield put(lookupPublicQrSuccess({ code, poleInfo }))
  } catch (error: any) {
    const status = error?.response?.status
    let msg = 'Không thể tra cứu thông tin cột đèn.'

    if (status === 404) {
      msg = 'Mã QR tem cột đèn này không tồn tại hoặc đã bị thu hồi. Vui lòng quét lại tem mới.'
    } else if (status === 429) {
      msg = 'Hệ thống đang bận do có quá nhiều lượt truy cập. Vui lòng thử lại sau ít phút.'
    } else if (error?.response?.data?.message) {
      msg = error.response.data.message
    } else if (error?.message) {
      msg = error.message
    }

    yield put(lookupPublicQrFailure(msg))
  }
}

/**
 * Worker Saga: Nộp phản ánh sự cố công khai của người dân
 * POST /api/v1/public/reports
 */
function* handleSubmitReport(action: PayloadAction<PublicReportSubmitPayload>) {
  const payload = { ...action.payload }

  // Tự động gán client_op_id UUID nếu chưa có
  if (!payload.client_op_id) {
    try {
      payload.client_op_id = crypto.randomUUID()
    } catch {
      payload.client_op_id = `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    }
  }

  try {
    // Cơ chế Timeout 15s cho kết nối di động ngoài thực địa
    const { response, timeout }: { response?: PublicReportReceipt; timeout?: boolean } = yield race({
      response: call(citizenReportAPI.submitReport, payload),
      timeout: delay(15000),
    })

    if (timeout) {
      const timeoutMsg =
        'Kết nối mạng quá chậm hoặc không ổn định. Dữ liệu phản ánh của bạn vẫn được giữ nguyên, vui lòng bấm thử gửi lại nhé!'
      yield put(submitReportFailure(timeoutMsg))
      showToast.error('Kết nối mạng quá chậm', timeoutMsg)
      return
    }

    if (response) {
      yield put(submitReportSuccess(response))
      showToast.success(
        'Gửi phản ánh thành công!',
        'Hệ thống LuxMap đã tiếp nhận thông tin và chuyển tới ban quản lý chiếu sáng xử lý.'
      )
    }
  } catch (error: any) {
    const status = error?.response?.status
    let errorMsg = 'Không thể gửi phản ánh vào lúc này. Vui lòng thử lại.'

    if (status === 404) {
      errorMsg = 'Mã tem QR không hợp lệ hoặc đã bị vô hiệu hóa.'
    } else if (status === 409) {
      errorMsg = 'Phản ánh này đã được hệ thống tiếp nhận trước đó (trùng lặp yêu cầu).'
    } else if (status === 413) {
      errorMsg = 'Kích thước tệp ảnh đính kèm quá lớn. Vui lòng chọn ảnh dung lượng nhẹ hơn.'
    } else if (status === 429) {
      errorMsg = 'Bạn đã gửi phản ánh quá nhanh. Vui lòng đợi trong giây lát rồi gửi lại.'
    } else if (error?.response?.data?.message) {
      errorMsg = error.response.data.message
    } else if (error?.message) {
      errorMsg = error.message
    }

    yield put(submitReportFailure(errorMsg))
    showToast.error('Gửi phản ánh thất bại', errorMsg)
  }
}

export default function* citizenReportSaga() {
  yield takeLatest(lookupPublicQrRequest.type, handleLookupPublicQr)
  yield takeLatest(submitReportRequest.type, handleSubmitReport)
}
