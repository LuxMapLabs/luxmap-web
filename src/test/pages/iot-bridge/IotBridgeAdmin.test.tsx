import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GatewayRoutesPanel } from '../../../pages/iot-bridge/components/GatewayRoutesPanel'
import { IotServerFormModal } from '../../../pages/iot-bridge/components/IotServerFormModal'
import iotAPI from '../../../feature/iot/iotAPI'

vi.mock('../../../feature/iot/iotAPI', () => ({
  default: {
    getGatewayRoutes: vi.fn(),
    putGatewayRoute: vi.fn(),
    issueGatewayCredential: vi.fn(),
    registerServer: vi.fn(),
    updateServerLocation: vi.fn(),
  },
}))

// Bản đồ thật cần WebGL (jsdom không có): thay bằng nút "ghim" giả lập cú bấm lên bản đồ.
vi.mock('../../../components/LocationPickerMap', () => ({
  LocationPickerMap: ({
    onChange,
    boundary,
    unpicked,
  }: {
    onChange?: (c: { lat: number; lng: number }) => void
    boundary?: { min_lng?: number } | null
    unpicked?: boolean
  }) => (
    <button
      type="button"
      data-boundary-min-lng={boundary?.min_lng ?? ''}
      data-unpicked={String(Boolean(unpicked))}
      onClick={() => onChange?.({ lat: 10.97, lng: 106.5 })}
    >
      Ghim trên bản đồ
    </button>
  ),
}))

const api = vi.mocked(iotAPI)
const communes = [
  {
    commune_id: 'COM-001',
    name: 'Thị trấn Củ Chi',
    center: { lat: 10.9, lng: 106.4 },
    bbox: { min_lng: 106.3, min_lat: 10.8, max_lng: 106.5, max_lat: 11.0 },
  },
  { commune_id: 'COM-002', name: 'Xã chưa có khung' },
]

describe('IotServerFormModal', () => {
  beforeEach(() => vi.clearAllMocks())

  const submitButton = () => screen.getByRole('button', { name: /Đăng ký server/ })

  it('rejects the reserved server id "default" without calling the API', async () => {
    render(<IotServerFormModal server={null} communes={communes} communeStatus="ready" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('iot-server-01'), { target: { value: 'Default' } })
    fireEvent.click(submitButton())

    expect(await screen.findByText(/không được là "default"/)).toBeInTheDocument()
    expect(api.registerServer).not.toHaveBeenCalled()
  })

  it('outlines the selected commune on the map and drops it when switching to a commune without a frame', () => {
    render(<IotServerFormModal server={null} communes={communes} communeStatus="ready" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText('Ghim trên bản đồ')).toHaveAttribute('data-boundary-min-lng', '')

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'COM-001' } })
    expect(screen.getByText('Ghim trên bản đồ')).toHaveAttribute('data-boundary-min-lng', '106.3')

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'COM-002' } })
    expect(screen.getByText('Ghim trên bản đồ')).toHaveAttribute('data-boundary-min-lng', '')
  })

  it('starts with no commune selected and refuses to register until one is chosen', async () => {
    render(<IotServerFormModal server={null} communes={communes} communeStatus="ready" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByRole('combobox')).toHaveValue('')

    fireEvent.change(screen.getByPlaceholderText('iot-server-01'), { target: { value: 'iot-server-01' } })
    fireEvent.click(screen.getByText('Ghim trên bản đồ'))
    fireEvent.click(submitButton())

    expect(await screen.findByText('Cần chọn xã/phường.')).toBeInTheDocument()
    expect(api.registerServer).not.toHaveBeenCalled()
  })

  it('says the commune list is still loading instead of showing a blank select', () => {
    render(<IotServerFormModal server={null} communes={[]} communeStatus="loading" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByRole('combobox')).toHaveDisplayValue('Đang tải danh sách…')
    expect(screen.getByText('Đang tải danh sách xã / phường…')).toBeInTheDocument()
  })

  it('opens a new registration without a pin and never sends the commune centre as the gateway location', async () => {
    render(<IotServerFormModal server={null} communes={communes} communeStatus="ready" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText('Ghim trên bản đồ')).toHaveAttribute('data-unpicked', 'true')
    expect(screen.getByTestId('iot-server-location')).toHaveTextContent('Chưa chọn')

    fireEvent.change(screen.getByPlaceholderText('iot-server-01'), { target: { value: 'iot-server-01' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'COM-001' } })
    fireEvent.click(submitButton())

    expect(await screen.findByText('Hãy bấm lên bản đồ để đặt vị trí gateway.')).toBeInTheDocument()
    expect(api.registerServer).not.toHaveBeenCalled()
  })

  it('registers a server with the commune and the location pinned on the map', async () => {
    api.registerServer.mockResolvedValue({ server_id: 'iot-server-01' })
    const onSaved = vi.fn()
    render(<IotServerFormModal server={null} communes={communes} communeStatus="ready" onClose={vi.fn()} onSaved={onSaved} />)
    fireEvent.change(screen.getByPlaceholderText('iot-server-01'), { target: { value: 'iot-server-01' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'COM-001' } })
    fireEvent.click(screen.getByText('Ghim trên bản đồ'))
    expect(screen.getByTestId('iot-server-location')).toHaveTextContent('10.970000, 106.500000')
    fireEvent.click(submitButton())

    await waitFor(() =>
      expect(api.registerServer).toHaveBeenCalledWith({
        server_id: 'iot-server-01',
        base_url: 'http://127.0.0.1:5000',
        commune_id: 'COM-001',
        location: { lat: 10.97, lng: 106.5 },
      })
    )
    expect(onSaved).toHaveBeenCalled()
  })

  it('edits only commune and location of an existing server', async () => {
    api.updateServerLocation.mockResolvedValue(undefined)
    render(
      <IotServerFormModal
        server={{ server_id: 'iot-server-01', commune_id: 'COM-001', location: { lat: 10, lng: 106 } }}
        communes={communes}
        communeStatus="ready"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )
    expect(screen.queryByPlaceholderText('iot-server-01')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Lưu vị trí/ }))

    await waitFor(() =>
      expect(api.updateServerLocation).toHaveBeenCalledWith('iot-server-01', {
        commune_id: 'COM-001',
        location: { lat: 10, lng: 106 },
      })
    )
  })
})

