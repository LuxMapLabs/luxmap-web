import { all, call, put, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import mapAPI from './mapAPI'
import type { CabinetPropertiesFeatureCollection, CabinetTopologyEdgePropertiesFeatureCollection } from '../../types/map/cabinets'
import type { PolePropertiesFeatureCollection, PoleMapDetail } from '../../types/map/poles'
import type { SegmentPropertiesFeatureCollection } from '../../types/map/segments'
import {
  fetchMapLayersRequest,
  fetchMapLayersSuccess,
  fetchMapLayersFailure,
  fetchCabinetTopologyRequest,
  fetchCabinetTopologySuccess,
  fetchCabinetTopologyFailure,
  fetchPoleDetailRequest,
  fetchPoleDetailSuccess,
  fetchPoleDetailFailure,
} from './mapSlice'

/**
 * Worker saga tải toàn bộ các lớp dữ liệu bản đồ không gian từ Backend
 */
function* handleFetchMapLayers(
  action: PayloadAction<{ bbox?: string; status?: string; segment_id?: string } | undefined>
) {
  try {
    const bbox = action.payload?.bbox || '106.35,10.85,106.65,11.10'

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

    yield put(
      fetchMapLayersSuccess({
        cabinets: cabsRes.features || [],
        segments: segsRes.features || [],
        poles: polesRes.features || [],
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
    const topologyRes: CabinetTopologyEdgePropertiesFeatureCollection = yield call(
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

export default function* mapSaga() {
  yield takeLatest(fetchMapLayersRequest.type, handleFetchMapLayers)
  yield takeLatest(fetchCabinetTopologyRequest.type, handleFetchCabinetTopology)
  yield takeLatest(fetchPoleDetailRequest.type, handleFetchPoleDetail)
}
