import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import { IotBridgeAdminPage } from '../../pages/iot-bridge/IotBridgeAdminPage'
import { RegisterNodeModal } from '../../pages/iot-bridge/components/RegisterNodeModal'
import { IotNodeDetailModal } from '../../pages/assets/components/iot/components/IotNodeDetailModal'
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
    registerNode: vi.fn(),
    updateNode: vi.fn(),
    detachNodeFeeder: vi.fn(),
    getElectrical: vi.fn(),
    getNodeSource: vi.fn(),
    getFeederElectricalHistory: vi.fn(),
    getFeederElectricalHistoryReceived: vi.fn(),
    getFeederDiagnosticHistory: vi.fn(),
    getCommandHistory: vi.fn(),
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
  { server_id: 'iot-server-01', status: 'online' as const, commune_id: 'COM-001', location: { lat: 10.78, lng: 106.7 } },
  { server_id: 'iot-server-09', status: 'offline' as const, commune_id: 'COM-009', location: undefined },
]
const nodes = [{ node_id: 'NODE-001', server_id: 'iot-server-01', status: 'online' as const, cabinet_id: 'CAB-001', commune_id: 'COM-001' }]

const renderPage = (role: string) =>
  renderWithSagaStore(<IotBridgeAdminPage />, {
    role,
    reducers: { iotBridge: iotBridgeReducer, iotMonitor: iotMonitorReducer },
    sagas: [iotBridgeSaga, iotMonitorSaga],
  })

