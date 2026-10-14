import { call, put, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import { qrCodeAPI, type QrCodeListQuery } from './qrCodeAPI'
import {
  fetchPoleQrRequest,
  fetchPoleQrSuccess,
  fetchPoleQrFailure,
  issueQrCodeRequest,
  issueQrCodeSuccess,
  issueQrCodeFailure,
  revokeQrCodeRequest,
  revokeQrCodeSuccess,
  revokeQrCodeFailure,
  fetchQrCodesRequest,
  fetchQrCodesSuccess,
  fetchQrCodesFailure,
} from './qrCodeSlice'
import type {
  IssueQrCodeRequest,
  QrCodeItem,
  QrCodeItemPagedResult,
} from '../../types/qr-codes/qr-codes'

/**
 * Worker: Tra cứu mã QR active của một cột đèn
 * GET /api/v1/qr-codes?pole_id={poleId}&active=true
 */
function* handleFetchPoleQr(action: PayloadAction<string>) {
  const poleId = action.payload
  try {
    const res: QrCodeItemPagedResult = yield call(qrCodeAPI.getQrCodes, {
      pole_id: poleId,
      active: true,
      page: 1,
      page_size: 1,
    })

    const activeItem: QrCodeItem | null =
      res.items && res.items.length > 0 ? res.items[0] : null

    yield put(fetchPoleQrSuccess({ poleId, qrItem: activeItem }))
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Không thể tải thông tin mã QR của cột đèn.'
    yield put(fetchPoleQrFailure(message))
  }
}

/**
 * Worker: Cấp mã QR mới cho cột đèn
 * POST /api/v1/qr-codes
 */
function* handleIssueQrCode(action: PayloadAction<IssueQrCodeRequest>) {
  try {
    const res: QrCodeItem = yield call(qrCodeAPI.issueQrCode, action.payload)
    yield put(issueQrCodeSuccess(res))
    toast.success('Cấp mã QR cho cột đèn thành công!')
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Không thể cấp mã QR cho cột đèn này.'
    yield put(issueQrCodeFailure(message))
    toast.error(message)
  }
}

/**
 * Worker: Thu hồi mã QR
 * POST /api/v1/qr-codes/{qr_id}/revoke
 */
function* handleRevokeQrCode(
  action: PayloadAction<{ qrId: string; poleId?: string }>
) {
  try {
    const res: QrCodeItem = yield call(qrCodeAPI.revokeQrCode, action.payload.qrId)
    yield put(revokeQrCodeSuccess(res))
    toast.success('Thu hồi mã QR thành công!')
  } catch (error: any) {
    const status = error?.response?.status
    let message =
      error?.response?.data?.message ||
      error?.message ||
      'Không thể thu hồi mã QR này.'

    if (status === 409) {
      message = 'Mã QR này đã bị thu hồi trước đó.'
    }
    yield put(revokeQrCodeFailure(message))
    toast.error(message)
  }
}

/**
 * Worker: Tra cứu danh sách mã QR có phân trang & lọc
 * GET /api/v1/qr-codes
 */
function* handleFetchQrCodes(action: PayloadAction<QrCodeListQuery | undefined>) {
  try {
    const res: QrCodeItemPagedResult = yield call(qrCodeAPI.getQrCodes, action.payload)
    yield put(fetchQrCodesSuccess(res))
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Không thể tải danh sách mã QR.'
    yield put(fetchQrCodesFailure(message))
    toast.error(message)
  }
}

export default function* qrCodeSaga() {
  yield takeLatest(fetchPoleQrRequest.type, handleFetchPoleQr)
  yield takeLatest(issueQrCodeRequest.type, handleIssueQrCode)
  yield takeLatest(revokeQrCodeRequest.type, handleRevokeQrCode)
  yield takeLatest(fetchQrCodesRequest.type, handleFetchQrCodes)
}
