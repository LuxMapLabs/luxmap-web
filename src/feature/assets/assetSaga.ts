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
import type {
  IotNodeItemPagedResult,
  CreateIotNodeRequest,
  IotNodeCredential,
} from '../../types/assets/iot-nodes'
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
  deletePoleRequest,
  createCabinetRequest,
  createCabinetsBulkRequest,
  updateCabinetRequest,
  deleteCabinetRequest,
  createFeederRequest,
  createFeedersBulkRequest,
  updateFeederRequest,
  deleteFeederRequest,
  createSegmentRequest,
  updateSegmentRequest,
  deleteSegmentRequest,
  createFixtureRequest,
  createFixturesBulkRequest,
  retireFixtureRequest,
  createIotNodeRequest,
  updateIotNodeRequest,
  deleteIotNodeRequest,
  setIotNodeRelayRequest,
  issueIotNodeCredentialRequest,
  mutationSuccess,
  mutationFailure,
  type ImportAssetPayload,
  type CreatePolePayload,
  type UpdatePolePayload,
  type UpdateCabinetPayload,
  type UpdateFeederPayload,
  type UpdateSegmentPayload,
  type RetireFixturePayload,
  type UpdateIotNodePayload,
  type SetIotNodeRelayPayload,
  type IssueIotNodeCredentialPayload,
} from './assetSlice'

const BACKEND_ERROR_TRANSLATIONS: Record<string, string> = {
  'That road segment still has poles, faults or fault clusters pointing at it, so it cannot be deleted.':
    'Tuyến đường này vẫn còn cột đèn, sự cố hoặc cụm sự cố liên kết, không thể xóa.',
  'That cabinet still has feeders or a device pointing at it, so it cannot be deleted.':
    'Tủ điện này vẫn còn mạch điện hoặc thiết bị IoT gắn kèm, không thể xóa.',
  'That feeder still has poles wired to it, so it cannot be deleted.':
    'Mạch điện này vẫn còn cột đèn đang đấu nối, không thể xóa.',
  'That pole still has records pointing at it, so it cannot be deleted.':
    'Cột đèn này vẫn còn dữ liệu liên kết (bóng đèn, sự cố hoặc lịch sử bảo trì), không thể xóa.',
  'That device still has relays wired or commands recorded, so it cannot be deleted. Unwire its relays first.':
    'Thiết bị IoT này vẫn còn rơ-le đang đấu nối hoặc lệnh điều khiển ghi nhận, không thể xóa. Vui lòng ngắt kết nối các rơ-le trước.',
  'That feeder was just wired to another relay. Unwire it there first.':
    'Mạch điện này đã được đấu nối vào rơ-le khác. Vui lòng ngắt kết nối trước.',
}

function translateErrorMessage(msg: string): string {
  if (!msg) return msg
  const trimmed = msg.trim()
  if (BACKEND_ERROR_TRANSLATIONS[trimmed]) {
    return BACKEND_ERROR_TRANSLATIONS[trimmed]
  }

  if (/road segment.*still has poles/i.test(trimmed)) {
    return 'Tuyến đường này vẫn còn cột đèn, sự cố hoặc cụm sự cố liên kết, không thể xóa.'
  }
  if (/cabinet.*still has feeders|cabinet.*device pointing/i.test(trimmed)) {
    return 'Tủ điện này vẫn còn mạch điện hoặc thiết bị IoT gắn kèm, không thể xóa.'
  }
  if (/feeder.*still has poles wired/i.test(trimmed)) {
    return 'Mạch điện này vẫn còn cột đèn đang đấu nối, không thể xóa.'
  }
  if (/pole.*still has records/i.test(trimmed)) {
    return 'Cột đèn này vẫn còn dữ liệu liên kết (bóng đèn, sự cố hoặc lịch sử bảo trì), không thể xóa.'
  }
  if (/device.*still has relays wired/i.test(trimmed)) {
    return 'Thiết bị IoT này vẫn còn rơ-le đang đấu nối. Vui lòng ngắt kết nối các rơ-le trước khi xóa.'
  }
  if (/feeder was just wired to another relay/i.test(trimmed)) {
    return 'Mạch điện này đã được đấu nối vào rơ-le khác. Vui lòng ngắt kết nối trước.'
  }

  return msg
}

function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: { data?: { error?: { message?: string }; message?: string } }
    message?: string
  }
  const rawMsg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || fallback
  return translateErrorMessage(rawMsg)
}

/**
 * Worker saga tải toàn bộ danh mục tài sản thực tế từ Backend API
 */
