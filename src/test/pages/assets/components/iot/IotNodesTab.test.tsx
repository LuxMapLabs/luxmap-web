import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { IotNodesTab } from '../../../../../pages/assets/components/iot/IotNodesTab'
import iotAPI from '../../../../../feature/iot/iotAPI'
import assetReducer, {
  createIotNodeRequest,
  updateIotNodeRequest,
  deleteIotNodeRequest,
  setIotNodeRelayRequest,
  issueIotNodeCredentialRequest,
} from '../../../../../feature/assets/assetSlice'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import type { FeederListItem } from '../../../../../types/assets/feeders'

vi.mock('../../../../../hooks/useShowCommune', () => ({ useShowCommune: () => false }))

vi.mock('../../../../../feature/iot/iotAPI', () => ({
  default: { getNodes: vi.fn(), getServers: vi.fn() },
}))

const api = vi.mocked(iotAPI)

describe('IotNodesTab (GET /iot/nodes)', () => {
  const cabinets = [
    { cabinet_id: 'CAB-001', external_ref: 'CAB-TL8-A', cabinet_name: 'Tủ A - Tỉnh Lộ 8', commune_id: 'COM-001' },
    { cabinet_id: 'CAB-002', external_ref: 'CAB-TL8-B', cabinet_name: 'Tủ B - Tỉnh Lộ 8', commune_id: 'COM-002' },
  ] as CabinetListItem[]

  // FDR-001 đấu vào rơ-le #1 của IOT-NODE-001; IOT-NODE-002 chỉ có mạch ở rơ-le #2.
  const feeders = [
    { feeder_id: 'FDR-001', control: { node_id: 'IOT-NODE-001', relay_no: 1 } },
    { feeder_id: 'FDR-002', control: { node_id: 'IOT-NODE-002', relay_no: 2 } },
  ] as FeederListItem[]

  const nodes = [
    {
      node_id: 'IOT-NODE-001',
      server_id: 'iot-server-01',
      status: 'online',
      last_received_at: '2026-11-13T02:00:00Z',
      cabinet_id: 'CAB-001',
      commune_id: 'COM-001',
    },
    {
      node_id: 'IOT-NODE-002',
      server_id: null,
      status: 'unconfigured',
      last_received_at: null,
      cabinet_id: 'CAB-002',
      commune_id: 'COM-002',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    api.getNodes.mockResolvedValue({ page: 1, page_size: 200, total: 2, items: nodes })
    api.getServers.mockResolvedValue([])
  })

  it('lists the nodes from /iot/nodes with bridge status, server and the feeder on relay 1', async () => {
    render(<IotNodesTab cabinets={cabinets} feeders={feeders} />)

    const row1 = (await screen.findByText('IOT-NODE-001')).closest('tr')!
    expect(api.getNodes).toHaveBeenCalledWith({ page: 1, page_size: 200 })
    expect(within(row1).getByText('Tủ A - Tỉnh Lộ 8')).toBeInTheDocument()
    expect(within(row1).getByText('iot-server-01')).toBeInTheDocument()
    expect(within(row1).getByText('Node online')).toBeInTheDocument()
    expect(within(row1).getByText('FDR-001')).toBeInTheDocument()

    // Mạch ở rơ-le #2 không phải mạch của nguồn đo bridge.
    const row2 = screen.getByText('IOT-NODE-002').closest('tr')!
    expect(within(row2).getByText('Chưa gán nguồn đo')).toBeInTheDocument()
    expect(within(row2).getByText('Chưa đấu nối')).toBeInTheDocument()
    expect(within(row2).getByText('Chưa có mẫu đo')).toBeInTheDocument()

    // Không còn thao tác của /assets/iot-nodes.
    expect(screen.queryByText('Thêm thiết bị IoT')).not.toBeInTheDocument()
  })

  it('filters by server id', async () => {
    render(<IotNodesTab cabinets={cabinets} feeders={feeders} />)
    await screen.findByText('IOT-NODE-001')

    fireEvent.change(screen.getByPlaceholderText(/Tìm theo mã thiết bị/), { target: { value: 'iot-server-01' } })

    expect(screen.getByText('IOT-NODE-001')).toBeInTheDocument()
    expect(screen.queryByText('IOT-NODE-002')).not.toBeInTheDocument()
  })

  it('shows the API error message', async () => {
    api.getNodes.mockRejectedValue({ response: { data: { error: { message: 'Bạn không có quyền.' } } } })
    render(<IotNodesTab cabinets={cabinets} feeders={feeders} />)

    expect(await screen.findByText('Bạn không có quyền.')).toBeInTheDocument()
  })

  it('opens the bridge source dialog for the row, with the feeder on relay 1', async () => {
    render(<IotNodesTab cabinets={cabinets} feeders={feeders} />)
    const row1 = (await screen.findByText('IOT-NODE-001')).closest('tr')!

    fireEvent.click(within(row1).getByRole('button', { name: /Nguồn đo/ }))

    expect(await screen.findByRole('dialog', { name: 'Nguồn đo IoT bridge' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('FDR-001')).toBeInTheDocument()
  })
})

describe('assetSlice IoT node actions', () => {
  it('sets isMutating for the IoT node CRUD actions', () => {
    const initialState = {
      poles: [],
      cabinets: [],
      segments: [],
      feeders: [],
      iotNodes: [],
      isLoadingAssets: false,
      loadAssetsError: null,
      isMutating: false,
      mutationError: null,
      isImporting: false,
      importResult: null,
      error: null,
    }

    const stateCreating = assetReducer(
      initialState,
      createIotNodeRequest({
        cabinet_id: 'CAB-001',
        data_source: 'simulated',
        supports_remote_control: true,
      })
    )
    expect(stateCreating.isMutating).toBe(true)

    const stateUpdating = assetReducer(
      initialState,
      updateIotNodeRequest({
        nodeId: 'IOT-001',
        data: { data_source: 'calibration_rig', supports_remote_control: false },
      })
    )
    expect(stateUpdating.isMutating).toBe(true)

    const stateDeleting = assetReducer(initialState, deleteIotNodeRequest('IOT-001'))
    expect(stateDeleting.isMutating).toBe(true)

    const stateRelay = assetReducer(
      initialState,
      setIotNodeRelayRequest({
        nodeId: 'IOT-001',
        relayNo: 1,
        data: { feeder_id: 'FDR-001' },
      })
    )
    expect(stateRelay.isMutating).toBe(true)

    const stateCred = assetReducer(
      initialState,
      issueIotNodeCredentialRequest({
        nodeId: 'IOT-001',
      })
    )
    expect(stateCred.isMutating).toBe(true)
  })
})
