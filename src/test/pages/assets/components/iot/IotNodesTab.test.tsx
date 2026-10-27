import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IotNodesTab } from '../../../../../pages/assets/components/iot/IotNodesTab'
import { IotNodeDetailModal } from '../../../../../pages/assets/components/iot/components/IotNodeDetailModal'
import { IssueCredentialModal } from '../../../../../pages/assets/components/iot/components/IssueCredentialModal'
import { SetRelayModal } from '../../../../../pages/assets/components/iot/components/SetRelayModal'
import assetReducer, {
  createIotNodeRequest,
  updateIotNodeRequest,
  deleteIotNodeRequest,
  setIotNodeRelayRequest,
  issueIotNodeCredentialRequest,
} from '../../../../../feature/assets/assetSlice'
import type { IotNodeItem } from '../../../../../types/assets/iot-nodes'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import type { FeederListItem } from '../../../../../types/assets/feeders'

vi.mock('../../../../../feature/assets/assetAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../feature/assets/assetAPI')>()
  return {
    ...actual,
    default: {
      ...actual.default,
      getIotNodeDetail: vi.fn().mockImplementation(async (nodeId: string) => ({
        node_id: nodeId,
        cabinet_id: 'CAB-001',
        commune_id: 'COM-001',
        node_role: 'segment_controller',
        data_source: 'simulated',
        supports_remote_control: true,
        has_credential: true,
        relays: [
          { relay_no: 1, feeder_id: 'FDR-001' },
          { relay_no: 2, feeder_id: 'FDR-001' },
        ],
      })),
    },
  }
})

