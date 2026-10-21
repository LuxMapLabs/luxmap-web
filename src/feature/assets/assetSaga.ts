import { all, call, put, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import assetAPI from './assetAPI'
import type { ImportResult } from '../../types/assets/import'
import type {
  SegmentListItemPagedResult,
  CreateSegmentRequest,
} from '../../types/assets/segments'
import type {
  CabinetListItemPagedResult,
  CreateCabinetRequest,
} from '../../types/assets/cabinets'
import type { FeederListItemPagedResult, CreateFeederRequest } from '../../types/assets/feeders'
import type { PoleListItemPagedResult } from '../../types/assets/poles'
import type { CreateFixtureRequest } from '../../types/assets/fixtures'
import {
  fetchAssetsRequest,
  fetchAssetsSuccess,
  fetchAssetsFailure,
  importAssetRequest,
  importAssetSuccess,
  importAssetFailure,
  createPoleRequest,
  createPolesBulkRequest,
  updatePoleRequest,
  createCabinetRequest,
  createCabinetsBulkRequest,
  updateCabinetRequest,
  createFeederRequest,
  createFeedersBulkRequest,
  updateFeederRequest,
  deleteFeederRequest,
  createSegmentRequest,
  updateSegmentRequest,
  createFixtureRequest,
  createFixturesBulkRequest,
  retireFixtureRequest,
  mutationSuccess,
  mutationFailure,
  type ImportAssetPayload,
  type CreatePolePayload,
  type UpdatePolePayload,
  type UpdateCabinetPayload,
  type UpdateFeederPayload,
  type UpdateSegmentPayload,
  type RetireFixturePayload,
} from './assetSlice'

function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { message?: string } }; message?: string }
  return err?.response?.data?.message || err?.message || fallback
}

/**
 * Worker saga tải toàn bộ danh mục tài sản thực tế từ Backend API
 */
function* handleFetchAssets() {
  try {
    const [segmentsRes, cabinetsRes, feedersRes, polesRes]: [
      SegmentListItemPagedResult,
      CabinetListItemPagedResult,
      FeederListItemPagedResult,
      PoleListItemPagedResult
    ] = yield all([
      call(assetAPI.getSegments, { page_size: 1000 }),
      call(assetAPI.getCabinets, { page_size: 1000 }),
      call(assetAPI.getFeeders, { page_size: 1000 }),
      call(assetAPI.getPoles, { page_size: 1000 }),
    ])

    yield put(
      fetchAssetsSuccess({
        segments: segmentsRes.items ?? [],
        cabinets: cabinetsRes.items ?? [],
        feeders: feedersRes.items ?? [],
        poles: polesRes.items ?? [],
      })
    )
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(
      error,
      'Không thể tải dữ liệu danh mục tài sản từ máy chủ Backend.'
    )
    yield put(fetchAssetsFailure(errorMsg))
  }
}

/**
 * Worker saga nạp file CSV lên Backend API
 */
function* handleImportAsset(action: PayloadAction<ImportAssetPayload>) {
  const { category, file } = action.payload

  try {
    let result: ImportResult

    switch (category) {
      case 'segments':
        result = (yield call(assetAPI.importSegments, file)) as ImportResult
        break
      case 'cabinets':
        result = (yield call(assetAPI.importCabinets, file)) as ImportResult
        break
      case 'feeders':
        result = (yield call(assetAPI.importFeeders, file)) as ImportResult
        break
      case 'poles':
      case 'poles_and_fixtures':
        result = (yield call(assetAPI.importPoles, file)) as ImportResult
        break
      case 'fixtures':
        result = (yield call(assetAPI.importFixtures, file)) as ImportResult
        break
      default:
        throw new Error(`Loại tài sản '${category}' không được hỗ trợ để nạp tệp.`)
    }

    yield put(importAssetSuccess(result))

    const inserted = result.inserted ?? 0
    const updated = result.updated ?? 0

    // Tự động tải lại dữ liệu từ Backend để các bảng cập nhật ngay lập tức
    if (inserted + updated > 0) {
      yield put(fetchAssetsRequest())
    }
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(
      error,
      'Không thể kết nối đến máy chủ Backend để nạp dữ liệu.'
    )
    yield put(importAssetFailure(errorMsg))
    toast.error(`Lỗi nạp dữ liệu: ${errorMsg}`)
  }
}

// ====================================================
// MUTATION WORKER SAGAS (REDUX-SAGA FIRST ARCHITECTURE)
// ====================================================

