import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeedersTab } from '../../../../../pages/assets/components/feeders/FeedersTab'
import { FeederDetailModal } from '../../../../../pages/assets/components/feeders/components/FeederDetailModal'
import assetReducer, {
  createFeederRequest,
  updateFeederRequest,
  deleteFeederRequest,
} from '../../../../../feature/assets/assetSlice'
import type { FeederListItem } from '../../../../../types/assets/feeders'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import type { PoleListItem } from '../../../../../types/assets/poles'

describe('FeedersTab & Feeder Components Integration Tests', () => {
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
      commune_id: 'COM-001',
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
      updated_by_name: 'Quản trị viên',
    },
    {
      feeder_id: 'FDR-002',
      external_ref: 'FDR-CAB-TL8-B',
      feeder_name: 'Lộ 1 - Tủ B - Tỉnh Lộ 8',
      commune_id: 'COM-001',
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
      data_source: 'field',
      near_sensitive_poi: false,
      location: { lat: 10.9705, lng: 106.49 },
      updated_at: '2026-10-20T10:00:00Z',
    },
  ]

  it('1. Render đầy đủ thanh công cụ tìm kiếm và bảng danh sách mạch điện (không còn KPI cards)', () => {
    render(
      <FeedersTab
        feeders={mockFeeders}
        cabinets={mockCabinets}
        poles={mockPoles}
        onAddFeeder={vi.fn()}
        onUpdateFeeder={vi.fn()}
        onDeleteFeeder={vi.fn()}
        onOpenImport={vi.fn()}
      />
    )

    // Khẳng định các thẻ KPI đã được loại bỏ gọn gàng
    expect(screen.queryByText('Tổng Số Mạch Điện')).not.toBeInTheDocument()
    expect(screen.queryByText('Mạch Đang Cấp Nguồn')).not.toBeInTheDocument()
    expect(screen.queryByText('Tổng Cột Đèn Đấu Nối')).not.toBeInTheDocument()

    // Thanh tìm kiếm và nút bấm chuẩn đồng bộ
    expect(screen.getByPlaceholderText(/Tìm theo mã lộ, tên mạch, tên tủ, địa bàn/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Import Dữ Liệu/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thêm Mạch Điện Mới/i })).toBeInTheDocument()

    // Bảng dữ liệu
    expect(screen.getByText('FDR-CAB-TL8-A')).toBeInTheDocument()
    expect(screen.getByText('Lộ 1 - Tủ A - Tỉnh Lộ 8')).toBeInTheDocument()
    expect(screen.getByText('5 cột')).toBeInTheDocument()
    expect(screen.getByText('FDR-CAB-TL8-B')).toBeInTheDocument()
  })

  it('2. Lọc danh sách mạch điện theo từ khóa tìm kiếm', () => {
    render(
      <FeedersTab
        feeders={mockFeeders}
        cabinets={mockCabinets}
        poles={mockPoles}
        onAddFeeder={vi.fn()}
        onUpdateFeeder={vi.fn()}
        onDeleteFeeder={vi.fn()}
        onOpenImport={vi.fn()}
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
    render(
      <FeedersTab
        feeders={mockFeeders}
        cabinets={mockCabinets}
        poles={mockPoles}
        onAddFeeder={handleAdd}
        onUpdateFeeder={vi.fn()}
        onDeleteFeeder={vi.fn()}
        onOpenImport={vi.fn()}
      />
    )

    const addBtn = screen.getByRole('button', { name: /Thêm Mạch Điện Mới/i })
    fireEvent.click(addBtn)

    expect(screen.getByText('Thêm Mạch Điện Chiếu Sáng')).toBeInTheDocument()

    // Chọn tủ điện
    const select = screen.getByDisplayValue('-- Chọn tủ điện đấu nối --')
    fireEvent.change(select, { target: { value: 'CAB-001' } })

    // Nhấn Lưu
    const saveBtn = screen.getByRole('button', { name: /Lưu Mạch Điện/i })
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
    render(
      <FeedersTab
        feeders={mockFeeders}
        cabinets={mockCabinets}
        poles={mockPoles}
        onAddFeeder={vi.fn()}
        onUpdateFeeder={vi.fn()}
        onDeleteFeeder={mockDelete}
        onOpenImport={vi.fn()}
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
})