describe('IotNodesTab & IoT Node Components Integration Tests', () => {
  const mockCabinets: CabinetListItem[] = [
    {
      cabinet_id: 'CAB-001',
      external_ref: 'CAB-TL8-A',
      cabinet_name: 'Tủ A - Tỉnh Lộ 8',
      commune_id: 'COM-001',
      data_source: 'field',
      location: { lat: 10.9701, lng: 106.4896 },
      feeder_ids: ['FDR-001'],
      updated_at: '2026-10-20T10:00:00Z',
    },
    {
      cabinet_id: 'CAB-002',
      external_ref: 'CAB-TL8-B',
      cabinet_name: 'Tủ B - Tỉnh Lộ 8',
      commune_id: 'COM-002',
      data_source: 'field',
      location: { lat: 10.973, lng: 106.495 },
      feeder_ids: ['FDR-002'],
      updated_at: '2026-10-20T10:00:00Z',
    },
  ]

  const mockFeeders: FeederListItem[] = [
    {
      feeder_id: 'FDR-001',
      external_ref: 'FDR-CAB-TL8-A',
      feeder_name: 'Lộ 1 - Tủ A - Tỉnh Lộ 8',
      commune_id: 'COM-001',
      has_geometry: true,
      pole_count: 5,
      cabinet: {
        cabinet_id: 'CAB-001',
        cabinet_name: 'Tủ A - Tỉnh Lộ 8',
        location: { lat: 10.9701, lng: 106.4896 },
        cabinet_source: 'verified',
      },
      updated_at: '2026-10-20T10:00:00Z',
    },
    {
      feeder_id: 'FDR-002',
      external_ref: 'FDR-CAB-TL8-B',
      feeder_name: 'Lộ 1 - Tủ B - Tỉnh Lộ 8',
      commune_id: 'COM-002',
      has_geometry: false,
      pole_count: 0,
      cabinet: {
        cabinet_id: 'CAB-002',
        cabinet_name: 'Tủ B - Tỉnh Lộ 8',
        location: { lat: 10.973, lng: 106.495 },
        cabinet_source: 'verified',
      },
      updated_at: '2026-10-20T10:00:00Z',
    },
  ]

  const mockIotNodes: IotNodeItem[] = [
    {
      node_id: 'IOT-NODE-001',
      cabinet_id: 'CAB-001',
      commune_id: 'COM-001',
      node_role: 'segment_controller',
      data_source: 'simulated',
      supports_remote_control: true,
      has_credential: true,
      credential_set_at: '2026-10-20T08:00:00Z',
      last_report_at: '2026-10-21T02:00:00Z',
      relays: [
        {
          relay_no: 1,
          feeder_id: 'FDR-001',
          control_mode: 'on',
          mode_reported_at: '2026-10-21T02:00:00Z',
        },
      ],
      updated_at: '2026-10-21T02:00:00Z',
    },
    {
      node_id: 'IOT-NODE-002',
      cabinet_id: 'CAB-002',
      commune_id: 'COM-002',
      node_role: 'segment_controller',
      data_source: 'calibration_rig',
      supports_remote_control: false,
      has_credential: false,
      credential_set_at: null,
      last_report_at: null,
      relays: [],
      updated_at: '2026-10-20T10:00:00Z',
    },
  ]

  it('1. Render đầy đủ thanh công cụ tìm kiếm và bảng danh sách thiết bị IoT', () => {
    render(
      <IotNodesTab
        iotNodes={mockIotNodes}
        cabinets={mockCabinets}
        feeders={mockFeeders}
        onAddIotNode={vi.fn()}
        onUpdateIotNode={vi.fn()}
        onDeleteIotNode={vi.fn()}
        onSetRelay={vi.fn()}
        onIssueCredential={vi.fn()}
      />
    )

    // Kiểm tra toolbar
    expect(
      screen.getByPlaceholderText('Tìm theo mã thiết bị, mã tủ, tên tủ, địa bàn...')
    ).toBeInTheDocument()
    expect(screen.getByText('Đăng Ký Thiết Bị IoT')).toBeInTheDocument()

    // Kiểm tra các cột tiêu đề bảng
    expect(screen.getByText('Mã Thiết Bị')).toBeInTheDocument()
    expect(screen.getByText('Tủ Điện Cấp Nguồn')).toBeInTheDocument()
    expect(screen.getByText('Nguồn Dữ Liệu')).toBeInTheDocument()
    expect(screen.getByText('Điều Khiển Từ Xa')).toBeInTheDocument()
    expect(screen.getByText('Xác Thực (Secret)')).toBeInTheDocument()

    // Kiểm tra dữ liệu dòng
    expect(screen.getByText('IOT-NODE-001')).toBeInTheDocument()
    expect(screen.getByText('IOT-NODE-002')).toBeInTheDocument()
    expect(screen.getByText('Mô phỏng')).toBeInTheDocument()
    expect(screen.getByText('Kiểm chuẩn (Rig)')).toBeInTheDocument()
    expect(screen.getByText('Đã cấp')).toBeInTheDocument()
    expect(screen.getByText('Chưa cấp')).toBeInTheDocument()
    expect(screen.getByText('R1: FDR-001')).toBeInTheDocument()
  })

  it('2. Lọc danh sách thiết bị IoT khi gõ từ khóa tìm kiếm', () => {
    render(
      <IotNodesTab
        iotNodes={mockIotNodes}
        cabinets={mockCabinets}
        feeders={mockFeeders}
        onAddIotNode={vi.fn()}
        onUpdateIotNode={vi.fn()}
        onDeleteIotNode={vi.fn()}
        onSetRelay={vi.fn()}
        onIssueCredential={vi.fn()}
      />
    )

    const searchInput = screen.getByPlaceholderText(
      'Tìm theo mã thiết bị, mã tủ, tên tủ, địa bàn...'
    )
    fireEvent.change(searchInput, { target: { value: 'IOT-NODE-002' } })

    // Node 002 vẫn hiển thị, node 001 bị lọc
    expect(screen.getByText('IOT-NODE-002')).toBeInTheDocument()
    expect(screen.queryByText('IOT-NODE-001')).not.toBeInTheDocument()
  })

  it('3. Mở modal Đăng Ký Thiết Bị IoT mới khi click nút', () => {
    render(
      <IotNodesTab
        iotNodes={mockIotNodes}
        cabinets={mockCabinets}
        feeders={mockFeeders}
        onAddIotNode={vi.fn()}
        onUpdateIotNode={vi.fn()}
        onDeleteIotNode={vi.fn()}
        onSetRelay={vi.fn()}
        onIssueCredential={vi.fn()}
      />
    )

    const addBtn = screen.getByText('Đăng Ký Thiết Bị IoT')
    fireEvent.click(addBtn)

    expect(screen.getByText('Đăng Ký Thiết Bị IoT Mới')).toBeInTheDocument()
    expect(screen.getByDisplayValue('-- Chọn tủ điện gắn thiết bị --')).toBeInTheDocument()
  })

  it('4. Modal Xem Chi Tiết Thiết Bị IoT hiển thị thông tin và danh sách rơ-le', () => {
    const handleClose = vi.fn()
    render(
      <IotNodeDetailModal
        isOpen={true}
        node={mockIotNodes[0]}
        cabinets={mockCabinets}
        onClose={handleClose}
        onEdit={vi.fn()}
        onSetRelay={vi.fn()}
        onIssueCredential={vi.fn()}
      />
    )

    expect(screen.getByText('IOT-NODE-001')).toBeInTheDocument()
    expect(screen.getByText('Tủ A - Tỉnh Lộ 8')).toBeInTheDocument()
    expect(screen.getByText('Mô phỏng (Simulated)')).toBeInTheDocument()
    expect(screen.getByText('Rơ-le #1')).toBeInTheDocument()
    expect(screen.getByText('FDR-001')).toBeInTheDocument()
  })

  it('5. Modal Cấp Secret Xác Thực cảnh báo an toàn và gọi hàm tạo secret', () => {
    const handleIssue = vi.fn()
    render(
      <IssueCredentialModal
        isOpen={true}
        node={mockIotNodes[0]}
        onClose={vi.fn()}
        onIssue={handleIssue}
      />
    )

    expect(screen.getByText('Cấp Secret Xác Thực IoT')).toBeInTheDocument()
    expect(screen.getByText('Cảnh báo bảo mật quan trọng:')).toBeInTheDocument()

    const generateBtn = screen.getByText('Tạo Secret Mới')
    fireEvent.click(generateBtn)

    expect(handleIssue).toHaveBeenCalledWith('IOT-NODE-001', expect.any(Function))
  })

  it('6. Modal Cấu Hình Đấu Nối Rơ-le lọc đúng mạch của tủ điện đó', () => {
    const handleSave = vi.fn()
    render(
      <SetRelayModal
        isOpen={true}
        node={mockIotNodes[0]}
        feeders={mockFeeders}
        onClose={vi.fn()}
        onSave={handleSave}
      />
    )

    expect(screen.getByText('Cấu Hình Đấu Nối Rơ-le')).toBeInTheDocument()
    expect(screen.getByText('Rơ-le #1')).toBeInTheDocument()
    expect(screen.getByText('Thêm Rơ-le')).toBeInTheDocument()
    
    // Ban đầu chưa bấm thêm/sửa thì form cấu hình chưa hiển thị
    expect(screen.queryByText('Đấu nối vào mạch')).not.toBeInTheDocument()

    // Test click thêm rơ-le mới -> form cấu hình mở ra cho rơ-le #2
    const addRelayBtn = screen.getByText('Thêm Rơ-le')
    fireEvent.click(addRelayBtn)
    expect(screen.getByText('Đấu Nối Rơ-le Mới: #2')).toBeInTheDocument()
    expect(screen.getByText('Đang cấu hình Rơ-le #2')).toBeInTheDocument()
    expect(screen.getByText(/Mạch Điện Xuất Tuyến Thuộc Tủ/)).toBeInTheDocument()

    const submitBtn = screen.getByText('Lưu Rơ-le Này')
    fireEvent.click(submitBtn)

    expect(handleSave).toHaveBeenCalledWith('IOT-NODE-001', 2, 'FDR-001')
  })

  it('7. Hiển thị modal xác nhận xóa tùy chỉnh (ConfirmDeleteIotNodeModal) thay vì window.confirm', () => {
    const handleDelete = vi.fn()
    render(
      <IotNodesTab
        iotNodes={mockIotNodes}
        cabinets={mockCabinets}
        feeders={mockFeeders}
        onAddIotNode={vi.fn()}
        onUpdateIotNode={vi.fn()}
        onDeleteIotNode={handleDelete}
        onSetRelay={vi.fn()}
        onIssueCredential={vi.fn()}
      />
    )

    // Tìm nút xóa cho node IOT-NODE-002 (node này không có rơ-le nối mạch)
    const deleteButtons = screen.getAllByTitle('Xóa thiết bị')
    // Nút thứ 2 là của IOT-NODE-002
    fireEvent.click(deleteButtons[1])

    // Kiểm tra modal xác nhận xóa xuất hiện
    expect(screen.getByText('Xác Nhận Xóa Thiết Bị IoT')).toBeInTheDocument()
    expect(screen.getByText(/Thao tác này sẽ gỡ bỏ thiết bị khỏi tủ điện/)).toBeInTheDocument()

    // Click nút "Xác Nhận Xóa"
    const confirmBtn = screen.getByRole('button', { name: 'Xác Nhận Xóa' })
    fireEvent.click(confirmBtn)

    expect(handleDelete).toHaveBeenCalledWith('IOT-NODE-002')
  })

  it('8. Xác minh Redux slice xử lý đúng actions IoT Node CRUD', () => {
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
