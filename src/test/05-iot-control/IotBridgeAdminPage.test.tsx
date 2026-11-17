import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { IotBridgeAdminPage } from '../../pages/iot-bridge/IotBridgeAdminPage'
import { RegisterNodeModal } from '../../pages/iot-bridge/components/RegisterNodeModal'
import { IotNodeDetailModal } from '../../pages/assets/components/iot/components/IotNodeDetailModal'
import iotAPI from '../../feature/iot/iotAPI'
import { assetAPI } from '../../feature/assets/assetAPI'
import { communeAPI } from '../../feature/communes/communeAPI'

vi.mock('../../feature/iot/iotAPI', () => ({
  default: {
    getServers: vi.fn(),
    getNodes: vi.fn(),
    registerNode: vi.fn(),
    getGatewayRoutes: vi.fn(),
    getElectrical: vi.fn(),
    getElectricalHistory: vi.fn(),
    getDiagnostics: vi.fn(),
  },
}))
vi.mock('../../feature/assets/assetAPI', () => ({
  assetAPI: { getCabinets: vi.fn(), getFeeders: vi.fn() },
}))
vi.mock('../../feature/communes/communeAPI', () => ({
  communeAPI: { getCommunes: vi.fn() },
}))
vi.mock('../../components/LocationPickerMap', () => ({ LocationPickerMap: () => null }))

const api = vi.mocked(iotAPI)
const assets = vi.mocked(assetAPI)
const communes = vi.mocked(communeAPI)

const servers = [
  { server_id: 'iot-server-01', status: 'online', commune_id: 'COM-001', location: { lat: 10.78, lng: 106.7 } },
  { server_id: 'iot-server-09', status: 'offline', commune_id: 'COM-009', location: undefined },
]
const nodes = [{ node_id: 'NODE-001', server_id: 'iot-server-01', status: 'online', cabinet_id: 'CAB-001', commune_id: 'COM-001' }]

const renderPage = (role: string) =>
  render(
    <Provider store={configureStore({ reducer: { auth: () => ({ user: { role } }) } })}>
      <IotBridgeAdminPage />
    </Provider>
  )

const WRITE_CONTROLS = ['Đăng ký server', 'Tuyến gateway', 'Sửa vị trí', 'Đăng ký node']

describe('IotBridgeAdminPage role gating (server và node: Admin tạo / chỉnh, vai trò khác chỉ xem)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getServers.mockResolvedValue(servers)
    api.getNodes.mockResolvedValue({ page: 1, page_size: 200, total: 1, items: nodes })
    api.getGatewayRoutes.mockResolvedValue([])
    communes.getCommunes.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] } as never)
  })

  it('shows every create / edit control to system_admin', async () => {
    renderPage('system_admin')
    await screen.findAllByText('iot-server-01')
    await screen.findByText('NODE-001')

    expect(screen.getByRole('button', { name: /Đăng ký server/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Đăng ký node/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Tuyến gateway/ })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /Sửa vị trí/ })).toHaveLength(2)
  })

  it('hides (not just disables) every create / edit control from the manager, who still sees servers and nodes', async () => {
    renderPage('manager')
    await screen.findAllByText('iot-server-01')
    const nodeRow = (await screen.findByText('NODE-001')).closest('tr')!

    for (const label of WRITE_CONTROLS) {
      expect(screen.queryByRole('button', { name: new RegExp(label) })).not.toBeInTheDocument()
    }
    expect(within(nodeRow).getByRole('button', { name: /Chi tiết/ })).toBeInTheDocument()
  })

  it('opens the node registration form only for system_admin', async () => {
    assets.getCabinets.mockResolvedValue({ items: [] })
    assets.getFeeders.mockResolvedValue({ items: [] })
    renderPage('system_admin')

    fireEvent.click(await screen.findByRole('button', { name: /Đăng ký node/ }))

    expect(await screen.findByText('Đăng ký node IoT')).toBeInTheDocument()
  })
})

