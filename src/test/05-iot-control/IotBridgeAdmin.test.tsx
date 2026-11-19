import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { ServerCredentialPanel } from '../../pages/iot-bridge/components/ServerCredentialPanel'
import { IotServerFormModal } from '../../pages/iot-bridge/components/IotServerFormModal'
import iotBridgeReducer from '../../feature/iot/iotBridgeSlice'
import iotBridgeSaga from '../../feature/iot/iotBridgeSaga'
import iotAPI from '../../feature/iot/iotAPI'
import { communeAPI } from '../../feature/communes/communeAPI'
import { renderWithSagaStore, type SagaStore } from '../utils/sagaStore'

vi.mock('../../feature/iot/iotAPI', () => ({
  default: {
    getServers: vi.fn(),
    getNodes: vi.fn(),
    issueServerCredential: vi.fn(),
    getServerCredential: vi.fn(),
    revokeServerCredential: vi.fn(),
    registerServer: vi.fn(),
    updateServerLocation: vi.fn(),
  },
}))

vi.mock('../../feature/communes/communeAPI', () => ({
  communeAPI: {
    getCommunes: vi.fn(),
  },
}))

// Bản đồ thật cần WebGL (jsdom không có): thay bằng nút "ghim" giả lập cú bấm lên bản đồ.
vi.mock('../../components/LocationPickerMap', () => ({
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
const communesApi = vi.mocked(communeAPI)

const communes = [
  {
    commune_id: 'COM-001',
    name: 'Thị trấn Củ Chi',
    center: { lat: 10.9, lng: 106.4 },
    bbox: { min_lng: 106.3, min_lat: 10.8, max_lng: 106.5, max_lat: 11.0 },
  },
  { commune_id: 'COM-002', name: 'Xã chưa có khung' },
]

const renderWithStore = (ui: React.ReactElement, customStore?: SagaStore) =>
  renderWithSagaStore(ui, {
    reducers: { iotBridge: iotBridgeReducer },
    sagas: [iotBridgeSaga],
    store: customStore,
  })

describe('IotServerFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getServers.mockResolvedValue([])
    api.getNodes.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] })
    communesApi.getCommunes.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] } as never)
  })

  const submitButton = () => screen.getByRole('button', { name: /Đăng ký server/ })

  it('rejects the reserved server id "default" without calling the API', async () => {
    renderWithStore(<IotServerFormModal server={null} communes={communes} communeStatus="ready" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('iot-server-01'), { target: { value: 'Default' } })
    fireEvent.click(submitButton())

    expect(await screen.findByText(/không được là "default"/)).toBeInTheDocument()
    expect(api.registerServer).not.toHaveBeenCalled()
  })

  it('hides the map until a commune is chosen', () => {
    renderWithStore(<IotServerFormModal server={null} communes={communes} communeStatus="ready" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByText('Ghim trên bản đồ')).not.toBeInTheDocument()
    expect(screen.getByTestId('iot-server-map-placeholder')).toHaveTextContent('Chọn xã / phường để hiện bản đồ')

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'COM-001' } })

    expect(screen.getByText('Ghim trên bản đồ')).toBeInTheDocument()
    expect(screen.queryByTestId('iot-server-map-placeholder')).not.toBeInTheDocument()
  })

  it('outlines the selected commune on the map and drops it when switching to a commune without a frame', () => {
    renderWithStore(<IotServerFormModal server={null} communes={communes} communeStatus="ready" onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'COM-001' } })
    expect(screen.getByText('Ghim trên bản đồ')).toHaveAttribute('data-boundary-min-lng', '106.3')

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'COM-002' } })
    expect(screen.getByText('Ghim trên bản đồ')).toHaveAttribute('data-boundary-min-lng', '')
  })

  it('starts with no commune selected and refuses to register until one is chosen', async () => {
    renderWithStore(<IotServerFormModal server={null} communes={communes} communeStatus="ready" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByRole('combobox')).toHaveValue('')

    fireEvent.change(screen.getByPlaceholderText('iot-server-01'), { target: { value: 'iot-server-01' } })
    fireEvent.click(submitButton())

    expect(await screen.findByText('Cần chọn xã/phường.')).toBeInTheDocument()
    expect(api.registerServer).not.toHaveBeenCalled()
  })

  it('says the commune list is still loading instead of showing a blank select', () => {
    renderWithStore(<IotServerFormModal server={null} communes={[]} communeStatus="loading" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByRole('combobox')).toHaveDisplayValue('Đang tải danh sách…')
    expect(screen.getByText('Đang tải danh sách xã / phường…')).toBeInTheDocument()
  })

  it('opens a new registration without a pin and never sends the commune centre as the gateway location', async () => {
    renderWithStore(<IotServerFormModal server={null} communes={communes} communeStatus="ready" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('iot-server-01'), { target: { value: 'iot-server-01' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'COM-001' } })
    expect(screen.getByText('Ghim trên bản đồ')).toHaveAttribute('data-unpicked', 'true')
    expect(screen.getByTestId('iot-server-location')).toHaveTextContent('Chưa chọn')
    fireEvent.click(submitButton())

    expect(await screen.findByText('Hãy bấm lên bản đồ để đặt vị trí gateway.')).toBeInTheDocument()
    expect(api.registerServer).not.toHaveBeenCalled()
  })

  it('registers a server with the commune and the location pinned on the map', async () => {
    api.registerServer.mockResolvedValue({ server_id: 'iot-server-01' })
    const onSaved = vi.fn()
    renderWithStore(<IotServerFormModal server={null} communes={communes} communeStatus="ready" onClose={vi.fn()} onSaved={onSaved} />)
    fireEvent.change(screen.getByPlaceholderText('iot-server-01'), { target: { value: 'iot-server-01' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'COM-001' } })
    fireEvent.click(screen.getByText('Ghim trên bản đồ'))
    expect(screen.getByTestId('iot-server-location')).toHaveTextContent('10.970000, 106.500000')
    fireEvent.click(submitButton())

    await waitFor(() =>
      expect(api.registerServer).toHaveBeenCalledWith({
        server_id: 'iot-server-01',
        commune_id: 'COM-001',
        location: { lat: 10.97, lng: 106.5 },
      })
    )
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
  })

  it('edits only commune and location of an existing server', async () => {
    api.updateServerLocation.mockResolvedValue(undefined)
    renderWithStore(
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

  it('does not call onSaved again when re-mounting on the same store after a successful save', async () => {
    api.registerServer.mockResolvedValue({ server_id: 'iot-server-01' })
    const onSaved = vi.fn()
    const { store, unmount } = renderWithStore(
      <IotServerFormModal server={null} communes={communes} communeStatus="ready" onClose={vi.fn()} onSaved={onSaved} />
    )

    fireEvent.change(screen.getByPlaceholderText('iot-server-01'), { target: { value: 'iot-server-01' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'COM-001' } })
    fireEvent.click(screen.getByText('Ghim trên bản đồ'))
    fireEvent.click(submitButton())

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))

    unmount()

    const onSavedSecond = vi.fn()
    renderWithStore(
      <IotServerFormModal server={null} communes={communes} communeStatus="ready" onClose={vi.fn()} onSaved={onSavedSecond} />,
      store
    )

    expect(onSavedSecond).not.toHaveBeenCalled()
  })

  it('shows backend error message in the form when API fails and does not call onSaved', async () => {
    api.registerServer.mockRejectedValue({
      response: { data: { error: { message: 'Server ID đã tồn tại.' } } },
    })
    const onSaved = vi.fn()
    renderWithStore(
      <IotServerFormModal server={null} communes={communes} communeStatus="ready" onClose={vi.fn()} onSaved={onSaved} />
    )

    fireEvent.change(screen.getByPlaceholderText('iot-server-01'), { target: { value: 'iot-server-01' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'COM-001' } })
    fireEvent.click(screen.getByText('Ghim trên bản đồ'))
    fireEvent.click(submitButton())

    expect(await screen.findByText('Server ID đã tồn tại.')).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })
})