function* handleCreatePole(action: PayloadAction<CreatePolePayload>) {
  try {
    const { pole, fixture } = action.payload
    yield call(assetAPI.createPole, pole)

    if (fixture) {
      yield call(assetAPI.createFixture, fixture)
    }

    yield put(mutationSuccess())
    toast.success(`Đã lưu thành công cột đèn "${pole.external_ref || 'mới'}" vào Hệ thống!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể lưu cột đèn vào hệ thống')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi tạo cột: ${errorMsg}`)
  }
}

function* handleCreatePolesBulk(action: PayloadAction<CreatePolePayload[]>) {
  try {
    const list = action.payload
    for (const item of list) {
      yield call(assetAPI.createPole, item.pole)
      if (item.fixture) {
        yield call(assetAPI.createFixture, item.fixture)
      }
    }

    yield put(mutationSuccess())
    toast.success(`Đã lưu thành công ${list.length} cột đèn vào Hệ thống!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể lưu danh sách cột đèn vào hệ thống')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi tạo danh sách cột: ${errorMsg}`)
  }
}

function* handleUpdatePole(action: PayloadAction<UpdatePolePayload>) {
  try {
    const { poleId, data } = action.payload
    yield call(assetAPI.updatePole, poleId, data)

    yield put(mutationSuccess())
    toast.success(`Đã cập nhật thông số cột đèn "${data.external_ref || poleId}"!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể cập nhật cột đèn')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi cập nhật cột: ${errorMsg}`)
  }
}

function* handleCreateCabinet(action: PayloadAction<CreateCabinetRequest>) {
  try {
    const data = action.payload
    const createdCabId = (yield call(assetAPI.createCabinet, data)) as string | null

    // Tự động khởi tạo Lộ xuất tuyến đầu tiên (Feeder) cho tủ điện mới
    try {
      yield call(assetAPI.createFeeder, {
        feeder_name: `Lộ 1 - ${data.cabinet_name || data.external_ref || 'Tủ điện'}`,
        external_ref: data.external_ref ? `FDR-${data.external_ref}` : null,
        cabinet_id: createdCabId || null,
        commune_id: data.commune_id || 'COM-001',
      })
    } catch (feederErr) {
      console.warn('Could not auto-create feeder for cabinet:', feederErr)
    }

    yield put(mutationSuccess())
    toast.success(
      `Đã lưu thành công tủ điện "${data.cabinet_name || data.external_ref}" và khởi tạo Lộ xuất tuyến!`
    )
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể lưu tủ điện vào hệ thống')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi tạo tủ điện: ${errorMsg}`)
  }
}

function* handleCreateCabinetsBulk(action: PayloadAction<CreateCabinetRequest[]>) {
  try {
    const list = action.payload
    for (const item of list) {
      const createdCabId = (yield call(assetAPI.createCabinet, item)) as string | null
      try {
        yield call(assetAPI.createFeeder, {
          feeder_name: `Lộ 1 - ${item.cabinet_name || item.external_ref || 'Tủ điện'}`,
          external_ref: item.external_ref ? `FDR-${item.external_ref}` : null,
          cabinet_id: createdCabId || null,
          commune_id: item.commune_id || 'COM-001',
        })
      } catch (feederErr) {
        console.warn('Could not auto-create feeder for cabinet in bulk:', feederErr)
      }
    }

    yield put(mutationSuccess())
    toast.success(`Đã lưu thành công ${list.length} tủ điện vào Hệ thống!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể lưu danh sách tủ điện vào hệ thống')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi tạo danh sách tủ điện: ${errorMsg}`)
  }
}

function* handleUpdateCabinet(action: PayloadAction<UpdateCabinetPayload>) {
  try {
    const { cabinetId, data } = action.payload
    yield call(assetAPI.updateCabinet, cabinetId, data)

    yield put(mutationSuccess())
    toast.success(`Đã cập nhật thông số tủ điện "${data.cabinet_name || cabinetId}"!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể cập nhật tủ điện')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi cập nhật tủ điện: ${errorMsg}`)
  }
}

function* handleCreateFeeder(action: PayloadAction<CreateFeederRequest>) {
  try {
    const data = action.payload
    yield call(assetAPI.createFeeder, data)

    yield put(mutationSuccess())
    toast.success(`Đã tạo mạch xuất tuyến "${data.feeder_name || data.external_ref}" thành công!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể tạo mạch điện')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi tạo mạch điện: ${errorMsg}`)
  }
}

function* handleCreateFeedersBulk(action: PayloadAction<CreateFeederRequest[]>) {
  try {
    const list = action.payload
    for (const item of list) {
      yield call(assetAPI.createFeeder, item)
    }

    yield put(mutationSuccess())
    toast.success(`Đã thêm thành công ${list.length} mạch xuất tuyến mới!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể tạo danh sách mạch điện')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi thêm danh sách mạch điện: ${errorMsg}`)
  }
}

