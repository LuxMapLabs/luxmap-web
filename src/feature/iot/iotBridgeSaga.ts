import { all, call, put, takeEvery, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import iotAPI from './iotAPI'
import { communeAPI } from '../communes/communeAPI'
import { assetAPI } from '../assets/assetAPI'
import { apiErrorMessage } from '../../utils/iot/apiError'
import type {
  IotGatewayCredential,
  IotServerStatus,
  RegisterServerRequest,
  ServerLocationRequest,
} from '../../types/iot/servers'
import type {
  IotNodeStatusPagedResult,
  RegisterNodeRequest,
  RegisteredNode,
  UpdateNodeRequest,
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
  fetchNodeAssetsRequest,
  fetchNodeAssetsSuccess,
  fetchNodeAssetsFailure,
  registerServerRequest,
  updateServerLocationRequest,
  serverSubmitSuccess,
  serverSubmitFailure,
  registerNodeRequest,
  nodeSubmitSuccess,
  nodeSubmitFailure,
  updateNodeRequest,
  updateNodeSuccess,
  updateNodeFailure,
  detachNodeFeederRequest,
  detachNodeFeederSuccess,
  detachNodeFeederFailure,
  issueServerCredentialRequest,
  viewServerCredentialRequest,
  revokeServerCredentialRequest,
  serverCredentialSuccess,
  serverCredentialRevoked,
  serverCredentialFailure,
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

// ---- 2. Fetch Node Assets worker ----
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

// ---- 4. Node Submit worker ----
function* handleRegisterNode(action: PayloadAction<RegisterNodeRequest>) {
  try {
    const node: RegisteredNode = yield call(iotAPI.registerNode, action.payload)
    yield put(nodeSubmitSuccess(node))
    toast.success(`Đã đăng ký ${node.node_id || ''} (server ${node.server_id || ''})`)
    yield put(fetchBridgeRequest())
  } catch (err: unknown) {
    yield put(nodeSubmitFailure(apiErrorMessage(err, 'Không đăng ký được node IoT.')))
  }
}

function* handleUpdateNode(
  action: PayloadAction<{ nodeId: string; body: UpdateNodeRequest }>
) {
  const { nodeId, body } = action.payload
  try {
    yield call(iotAPI.updateNode, nodeId, body)
    yield put(updateNodeSuccess())
    toast.success(`Đã cập nhật node ${nodeId}`)
    yield put(fetchBridgeRequest())
  } catch (err: unknown) {
    yield put(updateNodeFailure(apiErrorMessage(err, 'Không cập nhật được node IoT.')))
  }
}

function* handleDetachNodeFeeder(action: PayloadAction<string>) {
  const nodeId = action.payload
  try {
    yield call(iotAPI.detachNodeFeeder, nodeId)
    yield put(detachNodeFeederSuccess())
    toast.success(`Đã gỡ node ${nodeId} khỏi mạch`)
    yield put(fetchBridgeRequest())
  } catch (err: unknown) {
    yield put(detachNodeFeederFailure(apiErrorMessage(err, 'Không gỡ được node khỏi mạch.')))
  }
}

// ---- 5. Key MQTT theo server ----
function* handleIssueServerCredential(action: PayloadAction<string>) {
  const serverId = action.payload
  try {
    const credential: IotGatewayCredential = yield call(
      iotAPI.issueServerCredential,
      serverId
    )
    yield put(serverCredentialSuccess(credential))
    yield put(fetchBridgeRequest())
  } catch (err: unknown) {
    const message = apiErrorMessage(err, 'Không cấp được key MQTT.')
    yield put(serverCredentialFailure(message))
    toast.error(message)
  }
}

function* handleViewServerCredential(action: PayloadAction<string>) {
  const serverId = action.payload
  try {
    const credential: IotGatewayCredential = yield call(
      iotAPI.getServerCredential,
      serverId
    )
    yield put(serverCredentialSuccess(credential))
  } catch (err: unknown) {
    const message = apiErrorMessage(err, 'Không xem được key MQTT.')
    yield put(serverCredentialFailure(message))
    toast.error(message)
  }
}

function* handleRevokeServerCredential(action: PayloadAction<string>) {
  const serverId = action.payload
  try {
    yield call(iotAPI.revokeServerCredential, serverId)
    yield put(serverCredentialRevoked())
    toast.success(`Đã thu hồi key của ${serverId}`)
    yield put(fetchBridgeRequest())
  } catch (err: unknown) {
    const message = apiErrorMessage(err, 'Không thu hồi được key MQTT.')
    yield put(serverCredentialFailure(message))
    toast.error(message)
  }
}

// takeLatest cho các fetch để huỷ request cũ khi chuyển màn / đổi server;
// takeEvery cho các thao tác ghi để không huỷ saga đang chạy làm mất response (ví dụ mật khẩu vừa cấp)
export function* iotBridgeSaga() {
  yield all([
    takeLatest(fetchBridgeRequest.type, handleFetchBridge),
    takeLatest(fetchNodeAssetsRequest.type, handleFetchNodeAssets),
    takeEvery(registerServerRequest.type, handleRegisterServer),
    takeEvery(updateServerLocationRequest.type, handleUpdateServerLocation),
    takeEvery(registerNodeRequest.type, handleRegisterNode),
    takeEvery(updateNodeRequest.type, handleUpdateNode),
    takeEvery(detachNodeFeederRequest.type, handleDetachNodeFeeder),
    takeEvery(issueServerCredentialRequest.type, handleIssueServerCredential),
    takeEvery(viewServerCredentialRequest.type, handleViewServerCredential),
    takeEvery(revokeServerCredentialRequest.type, handleRevokeServerCredential),
  ])
}

export default iotBridgeSaga
