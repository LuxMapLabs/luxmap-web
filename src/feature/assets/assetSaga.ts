import { all, call, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import assetAPI from './assetAPI'
import type { WorkbookImportResult } from '../../types/assets/import'
import type {
  SegmentListItemPagedResult,
  CreateSegmentRequest,
  SegmentDetail,
} from '../../types/assets/segments'
import type { CabinetListItemPagedResult, CreateCabinetRequest } from '../../types/assets/cabinets'
import type { FeederListItemPagedResult, CreateFeederRequest } from '../../types/assets/feeders'
import type {
  PoleListItem,
  PoleListItemPagedResult,
} from '../../types/assets/poles'
import type { RootState } from '../../redux/rootReducer'
import { fetchMapLayersRequest, fetchPoleDetailRequest } from '../map/mapSlice'
import {
  buildSegmentGeometry,
  isSameLine,
  orderedPolesOfSegment,
  reconcileRoute,
} from '../../utils/gis-map/segmentPoleOrder'
import { isRoadShape } from '../../utils/gis-map/segmentRoadShape'
import { calculateDistanceMeters } from '../../utils/gis-map/routeUtils'
import type { CreateFixtureRequest } from '../../types/assets/fixtures'
import type {
  CreateIotNodeRequest,
  IotNodeCredential,
} from '../../types/assets/iot-nodes'
import {
  styleAssetWorkbook,
  saveWorkbookFile,
} from '../../utils/assets/workbookStyler'
import {
  fetchAssetsRequest,
  fetchAssetsSuccess,
  fetchAssetsFailure,
  importAssetRequest,
  importAssetSuccess,
  importAssetFailure,
  exportWorkbookRequest,
  exportWorkbookSuccess,
  exportWorkbookFailure,
  downloadTemplateRequest,
  downloadTemplateSuccess,
  downloadTemplateFailure,
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
  fetchSegmentDetailRequest,
  fetchSegmentDetailSuccess,
  fetchSegmentDetailFailure,
  createSegmentRequest,
  updateSegmentRequest,
  deleteSegmentRequest,
  drawSegmentRequest,
  createFixtureRequest,
  createFixturesBulkRequest,
  retireFixtureRequest,
  updateFixtureRequest,
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
  type UpdateFixturePayload,
  type CreateFixturePayload,
  type UpdateIotNodePayload,
  type SetIotNodeRelayPayload,
  type IssueIotNodeCredentialPayload,
} from './assetSlice'

const BACKEND_ERROR_TRANSLATIONS: Record<string, string> = {
  'Upload a .xlsx workbook.': 'Chỉ nhận tệp Excel .xlsx. Vui lòng chọn đúng tệp và nạp lại.',
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
  const rawMsg =
    err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || fallback
  return translateErrorMessage(rawMsg)
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
      PoleListItemPagedResult,
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
 * Worker saga nạp file Excel sổ cái tài sản lên Backend API
 */
function* handleImportAsset(action: PayloadAction<ImportAssetPayload>) {
  const { file } = action.payload

  try {
    const result: WorkbookImportResult = (yield call(
      assetAPI.importWorkbook,
      file
    )) as WorkbookImportResult

    yield put(importAssetSuccess(result))

    if (result.committed) {
      const totalChanges =
        (result.segments?.inserted ?? 0) +
        (result.segments?.updated ?? 0) +
        (result.cabinets?.inserted ?? 0) +
        (result.cabinets?.updated ?? 0) +
        (result.feeders?.inserted ?? 0) +
        (result.feeders?.updated ?? 0) +
        (result.poles?.inserted ?? 0) +
        (result.poles?.updated ?? 0) +
        (result.fixtures?.inserted ?? 0) +
        (result.fixtures?.updated ?? 0)

      if (totalChanges > 0) {
        yield put(fetchAssetsRequest())
      }
    }
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể kết nối đến máy chủ Backend để nạp dữ liệu.')
    yield put(importAssetFailure(errorMsg))
    toast.error(`Lỗi nạp dữ liệu: ${errorMsg}`)
  }
}

function getLocalISODate(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function* safeGetTemplate() {
  try {
    const tpl: ArrayBuffer = (yield call(assetAPI.getTemplateWorkbook)) as ArrayBuffer
    return tpl
  } catch (err: unknown) {
    console.warn('Không lấy được tệp mẫu:', err)
    return null
  }
}

function* styleOrRaw(template: ArrayBuffer, exported?: ArrayBuffer) {
  try {
    const styled: ArrayBuffer = (yield call(
      styleAssetWorkbook,
      template,
      exported,
    )) as ArrayBuffer
    return styled
  } catch (err: unknown) {
    console.error('Không thể tân trang workbook, sử dụng dữ liệu thô:', err)
    return exported ?? template
  }
}

/**
 * Worker saga xuất file Excel sổ cái tài sản từ Backend API
 */
function* handleExportWorkbook() {
  try {
    const [exported, template]: [ArrayBuffer, ArrayBuffer | null] = (yield all([
      call(assetAPI.exportWorkbook),
      call(safeGetTemplate),
    ])) as [ArrayBuffer, ArrayBuffer | null]

    const file: ArrayBuffer = template
      ? yield* styleOrRaw(template, exported)
      : exported
    const fileName = `Tai-san-${getLocalISODate()}.xlsx`
    yield call(saveWorkbookFile, file, fileName)
    yield put(exportWorkbookSuccess())
    toast.success(`Đã tải ${fileName}`)
  } catch (error: unknown) {
    yield put(exportWorkbookFailure())
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 413) {
      toast.error('Có quá nhiều tài sản để xuất trong một tệp. Vui lòng liên hệ quản trị viên.')
    } else {
      toast.error('Không xuất được dữ liệu tài sản. Vui lòng thử lại.')
    }
  }
}

/**
 * Worker saga tải tệp mẫu Excel sổ cái tài sản
 */
function* handleDownloadTemplate() {
  try {
    const raw: ArrayBuffer = (yield call(assetAPI.getTemplateWorkbook)) as ArrayBuffer
    const file: ArrayBuffer = yield* styleOrRaw(raw)
    const fileName = 'Mau-nap-tai-san.xlsx'
    yield call(saveWorkbookFile, file, fileName)
    yield put(downloadTemplateSuccess())
  } catch {
    yield put(downloadTemplateFailure())
    toast.error('Không tải được tệp mẫu. Vui lòng thử lại.')
  }
}

// ====================================================
// MUTATION WORKER SAGAS (REDUX-SAGA FIRST ARCHITECTURE)
// ====================================================

/** Backend giới hạn page_size ở 200 (lặng lẽ, không báo lỗi): đọc lần lượt từng trang tới hết. */
const POLE_PAGE_SIZE = 200

function* fetchAllPoles() {
  const all: PoleListItem[] = []
  for (let page = 1; ; page++) {
    const res = (yield call(assetAPI.getPoles, {
      page,
      page_size: POLE_PAGE_SIZE,
    })) as PoleListItemPagedResult
    const items = res.items ?? []
    all.push(...items)
    const total = typeof res.total === 'number' ? res.total : all.length
    if (items.length === 0 || all.length >= total) return all
  }
}

/**
 * Sau khi cột được tạo / dời / đổi tuyến, tuyến chưa có hình hoặc đang là đường nối cột (bản nháp) được dựng lại
 * từ các cột của nó (giữ điểm uốn đã có). Tuyến có hình thật (theo con đường) thì giữ nguyên: không bao giờ
 * ghi đè bằng đường nối cột (`isRoadShape`). Backend không tự vẽ lại. Cột đã lưu rồi thì lỗi ở đây không hoàn tác được,
 * chỉ báo để người dùng mở "Sửa tuyến" lưu lại. Trả về true nếu có tuyến không cập nhật được.
 *
 * `before`: danh sách cột trước khi lưu (vị trí cũ, để nhận ra đỉnh nào của đường cũ là cột nào).
 */
function* syncSegmentGeometries(segmentIds: string[], before: PoleListItem[]) {
  let failed = false
  const ids = [...new Set(segmentIds.filter(Boolean))]
  if (ids.length === 0) return failed

  let after: PoleListItem[] = []
  try {
    after = yield* fetchAllPoles()
  } catch {
    return true
  }

  for (const segmentId of ids) {
    try {
      const detail = (yield call(assetAPI.getSegmentDetail, segmentId)) as SegmentDetail
      const previous = orderedPolesOfSegment(before, segmentId)
      if (isRoadShape(previous, detail.geom_wkt)) continue
      const route = reconcileRoute(
        previous,
        detail.geom_wkt,
        orderedPolesOfSegment(after, segmentId)
      )
      const geometry = buildSegmentGeometry(route)
      // Chưa đủ 2 cột có GPS thì chưa dựng được đường; đường không đổi thì khỏi gọi API
      if (!geometry || isSameLine(geometry.geomWkt, detail.geom_wkt)) continue

      const seg = detail.segment
      yield call(assetAPI.updateSegment, segmentId, {
        external_ref: seg.external_ref,
        segment_name: seg.segment_name,
        road_class: seg.road_class,
        // Có hình thì chiều dài lấy theo hình đo được, thay cho số khai theo sổ sách
        length_m: geometry.lengthM,
        geom_wkt: geometry.geomWkt,
        data_source: seg.data_source,
      })
    } catch {
      failed = true
    }
  }
  return failed
}

/** `POINT(lng lat)` của form cột; null nếu không đọc được. */
const pointOfWkt = (wkt: string | null | undefined): [number, number] | null => {
  const m = typeof wkt === 'string' ? /^\s*POINT\s*\(\s*(\S+)\s+(\S+)\s*\)\s*$/i.exec(wkt) : null
  if (!m) return null
  const lng = Number(m[1])
  const lat = Number(m[2])
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null
}

const warnSegmentNotSynced = () =>
  toast.warning(
    'Cột đã lưu nhưng hình tuyến chưa cập nhật. Mở "Sửa tuyến" và lưu lại để vẽ lại đường.'
  )

function* handleCreatePole(action: PayloadAction<CreatePolePayload>) {
  try {
    const { pole, fixture } = action.payload
    const before: PoleListItem[] = yield select((state: RootState) => state.assets.poles)
    yield call(assetAPI.createPole, pole)

    if (fixture) {
      yield call(assetAPI.createFixture, fixture)
    }

    const failed: boolean = yield* syncSegmentGeometries(
      pole.segment_id && pole.geom_wkt ? [pole.segment_id] : [],
      before
    )
    if (failed) warnSegmentNotSynced()

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
    const before: PoleListItem[] = yield select((state: RootState) => state.assets.poles)
    for (const item of list) {
      yield call(assetAPI.createPole, item.pole)
      if (item.fixture) {
        yield call(assetAPI.createFixture, item.fixture)
      }
    }

    // Mỗi tuyến chỉ cập nhật hình một lần sau khi đã thêm xong cả loạt cột
    const failed: boolean = yield* syncSegmentGeometries(
      list.flatMap((item) =>
        item.pole.segment_id && item.pole.geom_wkt ? [item.pole.segment_id] : []
      ),
      before
    )
    if (failed) warnSegmentNotSynced()

    yield put(mutationSuccess())
    toast.success(`Đã lưu thành công ${list.length} cột đèn vào Hệ thống!`)
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể lưu danh sách cột đèn vào hệ thống')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi tạo danh sách cột: ${errorMsg}`)
  }
}

export function* handleUpdatePole(action: PayloadAction<UpdatePolePayload>) {
  try {
    const { poleId, data } = action.payload
    const before: PoleListItem[] = yield select((state: RootState) => state.assets.poles)
    const old = before.find((p) => p.pole_id === poleId)
    // Dời cột trên cùng tuyến: đổi vị trí qua /location như Bản đồ GIS, để backend đo hành lang và ghi audit.
    // Đổi tuyến thì không: /location đo theo tuyến cũ của cột.
    const to = pointOfWkt(data.geom_wkt)
    const from: [number, number] | null = old?.location
      ? [old.location.lng, old.location.lat]
      : null
    const moved =
      to !== null &&
      from !== null &&
      (old?.segment_id ?? null) === (data.segment_id ?? null) &&
      calculateDistanceMeters(from, to) >= 0.01
    if (moved && to) yield call(assetAPI.setPoleLocation, poleId, { lat: to[1], lng: to[0] })
    yield call(assetAPI.updatePole, poleId, data)

    // Tuyến cũ (nếu cột đã có GPS) mất / dời cột, tuyến mới (nếu cột có GPS) nhận cột
    const affected = [
      old?.location && old.segment_id ? old.segment_id : '',
      data.segment_id && data.geom_wkt ? data.segment_id : '',
    ]
    const failed: boolean = yield* syncSegmentGeometries(affected, before)
    if (failed) warnSegmentNotSynced()

    yield put(mutationSuccess())
    toast.success(`Đã cập nhật thông số cột đèn "${data.external_ref || poleId}"!`)
    yield put(fetchAssetsRequest())
    if (action.payload.refreshMap) {
      yield put(fetchPoleDetailRequest(poleId))
      yield put(fetchMapLayersRequest())
    }
  } catch (error: unknown) {
    const errorMsg =
      poleOffSegmentMessage(error) ?? getErrorMessage(error, 'Không thể cập nhật cột đèn')
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

function* handleDrawSegment(action: PayloadAction<string>) {
  try {
    const segmentId = action.payload
    const before: PoleListItem[] = yield select((state: RootState) => state.assets.poles)
    const failed: boolean = yield* syncSegmentGeometries([segmentId], before)
    if (failed) throw new Error('Không vẽ được hình tuyến từ các cột hiện có')

    yield put(mutationSuccess())
    toast.success('Đã vẽ hình tuyến từ các cột có GPS!')
    yield put(fetchAssetsRequest())
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể vẽ hình tuyến')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi vẽ tuyến: ${errorMsg}`)
  }
}

// Không báo lỗi bằng toast: form sửa tuyến tự rơi về thứ tự suy ra và đã có lời nhắc cho người dùng.
function* handleFetchSegmentDetail(action: PayloadAction<string>) {
  const segmentId = action.payload
  try {
    const detail = (yield call(assetAPI.getSegmentDetail, segmentId)) as SegmentDetail
    yield put(fetchSegmentDetailSuccess({ segmentId, geomWkt: detail.geom_wkt }))
  } catch {
    yield put(fetchSegmentDetailFailure(segmentId))
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

export function* handleCreateFixture(action: PayloadAction<CreateFixturePayload>) {
  try {
    const { data, poleId } = action.payload
    yield call(assetAPI.createFixture, data)

    yield put(mutationSuccess())
    toast.success('Đã gắn bộ đèn mới!')
    yield put(fetchAssetsRequest())
    if (poleId) {
      yield put(fetchPoleDetailRequest(poleId))
      yield put(fetchMapLayersRequest())
    }
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể gắn bộ đèn')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi gắn bộ đèn: ${errorMsg}`)
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

export function* handleUpdateFixture(action: PayloadAction<UpdateFixturePayload>) {
  try {
    const { fixtureId, data, poleId } = action.payload
    yield call(assetAPI.updateFixture, fixtureId, data)

    yield put(mutationSuccess())
    toast.success(`Đã lưu thông tin bộ đèn "${fixtureId}"!`)
    yield put(fetchAssetsRequest())
    if (poleId) {
      yield put(fetchPoleDetailRequest(poleId))
      yield put(fetchMapLayersRequest())
    }
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể sửa bộ đèn')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi khi sửa bộ đèn: ${errorMsg}`)
  }
}

export function* handleRetireFixture(action: PayloadAction<RetireFixturePayload>) {
  try {
    const { fixtureId, data, poleId } = action.payload
    yield call(assetAPI.retireFixture, fixtureId, data)

    yield put(mutationSuccess())
    toast.success(
      data.removed_date
        ? `Đã đăng ký tháo dỡ bóng đèn "${fixtureId}"!`
        : `Đã kích hoạt lại bóng đèn "${fixtureId}"!`
    )
    yield put(fetchAssetsRequest())
    // Tháo từ Bản đồ GIS: cột đang mở và lớp bản đồ hiện ngay bóng đã tháo
    if (poleId) {
      yield put(fetchPoleDetailRequest(poleId))
      yield put(fetchMapLayersRequest())
    }
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error, 'Không thể thao tác bóng đèn')
    yield put(mutationFailure(errorMsg))
    toast.error(`Lỗi thao tác bóng đèn: ${errorMsg}`)
  }
}

const formatMeters = (m: number) => `${m.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} m`

/** 409 `POLE_OFF_SEGMENT`: vị trí mới ra ngoài hành lang khảo sát quanh tuyến của cột. Backend gửi kèm số đo thật. */
function poleOffSegmentMessage(error: unknown): string | null {
  const body = (
    error as {
      response?: {
        data?: { error?: { code?: string; details?: { distance_m?: number; corridor_m?: number } } }
      }
    }
  )?.response?.data?.error
  if (body?.code !== 'POLE_OFF_SEGMENT') return null
  const { distance_m: distance, corridor_m: corridor } = body.details ?? {}
  const far = typeof distance === 'number' ? `cách tuyến ${formatMeters(distance)}, ` : ''
  const limit = typeof corridor === 'number' ? ` ${formatMeters(corridor)}` : ''
  return `Vị trí mới ${far}nằm ngoài hành lang${limit} quanh tuyến của cột nên không lưu. Muốn đưa cột sang tuyến khác thì sửa cột ở Quản lý tài sản.`
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
    action.payload.onError?.()
  }
}

export default function* assetSaga() {
  yield takeLatest(fetchAssetsRequest.type, handleFetchAssets)
  yield takeLatest(importAssetRequest.type, handleImportAsset)
  yield takeLeading(exportWorkbookRequest.type, handleExportWorkbook)
  yield takeLeading(downloadTemplateRequest.type, handleDownloadTemplate)
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
  yield takeLatest(fetchSegmentDetailRequest.type, handleFetchSegmentDetail)
  yield takeLatest(createSegmentRequest.type, handleCreateSegment)
  yield takeLatest(updateSegmentRequest.type, handleUpdateSegment)
  yield takeLatest(deleteSegmentRequest.type, handleDeleteSegment)
  yield takeLatest(drawSegmentRequest.type, handleDrawSegment)
  yield takeLatest(createFixtureRequest.type, handleCreateFixture)
  yield takeLatest(createFixturesBulkRequest.type, handleCreateFixturesBulk)
  yield takeLatest(updateFixtureRequest.type, handleUpdateFixture)
  yield takeLatest(retireFixtureRequest.type, handleRetireFixture)
  yield takeLatest(createIotNodeRequest.type, handleCreateIotNode)
  yield takeLatest(updateIotNodeRequest.type, handleUpdateIotNode)
  yield takeLatest(deleteIotNodeRequest.type, handleDeleteIotNode)
  yield takeLatest(setIotNodeRelayRequest.type, handleSetIotNodeRelay)
  yield takeLatest(issueIotNodeCredentialRequest.type, handleIssueIotNodeCredential)
}
