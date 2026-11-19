import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type {
  IotGatewayCredential,
  IotServerStatus,
  RegisterServerRequest,
  ServerLocationRequest,
} from '../../types/iot/servers'
import type {
  IotNodeStatus,
  RegisterNodeRequest,
  RegisteredNode,
  UpdateNodeRequest,
} from '../../types/iot/nodes'
import type { CommuneItem } from '../../types/admin/communes'
import type { CabinetListItem } from '../../types/assets/cabinets'
import type { FeederListItem } from '../../types/assets/feeders'

export type IotLoadStatus = 'idle' | 'loading' | 'ready' | 'error'
export type IotSubmitStatus = 'idle' | 'submitting' | 'succeeded' | 'failed'
export type IotCredentialAction = 'issue' | 'view' | 'revoke'

export interface IotBridgeState {
  servers: IotServerStatus[]
  serversStatus: IotLoadStatus
  serversError: string | null
  nodes: IotNodeStatus[]
  nodesStatus: IotLoadStatus
  nodesError: string | null
  communes: CommuneItem[]
  communesStatus: IotLoadStatus
  cabinets: CabinetListItem[]
  feeders: FeederListItem[]
  nodeAssetsStatus: IotLoadStatus
  nodeAssetsError: string | null
  serverSubmit: IotSubmitStatus
  serverSubmitError: string | null
  nodeSubmit: IotSubmitStatus
  nodeSubmitError: string | null
  registeredNode: RegisteredNode | null
  nodeEdit: IotSubmitStatus
  nodeEditError: string | null
  nodeDetach: IotSubmitStatus
  nodeDetachError: string | null
  credential: IotGatewayCredential | null
  serverCredentialBusy: IotCredentialAction | null
  credentialError: string | null
}

const initialState: IotBridgeState = {
  servers: [],
  serversStatus: 'idle',
  serversError: null,
  nodes: [],
  nodesStatus: 'idle',
  nodesError: null,
  communes: [],
  communesStatus: 'idle',
  cabinets: [],
  feeders: [],
  nodeAssetsStatus: 'idle',
  nodeAssetsError: null,
  serverSubmit: 'idle',
  serverSubmitError: null,
  nodeSubmit: 'idle',
  nodeSubmitError: null,
  registeredNode: null,
  nodeEdit: 'idle',
  nodeEditError: null,
  nodeDetach: 'idle',
  nodeDetachError: null,
  credential: null,
  serverCredentialBusy: null,
  credentialError: null,
}