describe('GatewayRoutesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getGatewayRoutes.mockResolvedValue([{ gateway_id: 'LUXMAP-GW001', device_ids: ['LUXMAP-P001'], credential_issued: false }])
  })

  it('adds a gateway → device route', async () => {
    api.putGatewayRoute.mockResolvedValue(undefined)
    render(<GatewayRoutesPanel serverId="iot-server-01" />)
    await screen.findByText('LUXMAP-GW001')

    fireEvent.change(screen.getByPlaceholderText('LUXMAP-GW001'), { target: { value: 'LUXMAP-GW002' } })
    fireEvent.change(screen.getByPlaceholderText('LUXMAP-P001'), { target: { value: 'LUXMAP-P002' } })
    fireEvent.click(screen.getByText('Thêm tuyến'))

    await waitFor(() =>
      expect(api.putGatewayRoute).toHaveBeenCalledWith('iot-server-01', 'LUXMAP-GW002', { device_id: 'LUXMAP-P002' })
    )
  })

  it('does not send a route whose id has a slash (it would break the MQTT topic)', async () => {
    render(<GatewayRoutesPanel serverId="iot-server-01" />)
    await screen.findByText('LUXMAP-GW001')

    fireEvent.change(screen.getByPlaceholderText('LUXMAP-GW001'), { target: { value: 'GW/1' } })
    fireEvent.change(screen.getByPlaceholderText('LUXMAP-P001'), { target: { value: 'LUXMAP-P002' } })
    fireEvent.click(screen.getByText('Thêm tuyến'))

    expect(await screen.findByText(/Gateway ID và Device ID/)).toBeInTheDocument()
    expect(api.putGatewayRoute).not.toHaveBeenCalled()
  })

  it('shows the one-time MQTT password after issuing a credential', async () => {
    api.issueGatewayCredential.mockResolvedValue({
      client_id: 'LUXMAP-GW001',
      username: 'LUXMAP-GW001',
      password: 'one-time-secret',
      node_ids: ['LUXMAP-P001'],
    })
    render(<GatewayRoutesPanel serverId="iot-server-01" />)

    fireEvent.click(await screen.findByText('Cấp secret'))

    await waitFor(() => expect(api.issueGatewayCredential).toHaveBeenCalledWith('iot-server-01', 'LUXMAP-GW001'))
    expect(await screen.findByLabelText('Password')).toHaveValue('one-time-secret')
  })
})
