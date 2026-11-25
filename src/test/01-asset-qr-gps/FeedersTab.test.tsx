import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeedersTab } from '../../pages/assets/components/feeders/FeedersTab'
import { FeederDetailModal } from '../../pages/assets/components/feeders/components/FeederDetailModal'
import { validateImportRow } from '../../validations/assetImport.schema'
import assetReducer, {
  createFeederRequest,
  updateFeederRequest,
  deleteFeederRequest,
} from '../../feature/assets/assetSlice'
import iotMonitorReducer from '../../feature/iot/iotMonitorSlice'
import iotMonitorSaga from '../../feature/iot/iotMonitorSaga'
import iotAPI from '../../feature/iot/iotAPI'
import { renderWithSagaStore } from '../utils/sagaStore'
import type { FeederListItem } from '../../types/assets/feeders'
import type { CabinetListItem } from '../../types/assets/cabinets'
import type { PoleListItem } from '../../types/assets/poles'


vi.mock('../../hooks/useShowCommune', () => ({ useShowCommune: () => false }))
vi.mock('../../feature/iot/iotAPI', () => ({
  default: {
    getFeederElectricalHistory: vi.fn(),
    getFeederDiagnosticHistory: vi.fn(),
    getCommand: vi.fn(),
    getCommandHistory: vi.fn(),
  },
}))

const renderTab = (ui: React.ReactElement, role = 'manager') =>
  renderWithSagaStore(ui, {
    role,
    reducers: { iotMonitor: iotMonitorReducer },
    sagas: [iotMonitorSaga],
  })