const iotBridgeSlice = createSlice({
  name: 'iotBridge',
  initialState,
  reducers: {
    // ---- 1. Bridge load (servers, nodes, communes song song) ----
    fetchBridgeRequest: (state) => {
      state.serversStatus = 'loading'
      state.serversError = null
      state.nodesStatus = 'loading'
      state.nodesError = null
      state.communesStatus = 'loading'
    },
    fetchServersSuccess: (state, action: PayloadAction<IotServerStatus[]>) => {
      state.serversStatus = 'ready'
      state.servers = action.payload
      state.serversError = null
    },
    fetchServersFailure: (state, action: PayloadAction<string>) => {
      state.serversStatus = 'error'
      state.serversError = action.payload
    },
    fetchNodesSuccess: (state, action: PayloadAction<IotNodeStatus[]>) => {
      state.nodesStatus = 'ready'
      state.nodes = action.payload
      state.nodesError = null
    },
    fetchNodesFailure: (state, action: PayloadAction<string>) => {
      state.nodesStatus = 'error'
      state.nodesError = action.payload
    },
    fetchCommunesSuccess: (state, action: PayloadAction<CommuneItem[]>) => {
      state.communesStatus = 'ready'
      state.communes = action.payload
    },
    fetchCommunesFailure: (state) => {
      state.communesStatus = 'error'
    },

    // ---- 2. Node assets (cabinets + feeders) ----
    fetchNodeAssetsRequest: (state) => {
      state.nodeAssetsStatus = 'loading'
      state.nodeAssetsError = null
    },
    fetchNodeAssetsSuccess: (
      state,
      action: PayloadAction<{ cabinets: CabinetListItem[]; feeders: FeederListItem[] }>
    ) => {
      state.nodeAssetsStatus = 'ready'
      state.cabinets = action.payload.cabinets
      state.feeders = action.payload.feeders
      state.nodeAssetsError = null
    },
    fetchNodeAssetsFailure: (state, action: PayloadAction<string>) => {
      state.nodeAssetsStatus = 'error'
      state.nodeAssetsError = action.payload
    },

    // ---- 4. Server submit (register + update location) ----
    registerServerRequest: (state, _action: PayloadAction<RegisterServerRequest>) => {
      state.serverSubmit = 'submitting'
      state.serverSubmitError = null
    },
    updateServerLocationRequest: (
      state,
      _action: PayloadAction<{ serverId: string; body: ServerLocationRequest }>
    ) => {
      state.serverSubmit = 'submitting'
      state.serverSubmitError = null
    },
    serverSubmitSuccess: (state) => {
      state.serverSubmit = 'succeeded'
      state.serverSubmitError = null
    },
    serverSubmitFailure: (state, action: PayloadAction<string>) => {
      state.serverSubmit = 'failed'
      state.serverSubmitError = action.payload
    },
    resetServerSubmit: (state) => {
      state.serverSubmit = 'idle'
      state.serverSubmitError = null
    },

    // ---- 4. Node submit ----
    registerNodeRequest: (state, _action: PayloadAction<RegisterNodeRequest>) => {
      state.nodeSubmit = 'submitting'
      state.nodeSubmitError = null
      state.registeredNode = null
    },
    nodeSubmitSuccess: (state, action: PayloadAction<RegisteredNode>) => {
      state.nodeSubmit = 'succeeded'
      state.registeredNode = action.payload
      state.nodeSubmitError = null
    },
    nodeSubmitFailure: (state, action: PayloadAction<string>) => {
      state.nodeSubmit = 'failed'
      state.nodeSubmitError = action.payload
    },
    resetNodeSubmit: (state) => {
      state.nodeSubmit = 'idle'
      state.nodeSubmitError = null
      state.registeredNode = null
    },

    // ---- 6b. Node edit & detach feeder ----
    updateNodeRequest: (
      state,
      _action: PayloadAction<{ nodeId: string; body: UpdateNodeRequest }>
    ) => {
      state.nodeEdit = 'submitting'
      state.nodeEditError = null
    },
    updateNodeSuccess: (state) => {
      state.nodeEdit = 'succeeded'
      state.nodeEditError = null
    },
    updateNodeFailure: (state, action: PayloadAction<string>) => {
      state.nodeEdit = 'failed'
      state.nodeEditError = action.payload
    },
    resetNodeEdit: (state) => {
      state.nodeEdit = 'idle'
      state.nodeEditError = null
    },
    detachNodeFeederRequest: (state, _action: PayloadAction<string>) => {
      state.nodeDetach = 'submitting'
      state.nodeDetachError = null
    },
    detachNodeFeederSuccess: (state) => {
      state.nodeDetach = 'succeeded'
      state.nodeDetachError = null
    },
    detachNodeFeederFailure: (state, action: PayloadAction<string>) => {
      state.nodeDetach = 'failed'
      state.nodeDetachError = action.payload
    },
    resetNodeDetach: (state) => {
      state.nodeDetach = 'idle'
      state.nodeDetachError = null
    },

    // ---- 5. Key MQTT theo server ----
    clearCredential: (state) => {
      state.credential = null
      state.credentialError = null
    },
    issueServerCredentialRequest: (state, _action: PayloadAction<string>) => {
      state.serverCredentialBusy = 'issue'
      state.credentialError = null
    },
    viewServerCredentialRequest: (state, _action: PayloadAction<string>) => {
      state.serverCredentialBusy = 'view'
      state.credentialError = null
    },
    revokeServerCredentialRequest: (state, _action: PayloadAction<string>) => {
      state.serverCredentialBusy = 'revoke'
      state.credentialError = null
    },
    serverCredentialSuccess: (state, action: PayloadAction<IotGatewayCredential>) => {
      state.credential = action.payload
      state.serverCredentialBusy = null
      state.credentialError = null
    },
    serverCredentialRevoked: (state) => {
      state.credential = null
      state.serverCredentialBusy = null
      state.credentialError = null
    },
    serverCredentialFailure: (state, action: PayloadAction<string>) => {
      state.serverCredentialBusy = null
      state.credentialError = action.payload
    },
  },
})

export const {
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
  resetServerSubmit,
  registerNodeRequest,
  nodeSubmitSuccess,
  nodeSubmitFailure,
  resetNodeSubmit,
  updateNodeRequest,
  updateNodeSuccess,
  updateNodeFailure,
  resetNodeEdit,
  detachNodeFeederRequest,
  detachNodeFeederSuccess,
  detachNodeFeederFailure,
  resetNodeDetach,
  clearCredential,
  issueServerCredentialRequest,
  viewServerCredentialRequest,
  revokeServerCredentialRequest,
  serverCredentialSuccess,
  serverCredentialRevoked,
  serverCredentialFailure,
} = iotBridgeSlice.actions

export default iotBridgeSlice.reducer
