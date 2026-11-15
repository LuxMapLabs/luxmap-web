import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NodeSourceModal } from '../../../../../pages/assets/components/iot/components/NodeSourceModal'
import iotAPI from '../../../../../feature/iot/iotAPI'
import type { IotNodeStatus } from '../../../../../types/iot/nodes'
import type { FeederListItem } from '../../../../../types/assets/feeders'
import type { PoleListItem } from '../../../../../types/assets/poles'

vi.mock('../../../../../feature/iot/iotAPI', () => ({
  default: {
    getServers: vi.fn(),
    registerNodeSource: vi.fn(),
    updateNodeSource: vi.fn(),
    deleteNodeSource: vi.fn(),
  },
}))

const api = vi.mocked(iotAPI)

const node = (overrides: Partial<IotNodeStatus> = {}): IotNodeStatus => ({
  node_id: 'NODE-001',
  server_id: null,
  status: 'unconfigured',
  cabinet_id: 'CAB-009',
  commune_id: 'COM-001',
  ...overrides,
})

// FDR-010 đấu vào rơ-le #1 của NODE-001.
const feeders = [{ feeder_id: 'FDR-010', control: { node_id: 'NODE-001', relay_no: 1 } }] as FeederListItem[]

const poles = [
  { pole_id: 'POLE-0027', feeder_id: 'FDR-013', segment_id: 'SEG-001' },
  { pole_id: 'POLE-0034', feeder_id: 'FDR-010', segment_id: 'SEG-002' },
] as PoleListItem[]

const fill = () => {
  fireEvent.change(screen.getByPlaceholderText('LUXMAP-P001'), { target: { value: 'LUXMAP-P001' } })
  fireEvent.change(screen.getByPlaceholderText('5'), { target: { value: '5' } })
  fireEvent.change(screen.getByPlaceholderText('100'), { target: { value: '100' } })
  fireEvent.change(screen.getByPlaceholderText('500'), { target: { value: '500' } })
}

describe('NodeSourceModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getServers.mockResolvedValue([{ server_id: 'iot-server-01', status: 'unconfigured' }])
  })

  it('registers a new source on relay 1 with the feeder of that relay and a pole of that feeder', async () => {
    api.registerNodeSource.mockResolvedValue({ node_id: 'NODE-001' })
    const onSaved = vi.fn()
    render(<NodeSourceModal node={node()} feeders={feeders} poles={poles} onClose={vi.fn()} onSaved={onSaved} />)

    expect(await screen.findByText(/chưa gán/)).toBeInTheDocument()
    fill()
    fireEvent.click(screen.getByText('Gán nguồn đo'))

    await waitFor(() =>
      expect(api.registerNodeSource).toHaveBeenCalledWith('NODE-001', {
        server_id: 'iot-server-01',
        device_id: 'LUXMAP-P001',
        feeder_id: 'FDR-010',
        pole_id: 'POLE-0034',
        relay_no: 1,
        nominal_voltage: 5,
        nominal_current_ma: 100,
        nominal_power_mw: 500,
      })
    )
    expect(api.updateNodeSource).not.toHaveBeenCalled()
    expect(onSaved).toHaveBeenCalled()
  })

  it('updates with PUT when the node already has a source, and removes only after a second click', async () => {
    render(
      <NodeSourceModal
        node={node({ server_id: 'iot-server-01', status: 'offline' })}
        feeders={feeders}
        poles={poles}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )

    expect(await screen.findByText('Cập nhật nguồn đo')).toBeInTheDocument()
    fill()
    fireEvent.click(screen.getByText('Cập nhật nguồn đo'))
    await waitFor(() => expect(api.updateNodeSource).toHaveBeenCalledTimes(1))
    expect(api.registerNodeSource).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Gỡ nguồn đo'))
    expect(api.deleteNodeSource).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Bấm lần nữa để gỡ'))
    await waitFor(() => expect(api.deleteNodeSource).toHaveBeenCalledWith('NODE-001'))
  })

  it('refuses to save a node whose relay 1 is not wired to a feeder', async () => {
    // Mạch chỉ đấu vào rơ-le #2 thì không phải mạch của nguồn đo.
    const relayTwo = [{ feeder_id: 'FDR-010', control: { node_id: 'NODE-001', relay_no: 2 } }] as FeederListItem[]
    render(<NodeSourceModal node={node()} feeders={relayTwo} poles={poles} onClose={vi.fn()} onSaved={vi.fn()} />)

    await screen.findByText(/chưa gán/)
    fill()
    fireEvent.click(screen.getByText('Gán nguồn đo'))

    expect(await screen.findByText(/chưa đấu rơ-le #1/)).toBeInTheDocument()
    expect(api.registerNodeSource).not.toHaveBeenCalled()
  })
})
