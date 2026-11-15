import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { IotBridgeControlCard } from '../../../pages/gis-map/components/IotBridgeControlCard'
import iotAPI from '../../../feature/iot/iotAPI'

vi.mock('../../../feature/iot/iotAPI', () => ({
  default: {
    getPoleControl: vi.fn(),
    getCommand: vi.fn(),
    sendCommand: vi.fn(),
  },
}))

const api = vi.mocked(iotAPI)

const renderCard = (role: string) =>
  render(
    <Provider store={configureStore({ reducer: { auth: () => ({ user: { role } }) } })}>
      <IotBridgeControlCard poleId="POLE-0001" />
    </Provider>
  )

const bridgeControl = {
  pole_id: 'POLE-0001',
  feeder_id: 'FDR-001',
  node_id: 'NODE-001',
  relay_no: 1,
  can_control_feeder: true,
  control_channel: 'iot_bridge',
}

describe('IotBridgeControlCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCommand.mockResolvedValue({ node_id: 'NODE-001', command_id: 'old', mode: 'AUTO', command: null, command_acknowledged: true })
  })

  it('renders nothing when the pole has no IoT node', async () => {
    api.getPoleControl.mockResolvedValue({ pole_id: 'POLE-0001', feeder_id: 'FDR-001', can_control_feeder: false })
    const { container } = renderCard('manager')
    await waitFor(() => expect(api.getPoleControl).toHaveBeenCalledWith('POLE-0001'))
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the current command but no buttons for a read-only role', async () => {
    api.getPoleControl.mockResolvedValue(bridgeControl)
    renderCard('superior')
    expect(await screen.findByText('AUTO')).toBeInTheDocument()
    expect(screen.queryByText('Tắt mạch')).not.toBeInTheDocument()
  })

  it('explains why a node on the feeder cannot be switched through the bridge', async () => {
    api.getPoleControl.mockResolvedValue({ ...bridgeControl, can_control_feeder: false, control_channel: null })
    renderCard('manager')
    expect(await screen.findByText(/chưa điều khiển được qua IoT bridge/)).toBeInTheDocument()
    expect(api.getCommand).not.toHaveBeenCalled()
  })

  it('sends MANUAL OFF for the whole feeder and waits for the node ACK', async () => {
    api.getPoleControl.mockResolvedValue(bridgeControl)
    api.sendCommand.mockResolvedValue({
      node_id: 'NODE-001',
      command_id: 'new',
      mode: 'MANUAL',
      command: 'OFF',
      command_acknowledged: false,
      expires_at: new Date(Date.now() + 300_000).toISOString(),
    })
    renderCard('manager')

    fireEvent.click(await screen.findByText('Tắt mạch'))

    await waitFor(() => expect(api.sendCommand).toHaveBeenCalledWith('NODE-001', { mode: 'MANUAL', command: 'OFF' }))
    expect(await screen.findByText('Đang chờ node xác nhận…')).toBeInTheDocument()
  })

  it('refuses an AUTO schedule whose two times are equal, without calling the API', async () => {
    api.getPoleControl.mockResolvedValue(bridgeControl)
    renderCard('manager')

    fireEvent.click(await screen.findByText('Đặt lịch AUTO'))
    const [day, night] = screen.getAllByDisplayValue('') as HTMLInputElement[]
    fireEvent.change(day, { target: { value: '07:00' } })
    fireEvent.change(night, { target: { value: '07:00' } })
    fireEvent.click(screen.getByText('Gửi AUTO với lịch mới'))

    expect(await screen.findByText('Lịch AUTO cần hai giờ khác nhau theo định dạng HH:mm.')).toBeInTheDocument()
    expect(api.sendCommand).not.toHaveBeenCalled()
  })
})
