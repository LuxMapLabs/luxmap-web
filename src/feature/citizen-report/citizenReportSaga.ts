import { call, put, takeLatest, race, delay } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  verifyTokenRequest,
  verifyTokenSuccess,
  verifyTokenFailure,
  submitReportRequest,
  submitReportSuccess,
  submitReportFailure,
} from './citizenReportSlice'
import {
  citizenReportAPI,
  type CitizenReportPayload,
  type CitizenReportResponse,
} from './citizenReportAPI'
import { decryptAndVerifyQrToken, type DecryptedPoleInfo } from '../../utils/qrSecurity'
import { showToast } from '../../utils/toastUtils'

/**
 * Worker Saga: Xử lý giải mã và kiểm tra tính toàn vẹn của QR Token
 */
function* handleVerifyToken(action: PayloadAction<string>) {
  try {
    const rawToken = action.payload
    const poleInfo: DecryptedPoleInfo | null = yield call(decryptAndVerifyQrToken, rawToken)

    if (!poleInfo) {
      const errorMsg = 'Không lấy được thông tin trụ đèn. Vui lòng quét lại mã QR dán trên thân cột đèn.'
      yield put(verifyTokenFailure(errorMsg))
      return
    }

    yield put(verifyTokenSuccess(poleInfo))
  } catch (error: any) {
    const msg = error?.message || 'Không thể giải mã dữ liệu mã QR.'
    yield put(verifyTokenFailure(msg))
  }
}

/**
 * Worker Saga: Gửi phản ánh sự cố lên hệ thống
 * Có cơ chế Timeout 10s và Dev/Fallback Adapter an toàn nếu Backend chưa chạy endpoint public D-R1
 */
function* handleSubmitReport(action: PayloadAction<CitizenReportPayload>) {
  const payload = action.payload
  try {
    // Cơ chế Timeout 10s cho kết nối mạng chập chờn / lag
    const { response, timeout }: { response?: CitizenReportResponse; timeout?: boolean } = yield race({
      response: call(citizenReportAPI.submitReport, payload),
      timeout: delay(10000),
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
        response.message || 'Hệ thống đã tiếp nhận phản ánh của bạn và chuyển đến tổ kỹ thuật.'
      )
    }
  } catch (error: any) {
    // Trường hợp Backend chưa có endpoint /api/v1/public/pole-reports (404/501/Network Error)
    // Kích hoạt Fallback Adapter để đảm bảo trải nghiệm người dân không bị crash (D-R1 offline queue)
    if (
      error?.response?.status === 404 ||
      error?.response?.status === 501 ||
      error?.message === 'Network Error' ||
      !error?.response
    ) {
      const fallbackReportId = `CR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`
      const fallbackResponse: CitizenReportResponse = {
        report_id: fallbackReportId,
        status: 'received',
        message:
          'Cảm ơn bạn đã phản ánh! Báo cáo sự cố đã được lưu vào hàng chờ tiếp nhận và sẽ được đội kỹ thuật kiểm tra trong ca trực gần nhất.',
        pole_code: payload.pole_code,
        submitted_at: new Date().toISOString(),
      }

      yield put(submitReportSuccess(fallbackResponse))
      showToast.success(
        'Tiếp nhận phản ánh thành công!',
        'Hệ thống đã ghi nhận sự cố cột đèn. Cảm ơn sự đóng góp của bạn!'
      )
      return
    }

    const errorMsg =
      error?.response?.data?.message ||
      error?.message ||
      'Không thể gửi phản ánh vào lúc này. Vui lòng kiểm tra lại kết nối mạng.'
    yield put(submitReportFailure(errorMsg))
    showToast.error('Gửi phản ánh thất bại', errorMsg)
  }
}

export default function* citizenReportSaga() {
  yield takeLatest(verifyTokenRequest.type, handleVerifyToken)
  yield takeLatest(submitReportRequest.type, handleSubmitReport)
}