describe('RegisterNodeModal (POST /iot/nodes/register)', () => {
  const cabinets = [
    { cabinet_id: 'CAB-001', cabinet_name: 'Tủ A', commune_id: 'COM-001', iot_node_ids: ['NODE-001'] },
    { cabinet_id: 'CAB-002', cabinet_name: 'Tủ B', commune_id: 'COM-001', iot_node_ids: ['NODE-003'] },
    { cabinet_id: 'CAB-009', cabinet_name: 'Tủ xã khác', commune_id: 'COM-009', iot_node_ids: [] },
  ]
  const communeList = [
    { commune_id: 'COM-001', name: 'Xã Một' },
    { commune_id: 'COM-009', name: 'Xã Chín' },
  ]
  const modal = (onSaved = vi.fn()) => (
    <RegisterNodeModal servers={servers} communes={communeList} communeStatus="ready" onClose={vi.fn()} onSaved={onSaved} />
  )
  const select = (name: string) => screen.getByRole('combobox', { name })
  const feeders = [
    { feeder_id: 'FDR-001', feeder_name: 'Mạch 1', cabinet: { cabinet_id: 'CAB-001' } },
    { feeder_id: 'FDR-002', feeder_name: 'Mạch 2', cabinet: { cabinet_id: 'CAB-002' } },
    // Mạch đã gắn node: không chọn lại được (mỗi mạch một node), dù tủ vẫn nhận node cho mạch khác
    { feeder_id: 'FDR-003', feeder_name: 'Mạch 3', cabinet: { cabinet_id: 'CAB-002' }, control: { node_id: 'NODE-003', relay_no: 1 } },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    assets.getCabinets.mockResolvedValue({ items: cabinets } as never)
    assets.getFeeders.mockResolvedValue({ items: feeders } as never)
  })

  const fill = async () => {
    await waitFor(() => expect(assets.getFeeders).toHaveBeenCalled())
    fireEvent.change(select('Xã / phường'), { target: { value: 'COM-001' } })
    const [cabinet, feeder, server] = [select('Tủ điện'), select('Mạch (rơ-le #1)'), select('Server IoT')]
    await waitFor(() => expect(within(cabinet).queryByText(/CAB-002/)).toBeInTheDocument())
    // Tủ đã có node vẫn chọn được (một tủ nhiều node, mỗi node một mạch); tủ xã khác không hiện.
    expect(within(cabinet).getByText(/CAB-001/)).toBeInTheDocument()
    expect(within(cabinet).queryByText(/CAB-009/)).not.toBeInTheDocument()
    fireEvent.change(cabinet, { target: { value: 'CAB-002' } })
    // Chỉ mạch chưa gắn node của tủ đã chọn, chỉ server cùng xã.
    expect(within(feeder).queryByText(/FDR-001/)).not.toBeInTheDocument()
    expect(within(feeder).queryByText(/FDR-003/)).not.toBeInTheDocument()
    expect(within(feeder).getByText(/FDR-002/)).toBeInTheDocument()
    expect(within(server).queryByText('iot-server-09')).not.toBeInTheDocument()
    fireEvent.change(feeder, { target: { value: 'FDR-002' } })
    fireEvent.change(server, { target: { value: 'iot-server-01' } })
    fireEvent.change(screen.getByPlaceholderText('LUXMAP-P002'), { target: { value: 'LUXMAP-P002' } })
    fireEvent.change(screen.getByPlaceholderText('LUXMAP-GW002'), { target: { value: 'LUXMAP-GW002' } })
    fireEvent.change(screen.getByPlaceholderText('5'), { target: { value: '5' } })
    fireEvent.change(screen.getByPlaceholderText('100'), { target: { value: '100' } })
  }

  it('registers node, relay 1, source and MQTT route in one call', async () => {
    api.registerNode.mockResolvedValue({
      node_id: 'NODE-002',
      server_id: 'iot-server-01',
      device_id: 'LUXMAP-P002',
      feeder_id: 'FDR-002',
      gateway_id: 'LUXMAP-GW002',
    })
    const onSaved = vi.fn()
    render(modal(onSaved))
    await fill()
    fireEvent.change(screen.getByPlaceholderText('500'), { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký node' }))

    await waitFor(() =>
      expect(api.registerNode).toHaveBeenCalledWith({
        server_id: 'iot-server-01',
        cabinet_id: 'CAB-002',
        feeder_id: 'FDR-002',
        device_id: 'LUXMAP-P002',
        gateway_id: 'LUXMAP-GW002',
        data_source: 'calibration_rig',
        supports_remote_control: true,
        nominal_voltage: 5,
        nominal_current_ma: 100,
        nominal_power_mw: 500,
      })
    )
    expect(onSaved).toHaveBeenCalled()
  })

  it('refuses a missing nominal value without calling the API', async () => {
    render(modal())
    await fill()
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký node' }))

    expect(await screen.findByText(/phải là số dương/)).toBeInTheDocument()
    expect(api.registerNode).not.toHaveBeenCalled()
  })

  it('fixes the data source to the team-built hardware: no choice, no simulated option', async () => {
    render(modal())
    expect(screen.queryByRole('combobox', { name: 'Nguồn dữ liệu' })).not.toBeInTheDocument()
    expect(screen.getByTestId('register-node-data-source')).toHaveTextContent('Phần cứng nhóm tự dựng (calibration_rig)')
    expect(screen.queryByText(/simulated/)).not.toBeInTheDocument()
  })

  it('asks for the commune first: cabinet, feeder and server stay locked until one is chosen', async () => {
    render(modal())
    expect(select('Tủ điện')).toBeDisabled()
    expect(select('Mạch (rơ-le #1)')).toBeDisabled()
    expect(select('Server IoT')).toBeDisabled()

    fireEvent.change(select('Xã / phường'), { target: { value: 'COM-009' } })

    expect(select('Tủ điện')).toBeEnabled()
    expect(select('Server IoT')).toBeEnabled()
    await waitFor(() => expect(within(select('Tủ điện')).queryByText(/CAB-009/)).toBeInTheDocument())
    expect(within(select('Tủ điện')).queryByText(/CAB-002/)).not.toBeInTheDocument()
    expect(within(select('Server IoT')).getByText('iot-server-09')).toBeInTheDocument()
    expect(within(select('Server IoT')).queryByText('iot-server-01')).not.toBeInTheDocument()
  })
})

describe('IotNodeDetailModal (read-only, mục 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getElectrical.mockResolvedValue({
      node_id: 'NODE-001',
      server_id: 'iot-server-01',
      status: 'online',
      power_state: 'off',
      measurement: { received_at: '2026-11-16T01:00:00Z', lamp_command: 'OFF', voltage: 5, current_ma: 0.5, power_mw: 2.5 },
    })
    api.getDiagnostics.mockResolvedValue({
      node_id: 'NODE-001',
      status: 'anomaly',
      anomalies: [{ code: 'current_when_off', observed: 12, limit: 5 }],
    })
  })

  it('shows latest sample and anomaly; electrical and command history live in the GIS drawer, not here', async () => {
    render(<IotNodeDetailModal nodeId="NODE-001" onClose={vi.fn()} />)

    expect(await screen.findByText('Mạch đã ngắt tải')).toBeInTheDocument()
    expect(await screen.findByText('Còn dòng khi lệnh OFF (mA)')).toBeInTheDocument()
    expect(screen.queryByText('Lịch sử điện')).not.toBeInTheDocument()
    expect(screen.queryByText('Lịch sử lệnh')).not.toBeInTheDocument()
    expect(api.getElectricalHistory).not.toHaveBeenCalled()
  })

  it('shows the backend error message when the source is not configured (503)', async () => {
    api.getElectrical.mockRejectedValue({ response: { data: { error: { message: 'Chưa cấu hình nguồn đo.' } } } })
    render(<IotNodeDetailModal nodeId="NODE-001" onClose={vi.fn()} />)

    expect(await screen.findByText('Chưa cấu hình nguồn đo.')).toBeInTheDocument()
  })
})