describe('FeedersTab & Feeder Components Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(iotAPI.getFeederElectricalHistory).mockResolvedValue({
      page: 1,
      page_size: 200,
      total: 0,
      items: [],
    })
  })
  const mockCabinets: CabinetListItem[] = [
    {
      cabinet_id: 'CAB-001',
      external_ref: 'CAB-TL8-A',
      cabinet_name: 'Tủ A - Tỉnh Lộ 8',
      commune_id: 'COM-001',
      commune_name: 'Xã Phú Hòa Đông',
      data_source: 'field',
      location: { lat: 10.9701, lng: 106.4896 },
      feeder_ids: ['FDR-001'],
      iot_node_ids: [],
      updated_at: '2026-10-20T10:00:00Z',
    },
    {
      cabinet_id: 'CAB-002',
      external_ref: 'CAB-TL8-B',
      cabinet_name: 'Tủ B - Tỉnh Lộ 8',
      commune_id: 'COM-001',
      commune_name: 'Xã Phú Hòa Đông',
      data_source: 'field',
      location: { lat: 10.973, lng: 106.495 },
      feeder_ids: ['FDR-002'],
      iot_node_ids: [],
      updated_at: '2026-10-20T10:00:00Z',
    },
  ]

  const mockFeeders: FeederListItem[] = [
    {
      feeder_id: 'FDR-001',
      external_ref: 'FDR-CAB-TL8-A',
      feeder_name: 'Lộ 1 - Tủ A - Tỉnh Lộ 8',
      commune_id: 'COM-001',
      commune_name: 'Xã Phú Hòa Đông',
      has_geometry: true,
      pole_count: 5,
      cabinet: {
        cabinet_id: 'CAB-001',
        cabinet_name: 'Tủ A - Tỉnh Lộ 8',
        location: { lat: 10.9701, lng: 106.4896 },
        cabinet_source: 'verified',
      },
      updated_at: '2026-10-20T10:00:00Z',
      updated_by_name: 'Quản trị viên',
    },
    {
      feeder_id: 'FDR-002',
      external_ref: 'FDR-CAB-TL8-B',
      feeder_name: 'Lộ 1 - Tủ B - Tỉnh Lộ 8',
      commune_id: 'COM-001',
      commune_name: 'Xã Phú Hòa Đông',
      has_geometry: false,
      pole_count: 0,
      cabinet: {
        cabinet_id: 'CAB-002',
        cabinet_name: 'Tủ B - Tỉnh Lộ 8',
        location: { lat: 10.973, lng: 106.495 },
        cabinet_source: 'verified',
      },
      updated_at: '2026-10-20T10:00:00Z',
      updated_by_name: 'Quản trị viên',
    },
  ]

  const mockPoles: PoleListItem[] = [
    {
      pole_id: 'POLE-001',
      external_ref: 'Cột 1',
      segment_id: 'SEG-001',
      feeder_id: 'FDR-001',
      feeder_source: 'verified',
      cabinet_id: 'CAB-001',
      cabinet_name: 'Tủ A - Tỉnh Lộ 8',
      cabinet_source: 'verified',
      commune_id: 'COM-001',
      commune_name: 'Xã Phú Hòa Đông',
      data_source: 'field',
      near_sensitive_poi: false,
      location: { lat: 10.9705, lng: 106.49 },
      updated_at: '2026-10-20T10:00:00Z',
    },
  ]

  it('1. Render đầy đủ thanh công cụ tìm kiếm và bảng danh sách mạch điện (không còn KPI cards)', () => {
    renderTab(
      <FeedersTab
        feeders={mockFeeders}
        cabinets={mockCabinets}
        poles={mockPoles}
        onAddFeeder={vi.fn()}
        onUpdateFeeder={vi.fn()}
        onDeleteFeeder={vi.fn()}
      />
    )

    // Khẳng định các thẻ KPI đã được loại bỏ gọn gàng
    expect(screen.queryByText('Tổng Số Mạch Điện')).not.toBeInTheDocument()
    expect(screen.queryByText('Mạch Đang Cấp Nguồn')).not.toBeInTheDocument()
    expect(screen.queryByText('Tổng Cột Đèn Đấu Nối')).not.toBeInTheDocument()

    // Thanh tìm kiếm và nút bấm chuẩn đồng bộ
    expect(screen.getByPlaceholderText(/Tìm theo mã lộ, tên mạch, tên tủ, địa bàn/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Import dữ liệu/i })).toBeNull()
    expect(screen.getByRole('button', { name: /Thêm mạch điện/i })).toBeInTheDocument()

    // Bảng dữ liệu
    expect(screen.getByText('FDR-CAB-TL8-A')).toBeInTheDocument()
    expect(screen.getByText('Lộ 1 - Tủ A - Tỉnh Lộ 8')).toBeInTheDocument()
    expect(screen.getByText('5 cột')).toBeInTheDocument()
    expect(screen.getByText('FDR-CAB-TL8-B')).toBeInTheDocument()
  })

  it('2. Lọc danh sách mạch điện theo từ khóa tìm kiếm', () => {
    renderTab(
      <FeedersTab
        feeders={mockFeeders}
        cabinets={mockCabinets}
        poles={mockPoles}
        onAddFeeder={vi.fn()}
        onUpdateFeeder={vi.fn()}
        onDeleteFeeder={vi.fn()}
      />
    )

    const searchInput = screen.getByPlaceholderText(/Tìm theo mã lộ, tên mạch/i)
    fireEvent.change(searchInput, { target: { value: 'Tủ B' } })

    // Chỉ hiển thị Tủ B
    expect(screen.getByText('FDR-CAB-TL8-B')).toBeInTheDocument()
    expect(screen.queryByText('FDR-CAB-TL8-A')).not.toBeInTheDocument()
  })

  it('3. Mở Modal Thêm Mạch Điện và gọi hàm onAddFeeder', () => {
    const handleAdd = vi.fn()
    renderTab(
      <FeedersTab
        feeders={mockFeeders}
        cabinets={mockCabinets}
        poles={mockPoles}
        onAddFeeder={handleAdd}
        onUpdateFeeder={vi.fn()}
        onDeleteFeeder={vi.fn()}
      />
    )

    const addBtn = screen.getByRole('button', { name: /Thêm mạch điện/i })
    fireEvent.click(addBtn)

    expect(screen.getByText('Thêm mạch điện chiếu sáng')).toBeInTheDocument()

    // Chọn tủ điện
    const select = screen.getByDisplayValue('-- Chọn tủ điện đấu nối --')
    fireEvent.change(select, { target: { value: 'CAB-001' } })

    // Nhấn Lưu
    const saveBtn = screen.getByRole('button', { name: /Lưu mạch điện/i })
    fireEvent.click(saveBtn)

    expect(handleAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        cabinet_id: 'CAB-001',
        cabinet_source: 'verified',
        commune_id: 'COM-001',
      })
    )
  })

  it('4. FeederDetailModal hiển thị danh sách các cột đèn đấu nối', () => {
    render(
      <FeederDetailModal
        isOpen={true}
        feeder={mockFeeders[0]}
        poles={mockPoles}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Lộ 1 - Tủ A - Tỉnh Lộ 8')).toBeInTheDocument()
    expect(screen.getByText(/Danh Sách Cột Đèn Đang Đấu Nối/i)).toBeInTheDocument()
    expect(screen.getByText('Cột 1')).toBeInTheDocument()
  })

  it('5. Xác minh Redux slice xử lý đúng actions Feeder CRUD', () => {
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
      createFeederRequest({
        feeder_name: 'Lộ mới',
        commune_id: 'COM-001',
      })
    )
    expect(stateCreating.isMutating).toBe(true)

    const stateUpdating = assetReducer(
      initialState,
      updateFeederRequest({
        feederId: 'FDR-001',
        data: { feeder_name: 'Lộ cập nhật' },
      })
    )
    expect(stateUpdating.isMutating).toBe(true)


    const stateDeleting = assetReducer(initialState, deleteFeederRequest('FDR-001'))
    expect(stateDeleting.isMutating).toBe(true)
  })

  it('6. Hiển thị ConfirmDeleteAssetModal khi bấm nút xóa mạch điện thay vì dùng window.confirm', () => {
    const mockDelete = vi.fn()
    renderTab(
      <FeedersTab
        feeders={mockFeeders}
        cabinets={mockCabinets}
        poles={mockPoles}
        onAddFeeder={vi.fn()}
        onUpdateFeeder={vi.fn()}
        onDeleteFeeder={mockDelete}
      />
    )

    const deleteButtons = screen.getAllByTitle('Xóa mạch điện')
    fireEvent.click(deleteButtons[0])

    expect(screen.getByText('Xác Nhận Xóa Mạch Điện')).toBeInTheDocument()
    expect(screen.getByText(/Bạn có chắc chắn muốn xóa mạch điện/i)).toBeInTheDocument()

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận xóa/i })
    fireEvent.click(confirmBtn)

    expect(mockDelete).toHaveBeenCalledWith('FDR-001')
  })
  it('7. validateImportRow với category feeders liên kết đúng tủ điện cha đã có trong GIS', () => {
    const csvRow = {
      external_ref: 'FDR-CAB-TL8-A',
      feeder_name: 'Lộ 1 - Tủ A - Tỉnh Lộ 8',
      commune_id: 'COM-001',
      cabinet_external_ref: 'CAB-TL8-A',
    }

    const context = {
      poles: mockPoles,
      cabinets: mockCabinets,
      fixtures: [],
      segments: [],
      feeders: [],
    }

    const review = validateImportRow('feeders', csvRow, context, 0)
    expect(review.category).toBe('feeders')
    expect(review.actionType).toBe('new')
    expect(review.externalRef).toBe('FDR-CAB-TL8-A')
    expect((review.data as { cabinet_id?: string | null }).cabinet_id).toBe('CAB-001')
  })

  it('8. validateImportRow với category feeders báo lỗi vi phạm ràng buộc khi tủ điện chưa có trên GIS', () => {
    const csvRow = {
      external_ref: 'FDR-CAB-UNKNOWN',
      feeder_name: 'Lộ chưa rõ',
      commune_id: 'COM-001',
      cabinet_external_ref: 'CAB-NON-EXISTENT',
    }

    const context = {
      poles: mockPoles,
      cabinets: mockCabinets,
      fixtures: [],
      segments: [],
      feeders: [],
    }

    const review = validateImportRow('feeders', csvRow, context, 0)
    expect(review.actionType).toBe('invalid')
    expect(review.errorMsg).toContain('Tủ điện [CAB-NON-EXISTENT] chưa tồn tại trong hệ thống GIS')
  })

  it('9. Quản lý thấy nút "Xem lịch sử mạch" ở dòng có node và mở dialog Lịch sử mạch; dòng không có node và Cấp giám sát không thấy', async () => {
    const feedersWithNode: FeederListItem[] = [
      { ...mockFeeders[0], control: { node_id: 'NODE-001', relay_no: 1 } },
      mockFeeders[1],
    ]

    const { unmount } = renderTab(
      <FeedersTab
        feeders={feedersWithNode}
        cabinets={mockCabinets}
        poles={mockPoles}
        onAddFeeder={vi.fn()}
        onUpdateFeeder={vi.fn()}
        onDeleteFeeder={vi.fn()}
      />,
      'manager'
    )

    // Chỉ có đúng 1 nút Xem lịch sử mạch (dòng có node_id; dòng thứ 2 không có node không hiện)
    const historyBtns = screen.getAllByRole('button', { name: 'Xem lịch sử mạch' })
    expect(historyBtns).toHaveLength(1)

    fireEvent.click(historyBtns[0])
    expect(await screen.findByRole('dialog', { name: 'Lịch sử mạch FDR-CAB-TL8-A' })).toBeInTheDocument()
    unmount()

    // Cấp giám sát: không hiện nút Xem lịch sử mạch dù dòng có node
    renderTab(
      <FeedersTab
        feeders={feedersWithNode}
        cabinets={mockCabinets}
        poles={mockPoles}
        onAddFeeder={vi.fn()}
        onUpdateFeeder={vi.fn()}
        onDeleteFeeder={vi.fn()}
      />,
      'superior'
    )
    expect(screen.queryByRole('button', { name: 'Xem lịch sử mạch' })).not.toBeInTheDocument()
  })
})
