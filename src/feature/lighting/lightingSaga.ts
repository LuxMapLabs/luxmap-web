import { call, put, takeLatest, all, select } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import {
  lightingAPI,
  type PreviewLightingParams,
  type GetLightingCommandsParams,
} from './lightingAPI'
import {
  previewLightingRequest,
  previewLightingSuccess,
  previewLightingFailure,
  createLightingCommandRequest,
  createLightingCommandSuccess,
  createLightingCommandFailure,
  getLightingCommandsRequest,
  getLightingCommandsSuccess,
  getLightingCommandsFailure,
} from './lightingSlice'
import type { LightingPreview } from '../../types/lighting/preview'
import type {
  CreateLightingRequest,
  LightingRequestResult,
  LightingCommandItemPagedResult,
} from '../../types/lighting/commands'
import type { FeederControlMode } from '../../types/common/enums'
import { fetchCabinetTopologyRequest } from '../map/mapSlice'

function getErrorMessage(error: any, fallback: string): string {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    error?.message ||
    fallback
  )
}

function* handlePreviewLighting(
  action: PayloadAction<{
    params: PreviewLightingParams
    target: { kind: 'feeder' | 'segment'; id: string; requestedMode: FeederControlMode }
  }>
) {
  try {
    const result: LightingPreview = yield call(
      lightingAPI.previewLighting,
      action.payload.params
    )
    yield put(previewLightingSuccess(result))
  } catch (error: any) {
    const msg = getErrorMessage(error, 'Không thể lấy thông tin xem trước phạm vi điều khiển.')
    yield put(previewLightingFailure(msg))
    toast.error(msg)
  }
}

function* handleCreateLightingCommand(action: PayloadAction<CreateLightingRequest>) {
  try {
    const result: LightingRequestResult = yield call(
      lightingAPI.createLightingCommand,
      action.payload
    )
    yield put(createLightingCommandSuccess(result))

    // Refetch dữ liệu thực tế từ Backend API ngay sau khi phát lệnh
    const selectedCabinetId: string | null = yield select(
      (state: any) => state.map?.selectedCabinetId
    )
    if (selectedCabinetId) {
      yield put(fetchCabinetTopologyRequest(selectedCabinetId))
    }

    const modeLabels: Record<string, string> = {
      on: 'BẬT nguồn',
      off: 'NGẮT nguồn',
      auto: 'TỰ ĐỘNG (Lịch biểu)',
    }
    const label = modeLabels[action.payload.mode] || action.payload.mode
    toast.success(`Đã phát lệnh điều khiển ${label} thành công tới các thiết bị IoT!`)
  } catch (error: any) {
    const msg = getErrorMessage(error, 'Lỗi khi gửi lệnh điều khiển chiếu sáng xuống thiết bị.')
    yield put(createLightingCommandFailure(msg))
    toast.error(`Điều khiển thất bại: ${msg}`)
  }
}

function* handleGetLightingCommands(
  action: PayloadAction<GetLightingCommandsParams | undefined>
) {
  try {
    const result: LightingCommandItemPagedResult = yield call(
      lightingAPI.getLightingCommands,
      action.payload
    )
    yield put(getLightingCommandsSuccess(result))
  } catch (error: any) {
    const msg = getErrorMessage(error, 'Không thể tải lịch sử lệnh điều khiển.')
    yield put(getLightingCommandsFailure(msg))
  }
}

export function* lightingSaga() {
  yield all([
    takeLatest(previewLightingRequest.type, handlePreviewLighting),
    takeLatest(createLightingCommandRequest.type, handleCreateLightingCommand),
    takeLatest(getLightingCommandsRequest.type, handleGetLightingCommands),
  ])
}

export default lightingSaga

