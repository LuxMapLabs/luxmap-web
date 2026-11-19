import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { EditNodeModal } from '../../pages/iot-bridge/components/EditNodeModal'
import iotBridgeReducer from '../../feature/iot/iotBridgeSlice'
import iotBridgeSaga from '../../feature/iot/iotBridgeSaga'
import iotMonitorReducer from '../../feature/iot/iotMonitorSlice'
import iotMonitorSaga from '../../feature/iot/iotMonitorSaga'
import iotAPI from '../../feature/iot/iotAPI'
import { assetAPI } from '../../feature/assets/assetAPI'
import { communeAPI } from '../../feature/communes/communeAPI'
import { renderWithSagaStore } from '../utils/sagaStore'

vi.mock('../../feature/iot/iotAPI', () => ({
  default: {
    getServers: vi.fn(),
    getNodes: vi.fn(),
    getNodeSource: vi.fn(),
    updateNode: vi.fn(),
  },
}))
vi.mock('../../feature/assets/assetAPI', () => ({
  assetAPI: { getCabinets: vi.fn(), getFeeders: vi.fn() },
}))
vi.mock('../../feature/communes/communeAPI', () => ({
  communeAPI: { getCommunes: vi.fn() },
}))

const api = vi.mocked(iotAPI)
const assets = vi.mocked(assetAPI)
const communes = vi.mocked(communeAPI)

const servers = [
  { server_id: 'iot-server-01', status: 'online' as const, commune_id: 'COM-001' },
  { server_id: 'iot-server-02', status: 'online' as const, commune_id: 'COM-001' },
  { server_id: 'iot-server-other', status: 'online' as const, commune_id: 'COM-009' },
]

const feeders = [
  {
    feeder_id: 'FDR-001',
    feeder_name: 'Mạch 1',
    cabinet: { cabinet_id: 'CAB-001' },
    control: { node_id: 'NODE-001', relay_no: 1 },
  },
  {
    feeder_id: 'FDR-002',
    feeder_name: 'Mạch 2',
    cabinet: { cabinet_id: 'CAB-001' },
  },
  {
    feeder_id: 'FDR-003',
    feeder_name: 'Mạch đã gắn node khác',
    cabinet: { cabinet_id: 'CAB-001' },
    control: { node_id: 'NODE-999', relay_no: 1 },
  },
]

const node = {
  node_id: 'NODE-001',
  server_id: 'iot-server-01',
  cabinet_id: 'CAB-001',
  commune_id: 'COM-001',
  status: 'online' as const,
}

const renderModal = (onClose = vi.fn()) =>
  renderWithSagaStore(
    <EditNodeModal node={node} servers={servers} onClose={onClose} />,
    {
      role: 'system_admin',
      reducers: { iotBridge: iotBridgeReducer, iotMonitor: iotMonitorReducer },
      sagas: [iotBridgeSaga, iotMonitorSaga],
    }
  )

describe('EditNodeModal (PUT /iot/nodes/{nodeId})', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getServers.mockResolvedValue(servers)
    api.getNodes.mockResolvedValue({ page: 1, page_size: 200, total: 1, items: [node] })
    communes.getCommunes.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] } as never)
    assets.getCabinets.mockResolvedValue({ items: [] } as never)
    assets.getFeeders.mockResolvedValue({ items: feeders } as never)
    api.getNodeSource.mockResolvedValue({
      node_id: 'NODE-001',
      server_id: 'iot-server-01',
      device_id: 'LUXMAP-P001',
      feeder_id: 'FDR-001',
      nominal_voltage: 5,
      nominal_current_ma: 93.55,
      nominal_power_mw: 467.77,
    })
  })

  it('prefills form from node and node source, and submits strictly 6 fields', async () => {
    api.updateNode.mockResolvedValue(undefined)
    const onClose = vi.fn()
    renderModal(onClose)

    await waitFor(() => expect(screen.getByLabelText('Device ID')).toHaveValue('LUXMAP-P001'))
    expect(screen.getByLabelText('Server IoT')).toHaveValue('iot-server-01')
    expect(screen.getByLabelText('Mạch (rơ-le #1)')).toHaveValue('FDR-001')
    expect(screen.getByLabelText('Điện áp (V)')).toHaveValue('5')
    expect(screen.getByLabelText('Dòng (mA)')).toHaveValue('93.55')
    expect(screen.getByLabelText('Công suất (mW)')).toHaveValue('467.77')

    fireEvent.change(screen.getByLabelText('Server IoT'), { target: { value: 'iot-server-02' } })
    fireEvent.change(screen.getByLabelText('Mạch (rơ-le #1)'), { target: { value: 'FDR-002' } })
    fireEvent.change(screen.getByLabelText('Công suất (mW)'), { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() => expect(api.updateNode).toHaveBeenCalledTimes(1))
    expect(api.updateNode.mock.calls[0][0]).toBe('NODE-001')
    expect(api.updateNode.mock.calls[0][1]).toEqual({
      server_id: 'iot-server-02',
      device_id: 'LUXMAP-P001',
      feeder_id: 'FDR-002',
      nominal_voltage: 5,
      nominal_current_ma: 93.55,
      nominal_power_mw: 500,
    })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('displays store error when updateNode fails and does not close', async () => {
    api.updateNode.mockRejectedValue({
      response: { data: { error: { message: 'Mạch đã được gán cho node khác.' } } },
    })
    const onClose = vi.fn()
    renderModal(onClose)

    await waitFor(() => expect(screen.getByLabelText('Device ID')).toHaveValue('LUXMAP-P001'))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    expect(await screen.findByText('Mạch đã được gán cho node khác.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('rejects invalid Device ID without calling updateNode', async () => {
    renderModal()

    await waitFor(() => expect(screen.getByLabelText('Device ID')).toHaveValue('LUXMAP-P001'))
    fireEvent.change(screen.getByLabelText('Device ID'), { target: { value: 'BAD/ID' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    expect(await screen.findByText(/Device ID bắt đầu bằng chữ\/số/)).toBeInTheDocument()
    expect(api.updateNode).not.toHaveBeenCalled()
  })
})
