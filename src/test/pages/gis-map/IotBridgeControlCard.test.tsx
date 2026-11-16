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
    getElectrical: vi.fn(),
    getCommandHistory: vi.fn(),
  },
}))

const api = vi.mocked(iotAPI)

const renderCard = (role: string, onOpenElectricalMonitor?: (feederId: string, nodeId?: string | null) => void) =>
  render(
    <Provider store={configureStore({ reducer: { auth: () => ({ user: { role } }) } })}>
      <IotBridgeControlCard poleId="POLE-0001" onOpenElectricalMonitor={onOpenElectricalMonitor} />
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
    api.getElectrical.mockResolvedValue({ node_id: 'NODE-001', measurement: { power_mw: 512.3, current_ma: 102.5, voltage: 5 } })
    api.getCommandHistory.mockResolvedValue({ items: [{ command_id: 'old', mode: 'AUTO', command: null, status: 'success' }] })
  })

  it('shows the mode of the latest success command; a newer pending one does not count', async () => {
    api.getPoleControl.mockResolvedValue(bridgeControl)
    // GET command đã báo lệnh mới (OFF) nhưng node chưa thực hiện: chế độ vẫn là AUTO thành công trước đó
    api.getCommand.mockResolvedValue({ node_id: 'NODE-001', command_id: 'new', mode: 'MANUAL', command: 'OFF', command_acknowledged: false })
    api.getCommandHistory.mockResolvedValue({
      items: [
        { command_id: 'new', mode: 'MANUAL', command: 'OFF', status: 'pending' },
        { command_id: 'old', mode: 'AUTO', command: null, status: 'success' },
      ],
    })
    renderCard('superior')

    expect(await screen.findByText('AUTO')).toBeInTheDocument()
    expect(api.getCommandHistory).toHaveBeenCalledWith('NODE-001', { page: 1, page_size: 20 })
    expect(screen.queryByText('Tắt')).not.toBeInTheDocument()
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
    expect(screen.queryByText('Tắt mạch FDR-001')).not.toBeInTheDocument()
  })

  it('shows no command buttons to system_admin (ControlLighting is the manager only)', async () => {
    api.getPoleControl.mockResolvedValue(bridgeControl)
    renderCard('system_admin')
    expect(await screen.findByText('AUTO')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Bật mạch|Tắt mạch|^AUTO$/ })).not.toBeInTheDocument()
  })

  it('labels the buttons with the feeder they switch, for the manager', async () => {
    api.getPoleControl.mockResolvedValue(bridgeControl)
    renderCard('manager')
    expect(await screen.findByRole('button', { name: /Tắt mạch FDR-001/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bật mạch FDR-001/ })).toBeInTheDocument()
  })

  it('shows a one-line feeder summary that opens the electrical monitor for that feeder, for any role', async () => {
    api.getPoleControl.mockResolvedValue(bridgeControl)
    const open = vi.fn()
    renderCard('superior', open)

    const summary = await screen.findByRole('button', { name: /Mạch FDR-001/ })
    await waitFor(() => expect(summary).toHaveTextContent('512.3 mW · 102.5 mA'))
    expect(api.getElectrical).toHaveBeenCalledWith('NODE-001')
    fireEvent.click(summary)
    expect(open).toHaveBeenCalledWith('FDR-001', 'NODE-001')
    // Biểu đồ không còn mở ngay trong khung cột
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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

    fireEvent.click(await screen.findByText('Tắt mạch FDR-001'))

    await waitFor(() => expect(api.sendCommand).toHaveBeenCalledWith('NODE-001', { mode: 'MANUAL', command: 'OFF' }))
    expect(await screen.findByText('Đang chờ node xác nhận…')).toBeInTheDocument()
  })

  it('AUTO always goes with a schedule: the button opens the form prefilled from the node, and sends it', async () => {
    api.getPoleControl.mockResolvedValue(bridgeControl)
    api.getCommand.mockResolvedValue({
      node_id: 'NODE-001',
      command_id: 'old',
      mode: 'AUTO',
      command: null,
      command_acknowledged: true,
      auto_schedule: { day_start: '05:30', night_start: '18:15' },
    })
    api.sendCommand.mockResolvedValue({ node_id: 'NODE-001', command_id: 'new', mode: 'AUTO', command: null })
    renderCard('manager')

    fireEvent.click(await screen.findByRole('button', { name: /^AUTO$/ }))
    expect(api.sendCommand).not.toHaveBeenCalled()
    expect(screen.getByDisplayValue('05:30')).toBeInTheDocument()
    fireEvent.change(screen.getByDisplayValue('18:15'), { target: { value: '19:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi AUTO' }))

    await waitFor(() =>
      expect(api.sendCommand).toHaveBeenCalledWith('NODE-001', {
        mode: 'AUTO',
        command: null,
        auto_schedule: { day_start: '05:30', night_start: '19:00' },
      })
    )
  })

  it('refuses an AUTO schedule whose two times are equal, without calling the API', async () => {
    api.getPoleControl.mockResolvedValue(bridgeControl)
    renderCard('manager')

    fireEvent.click(await screen.findByRole('button', { name: /^AUTO$/ }))
    // Node chưa có lịch: điền sẵn 06:00 / 18:00
    fireEvent.change(screen.getByDisplayValue('18:00'), { target: { value: '06:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi AUTO' }))

    expect(await screen.findByText('Lịch AUTO cần hai giờ khác nhau theo định dạng HH:mm.')).toBeInTheDocument()
    expect(api.sendCommand).not.toHaveBeenCalled()
  })
})
