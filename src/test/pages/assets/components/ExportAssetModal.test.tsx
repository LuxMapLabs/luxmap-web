import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExportAssetModal } from '../../../../pages/assets/components/ExportAssetModal'
import * as csvExporter from '../../../../utils/assets/assetCsvExporter'

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ExportAssetModal Component', () => {
  const mockOnClose = vi.fn()
  const mockPoles = [{ id: 'pole-1', code: 'C-01' }] as any
  const mockCabinets = [{ id: 'cab-1', code: 'TB-01' }] as any
  const mockSegments = [{ id: 'seg-1', segment_code: 'TD-01' }] as any
  const mockFeeders = [{ id: 'feed-1', feeder_code: 'L-01' }] as any
  const mockFixtures = [{ id: 'fix-1', pole_id: 'pole-1' }] as any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(csvExporter, 'downloadCsvWithBom').mockImplementation(() => {})
  })

  it('render modal khi isOpen=true với 5 danh mục tài sản và không có badge số đếm bản ghi', () => {
    render(
      <ExportAssetModal
        isOpen={true}
        onClose={mockOnClose}
        initialCategory="poles"
        poles={mockPoles}
        cabinets={mockCabinets}
        segments={mockSegments}
        feeders={mockFeeders}
        fixtures={mockFixtures}
      />
    )

    expect(screen.getByText('Xuất Dữ Liệu Tài Sản Ra CSV')).toBeInTheDocument()
    expect(screen.getByText('Cột điện chiếu sáng')).toBeInTheDocument()
    expect(screen.getByText('Tủ điện điều khiển')).toBeInTheDocument()
    expect(screen.getByText('Tuyến đường chiếu sáng')).toBeInTheDocument()
    expect(screen.getByText('Tuyến lộ cấp nguồn')).toBeInTheDocument()
    expect(screen.getByText('Bộ đèn chiếu sáng')).toBeInTheDocument()

    // Đảm bảo KHÔNG có bất kỳ từ "bản ghi" nào xuất hiện trong modal
    expect(screen.queryByText(/bản ghi/i)).toBeNull()
  })

  it('cho phép chọn nhiều danh mục tài sản cùng lúc (multi-select)', () => {
    render(
      <ExportAssetModal
        isOpen={true}
        onClose={mockOnClose}
        initialCategory="poles"
        poles={mockPoles}
        cabinets={mockCabinets}
        segments={mockSegments}
        feeders={mockFeeders}
        fixtures={mockFixtures}
      />
    )

    // Ban đầu poles được chọn do initialCategory="poles"
    expect(screen.getByText(/Xác Nhận Xuất \(1 tệp CSV\)/i)).toBeInTheDocument()

    // Click chọn thêm Tủ điện
    const cabinetBtn = screen.getByText('Tủ điện điều khiển').closest('button')!
    fireEvent.click(cabinetBtn)

    // Bây giờ cả 2 tệp đều được chọn
    expect(screen.getByText(/Xác Nhận Xuất \(2 tệp CSV\)/i)).toBeInTheDocument()

    // Click tiếp chọn Tuyến đường
    const segmentBtn = screen.getByText('Tuyến đường chiếu sáng').closest('button')!
    fireEvent.click(segmentBtn)

    expect(screen.getByText(/Xác Nhận Xuất \(3 tệp CSV\)/i)).toBeInTheDocument()

    // Bỏ chọn cột điện
    const poleBtn = screen.getByText('Cột điện chiếu sáng').closest('button')!
    fireEvent.click(poleBtn)

    expect(screen.getByText(/Xác Nhận Xuất \(2 tệp CSV\)/i)).toBeInTheDocument()
  })

  it('hoạt động chính xác với nút Chọn tất cả và Bỏ chọn tất cả', () => {
    render(
      <ExportAssetModal
        isOpen={true}
        onClose={mockOnClose}
        initialCategory="poles"
        poles={mockPoles}
        cabinets={mockCabinets}
        segments={mockSegments}
        feeders={mockFeeders}
        fixtures={mockFixtures}
      />
    )

    const selectAllBtn = screen.getByText('Chọn tất cả')
    fireEvent.click(selectAllBtn)

    // Đã chọn tất cả 5 tệp
    expect(screen.getByText(/Xác Nhận Xuất \(5 tệp CSV\)/i)).toBeInTheDocument()

    // Nút đổi thành "Bỏ chọn tất cả"
    const deselectAllBtn = screen.getByText('Bỏ chọn tất cả')
    fireEvent.click(deselectAllBtn)

    // Không còn tệp nào được chọn
    expect(screen.getByText('Xác Nhận Xuất File')).toBeInTheDocument()
    const confirmBtn = screen.getByText('Xác Nhận Xuất File').closest('button')!
    expect(confirmBtn).toBeDisabled()
  })

  it('gọi downloadCsvWithBom tuần tự khi nhấn Xác Nhận Xuất', async () => {
    render(
      <ExportAssetModal
        isOpen={true}
        onClose={mockOnClose}
        initialCategory="cabinets"
        poles={mockPoles}
        cabinets={mockCabinets}
        segments={mockSegments}
        feeders={mockFeeders}
        fixtures={mockFixtures}
      />
    )

    // Chọn thêm poles
    const poleBtn = screen.getByText('Cột điện chiếu sáng').closest('button')!
    fireEvent.click(poleBtn)

    const confirmBtn = screen.getByText(/Xác Nhận Xuất \(2 tệp CSV\)/i).closest('button')!
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(csvExporter.downloadCsvWithBom).toHaveBeenCalled()
    })
    expect(mockOnClose).toHaveBeenCalled()
  })
})