function* handleUpdateFeeder(action: PayloadAction<UpdateFeederPayload>) {
  try {
    const { feederId, data } = action.payload
    yield call(assetAPI.updateFeeder, feederId, data)

    yield put(mutationSuccess())
    toast.success(`Đã cập nhật mạch điện "${data.feeder_name || feederId}"!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể cập nhật mạch điện')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi cập nhật mạch điện: ${errorMsg}`)
  }
}

function* handleDeleteFeeder(action: PayloadAction<string>) {
  try {
    const feederId = action.payload
    yield call(assetAPI.deleteFeeder, feederId)

    yield put(mutationSuccess())
    toast.success(`Đã xóa mạch điện "${feederId}" thành công!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể xóa mạch điện')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi xóa mạch điện: ${errorMsg}`)
  }
}

function* handleCreateSegment(action: PayloadAction<CreateSegmentRequest>) {
  try {
    const data = action.payload
    yield call(assetAPI.createSegment, data)

    yield put(mutationSuccess())
    toast.success(`Đã tạo tuyến đường mới "${data.segment_name}" thành công!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể tạo tuyến đường')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi tạo tuyến đường: ${errorMsg}`)
  }
}

function* handleUpdateSegment(action: PayloadAction<UpdateSegmentPayload>) {
  try {
    const { segmentId, data } = action.payload
    yield call(assetAPI.updateSegment, segmentId, data)

    yield put(mutationSuccess())
    toast.success(`Đã cập nhật thông tin tuyến đường "${data.segment_name}"!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể cập nhật tuyến đường')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi cập nhật tuyến đường: ${errorMsg}`)
  }
}

function* handleCreateFixture(action: PayloadAction<CreateFixtureRequest>) {
  try {
    const data = action.payload
    yield call(assetAPI.createFixture, data)

    yield put(mutationSuccess())
    toast.success('Đã thêm bóng đèn mới thành công!')
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể thêm bóng đèn')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi thêm bóng đèn: ${errorMsg}`)
  }
}

function* handleCreateFixturesBulk(action: PayloadAction<CreateFixtureRequest[]>) {
  try {
    const list = action.payload
    for (const item of list) {
      yield call(assetAPI.createFixture, item)
    }

    yield put(mutationSuccess())
    toast.success(`Đã thêm thành công ${list.length} bóng đèn mới!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể thêm danh sách bóng đèn')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi thêm danh sách bóng đèn: ${errorMsg}`)
  }
}

function* handleRetireFixture(action: PayloadAction<RetireFixturePayload>) {
  try {
    const { fixtureId, data } = action.payload
    yield call(assetAPI.retireFixture, fixtureId, data)

    yield put(mutationSuccess())
    toast.success(
      data.removed_date
        ? `Đã đăng ký tháo dỡ bóng đèn "${fixtureId}"!`
        : `Đã kích hoạt lại bóng đèn "${fixtureId}"!`
    )
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể thao tác bóng đèn')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi thao tác bóng đèn: ${errorMsg}`)
  }
}

export default function* assetSaga() {
  yield takeLatest(fetchAssetsRequest.type, handleFetchAssets)
  yield takeLatest(importAssetRequest.type, handleImportAsset)
  yield takeLatest(createPoleRequest.type, handleCreatePole)
  yield takeLatest(createPolesBulkRequest.type, handleCreatePolesBulk)
  yield takeLatest(updatePoleRequest.type, handleUpdatePole)
  yield takeLatest(createCabinetRequest.type, handleCreateCabinet)
  yield takeLatest(createCabinetsBulkRequest.type, handleCreateCabinetsBulk)
  yield takeLatest(updateCabinetRequest.type, handleUpdateCabinet)
  yield takeLatest(createFeederRequest.type, handleCreateFeeder)
  yield takeLatest(createFeedersBulkRequest.type, handleCreateFeedersBulk)
  yield takeLatest(updateFeederRequest.type, handleUpdateFeeder)
  yield takeLatest(deleteFeederRequest.type, handleDeleteFeeder)
  yield takeLatest(createSegmentRequest.type, handleCreateSegment)
  yield takeLatest(updateSegmentRequest.type, handleUpdateSegment)
  yield takeLatest(createFixtureRequest.type, handleCreateFixture)
  yield takeLatest(createFixturesBulkRequest.type, handleCreateFixturesBulk)
  yield takeLatest(retireFixtureRequest.type, handleRetireFixture)
}