describe('IotBridgeAdminPage role gating (server và node: Admin tạo / chỉnh, vai trò khác chỉ xem)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getServers.mockResolvedValue(servers)
    api.getNodes.mockResolvedValue({ page: 1, page_size: 200, total: 1, items: nodes })
    api.getNodeSource.mockResolvedValue({
      node_id: 'NODE-001',
      server_id: 'iot-server-01',
      device_id: 'LUXMAP-P001',
      feeder_id: 'FDR-001',
      nominal_voltage: 5,
      nominal_current_ma: 100,
      nominal_power_mw: 500,
    })
    assets.getCabinets.mockResolvedValue({ items: [] } as never)
    assets.getFeeders.mockResolvedValue({
      items: [
        {
          feeder_id: 'FDR-001',
          external_ref: 'FDR-001',
          feeder_name: 'Mạch 1',
          cabinet: { cabinet_id: 'CAB-001' },
          control: { node_id: 'NODE-001', relay_no: 1 },
        },
      ],
    } as never)
    communes.getCommunes.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] } as never)
  })

  it('shows every create / edit control to system_admin', async () => {
    renderPage('system_admin')
    await screen.findAllByText('iot-server-01')
    await screen.findByText('NODE-001')

    expect(screen.getByRole('button', { name: /Đăng ký server/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Đăng ký node/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Sửa vị trí/ })).toHaveLength(1)
    expect(await screen.findByRole('heading', { name: 'Key MQTT của server' })).toBeInTheDocument()
  })

  it('hides (not just disables) every create / edit control from the manager, who still sees servers and nodes', async () => {
    renderPage('manager')
    await screen.findAllByText('iot-server-01')
    const nodeRow = (await screen.findByText('NODE-001')).closest('tr')!

    const MANAGER_HIDDEN_CONTROLS = [
      'Sửa vị trí',
      'Đăng ký server',
      'Đăng ký node',
      'Cấp key',
      'Xem key',
      'Thu hồi',
    ]
    for (const label of MANAGER_HIDDEN_CONTROLS) {
      expect(screen.queryByRole('button', { name: new RegExp(label) })).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('heading', { name: 'Key MQTT của server' })).not.toBeInTheDocument()
    expect(within(nodeRow).getByRole('button', { name: /Chi tiết/ })).toBeInTheDocument()
  })

  it('opens the node registration form only for system_admin', async () => {
    assets.getCabinets.mockResolvedValue({ items: [] })
    assets.getFeeders.mockResolvedValue({ items: [] })
    renderPage('system_admin')

    fireEvent.click(await screen.findByRole('button', { name: /Đăng ký node/ }))

    expect(await screen.findByText('Đăng ký node IoT')).toBeInTheDocument()
  })

  it('selects the first server by default, and clicking the second server switches detail panel', async () => {
    renderPage('system_admin')
    await screen.findAllByText('iot-server-01')
    expect(await screen.findByRole('heading', { name: 'iot-server-01' })).toBeInTheDocument()

    const secondServerBtn = screen.getByRole('button', { name: /iot-server-09/ })
    fireEvent.click(secondServerBtn)

    expect(await screen.findByRole('heading', { name: 'iot-server-09' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Key MQTT của server' })).toBeInTheDocument()
  })

  it('clicking server name in the node table selects that server in the list above', async () => {
    api.getNodes.mockResolvedValue({
      page: 1,
      page_size: 200,
      total: 1,
      items: [{ node_id: 'NODE-009', server_id: 'iot-server-09', status: 'online' as const, cabinet_id: 'CAB-009', commune_id: 'COM-009' }],
    })
    renderPage('system_admin')
    await screen.findAllByText('iot-server-01')
    expect(await screen.findByRole('heading', { name: 'Key MQTT của server' })).toBeInTheDocument()

    const nodeRow = (await screen.findByText('NODE-009')).closest('tr')!
    const serverLink = within(nodeRow).getByRole('button', { name: 'iot-server-09' })
    fireEvent.click(serverLink)

    expect(await screen.findByRole('heading', { name: 'iot-server-09' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Key MQTT của server' })).toBeInTheDocument()
  })

  it('filters nodes correctly using status filter chips', async () => {
    const mixedNodes = [
      { node_id: 'NODE-ON', server_id: 'iot-server-01', status: 'online' as const, cabinet_id: 'CAB-001' },
      { node_id: 'NODE-OFF', server_id: 'iot-server-01', status: 'offline' as const, cabinet_id: 'CAB-001' },
    ]
    api.getNodes.mockResolvedValue({ page: 1, page_size: 200, total: 2, items: mixedNodes })

    renderPage('system_admin')
    await screen.findByText('NODE-ON')
    await screen.findByText('NODE-OFF')

    const offlineChip = await screen.findByRole('button', { name: /Node mất tín hiệu \(1\)/ })
    fireEvent.click(offlineChip)

    expect(screen.queryByText('NODE-ON')).not.toBeInTheDocument()
    expect(screen.getByText('NODE-OFF')).toBeInTheDocument()

    const allChip = screen.getByRole('button', { name: /Tất cả \(2\)/ })
    fireEvent.click(allChip)

    expect(screen.getByText('NODE-ON')).toBeInTheDocument()
    expect(screen.getByText('NODE-OFF')).toBeInTheDocument()
  })

  it('shows error box and retry button when getServers fails, while nodes still render; clicking retry calls getServers again', async () => {
    api.getServers.mockRejectedValueOnce(new Error('Network error'))
    renderPage('system_admin')

    expect(await screen.findByText('Không đọc được danh sách server IoT.')).toBeInTheDocument()
    expect(await screen.findByText('NODE-001')).toBeInTheDocument()

    api.getServers.mockResolvedValueOnce(servers)
    const retryBtn = screen.getByRole('button', { name: 'Thử lại' })
    fireEvent.click(retryBtn)

    await screen.findAllByText('iot-server-01')
    expect(api.getServers).toHaveBeenCalledTimes(2)
  })

  it('Admin sees edit and detach buttons for attached node, opens EditNodeModal, and confirms detachNodeFeeder', async () => {
    api.detachNodeFeeder.mockResolvedValue(undefined)
    renderPage('system_admin')
    await screen.findByText('NODE-001')

    const editBtn = await screen.findByRole('button', { name: 'Sửa node NODE-001' })
    fireEvent.click(editBtn)
    expect(await screen.findByRole('dialog', { name: 'Sửa node NODE-001' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }))

    const detachBtn = await screen.findByRole('button', { name: 'Gỡ node NODE-001 khỏi mạch' })
    fireEvent.click(detachBtn)
    const confirmDialog = await screen.findByRole('dialog', { name: 'Gỡ node khỏi mạch' })
    expect(confirmDialog).toHaveTextContent(/Gỡ node NODE-001 khỏi mạch FDR-001/)

    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Gỡ khỏi mạch' }))
    await waitFor(() => expect(api.detachNodeFeeder).toHaveBeenCalledWith('NODE-001'))
  })

  it('non-admin (manager) does NOT see edit or detach buttons for nodes', async () => {
    renderPage('manager')
    await screen.findByText('NODE-001')

    expect(screen.queryByRole('button', { name: 'Sửa node NODE-001' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gỡ node NODE-001 khỏi mạch' })).not.toBeInTheDocument()
  })
})

describe('RegisterNodeModal (POST /iot/nodes)', () => {
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
  const renderModal = (onSaved = vi.fn()) =>
    renderWithSagaStore(modal(onSaved), {
      reducers: { iotBridge: iotBridgeReducer },
      sagas: [iotBridgeSaga],
    })

  const select = (name: string) => screen.getByRole('combobox', { name })
  const feeders = [
    { feeder_id: 'FDR-001', feeder_name: 'Mạch 1', cabinet: { cabinet_id: 'CAB-001' } },
    { feeder_id: 'FDR-002', feeder_name: 'Mạch 2', cabinet: { cabinet_id: 'CAB-002' } },
    // Mạch đã gắn node: không chọn lại được (mỗi mạch một node), dù tủ vẫn nhận node cho mạch khác
    { feeder_id: 'FDR-003', feeder_name: 'Mạch 3', cabinet: { cabinet_id: 'CAB-002' }, control: { node_id: 'NODE-003', relay_no: 1 } },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    api.getServers.mockResolvedValue(servers)
    api.getNodes.mockResolvedValue({ page: 1, page_size: 200, total: 1, items: nodes })
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
    fireEvent.change(screen.getByPlaceholderText('5'), { target: { value: '5' } })
    fireEvent.change(screen.getByPlaceholderText('100'), { target: { value: '100' } })
  }

  it('registers node, relay 1, source and MQTT route in one call', async () => {
    api.registerNode.mockResolvedValue({
      node_id: 'NODE-002',
      server_id: 'iot-server-01',
      device_id: 'LUXMAP-P002',
      feeder_id: 'FDR-002',
    })
    const onSaved = vi.fn()
    renderModal(onSaved)
    await fill()
    fireEvent.change(screen.getByPlaceholderText('500'), { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký node' }))

    await waitFor(() =>
      expect(api.registerNode).toHaveBeenCalledWith({
        server_id: 'iot-server-01',
        cabinet_id: 'CAB-002',
        feeder_id: 'FDR-002',
        device_id: 'LUXMAP-P002',
        nominal_voltage: 5,
        nominal_current_ma: 100,
        nominal_power_mw: 500,
      })
    )
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
  })

  it('submits strictly the 7 fields without gateway_id, data_source, or supports_remote_control', async () => {
    api.registerNode.mockResolvedValue({
      node_id: 'NODE-002',
      server_id: 'iot-server-01',
      device_id: 'LUXMAP-P002',
      feeder_id: 'FDR-002',
    })
    renderModal()
    expect(screen.queryByPlaceholderText('LUXMAP-GW002')).not.toBeInTheDocument()
    expect(screen.queryByText('Cho phép điều khiển từ xa')).not.toBeInTheDocument()

    await fill()
    fireEvent.change(screen.getByPlaceholderText('500'), { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký node' }))

    await waitFor(() => expect(api.registerNode).toHaveBeenCalledTimes(1))
    expect(api.registerNode.mock.calls[0][0]).toEqual({
      server_id: 'iot-server-01',
      cabinet_id: 'CAB-002',
      feeder_id: 'FDR-002',
      device_id: 'LUXMAP-P002',
      nominal_voltage: 5,
      nominal_current_ma: 100,
      nominal_power_mw: 500,
    })
  })

  it('refuses a missing nominal value without calling the API', async () => {
    renderModal()
    await fill()
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký node' }))

    expect(await screen.findByText(/phải là số dương/)).toBeInTheDocument()
    expect(api.registerNode).not.toHaveBeenCalled()
  })

  it('fixes the data source to the team-built hardware: no choice, no simulated option', async () => {
    renderModal()
    expect(screen.queryByRole('combobox', { name: 'Nguồn dữ liệu' })).not.toBeInTheDocument()
    expect(screen.getByTestId('register-node-data-source')).toHaveTextContent('Phần cứng nhóm tự dựng (calibration_rig)')
    expect(screen.queryByText(/simulated/)).not.toBeInTheDocument()
  })

  it('asks for the commune first: cabinet, feeder and server stay locked until one is chosen', async () => {
    renderModal()
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
      status: 'online' as const,
      power_state: 'off' as const,
      measurement: { received_at: '2026-11-16T01:00:00Z', lamp_command: 'OFF', voltage: 5, current_ma: 0.5, power_mw: 2.5 },
    })
    api.getDiagnostics.mockResolvedValue({
      node_id: 'NODE-001',
      feeder_id: 'FDR-001',
      status: 'anomaly' as const,
      connection_status: 'online' as const,
      electrical_status: 'fresh' as const,
      electrical_window: { status: 'insufficient_samples', samples: 1, required_samples: 2 },
      anomalies: [{ code: 'voltage_loss' as const, observed: 12, reference: 220, deviation_percent: 94.5, limit: 200 }],
    })
    api.getFeederDiagnosticHistory.mockResolvedValue({ page: 1, page_size: 20, total: 0, items: [] })
    api.getCommandHistory.mockResolvedValue({ page: 1, page_size: 10, total: 0, items: [] })
    api.getFeederElectricalHistory.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] })
    api.getFeederElectricalHistoryReceived.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] })
    api.getNodeSource.mockResolvedValue({
      node_id: 'NODE-001',
      server_id: 'iot-server-01',
      device_id: 'DEV-001',
      feeder_id: 'FDR-001',
      nominal_voltage: 5,
      nominal_current_ma: 93.55,
      nominal_power_mw: 467.77,
    })
  })

  it('opens on overview tab by default with node info, calibration, latest sample, window and anomaly without Firmware', async () => {
    renderWithSagaStore(
      <IotNodeDetailModal
        nodeId="NODE-001"
        cabinet={{ name: 'Tủ A - TL8', code: 'CAB-TL8-A' }}
        node={{ node_id: 'NODE-001', server_id: 'iot-server-01', status: 'online' }}
        onClose={vi.fn()}
      />,
      {
        reducers: { iotBridge: iotBridgeReducer, iotMonitor: iotMonitorReducer },
        sagas: [iotBridgeSaga, iotMonitorSaga],
      }
    )

    expect(screen.getByText('Tủ điện cấp nguồn')).toBeInTheDocument()
    expect(screen.getByText('Tủ A - TL8')).toBeInTheDocument()
    expect(screen.getByText('Server IoT')).toBeInTheDocument()
    expect(screen.getByText('Trạng thái bridge')).toBeInTheDocument()
    expect(screen.getByText('Nhận gần nhất')).toBeInTheDocument()
    expect(await screen.findByText('Mạch đã ngắt tải')).toBeInTheDocument()
    expect(await screen.findByText('Mất điện áp khi đèn bật (V)')).toBeInTheDocument()
    expect(await screen.findByText('Chưa đủ mẫu để đánh giá (1/2).')).toBeInTheDocument()
    expect(screen.getByText('Hiệu chuẩn')).toBeInTheDocument()
    expect(screen.getByText('Điện áp danh định')).toBeInTheDocument()
    expect(screen.getByText('5 V')).toBeInTheDocument()
    expect(screen.getByText('Dòng danh định')).toBeInTheDocument()
    expect(screen.getByText('93.55 mA')).toBeInTheDocument()
    expect(screen.getByText('Công suất danh định')).toBeInTheDocument()
    expect(screen.getByText('467.77 mW')).toBeInTheDocument()
    expect(screen.queryByText('Firmware')).not.toBeInTheDocument()
    expect(api.getFeederElectricalHistory).not.toHaveBeenCalled()
    expect(api.getFeederDiagnosticHistory).not.toHaveBeenCalled()
    expect(api.getCommandHistory).not.toHaveBeenCalled()
  })

  it('shows a single amber notice on overview when both APIs fail (503) and no Firmware', async () => {
    const err503 = { response: { data: { error: { message: 'Chưa cấu hình nguồn đo.' } } } }
    api.getElectrical.mockRejectedValue(err503)
    api.getDiagnostics.mockRejectedValue(err503)
    renderWithSagaStore(<IotNodeDetailModal nodeId="NODE-001" onClose={vi.fn()} />, {
      reducers: { iotBridge: iotBridgeReducer, iotMonitor: iotMonitorReducer },
      sagas: [iotBridgeSaga, iotMonitorSaga],
    })

    const notices = await screen.findAllByText(/Chưa đọc được số đo/)
    expect(notices).toHaveLength(1)
    expect(notices[0]).toHaveTextContent('Chưa cấu hình nguồn đo.')
    expect(screen.queryByText('Firmware')).not.toBeInTheDocument()
  })

  it('shows muted notice in Hiệu chuẩn when getNodeSource rejects (404) and does not show Firmware', async () => {
    api.getNodeSource.mockRejectedValue({ response: { status: 404 } })
    renderWithSagaStore(<IotNodeDetailModal nodeId="NODE-001" onClose={vi.fn()} />, {
      reducers: { iotBridge: iotBridgeReducer, iotMonitor: iotMonitorReducer },
      sagas: [iotBridgeSaga, iotMonitorSaga],
    })

    expect(
      await screen.findByText(/Chưa có thông số danh định/)
    ).toBeInTheDocument()
    expect(screen.queryByText('Firmware')).not.toBeInTheDocument()
  })

  it('shows overview directly without tab bar and opens FeederHistoryModal from overview links', async () => {
    renderWithSagaStore(<IotNodeDetailModal nodeId="NODE-001" onClose={vi.fn()} />, {
      reducers: { iotBridge: iotBridgeReducer, iotMonitor: iotMonitorReducer },
      sagas: [iotBridgeSaga, iotMonitorSaga],
    })

    expect(screen.queryByRole('button', { name: 'Lịch sử lệnh' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lịch sử thông số' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lịch sử sự cố' })).not.toBeInTheDocument()

    const electricalLink = await screen.findByRole('button', { name: 'Lịch sử thông số của mạch →' })
    expect(screen.getByRole('button', { name: 'Lịch sử sự cố của mạch →' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lịch sử lệnh của mạch →' })).toBeInTheDocument()

    fireEvent.click(electricalLink)
    expect(await screen.findByRole('dialog', { name: 'Lịch sử mạch FDR-001' })).toBeInTheDocument()
  })

  it('clicking "Lịch sử lệnh của mạch →" opens FeederHistoryModal on commands tab and calls getCommandHistory', async () => {
    renderWithSagaStore(<IotNodeDetailModal nodeId="NODE-001" onClose={vi.fn()} />, {
      reducers: { iotBridge: iotBridgeReducer, iotMonitor: iotMonitorReducer },
      sagas: [iotBridgeSaga, iotMonitorSaga],
    })

    const commandsLink = await screen.findByRole('button', { name: 'Lịch sử lệnh của mạch →' })
    fireEvent.click(commandsLink)

    expect(await screen.findByRole('dialog', { name: 'Lịch sử mạch FDR-001' })).toBeInTheDocument()
    await waitFor(() =>
      expect(api.getCommandHistory).toHaveBeenCalledWith('NODE-001', { page: 1, page_size: 10 })
    )
  })
})
