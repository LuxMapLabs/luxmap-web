import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import iotBridgeReducer, {
  fetchBridgeRequest,
  fetchRoutesRequest,
  issueCredentialRequest,
  viewCredentialRequest,
  registerNodeRequest,
} from '../../feature/iot/iotBridgeSlice'
import iotBridgeSaga from '../../feature/iot/iotBridgeSaga'
import iotAPI from '../../feature/iot/iotAPI'
import { communeAPI } from '../../feature/communes/communeAPI'
import { assetAPI } from '../../feature/assets/assetAPI'
import { makeSagaStore } from '../utils/sagaStore'

vi.mock('../../feature/iot/iotAPI', () => ({
  default: {
    getServers: vi.fn(),
    getNodes: vi.fn(),
    getGatewayRoutes: vi.fn(),
    putGatewayRoute: vi.fn(),
    issueGatewayCredential: vi.fn(),
    getGatewayCredential: vi.fn(),
    revokeGatewayCredential: vi.fn(),
    registerServer: vi.fn(),
    updateServerLocation: vi.fn(),
    registerNode: vi.fn(),
  },
}))

vi.mock('../../feature/communes/communeAPI', () => ({
  communeAPI: {
    getCommunes: vi.fn(),
  },
}))

vi.mock('../../feature/assets/assetAPI', () => ({
  assetAPI: {
    getCabinets: vi.fn(),
    getFeeders: vi.fn(),
  },
}))

const api = vi.mocked(iotAPI)
const communes = vi.mocked(communeAPI)
const assets = vi.mocked(assetAPI)

