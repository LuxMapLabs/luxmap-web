import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FixtureTable } from '../../../../../pages/assets/components/fixtures/components/FixtureTable'
import { PoleDetailModal } from '../../../../../pages/assets/components/poles/components/PoleDetailModal'
import { PoleTable } from '../../../../../pages/assets/components/poles/components/PoleTable'
import { AddFixtureModal } from '../../../../../pages/assets/components/fixtures/components/AddFixtureModal'
import { EditFixtureModal } from '../../../../../pages/assets/components/fixtures/components/EditFixtureModal'
import { RetireFixtureModal } from '../../../../../pages/assets/components/fixtures/components/RetireFixtureModal'
import { FixtureDetailModal } from '../../../../../pages/assets/components/fixtures/components/FixtureDetailModal'
import { validateImportRow } from '../../../../../validations/assetImport.schema'
import type { ManagedFixture } from '../../../../../hooks/assets/useAssetData'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import type { CreateFixtureRequest } from '../../../../../types/assets/fixtures'

describe('Fixture & Pole Lamp Count (Số lượng bóng đèn trên cột) Tests', () => {
  const mockPoles: PoleListItem[] = [
    {
      pole_id: 'POLE-001',
      external_ref: 'POLE-0001',
      segment_id: 'SEG-001',
      feeder_id: 'FDR-001',
      commune_id: 'COM-001',
      commune_name: 'Xã Phú Hòa Đông',
      near_sensitive_poi: false,
      data_source: 'field',
      location: { lat: 10.97, lng: 106.49 },
      updated_at: '2026-10-21T00:00:00Z',
      active_fixture: {
        fixture_id: 'FIX-POLE-0001',
        fixture_type: 'led_road_lamp',
        power_source: 'grid',
        lamp_watt: 100,
        lamp_count: 2, // 2 bóng
        install_date: '2026-01-01',
        warranty_expiry: '2028-01-01',
        warranty_status: 'active',
        data_source: 'field',
      },
    },
    {
      pole_id: 'POLE-002',
      external_ref: 'POLE-0002',
      segment_id: 'SEG-001',
      feeder_id: 'FDR-001',
      commune_id: 'COM-001',
      commune_name: 'Xã Phú Hòa Đông',
      near_sensitive_poi: false,
      data_source: 'field',
      location: { lat: 10.98, lng: 106.50 },
      updated_at: '2026-10-21T00:00:00Z',
      active_fixture: {
        fixture_id: 'FIX-POLE-0002',
        fixture_type: 'led_road_lamp',
        power_source: 'grid',
        lamp_watt: 150,
        lamp_count: 1, // 1 bóng
        install_date: '2026-01-01',
        data_source: 'field',
      },
    },
    {
      pole_id: 'POLE-003',
      external_ref: 'POLE-0003',
      segment_id: 'SEG-001',
      feeder_id: 'FDR-001',
      commune_id: 'COM-001',
      commune_name: 'Xã Phú Hòa Đông',
      near_sensitive_poi: false,
      data_source: 'field',
      location: { lat: 10.99, lng: 106.51 },
      updated_at: '2026-10-21T00:00:00Z',
      // Chưa có active_fixture (cột chưa lắp đặt)
      active_fixture: undefined,
    },
  ]

  const mockSegments: SegmentListItem[] = [
    {
      segment_id: 'SEG-001',
      segment_name: 'Tuyến Đường 1',
      road_class: 'inter_commune',
      length_m: 500,
      commune_id: 'COM-001',
      commune_name: 'Xã Phú Hòa Đông',
      pole_count: 3,
      data_source: 'field',
      updated_at: '2026-01-01',
    },
  ]

  const mockFixtures: ManagedFixture[] = [
    {
      fixture_id: 'FIX-POLE-0001',
      pole_id: 'POLE-001',
      pole_external_ref: 'POLE-0001',
      fixture_type: 'led_road_lamp',
      power_source: 'grid',
      lamp_watt: 100,
      lamp_count: 2, // 2 bóng
      install_date: '2026-01-01',
      warranty_expiry: '2028-01-01',
      warranty_status: 'active',
      data_source: 'field',
      removed_date: null,
    },
  ]

  it('1. PoleTable hiển thị badge x2 khi cột có 2 bóng', () => {
    render(
      <PoleTable
        poles={mockPoles}
        cabinets={[]}
        segments={[]}
        onViewDetail={vi.fn()}
        onEdit={vi.fn()}
        onViewCabinetDetail={vi.fn()}
      />
    )

    // Cột POLE-0001 có 2 bóng đèn nên hiển thị badge "x2"
    expect(screen.getByText('x2')).toBeInTheDocument()
    // Cột POLE-0002 có 1 bóng đèn hiển thị "(1)"
    expect(screen.getByText('(1)')).toBeInTheDocument()
  })

  it('2. PoleDetailModal hiển thị thông tin Số lượng bóng và tính Tổng công suất', () => {
    render(
      <PoleDetailModal
        isOpen={true}
        pole={mockPoles[0]}
        segments={[]}
        cabinets={[]}
        onClose={vi.fn()}
      />
    )

    // Hiển thị card Số bóng / bộ
    expect(screen.getByText('Số bóng / bộ')).toBeInTheDocument()
    expect(screen.getByText('2 bóng')).toBeInTheDocument()

    // Hiển thị Tổng công suất: 200 W (2x100W)
    expect(screen.getByText('200 W')).toBeInTheDocument()
    expect(screen.getByText('(2x100W)')).toBeInTheDocument()
  })

  it('3. FixtureTable hiển thị cột Số lượng bóng và tính Tổng công suất cột', () => {
    render(
      <FixtureTable
        fixtures={mockFixtures}
        poles={mockPoles}
        onEditFixture={vi.fn()}
      />
    )

    // Cột Số lượng bóng
    expect(screen.getByText('2 bóng')).toBeInTheDocument()

    // Cột Công suất có hiển thị tổng watt
    expect(screen.getByText('100 W')).toBeInTheDocument()
    expect(screen.getByText('Tổng: 200 W')).toBeInTheDocument()
  })

  it('4. validateImportRow phát hiện thay đổi lamp_count và so khớp diffs chính xác', () => {
    const context = {
      poles: mockPoles,
      fixtures: mockFixtures,
      cabinets: [],
      segments: [],
    }

    // CSV nạp dữ liệu đổi từ 2 bóng sang 3 bóng
    const rowObj = {
      pole_external_ref: 'POLE-0001',
      fixture_type: 'led_road_lamp',
      power_source: 'grid',
      lamp_watt: '100',
      lamp_count: '3',
      install_date: '2026-01-01',
      data_source: 'field',
    }

    const review = validateImportRow('fixtures', rowObj, context, 0)
    expect(review.actionType).toBe('updated')
    expect((review.data as CreateFixtureRequest).lamp_count).toBe(3)

    const diff = review.diffs.find((d) => d.label === 'Số bóng trên bộ đèn')
    expect(diff).toBeDefined()
    expect(diff?.oldVal).toBe('2 bóng')
    expect(diff?.newVal).toBe('3 bóng')
  })

  it('5. validateImportRow tự động gán lamp_count = 1 khi file CSV để trống cột lamp_count', () => {
    const context = {
      poles: mockPoles,
      fixtures: mockFixtures,
      cabinets: [],
      segments: [],
    }

    // CSV không có cột lamp_count hoặc để trống
    const rowObj = {
      pole_external_ref: 'POLE-0002',
      fixture_type: 'led_road_lamp',
      power_source: 'grid',
      lamp_watt: '150',
      lamp_count: '',
      install_date: '2026-01-01',
      data_source: 'field',
    }

    const review = validateImportRow('fixtures', rowObj, context, 0)
    expect((review.data as CreateFixtureRequest).lamp_count).toBe(1)
    expect(review.actionType).toBe('unchanged')
  })

  it('6. AddFixtureModal chỉ hiển thị cột chưa lắp đặt (loại bỏ cột đã có active_fixture)', () => {
    render(
      <AddFixtureModal
        isOpen={true}
        onClose={vi.fn()}
        poles={mockPoles}
        segments={mockSegments}
        onAddFixture={vi.fn()}
      />
    )

    // Chọn tuyến đường SEG-001
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'SEG-001' } })

    // POLE-001 và POLE-002 đã có active_fixture nên không xuất hiện
    // Chỉ POLE-0003 (chưa gắn bộ đèn) xuất hiện trong dropdown Cột điện
    expect(screen.queryByText(/POLE-0001/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/POLE-0002/i)).not.toBeInTheDocument()
    expect(screen.getByText(/POLE-0003/i)).toBeInTheDocument()
  })

  it('7. EditFixtureModal có dropdown Tuyến đường, mặc định tuyến hiện tại và hiển thị cột [Đang lắp] cùng cột [Chưa lắp]', () => {
    render(
      <EditFixtureModal
        isOpen={true}
        onClose={vi.fn()}
        fixture={mockFixtures[0]}
        poles={mockPoles}
        segments={mockSegments}
        onUpdateFixture={vi.fn()}
      />
    )

    // Dropdown tuyến đường đã tự động chọn SEG-001
    const selects = screen.getAllByRole('combobox')
    const segmentSelect = selects[0] as HTMLSelectElement
    expect(segmentSelect.value).toBe('SEG-001')

    const poleSelect = selects[1] as HTMLSelectElement
    expect(poleSelect.value).toBe('POLE-001')

    // Dropdown cột điện chứa POLE-0001 [Đang lắp] và POLE-0003 [Chưa lắp]
    // Loại trừ POLE-0002 vì POLE-0002 đã có bộ đèn khác đang lắp
    expect(screen.getByText(/POLE-0001 \[Đang lắp\]/i)).toBeInTheDocument()
    expect(screen.getByText(/POLE-0003 \[Chưa lắp\]/i)).toBeInTheDocument()
    expect(screen.queryByText(/POLE-0002/i)).not.toBeInTheDocument()
  })
  it('8. EditFixtureModal không còn trường input Ngày Tháo Dỡ và không hiển thị thông tin Tủ nguồn trong dropdown', () => {
    render(
      <EditFixtureModal
        isOpen={true}
        onClose={vi.fn()}
        fixture={mockFixtures[0]}
        poles={mockPoles}
        segments={mockSegments}
        onUpdateFixture={vi.fn()}
      />
    )

    // Không còn nhãn hay input Ngày Tháo Dỡ trong modal edit
    expect(screen.queryByText('Ngày Tháo Dỡ')).not.toBeInTheDocument()

    // Dropdown không chứa thông tin nguồn/tủ (Nguồn:...)
    expect(screen.queryByText(/Nguồn:/i)).not.toBeInTheDocument()
    expect(screen.getByText('POLE-0001 [Đang lắp]')).toBeInTheDocument()
  })

  it('9. FixtureTable hiển thị nút Tháo dỡ khi bộ đèn đang hoạt động và ẩn khi đã tháo dỡ', () => {
    const onRetireMock = vi.fn()
    const retiredFixture: ManagedFixture = {
      ...mockFixtures[0],
      fixture_id: 'FIX-RETIRED-01',
      removed_date: '2026-10-20',
    }

    const { rerender } = render(
      <FixtureTable
        fixtures={mockFixtures}
        poles={mockPoles}
        onEditFixture={vi.fn()}
        onRetireFixture={onRetireMock}
      />
    )

    // Đèn đang hoạt động có nút Tháo dỡ
    const retireBtn = screen.getByTitle('Tháo dỡ bộ đèn')
    expect(retireBtn).toBeInTheDocument()
    fireEvent.click(retireBtn)
    expect(onRetireMock).toHaveBeenCalledWith(mockFixtures[0])

    // Đèn đã tháo dỡ không có nút Tháo dỡ
    rerender(
      <FixtureTable
        fixtures={[retiredFixture]}
        poles={mockPoles}
        onEditFixture={vi.fn()}
        onRetireFixture={onRetireMock}
      />
    )
    expect(screen.queryByTitle('Tháo dỡ bộ đèn')).not.toBeInTheDocument()
  })

  it('10. RetireFixtureModal mở lên với ngày mặc định hôm nay và gọi onConfirm đúng payload', () => {
    const onConfirmMock = vi.fn()
    const onCloseMock = vi.fn()

    render(
      <RetireFixtureModal
        isOpen={true}
        onClose={onCloseMock}
        fixture={mockFixtures[0]}
        onConfirm={onConfirmMock}
      />
    )

    expect(screen.getByText('Tháo Dỡ Bộ Đèn')).toBeInTheDocument()
    expect(screen.getByText('POLE-0001')).toBeInTheDocument()
    expect(screen.getByText('Ngày Tháo Dỡ')).toBeInTheDocument()

    // Bấm xác nhận tháo dỡ
    const submitBtn = screen.getByText('Xác Nhận Tháo Dỡ')
    fireEvent.click(submitBtn)

    expect(onConfirmMock).toHaveBeenCalledTimes(1)
    expect(onConfirmMock).toHaveBeenCalledWith('FIX-POLE-0001', expect.objectContaining({
      removed_date: expect.any(String),
    }))
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it("11. FixtureTable hiển thị nút xem chi tiết và kích hoạt onViewDetail khi bấm", () => {
    const onViewDetailMock = vi.fn()
    render(
      <FixtureTable
        fixtures={mockFixtures}
        poles={mockPoles}
        onViewDetail={onViewDetailMock}
        onEditFixture={vi.fn()}
      />
    )
    const detailBtns = screen.getAllByTitle("Xem chi tiết bộ đèn")
    expect(detailBtns.length).toBeGreaterThan(0)
    fireEvent.click(detailBtns[0])
    expect(onViewDetailMock).toHaveBeenCalledWith(mockFixtures[0])
  })

  it("12. FixtureDetailModal hiển thị đầy đủ thông số kỹ thuật, số bóng, vị trí lắp đặt và bảo hành", () => {
    const onCloseMock = vi.fn()
    const onEditMock = vi.fn()
    render(
      <FixtureDetailModal
        isOpen={true}
        fixture={mockFixtures[0]}
        poles={mockPoles}
        onClose={onCloseMock}
        onEdit={onEditMock}
      />
    )
    expect(screen.getByText("FIX-POLE-0001")).toBeInTheDocument()
    expect(screen.getByText("Đang hoạt động")).toBeInTheDocument()
    expect(screen.getByText("Đèn LED Chiếu Sáng Đường Phố")).toBeInTheDocument()
    expect(screen.getByText("2 bóng")).toBeInTheDocument()
    expect(screen.getByText("200 W")).toBeInTheDocument()
    expect(screen.getByText("POLE-0001")).toBeInTheDocument()
    const editBtn = screen.getByText("Chỉnh sửa thông số")
    fireEvent.click(editBtn)
    expect(onEditMock).toHaveBeenCalledWith(mockFixtures[0])
    const closeBtn = screen.getByText("Đóng")
    fireEvent.click(closeBtn)
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })
})