function* handleFetchAssets() {
  try {
    const [segmentsRes, cabinetsRes, feedersRes, polesRes, iotNodesRes]: [
      SegmentListItemPagedResult,
      CabinetListItemPagedResult,
      FeederListItemPagedResult,
      PoleListItemPagedResult,
      IotNodeItemPagedResult
    ] = yield all([
      call(assetAPI.getSegments, { page_size: 1000 }),
      call(assetAPI.getCabinets, { page_size: 1000 }),
      call(assetAPI.getFeeders, { page_size: 1000 }),
      call(assetAPI.getPoles, { page_size: 1000 }),
      call(assetAPI.getIotNodes, { page_size: 1000 }),
    ])

    yield put(
      fetchAssetsSuccess({
        segments: segmentsRes.items ?? [],
        cabinets: cabinetsRes.items ?? [],
        feeders: feedersRes.items ?? [],
        poles: polesRes.items ?? [],
        iotNodes: iotNodesRes.items ?? [],
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

function* handleDeletePole(action: PayloadAction<string>) {
  try {
    const poleId = action.payload
    yield call(assetAPI.deletePole, poleId)

    yield put(mutationSuccess())
    toast.success(`Đã xóa cột đèn "${poleId}" thành công!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể xóa cột đèn')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi xóa cột đèn: ${errorMsg}`)
  }
}

function* handleDeleteCabinet(action: PayloadAction<string>) {
  try {
    const cabinetId = action.payload
    yield call(assetAPI.deleteCabinet, cabinetId)

    yield put(mutationSuccess())
    toast.success(`Đã xóa tủ điện "${cabinetId}" thành công!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể xóa tủ điện')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi xóa tủ điện: ${errorMsg}`)
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

function* handleDeleteSegment(action: PayloadAction<string>) {
  try {
    const segmentId = action.payload
    yield call(assetAPI.deleteSegment, segmentId)

    yield put(mutationSuccess())
    toast.success(`Đã xóa tuyến đường "${segmentId}" thành công!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể xóa tuyến đường')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi xóa tuyến đường: ${errorMsg}`)
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

function* handleCreateIotNode(action: PayloadAction<CreateIotNodeRequest>) {
  try {
    yield call(assetAPI.createIotNode, action.payload)
    yield put(mutationSuccess())
    toast.success('Đã đăng ký thiết bị IoT mới thành công!')
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể đăng ký thiết bị IoT')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi đăng ký thiết bị IoT: ${errorMsg}`)
  }
}

function* handleUpdateIotNode(action: PayloadAction<UpdateIotNodePayload>) {
  try {
    const { nodeId, data } = action.payload
    yield call(assetAPI.updateIotNode, nodeId, data)
    yield put(mutationSuccess())
    toast.success(`Đã cập nhật thiết bị IoT "${nodeId}" thành công!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể cập nhật thiết bị IoT')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi cập nhật thiết bị IoT: ${errorMsg}`)
  }
}

function* handleDeleteIotNode(action: PayloadAction<string>) {
  try {
    const nodeId = action.payload
    yield call(assetAPI.deleteIotNode, nodeId)
    yield put(mutationSuccess())
    toast.success(`Đã xóa thiết bị IoT "${nodeId}" thành công!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể xóa thiết bị IoT')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi xóa thiết bị IoT: ${errorMsg}`)
  }
}

function* handleSetIotNodeRelay(action: PayloadAction<SetIotNodeRelayPayload>) {
  try {
    const { nodeId, relayNo, data } = action.payload
    yield call(assetAPI.setIotNodeRelay, nodeId, relayNo, data)
    yield put(mutationSuccess())
    toast.success(
      data.feeder_id
        ? `Đã đấu nối rơ-le số ${relayNo} vào mạch "${data.feeder_id}"!`
        : `Đã ngắt kết nối rơ-le số ${relayNo}!`
    )
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể cấu hình rơ-le thiết bị IoT')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi cấu hình rơ-le: ${errorMsg}`)
  }
}

function* handleIssueIotNodeCredential(action: PayloadAction<IssueIotNodeCredentialPayload>) {
  try {
    const { nodeId, onSuccess } = action.payload
    const credential: IotNodeCredential = (yield call(
      assetAPI.issueIotNodeCredential,
      nodeId
    )) as IotNodeCredential
    yield put(mutationSuccess())
    toast.success(`Đã cấp secret xác thực mới cho thiết bị IoT "${nodeId}"!`)
    if (onSuccess) {
      onSuccess(credential)
    }
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể cấp secret thiết bị IoT')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi cấp secret: ${errorMsg}`)
  }
}

export default function* assetSaga() {
  yield takeLatest(fetchAssetsRequest.type, handleFetchAssets)
  yield takeLatest(importAssetRequest.type, handleImportAsset)
  yield takeLatest(createPoleRequest.type, handleCreatePole)
  yield takeLatest(createPolesBulkRequest.type, handleCreatePolesBulk)
  yield takeLatest(updatePoleRequest.type, handleUpdatePole)
  yield takeLatest(deletePoleRequest.type, handleDeletePole)
  yield takeLatest(createCabinetRequest.type, handleCreateCabinet)
  yield takeLatest(createCabinetsBulkRequest.type, handleCreateCabinetsBulk)
  yield takeLatest(updateCabinetRequest.type, handleUpdateCabinet)
  yield takeLatest(deleteCabinetRequest.type, handleDeleteCabinet)
  yield takeLatest(createFeederRequest.type, handleCreateFeeder)
  yield takeLatest(createFeedersBulkRequest.type, handleCreateFeedersBulk)
  yield takeLatest(updateFeederRequest.type, handleUpdateFeeder)
  yield takeLatest(deleteFeederRequest.type, handleDeleteFeeder)
  yield takeLatest(createSegmentRequest.type, handleCreateSegment)
  yield takeLatest(updateSegmentRequest.type, handleUpdateSegment)
  yield takeLatest(deleteSegmentRequest.type, handleDeleteSegment)
  yield takeLatest(createFixtureRequest.type, handleCreateFixture)
  yield takeLatest(createFixturesBulkRequest.type, handleCreateFixturesBulk)
  yield takeLatest(retireFixtureRequest.type, handleRetireFixture)
  yield takeLatest(createIotNodeRequest.type, handleCreateIotNode)
  yield takeLatest(updateIotNodeRequest.type, handleUpdateIotNode)
  yield takeLatest(deleteIotNodeRequest.type, handleDeleteIotNode)
  yield takeLatest(setIotNodeRelayRequest.type, handleSetIotNodeRelay)
  yield takeLatest(issueIotNodeCredentialRequest.type, handleIssueIotNodeCredential)
}
