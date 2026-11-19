import { all, call, put, takeEvery, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import iotAPI from './iotAPI'
import { communeAPI } from '../communes/communeAPI'
import { assetAPI } from '../assets/assetAPI'
import { apiErrorMessage } from '../../utils/iot/apiError'
import type {
  IotGatewayCredential,
  IotGatewayRoute,
  IotGatewayRouteRequest,
  IotServerStatus,
  RegisterServerRequest,
  ServerLocationRequest,
} from '../../types/iot/servers'
import type {
  IotNodeStatusPagedResult,
  RegisterNodeRequest,
  RegisteredNode,
} from '../../types/iot/nodes'
import type { CommuneItemPagedResult } from '../../types/admin/communes'
import type { CabinetListItemPagedResult } from '../../types/assets/cabinets'
import type { FeederListItemPagedResult } from '../../types/assets/feeders'
import {
  fetchBridgeRequest,
  fetchServersSuccess,
  fetchServersFailure,
  fetchNodesSuccess,
  fetchNodesFailure,
  fetchCommunesSuccess,
  fetchCommunesFailure,
  fetchRoutesRequest,
  fetchRoutesSuccess,
  fetchRoutesFailure,
  fetchNodeAssetsRequest,
  fetchNodeAssetsSuccess,
  fetchNodeAssetsFailure,
  registerServerRequest,
  updateServerLocationRequest,
  serverSubmitSuccess,
  serverSubmitFailure,
  putRouteRequest,
  routeSubmitSuccess,
  routeSubmitFailure,
  registerNodeRequest,
  nodeSubmitSuccess,
  nodeSubmitFailure,
  issueCredentialRequest,
  viewCredentialRequest,
  revokeCredentialRequest,
  credentialSuccess,
  revokeCredentialSuccess,
  credentialFailure,
  type GatewayRef,
} from './iotBridgeSlice'

const PAGE_SIZE_200 = { page: 1, page_size: 200 }

// ---- 1. Fetch Bridge workers ----
function* handleFetchServers() {
  try {
    const servers: IotServerStatus[] = yield call(iotAPI.getServers)
    yield put(fetchServersSuccess(servers))
  } catch (err: unknown) {
    yield put(fetchServersFailure(apiErrorMessage(err, 'Không đọc được danh sách server IoT.')))
  }
}

function* handleFetchNodes() {
  try {
    const result: IotNodeStatusPagedResult = yield call(iotAPI.getNodes, PAGE_SIZE_200)
    yield put(fetchNodesSuccess(result.items || []))
  } catch (err: unknown) {
    yield put(fetchNodesFailure(apiErrorMessage(err, 'Không đọc được danh sách node IoT.')))
  }
}

function* handleFetchCommunes() {
  try {
    const result: CommuneItemPagedResult = yield call(communeAPI.getCommunes, PAGE_SIZE_200)
    yield put(fetchCommunesSuccess(result.items || []))
  } catch {
    yield put(fetchCommunesFailure())
  }
}

function* handleFetchBridge() {
  yield all([
    call(handleFetchServers),
    call(handleFetchNodes),
    call(handleFetchCommunes),
  ])
}

// ---- 2. Fetch Routes worker ----
function* handleFetchRoutes(action: PayloadAction<string>) {
  const serverId = action.payload
  try {
    const routes: IotGatewayRoute[] = yield call(iotAPI.getGatewayRoutes, serverId)
    yield put(fetchRoutesSuccess({ serverId, routes }))
  } catch (err: unknown) {
    yield put(fetchRoutesFailure({ serverId, error: apiErrorMessage(err, 'Không đọc được tuyến gateway từ bridge.') }))
  }
}

// ---- 3. Fetch Node Assets worker ----
function* handleFetchNodeAssets() {
  try {
    const [cab, fdr]: [CabinetListItemPagedResult, FeederListItemPagedResult] = yield all([
      call(assetAPI.getCabinets, PAGE_SIZE_200),
      call(assetAPI.getFeeders, PAGE_SIZE_200),
    ])
    yield put(
      fetchNodeAssetsSuccess({
        cabinets: cab.items || [],
        feeders: fdr.items || [],
      })
    )
  } catch (err: unknown) {
    yield put(fetchNodeAssetsFailure(apiErrorMessage(err, 'Không đọc được danh sách tủ điện / mạch.')))
  }
}

// ---- 4. Server Submit workers ----
function* handleRegisterServer(action: PayloadAction<RegisterServerRequest>) {
  try {
    yield call(iotAPI.registerServer, action.payload)
    yield put(serverSubmitSuccess())
    toast.success('Đã đăng ký server IoT')
    yield put(fetchBridgeRequest())
  } catch (err: unknown) {
    yield put(serverSubmitFailure(apiErrorMessage(err, 'Không đăng ký được server.')))
  }
}

function* handleUpdateServerLocation(
  action: PayloadAction<{ serverId: string; body: ServerLocationRequest }>
) {
  try {
    yield call(iotAPI.updateServerLocation, action.payload.serverId, action.payload.body)
    yield put(serverSubmitSuccess())
    toast.success('Đã cập nhật vị trí server')
    yield put(fetchBridgeRequest())
  } catch (err: unknown) {
    yield put(serverSubmitFailure(apiErrorMessage(err, 'Không cập nhật được vị trí server.')))
  }
}

// ---- 5. Route Submit worker ----
function* handlePutRoute(
  action: PayloadAction<{ serverId: string; gatewayId: string; body: IotGatewayRouteRequest }>
) {
  const { serverId, gatewayId, body } = action.payload
  try {
    yield call(iotAPI.putGatewayRoute, serverId, gatewayId, body)
    yield put(routeSubmitSuccess())
    toast.success(`Đã đăng ký tuyến ${gatewayId} → ${body.device_id || ''}`)
    yield put(fetchRoutesRequest(serverId))
  } catch (err: unknown) {
    yield put(routeSubmitFailure(apiErrorMessage(err, 'Không đăng ký được tuyến MQTT.')))
  }
}

// ---- 6. Node Submit worker ----
function* handleRegisterNode(action: PayloadAction<RegisterNodeRequest>) {
  try {
    const node: RegisteredNode = yield call(iotAPI.registerNode, action.payload)
    yield put(nodeSubmitSuccess(node))
    toast.success(`Đã đăng ký ${node.node_id || ''} (gateway ${node.gateway_id || ''})`)
    yield put(fetchBridgeRequest())
  } catch (err: unknown) {
    yield put(nodeSubmitFailure(apiErrorMessage(err, 'Không đăng ký được node IoT.')))
  }
}

// ---- 7. Gateway Credential workers ----
function* handleIssueCredential(action: PayloadAction<GatewayRef>) {
  const { serverId, gatewayId } = action.payload
  try {
    const credential: IotGatewayCredential = yield call(
      iotAPI.issueGatewayCredential,
      serverId,
      gatewayId
    )
    yield put(credentialSuccess(credential))
    yield put(fetchRoutesRequest(serverId))
  } catch (err: unknown) {
    const message = apiErrorMessage(err, 'Không cấp được key MQTT.')
    yield put(credentialFailure(message))
    toast.error(message)
  }
}

function* handleViewCredential(action: PayloadAction<GatewayRef>) {
  const { serverId, gatewayId } = action.payload
  try {
    const credential: IotGatewayCredential = yield call(
      iotAPI.getGatewayCredential,
      serverId,
      gatewayId
    )
    yield put(credentialSuccess(credential))
  } catch (err: unknown) {
    const message = apiErrorMessage(err, 'Không xem được key MQTT.')
    yield put(credentialFailure(message))
    toast.error(message)
  }
}

function* handleRevokeCredential(action: PayloadAction<GatewayRef>) {
  const { serverId, gatewayId } = action.payload
  try {
    yield call(iotAPI.revokeGatewayCredential, serverId, gatewayId)
    yield put(revokeCredentialSuccess())
    toast.success(`Đã thu hồi key của ${gatewayId}`)
    yield put(fetchRoutesRequest(serverId))
  } catch (err: unknown) {
    const message = apiErrorMessage(err, 'Không thu hồi được key MQTT.')
    yield put(credentialFailure(message))
    toast.error(message)
  }
}

// takeLatest cho các fetch để huỷ request cũ khi chuyển màn / đổi server;
// takeEvery cho các thao tác ghi để không huỷ saga đang chạy làm mất response (ví dụ mật khẩu vừa cấp)
export function* iotBridgeSaga() {
  yield all([
    takeLatest(fetchBridgeRequest.type, handleFetchBridge),
    takeLatest(fetchRoutesRequest.type, handleFetchRoutes),
    takeLatest(fetchNodeAssetsRequest.type, handleFetchNodeAssets),
    takeEvery(registerServerRequest.type, handleRegisterServer),
    takeEvery(updateServerLocationRequest.type, handleUpdateServerLocation),
    takeEvery(putRouteRequest.type, handlePutRoute),
    takeEvery(registerNodeRequest.type, handleRegisterNode),
    takeEvery(issueCredentialRequest.type, handleIssueCredential),
    takeEvery(viewCredentialRequest.type, handleViewCredential),
    takeEvery(revokeCredentialRequest.type, handleRevokeCredential),
  ])
}

export default iotBridgeSaga