describe('ServerCredentialPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getServers.mockResolvedValue([])
    api.getNodes.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] })
    communesApi.getCommunes.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] } as never)
  })

  it('shows "Đã cấp key", "Xem key", and "Thu hồi" when credentialIssued is true', () => {
    renderWithStore(<ServerCredentialPanel serverId="iot-server-01" credentialIssued />)
    expect(screen.getByText('Đã cấp key')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Xem key/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thu hồi/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cấp key/ })).not.toBeInTheDocument()
  })

  it('issues a key when credentialIssued is false and displays password with warning', async () => {
    api.issueServerCredential.mockResolvedValue({
      server_id: 'iot-server-01',
      client_id: 'iot-server-01',
      username: 'iot-server-01',
      password: 'one-time-secret',
      node_ids: [],
    })
    renderWithStore(<ServerCredentialPanel serverId="iot-server-01" credentialIssued={false} />)
    expect(screen.getByText('Chưa cấp key')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Cấp key/ }))

    await waitFor(() => expect(api.issueServerCredential).toHaveBeenCalledWith('iot-server-01'))
    const passwordInput = await screen.findByLabelText('Password')
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(passwordInput).toHaveValue('one-time-secret')
    expect(screen.getByText('Không lưu key vào chỗ công khai.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }))
    expect(passwordInput).toHaveAttribute('type', 'text')
  })

  it('views key and maps NOT_RETRIEVABLE error to friendly message', async () => {
    api.getServerCredential.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: 'IOT_CREDENTIAL_NOT_RETRIEVABLE',
            message: 'IOT_CREDENTIAL_NOT_RETRIEVABLE',
          },
        },
      },
    })
    renderWithStore(<ServerCredentialPanel serverId="iot-server-01" credentialIssued />)

    fireEvent.click(screen.getByRole('button', { name: /Xem key/ }))

    expect(
      await screen.findByText('Key cũ không xem lại được, hãy thu hồi rồi cấp mới.')
    ).toBeInTheDocument()
  })

  it('opens confirm modal on revoke without window.confirm and calls revokeServerCredential', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    api.revokeServerCredential.mockResolvedValue(undefined)
    renderWithStore(<ServerCredentialPanel serverId="iot-server-01" credentialIssued />)

    fireEvent.click(screen.getByRole('button', { name: /Thu hồi/ }))
    expect(await screen.findByText(/Thu hồi key của iot-server-01\?/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Thu hồi key' }))

    await waitFor(() => expect(api.revokeServerCredential).toHaveBeenCalledWith('iot-server-01'))
    await waitFor(() =>
      expect(screen.queryByText(/Thu hồi key của iot-server-01\?/)).not.toBeInTheDocument()
    )
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})