describe('iotBridgeSaga integration tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getServers.mockResolvedValue([])
    api.getNodes.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] })
    communes.getCommunes.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] } as never)
    assets.getCabinets.mockResolvedValue({ items: [] } as never)
    assets.getFeeders.mockResolvedValue({ items: [] } as never)
  })

  it('fetchBridgeRequest: when getServers fails, nodes and communes still reach ready status', async () => {
    api.getServers.mockRejectedValue(new Error('Server error'))
    api.getNodes.mockResolvedValue({
      page: 1,
      page_size: 200,
      total: 1,
      items: [{ node_id: 'NODE-1' }],
    })
    communes.getCommunes.mockResolvedValue({
      page: 1,
      page_size: 200,
      total: 1,
      items: [{ commune_id: 'COM-1', name: 'Xã 1' }],
    } as never)

    const store = makeSagaStore({
      reducers: { iotBridge: iotBridgeReducer },
      sagas: [iotBridgeSaga],
    })

    store.dispatch(fetchBridgeRequest())

    await waitFor(() => {
      const state = store.getState().iotBridge
      expect(state.serversStatus).toBe('error')
      expect(state.serversError).toBe('Không đọc được danh sách server IoT.')
      expect(state.nodesStatus).toBe('ready')
      expect(state.nodes).toHaveLength(1)
      expect(state.communesStatus).toBe('ready')
      expect(state.communes).toHaveLength(1)
    })
  })

  it("fetchRoutesRequest: when fetching 'A' then 'B', and A resolves after B, state only keeps routes of B", async () => {
    let resolveA: (val: unknown) => void = () => {}
    const promiseA = new Promise((resolve) => {
      resolveA = resolve
    })

    let resolveB: (val: unknown) => void = () => {}
    const promiseB = new Promise((resolve) => {
      resolveB = resolve
    })

    api.getGatewayRoutes.mockImplementation((serverId: string) => {
      if (serverId === 'A') return promiseA as never
      if (serverId === 'B') return promiseB as never
      return Promise.resolve([])
    })

    const store = makeSagaStore({
      reducers: { iotBridge: iotBridgeReducer },
      sagas: [iotBridgeSaga],
    })

    store.dispatch(fetchRoutesRequest('A'))
    store.dispatch(fetchRoutesRequest('B'))

    // B resolves first with route B
    resolveB([{ gateway_id: 'GW-B', device_ids: ['DEV-B'] }])

    await waitFor(() => {
      const state = store.getState().iotBridge
      expect(state.routesServerId).toBe('B')
      expect(state.routesStatus).toBe('ready')
      expect(state.routes).toEqual([{ gateway_id: 'GW-B', device_ids: ['DEV-B'] }])
    })

    // Then A resolves late with route A
    resolveA([{ gateway_id: 'GW-A', device_ids: ['DEV-A'] }])

    // Wait a tick and verify state still retains B
    await new Promise((r) => setTimeout(r, 50))
    const state = store.getState().iotBridge
    expect(state.routesServerId).toBe('B')
    expect(state.routes).toEqual([{ gateway_id: 'GW-B', device_ids: ['DEV-B'] }])
  })

  it('fetchRoutesRequest: refetching the same server keeps existing routes while loading', async () => {
    let resolveReload: (val: unknown) => void = () => {}
    const reloadPromise = new Promise((resolve) => {
      resolveReload = resolve
    })

    api.getGatewayRoutes
      .mockResolvedValueOnce([{ gateway_id: 'GW-INIT', device_ids: ['DEV-1'] }])
      .mockImplementationOnce(() => reloadPromise as never)

    const store = makeSagaStore({
      reducers: { iotBridge: iotBridgeReducer },
      sagas: [iotBridgeSaga],
    })

    // First fetch resolves
    store.dispatch(fetchRoutesRequest('SRV-1'))
    await waitFor(() => {
      expect(store.getState().iotBridge.routesStatus).toBe('ready')
      expect(store.getState().iotBridge.routes).toHaveLength(1)
    })

    // Refetch same server
    store.dispatch(fetchRoutesRequest('SRV-1'))
    const stateDuringReload = store.getState().iotBridge
    expect(stateDuringReload.routesStatus).toBe('loading')
    // routes cũ vẫn còn, không bị xóa về []
    expect(stateDuringReload.routes).toEqual([{ gateway_id: 'GW-INIT', device_ids: ['DEV-1'] }])

    // Resolve reload
    resolveReload([{ gateway_id: 'GW-UPDATED', device_ids: ['DEV-2'] }])
    await waitFor(() => {
      expect(store.getState().iotBridge.routesStatus).toBe('ready')
      expect(store.getState().iotBridge.routes).toEqual([{ gateway_id: 'GW-UPDATED', device_ids: ['DEV-2'] }])
    })
  })

  it('takes every credential action: issue key for GW1 then view key for GW2 concurrently, both resolve without cancellation', async () => {
    let resolveGW1: (val: unknown) => void = () => {}
    const promiseGW1 = new Promise((resolve) => {
      resolveGW1 = resolve
    })

    api.issueGatewayCredential.mockImplementation(() => promiseGW1 as never)
    api.getGatewayCredential.mockResolvedValue({
      client_id: 'GW2',
      username: 'GW2',
      password: 'pass-gw2',
      node_ids: [],
    })
    api.getGatewayRoutes.mockResolvedValue([])

    const store = makeSagaStore({
      reducers: { iotBridge: iotBridgeReducer },
      sagas: [iotBridgeSaga],
    })

    // Dispatch issue key cho GW1 (resolve chậm)
    store.dispatch(issueCredentialRequest({ serverId: 'SRV-1', gatewayId: 'GW1' }))

    // Dispatch view key cho GW2 (resolve ngay)
    store.dispatch(viewCredentialRequest({ serverId: 'SRV-1', gatewayId: 'GW2' }))

    await waitFor(() => {
      // GW2 view credential hoàn thành và cập nhật store
      expect(store.getState().iotBridge.credential).toEqual({
        client_id: 'GW2',
        username: 'GW2',
        password: 'pass-gw2',
        node_ids: [],
      })
    })

    // Resolve GW1
    resolveGW1({
      client_id: 'GW1',
      username: 'GW1',
      password: 'pass-gw1',
      node_ids: [],
    })

    await waitFor(() => {
      // Cả 2 action đều được gọi (takeEvery không hủy tác vụ)
      expect(api.issueGatewayCredential).toHaveBeenCalledWith('SRV-1', 'GW1')
      expect(api.getGatewayCredential).toHaveBeenCalledWith('SRV-1', 'GW2')
    })
  })

  it('registerNodeRequest: saves registeredNode and triggers fetchBridgeRequest (refetching servers and nodes)', async () => {
    const registered = {
      node_id: 'NODE-NEW',
      server_id: 'SRV-1',
      device_id: 'DEV-NEW',
      gateway_id: 'GW-NEW',
    }
    api.registerNode.mockResolvedValue(registered)
    api.getServers.mockResolvedValue([])
    api.getNodes.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] })
    communes.getCommunes.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] } as never)

    const store = makeSagaStore({
      reducers: { iotBridge: iotBridgeReducer },
      sagas: [iotBridgeSaga],
    })

    store.dispatch(
      registerNodeRequest({
        server_id: 'SRV-1',
        cabinet_id: 'CAB-1',
        feeder_id: 'FDR-1',
        device_id: 'DEV-NEW',
        gateway_id: 'GW-NEW',
        data_source: 'calibration_rig',
        nominal_voltage: 5,
        nominal_current_ma: 100,
        nominal_power_mw: 500,
      })
    )

    await waitFor(() => {
      const state = store.getState().iotBridge
      expect(state.nodeSubmit).toBe('succeeded')
      expect(state.registeredNode).toEqual(registered)
      expect(api.getServers).toHaveBeenCalled()
      expect(api.getNodes).toHaveBeenCalled()
    })
  })
})
