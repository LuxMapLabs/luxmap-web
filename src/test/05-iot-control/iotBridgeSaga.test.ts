import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import iotBridgeReducer, {
  fetchBridgeRequest,
  registerNodeRequest,
  updateNodeRequest,
  detachNodeFeederRequest,
  issueServerCredentialRequest,
  viewServerCredentialRequest,
  revokeServerCredentialRequest,
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
    issueServerCredential: vi.fn(),
    getServerCredential: vi.fn(),
    revokeServerCredential: vi.fn(),
    registerServer: vi.fn(),
    updateServerLocation: vi.fn(),
    registerNode: vi.fn(),
    updateNode: vi.fn(),
    detachNodeFeeder: vi.fn(),
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

  it('registerNodeRequest: saves registeredNode and triggers fetchBridgeRequest (refetching servers and nodes)', async () => {
    const registered = {
      node_id: 'NODE-NEW',
      server_id: 'SRV-1',
      device_id: 'DEV-NEW',
      feeder_id: 'FDR-1',
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
        feeder_id: 'FDR-1',
        device_id: 'DEV-NEW',
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

  it('updateNodeRequest: calls updateNode, sets succeeded, and triggers fetchBridgeRequest', async () => {
    api.updateNode.mockResolvedValue(undefined)
    const body = {
      server_id: 'SRV-1',
      device_id: 'DEV-001',
      feeder_id: 'FDR-002',
      nominal_voltage: 5,
      nominal_current_ma: 100,
      nominal_power_mw: 500,
    }

    const store = makeSagaStore({
      reducers: { iotBridge: iotBridgeReducer },
      sagas: [iotBridgeSaga],
    })

    store.dispatch(updateNodeRequest({ nodeId: 'NODE-001', body }))

    await waitFor(() => {
      const state = store.getState().iotBridge
      expect(state.nodeEdit).toBe('succeeded')
      expect(state.nodeEditError).toBeNull()
      expect(api.updateNode).toHaveBeenCalledWith('NODE-001', body)
      expect(api.getServers).toHaveBeenCalled()
      expect(api.getNodes).toHaveBeenCalled()
    })
  })

  it('updateNodeRequest: sets failed with error message when API rejects', async () => {
    api.updateNode.mockRejectedValue({
      response: { data: { error: { message: 'Mạch đã có node khác.' } } },
    })
    const store = makeSagaStore({
      reducers: { iotBridge: iotBridgeReducer },
      sagas: [iotBridgeSaga],
    })

    store.dispatch(
      updateNodeRequest({
        nodeId: 'NODE-001',
        body: {
          server_id: 'SRV-1',
          device_id: 'DEV-001',
          feeder_id: 'FDR-002',
          nominal_voltage: 5,
          nominal_current_ma: 100,
          nominal_power_mw: 500,
        },
      })
    )

    await waitFor(() => {
      const state = store.getState().iotBridge
      expect(state.nodeEdit).toBe('failed')
      expect(state.nodeEditError).toBe('Mạch đã có node khác.')
    })
  })

  it('detachNodeFeederRequest: calls detachNodeFeeder, sets succeeded, and triggers fetchBridgeRequest', async () => {
    api.detachNodeFeeder.mockResolvedValue(undefined)
    const store = makeSagaStore({
      reducers: { iotBridge: iotBridgeReducer },
      sagas: [iotBridgeSaga],
    })

    store.dispatch(detachNodeFeederRequest('NODE-001'))

    await waitFor(() => {
      const state = store.getState().iotBridge
      expect(state.nodeDetach).toBe('succeeded')
      expect(state.nodeDetachError).toBeNull()
      expect(api.detachNodeFeeder).toHaveBeenCalledWith('NODE-001')
      expect(api.getServers).toHaveBeenCalled()
      expect(api.getNodes).toHaveBeenCalled()
    })
  })

  it('detachNodeFeederRequest: sets failed with error message when API rejects', async () => {
    api.detachNodeFeeder.mockRejectedValue({
      response: { data: { error: { message: 'Không tìm thấy node.' } } },
    })
    const store = makeSagaStore({
      reducers: { iotBridge: iotBridgeReducer },
      sagas: [iotBridgeSaga],
    })

    store.dispatch(detachNodeFeederRequest('NODE-404'))

    await waitFor(() => {
      const state = store.getState().iotBridge
      expect(state.nodeDetach).toBe('failed')
      expect(state.nodeDetachError).toBe('Không tìm thấy node.')
    })
  })

  it('issueServerCredentialRequest: calls issueServerCredential, saves credential and refetches bridge', async () => {
    const cred = {
      server_id: 'SRV-1',
      client_id: 'SRV-1',
      username: 'SRV-1',
      password: 'secret-password',
      node_ids: ['NODE-1'],
    }
    api.issueServerCredential.mockResolvedValue(cred)
    const store = makeSagaStore({
      reducers: { iotBridge: iotBridgeReducer },
      sagas: [iotBridgeSaga],
    })

    store.dispatch(issueServerCredentialRequest('SRV-1'))

    await waitFor(() => {
      const state = store.getState().iotBridge
      expect(state.serverCredentialBusy).toBeNull()
      expect(state.credential).toEqual(cred)
      expect(state.credentialError).toBeNull()
      expect(api.issueServerCredential).toHaveBeenCalledWith('SRV-1')
      expect(api.getServers).toHaveBeenCalled()
    })
  })

  it('issueServerCredentialRequest: sets credentialError on failure', async () => {
    api.issueServerCredential.mockRejectedValue({
      response: { data: { error: { message: 'Server đã có key.' } } },
    })
    const store = makeSagaStore({
      reducers: { iotBridge: iotBridgeReducer },
      sagas: [iotBridgeSaga],
    })

    store.dispatch(issueServerCredentialRequest('SRV-1'))

    await waitFor(() => {
      const state = store.getState().iotBridge
      expect(state.serverCredentialBusy).toBeNull()
      expect(state.credentialError).toBe('Server đã có key.')
    })
  })

  it('viewServerCredentialRequest: calls getServerCredential and saves credential (or sets error on failure)', async () => {
    const cred = {
      server_id: 'SRV-1',
      client_id: 'SRV-1',
      username: 'SRV-1',
      password: 'viewed-password',
      node_ids: [],
    }
    api.getServerCredential.mockResolvedValueOnce(cred)
    const store = makeSagaStore({
      reducers: { iotBridge: iotBridgeReducer },
      sagas: [iotBridgeSaga],
    })

    store.dispatch(viewServerCredentialRequest('SRV-1'))

    await waitFor(() => {
      const state = store.getState().iotBridge
      expect(state.serverCredentialBusy).toBeNull()
      expect(state.credential).toEqual(cred)
      expect(api.getServerCredential).toHaveBeenCalledWith('SRV-1')
    })

    api.getServerCredential.mockRejectedValueOnce({
      response: { data: { error: { message: 'Chưa cấp key.' } } },
    })
    store.dispatch(viewServerCredentialRequest('SRV-1'))

    await waitFor(() => {
      const state = store.getState().iotBridge
      expect(state.serverCredentialBusy).toBeNull()
      expect(state.credentialError).toBe('Chưa cấp key.')
    })
  })

  it('revokeServerCredentialRequest: calls revokeServerCredential, clears credential and refetches bridge (or sets error on failure)', async () => {
    api.revokeServerCredential.mockResolvedValueOnce(undefined)
    const store = makeSagaStore({
      reducers: { iotBridge: iotBridgeReducer },
      sagas: [iotBridgeSaga],
    })

    store.dispatch(revokeServerCredentialRequest('SRV-1'))

    await waitFor(() => {
      const state = store.getState().iotBridge
      expect(state.serverCredentialBusy).toBeNull()
      expect(state.credential).toBeNull()
      expect(api.revokeServerCredential).toHaveBeenCalledWith('SRV-1')
      expect(api.getServers).toHaveBeenCalled()
    })

    api.revokeServerCredential.mockRejectedValueOnce({
      response: { data: { error: { message: 'Lỗi thu hồi key.' } } },
    })
    store.dispatch(revokeServerCredentialRequest('SRV-1'))

    await waitFor(() => {
      const state = store.getState().iotBridge
      expect(state.serverCredentialBusy).toBeNull()
      expect(state.credentialError).toBe('Lỗi thu hồi key.')
    })
  })
})
