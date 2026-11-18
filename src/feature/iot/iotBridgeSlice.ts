import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type {
  IotGatewayCredential,
  IotGatewayRoute,
  IotGatewayRouteRequest,
  IotServerStatus,
  RegisterServerRequest,
  ServerLocationRequest,
} from '../../types/iot/servers'
import type {
  IotNodeStatus,
  RegisterNodeRequest,
  RegisteredNode,
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
  routesServerId: string | null
  routes: IotGatewayRoute[]
  routesStatus: IotLoadStatus
  routesError: string | null
  cabinets: CabinetListItem[]
  feeders: FeederListItem[]
  nodeAssetsStatus: IotLoadStatus
  nodeAssetsError: string | null
  serverSubmit: IotSubmitStatus
  serverSubmitError: string | null
  routeSubmit: IotSubmitStatus
  routeSubmitError: string | null
  nodeSubmit: IotSubmitStatus
  nodeSubmitError: string | null
  registeredNode: RegisteredNode | null
  credential: IotGatewayCredential | null
  credentialBusy: { gatewayId: string; action: IotCredentialAction } | null
  credentialError: string | null
}

export interface GatewayRef {
  serverId: string
  gatewayId: string
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
  routesServerId: null,
  routes: [],
  routesStatus: 'idle',
  routesError: null,
  cabinets: [],
  feeders: [],
  nodeAssetsStatus: 'idle',
  nodeAssetsError: null,
  serverSubmit: 'idle',
  serverSubmitError: null,
  routeSubmit: 'idle',
  routeSubmitError: null,
  nodeSubmit: 'idle',
  nodeSubmitError: null,
  registeredNode: null,
  credential: null,
  credentialBusy: null,
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

    // ---- 2. Gateway routes ----
    fetchRoutesRequest: (state, action: PayloadAction<string>) => {
      if (state.routesServerId !== action.payload) {
        state.routesServerId = action.payload
        state.routes = []
      }
      state.routesStatus = 'loading'
      state.routesError = null
    },
    fetchRoutesSuccess: (
      state,
      action: PayloadAction<{ serverId: string; routes: IotGatewayRoute[] }>
    ) => {
      if (state.routesServerId === action.payload.serverId) {
        state.routesStatus = 'ready'
        state.routes = action.payload.routes
        state.routesError = null
      }
    },
    fetchRoutesFailure: (
      state,
      action: PayloadAction<{ serverId: string; error: string }>
    ) => {
      if (state.routesServerId === action.payload.serverId) {
        state.routesStatus = 'error'
        state.routesError = action.payload.error
      }
    },
    clearRoutes: (state) => {
      state.routesServerId = null
      state.routes = []
      state.routesStatus = 'idle'
      state.routesError = null
    },

    // ---- 3. Node assets (cabinets + feeders) ----
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

    // ---- 5. Route submit ----
    putRouteRequest: (
      state,
      _action: PayloadAction<{ serverId: string; gatewayId: string; body: IotGatewayRouteRequest }>
    ) => {
      state.routeSubmit = 'submitting'
      state.routeSubmitError = null
    },
    routeSubmitSuccess: (state) => {
      state.routeSubmit = 'succeeded'
      state.routeSubmitError = null
    },
    routeSubmitFailure: (state, action: PayloadAction<string>) => {
      state.routeSubmit = 'failed'
      state.routeSubmitError = action.payload
    },
    resetRouteSubmit: (state) => {
      state.routeSubmit = 'idle'
      state.routeSubmitError = null
    },

    // ---- 6. Node submit ----
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

    // ---- 7. Gateway credentials ----
    issueCredentialRequest: (state, action: PayloadAction<GatewayRef>) => {
      state.credentialBusy = { gatewayId: action.payload.gatewayId, action: 'issue' }
      state.credentialError = null
    },
    viewCredentialRequest: (state, action: PayloadAction<GatewayRef>) => {
      state.credentialBusy = { gatewayId: action.payload.gatewayId, action: 'view' }
      state.credentialError = null
    },
    revokeCredentialRequest: (state, action: PayloadAction<GatewayRef>) => {
      state.credentialBusy = { gatewayId: action.payload.gatewayId, action: 'revoke' }
      state.credentialError = null
    },
    credentialSuccess: (state, action: PayloadAction<IotGatewayCredential>) => {
      state.credential = action.payload
      state.credentialBusy = null
      state.credentialError = null
    },
    revokeCredentialSuccess: (state) => {
      state.credentialBusy = null
      state.credentialError = null
    },
    credentialFailure: (state, action: PayloadAction<string>) => {
      state.credentialBusy = null
      state.credentialError = action.payload
    },
    clearCredential: (state) => {
      state.credential = null
      state.credentialError = null
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
  fetchRoutesRequest,
  fetchRoutesSuccess,
  fetchRoutesFailure,
  clearRoutes,
  fetchNodeAssetsRequest,
  fetchNodeAssetsSuccess,
  fetchNodeAssetsFailure,
  registerServerRequest,
  updateServerLocationRequest,
  serverSubmitSuccess,
  serverSubmitFailure,
  resetServerSubmit,
  putRouteRequest,
  routeSubmitSuccess,
  routeSubmitFailure,
  resetRouteSubmit,
  registerNodeRequest,
  nodeSubmitSuccess,
  nodeSubmitFailure,
  resetNodeSubmit,
  issueCredentialRequest,
  viewCredentialRequest,
  revokeCredentialRequest,
  credentialSuccess,
  revokeCredentialSuccess,
  credentialFailure,
  clearCredential,
} = iotBridgeSlice.actions

export default iotBridgeSlice.reducer
