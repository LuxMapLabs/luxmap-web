import { all, call, put, select, takeLatest } from 'redux-saga/effects'
import type { RootState } from '../../redux/store'
import type { MapBounds } from '../../types/auth/me'
import { toBboxParam } from '../../utils/gis-map/mapUtils'
import type { PayloadAction } from '@reduxjs/toolkit'
import mapAPI from './mapAPI'
import iotAPI from '../iot/iotAPI'
import type { IotDiagnosticSummaryItem } from '../../types/iot/diagnostics'
import type {
  CabinetPropertiesFeatureCollection,
  CabinetTopology,
  CabinetTopologyEdgePropertiesFeature,
} from '../../types/map/cabinets'
import type { PolePropertiesFeatureCollection, PoleMapDetail } from '../../types/map/poles'
import type { SegmentPropertiesFeatureCollection } from '../../types/map/segments'
import type { CommunePropertiesFeatureCollection } from '../../types/map/communes'
import {
  fetchCommuneBoundariesRequest,
  fetchCommuneBoundariesSuccess,
  fetchCommuneBoundariesFailure,
  fetchMapLayersRequest,
  fetchMapLayersSuccess,
  fetchMapLayersFailure,
  fetchCabinetTopologyRequest,
  fetchCabinetTopologySuccess,
  fetchCabinetTopologyFailure,
  fetchPoleDetailRequest,
  fetchPoleDetailSuccess,
  fetchPoleDetailFailure,
  refreshFeederDiagnosticsRequest,
  refreshFeederDiagnosticsSuccess,
} from './mapSlice'

/**
 * Worker saga tải toàn bộ các lớp dữ liệu bản đồ không gian từ Backend
 */
function* handleFetchMapLayers(
  action: PayloadAction<{ bbox?: string; status?: string; segment_id?: string } | undefined>
) {
  try {
    // No explicit bbox: the account's communes (GET /auth/me map_bounds), not a hard-coded area.
    const mapBounds: MapBounds | null | undefined = yield select((state: RootState) => state.auth.user?.map_bounds)
    const bbox = action.payload?.bbox || toBboxParam(mapBounds?.bbox)
    if (!bbox) return

    const commonParams = { bbox }
    const polesParams: { bbox: string; status?: string; segment_id?: string } = { bbox }

    // Backend chỉ chấp nhận các giá trị FixtureStatus cụ thể (normal, dim, out, unknown) qua CSV
    if (action.payload?.status && action.payload.status !== 'all') {
      polesParams.status = action.payload.status
    }
    if (action.payload?.segment_id && action.payload.segment_id !== 'all') {
      polesParams.segment_id = action.payload.segment_id
    }

    const [cabsRes, segsRes, polesRes]: [
      CabinetPropertiesFeatureCollection,
      SegmentPropertiesFeatureCollection,
      PolePropertiesFeatureCollection
    ] = yield all([
      call(mapAPI.getCabinets, commonParams),
      call(mapAPI.getSegments, commonParams),
      call(mapAPI.getPoles, polesParams),
    ])

    // Lấy sơ đồ topology các cạnh mạch điện từ Backend cho toàn bộ tủ điện trong khu vực
    const cabList = cabsRes.features || []
    const cabinetIds: string[] = cabList
      .map((c) => c.properties?.cabinet_id)
      .filter((id): id is string => Boolean(id))

    let allTopologyEdges: CabinetTopologyEdgePropertiesFeature[] = []
    if (cabinetIds.length > 0) {
      try {
        const topologyResults: (CabinetTopology | null)[] = yield all(
          cabinetIds.map((cabId) =>
            call(function* () {
              try {
                const res: CabinetTopology = yield call(
                  mapAPI.getCabinetTopology,
                  cabId
                )
                return res
              } catch {
                return null
              }
            })
          )
        )
        allTopologyEdges = topologyResults.flatMap((res) => res?.features || [])
      } catch {
        // Không để lỗi topology ảnh hưởng đến việc load lớp tủ, tuyến, cột
      }
    }

    yield put(
      fetchMapLayersSuccess({
        cabinets: cabList,
        segments: segsRes.features || [],
        poles: polesRes.features || [],
        allTopologyEdges,
      })
    )
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.message ||
      error?.message ||
      'Không thể tải dữ liệu bản đồ từ máy chủ Backend.'
    yield put(fetchMapLayersFailure(errorMsg))
  }
}

/**
 * Worker saga lấy sơ đồ cạnh topology Trụ → Cột của một Tủ điện
 */
function* handleFetchCabinetTopology(action: PayloadAction<string>) {
  const cabinetId = action.payload
  try {
    const topologyRes: CabinetTopology = yield call(
      mapAPI.getCabinetTopology,
      cabinetId
    )
    yield put(
      fetchCabinetTopologySuccess({
        cabinetId,
        edges: topologyRes.features || [],
      })
    )
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.message ||
      error?.message ||
      `Không thể tải sơ đồ topology cho tủ ${cabinetId}.`
    yield put(fetchCabinetTopologyFailure(errorMsg))
  }
}

/**
 * Worker saga lấy thông tin chi tiết một cột điện trên bản đồ
 */
function* handleFetchPoleDetail(action: PayloadAction<string>) {
  const poleId = action.payload
  try {
    const poleDetail: PoleMapDetail = yield call(mapAPI.getPoleDetail, poleId)
    yield put(fetchPoleDetailSuccess(poleDetail))
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.message ||
      error?.message ||
      `Không thể tải chi tiết cột ${poleId}.`
    yield put(fetchPoleDetailFailure(errorMsg))
  }
}

/**
 * Worker saga tải ranh giới các địa bàn của tài khoản; lỗi thì coi như chưa có ranh giới (dùng khung bbox)
 */
function* handleFetchCommuneBoundaries() {
  try {
    const res: CommunePropertiesFeatureCollection = yield call(mapAPI.getCommuneBoundaries)
    yield put(fetchCommuneBoundariesSuccess(res.features || []))
  } catch {
    yield put(fetchCommuneBoundariesFailure())
  }
}

const DIAGNOSTICS_PAGE_SIZE = 200
const DIAGNOSTICS_MAX_PAGES = 10

export function* handleRefreshFeederDiagnostics() {
  try {
    const items: IotDiagnosticSummaryItem[] = []
    for (let page = 1; page <= DIAGNOSTICS_MAX_PAGES; page++) {
      const res: Awaited<ReturnType<typeof iotAPI.getDiagnosticsSummary>> = yield call(iotAPI.getDiagnosticsSummary, {
        page,
        page_size: DIAGNOSTICS_PAGE_SIZE,
      })
      const pageItems = res.items ?? []
      items.push(...pageItems)
      if (pageItems.length < DIAGNOSTICS_PAGE_SIZE || items.length >= (res.total ?? 0)) break
    }
    yield put(refreshFeederDiagnosticsSuccess(items))
  } catch {
    // Chạy ngầm: giữ dữ liệu cũ, không toast
  }
}

export default function* mapSaga() {
  yield takeLatest(refreshFeederDiagnosticsRequest.type, handleRefreshFeederDiagnostics)
  yield takeLatest(fetchCommuneBoundariesRequest.type, handleFetchCommuneBoundaries)
  yield takeLatest(fetchMapLayersRequest.type, handleFetchMapLayers)
  yield takeLatest(fetchCabinetTopologyRequest.type, handleFetchCabinetTopology)
  yield takeLatest(fetchPoleDetailRequest.type, handleFetchPoleDetail)
}
