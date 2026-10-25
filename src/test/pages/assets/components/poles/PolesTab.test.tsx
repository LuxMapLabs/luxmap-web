import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatusBadge } from '../../../../../components/StatusBadge'
import { PoleTable } from '../../../../../pages/assets/components/poles/components/PoleTable'
import { PoleDetailModal } from '../../../../../pages/assets/components/poles/components/PoleDetailModal'
import { AddFixtureModal } from '../../../../../pages/assets/components/fixtures/components/AddFixtureModal'
import { FixtureTable } from '../../../../../pages/assets/components/fixtures/components/FixtureTable'
import assetReducer, {
  fetchAssetsRequest,
  fetchAssetsFailure,
} from '../../../../../feature/assets/assetSlice'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import type { FixtureStatus } from '../../../../../types/common/enums'
import { validateImportRow, type ValidationContext } from '../../../../../validations/assetImport.schema'

describe('PolesTab & Warranty Status Test Suite (BE-31 / 2026-10-12)', () => {
  // 100% Mock Data chuẩn DTO từ src/types/
  const mockCabinet: CabinetListItem = {
    cabinet_id: 'cab_01',
    external_ref: 'CAB-01',
    cabinet_name: 'Tủ điện Tỉnh Lộ 8',
    commune_id: 'commune_tl8',
    data_source: 'field',
    location: { lat: 10.9701, lng: 106.4896 },
    feeder_ids: [],
    updated_at: '2026-10-12T00:00:00Z',
  }

  const mockSegment: SegmentListItem = {
    segment_id: 'seg_01',
    external_ref: 'SEG-01',
    segment_name: 'Tuyến Tỉnh Lộ 8',
    road_class: 'inter_commune',
    length_m: 1500,
    commune_id: 'commune_tl8',
    data_source: 'field',
    pole_count: 30,
    updated_at: '2026-10-12T00:00:00Z',
  }

  const mockPoleWithActiveWarranty: PoleListItem = {
    pole_id: 'pole_active_01',
    external_ref: 'POLE-ACTIVE',
    segment_id: 'seg_01',
    commune_id: 'commune_tl8',
    data_source: 'field',
    near_sensitive_poi: false,
    location: { lat: 10.9701, lng: 106.4896 },
    updated_at: '2026-10-12T00:00:00Z',
    active_fixture: {
      fixture_id: 'FIX-POLE-ACTIVE',
      fixture_type: 'led_road_lamp',
      power_source: 'grid',
      lamp_watt: 120,
      lamp_count: 1,
      install_date: '2025-01-15',
      warranty_expiry: '2028-01-15',
      warranty_status: 'active',
      data_source: 'field',
    },
  }

  const mockPoleWithExpiringWarranty: PoleListItem = {
    pole_id: 'pole_expiring_02',
    external_ref: 'POLE-EXPIRING',
    segment_id: 'seg_01',
    commune_id: 'commune_tl8',
    data_source: 'field',
    near_sensitive_poi: false,
    location: { lat: 10.9702, lng: 106.4897 },
    updated_at: '2026-10-12T00:00:00Z',
    active_fixture: {
      fixture_id: 'FIX-POLE-EXPIRING',
      fixture_type: 'led_road_lamp',
      power_source: 'grid',
      lamp_watt: 150,
      lamp_count: 1,
      install_date: '2023-11-01',
      warranty_expiry: '2026-11-01',
      warranty_status: 'expiring',
      data_source: 'field',
    },
  }

  const mockPoleWithExpiredWarranty: PoleListItem = {
    pole_id: 'pole_expired_03',
    external_ref: 'POLE-EXPIRED',
    segment_id: 'seg_01',
    commune_id: 'commune_tl8',
    data_source: 'field',
    near_sensitive_poi: false,
    location: { lat: 10.9703, lng: 106.4898 },
    updated_at: '2026-10-12T00:00:00Z',
    active_fixture: {
      fixture_id: 'FIX-POLE-EXPIRED',
      fixture_type: 'led_road_lamp',
      power_source: 'grid',
      lamp_watt: 100,
      lamp_count: 1,
      install_date: '2021-05-10',
      warranty_expiry: '2024-05-10',
      warranty_status: 'expired',
      data_source: 'field',
    },
  }

  const mockPoleWithUnknownWarranty: PoleListItem = {
    pole_id: 'pole_unknown_04',
    external_ref: 'POLE-UNKNOWN',
    segment_id: 'seg_01',
    commune_id: 'commune_tl8',
    data_source: 'field',
    near_sensitive_poi: true,
    location: { lat: 10.9704, lng: 106.4899 },
    updated_at: '2026-10-12T00:00:00Z',
    active_fixture: {
      fixture_id: 'FIX-POLE-UNKNOWN',
      fixture_type: 'led_road_lamp',
      power_source: 'grid',
      lamp_watt: 100,
      lamp_count: 1,
      install_date: '2022-01-01',
      warranty_expiry: null,
      warranty_status: 'unknown',
      data_source: 'field',
    },
  }

  const mockPoleWithoutFixture: PoleListItem = {
    pole_id: 'pole_nofix_05',
    external_ref: 'POLE-NOFIX',
    segment_id: 'seg_01',
    commune_id: 'commune_tl8',
    data_source: 'field',
    near_sensitive_poi: false,
    location: { lat: 10.9705, lng: 106.4900 },
    updated_at: '2026-10-12T00:00:00Z',
  }

  // =========================================================================
  // TẦNG 1: STATUS BADGE UNIT TESTS (WARRANTY & FIXTURE TYPE)
  // =========================================================================
  describe('1. StatusBadge Component - Type "warranty" & "fixture"', () => {
    it('render chính xác badge "Còn hạn" (active) với màu xanh lục (emerald)', () => {
      render(<StatusBadge type="warranty" status="active" />)
      const badge = screen.getByText('Còn hạn')
      expect(badge).toBeInTheDocument()
      const badgeOuter = badge.parentElement?.closest('span') || badge.closest('span')
      expect(badgeOuter).toHaveClass('text-emerald-700')
      expect(badgeOuter).toHaveClass('bg-emerald-50')
    })

    it('render chính xác badge "Sắp hết hạn" (expiring) với màu vàng hổ phách (amber)', () => {
      render(<StatusBadge type="warranty" status="expiring" />)
      const badge = screen.getByText('Sắp hết hạn')
      expect(badge).toBeInTheDocument()
      const badgeOuter = badge.parentElement?.closest('span') || badge.closest('span')
      expect(badgeOuter).toHaveClass('text-amber-800')
      expect(badgeOuter).toHaveClass('bg-amber-50')
    })

    it('render chính xác badge "Hết hạn" (expired) với màu đỏ hoa hồng (rose)', () => {
      render(<StatusBadge type="warranty" status="expired" />)
      const badge = screen.getByText('Hết hạn')
      expect(badge).toBeInTheDocument()
      const badgeOuter = badge.parentElement?.closest('span') || badge.closest('span')
      expect(badgeOuter).toHaveClass('text-rose-700')
      expect(badgeOuter).toHaveClass('bg-rose-50')
    })

    it('render chính xác badge "Chưa rõ" (unknown) khi status là unknown hoặc không xác định', () => {
      render(<StatusBadge type="warranty" status="unknown" />)
      const badge = screen.getByText('Chưa rõ')
      expect(badge).toBeInTheDocument()
      const badgeOuter = badge.parentElement?.closest('span') || badge.closest('span')
      expect(badgeOuter).toHaveClass('text-slate-600')
      expect(badgeOuter).toHaveClass('bg-slate-100')
    })

    it('sử dụng nhãn tùy biến label khi được truyền vào StatusBadge type="warranty"', () => {
      render(<StatusBadge type="warranty" status="active" label="Bảo hành VIP 5 năm" />)
      expect(screen.getByText('Bảo hành VIP 5 năm')).toBeInTheDocument()
    })

    it('render chính xác các trạng thái đo sáng trắc quang fixture: Sáng tốt, Sáng yếu, Mất sáng, Chưa quét', () => {
      const { rerender } = render(<StatusBadge type="fixture" status="normal" />)
      expect(screen.getByText('Sáng tốt')).toBeInTheDocument()

      rerender(<StatusBadge type="fixture" status="dim" />)
      expect(screen.getByText('Sáng yếu')).toBeInTheDocument()

      rerender(<StatusBadge type="fixture" status="out" />)
      expect(screen.getByText('Mất sáng')).toBeInTheDocument()

      rerender(<StatusBadge type="fixture" status="unknown" />)
      expect(screen.getByText('Chưa quét')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // TẦNG 2: HAPPY PATH - POLE TABLE & DETAIL MODAL RENDERING
  // =========================================================================
  describe('2. Happy Path - PoleTable & PoleDetailModal Warranty Flow', () => {
    const mockPoles = [
      mockPoleWithActiveWarranty,
      mockPoleWithExpiringWarranty,
      mockPoleWithExpiredWarranty,
      mockPoleWithUnknownWarranty,
      mockPoleWithoutFixture,
    ]

    it('PoleTable render tiêu đề cột "Mã bộ đèn" và "Trạng thái" trong thead và không render "Bảo hành"', () => {
      render(
        <PoleTable
          poles={mockPoles}
          cabinets={[mockCabinet]}
          segments={[mockSegment]}
          onViewDetail={vi.fn()}
          onEdit={vi.fn()}
          onViewCabinetDetail={vi.fn()}
        />
      )
      expect(screen.getByRole('columnheader', { name: /Mã bộ đèn/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /Trạng thái/i })).toBeInTheDocument()
      expect(screen.queryByRole('columnheader', { name: /Bảo hành/i })).not.toBeInTheDocument()
    })

    it('PoleTable render đúng trạng thái đo sáng từ GIS khi có poleStatusMap', () => {
      const mockStatusMap = new Map<string, FixtureStatus>([
        ['pole_active_01', 'normal'],
        ['pole_expiring_02', 'dim'],
        ['pole_expired_03', 'out'],
        ['pole_unknown_04', 'unknown'],
      ])

      render(
        <PoleTable
          poles={mockPoles}
          cabinets={[mockCabinet]}
          segments={[mockSegment]}
          poleStatusMap={mockStatusMap}
          onViewDetail={vi.fn()}
          onEdit={vi.fn()}
          onViewCabinetDetail={vi.fn()}
        />
      )

      expect(screen.getByText('Sáng tốt')).toBeInTheDocument()
      expect(screen.getByText('Sáng yếu')).toBeInTheDocument()
      expect(screen.getByText('Mất sáng')).toBeInTheDocument()
      expect(screen.getByText('Chưa quét')).toBeInTheDocument()
      expect(screen.getByText('Chưa gắn bộ đèn')).toBeInTheDocument()
      expect(screen.queryByText('Còn hạn')).not.toBeInTheDocument()
      expect(screen.queryByText('Hết hạn')).not.toBeInTheDocument()
    })

    it('PoleTable mặc định trạng thái là "Chưa quét" khi cột có bóng mới chưa có dữ liệu đo sáng từ GIS', () => {
      render(
        <PoleTable
          poles={[mockPoleWithActiveWarranty]}
          cabinets={[mockCabinet]}
          segments={[mockSegment]}
          onViewDetail={vi.fn()}
          onEdit={vi.fn()}
          onViewCabinetDetail={vi.fn()}
        />
      )

      expect(screen.getByText('Chưa quét')).toBeInTheDocument()
    })

    it('PoleDetailModal hiển thị KPI Card "Bảo hành bộ đèn" với StatusBadge và ngày hết hạn', () => {
      render(
        <PoleDetailModal
          isOpen={true}
          pole={mockPoleWithActiveWarranty}
          cabinets={[mockCabinet]}
          segments={[mockSegment]}
          onClose={vi.fn()}
        />
      )

      expect(screen.getByText('Bảo hành bộ đèn')).toBeInTheDocument()
      expect(screen.getByText('Còn hạn')).toBeInTheDocument()
      expect(screen.getByText(/Hạn: 2028-01-15/i)).toBeInTheDocument()
    })

    it('PoleDetailModal hiển thị "Hạn: —" và badge "Chưa rõ" khi cột không có hạn bảo hành', () => {
      render(
        <PoleDetailModal
          isOpen={true}
          pole={mockPoleWithUnknownWarranty}
          cabinets={[mockCabinet]}
          segments={[mockSegment]}
          onClose={vi.fn()}
        />
      )

      expect(screen.getByText('Bảo hành bộ đèn')).toBeInTheDocument()
      expect(screen.getByText('Chưa rõ')).toBeInTheDocument()
      expect(screen.getByText(/Hạn: —/i)).toBeInTheDocument()
    })

    it('AddFixtureModal khởi tạo form bóng đèn và các trường ngày tháng', () => {
      const onAddFixtureMock = vi.fn()
      render(
        <AddFixtureModal
          isOpen={true}
          onClose={vi.fn()}
          poles={[mockPoleWithoutFixture]}
          segments={[mockSegment]}
          onAddFixture={onAddFixtureMock}
        />
      )

      // Kiểm tra header cột 'Hạn bảo hành' có mặt trong thead
      const thLabel = screen.getByText(/Hạn bảo hành/i)
      expect(thLabel).toBeInTheDocument()

      // Chọn tuyến đường và cột điện để xuất hiện hàng bóng đèn
      const selects = document.querySelectorAll('select')
      const segmentSelect = selects[0]
      fireEvent.change(segmentSelect, { target: { value: mockSegment.segment_id } })

      const poleSelect = selects[1]
      fireEvent.change(poleSelect, { target: { value: mockPoleWithoutFixture.pole_id } })

      // Bấm '+ Thêm Bộ Đèn Mới'
      const addRowBtn = screen.getAllByText(/Thêm Bộ Đèn Mới/i)[0]
      fireEvent.click(addRowBtn)

      // Kiểm tra ô input date hạn bảo hành có mặt
      const dateInputs = document.querySelectorAll('input[type="date"]')
      expect(dateInputs.length).toBeGreaterThanOrEqual(2) // Ngày lắp và Hạn bảo hành
      const warrantyInput = dateInputs[1] as HTMLInputElement
      expect(warrantyInput).toBeInTheDocument()
    })

    it('FixtureTable render cột "Ngày Tháo Dỡ" và hiển thị chính xác ngày tháo dỡ hoặc dấu "—"', () => {
      const mockFixtures = [
        {
          fixture_id: 'FIX-01',
          pole_id: 'pole_active_01',
          pole_external_ref: 'POLE-ACTIVE',
          fixture_type: 'led_road_lamp' as const,
          power_source: 'grid' as const,
          lamp_watt: 120,
          lamp_count: 1,
          install_date: '2025-01-15',
          warranty_expiry: '2028-01-15',
          removed_date: '2026-05-20',
          data_source: 'field' as const,
        },
        {
          fixture_id: 'FIX-02',
          pole_id: 'pole_expiring_02',
          pole_external_ref: 'POLE-EXPIRING',
          fixture_type: 'led_road_lamp' as const,
          power_source: 'grid' as const,
          lamp_watt: 100,
          lamp_count: 1,
          install_date: '2025-01-15',
          warranty_expiry: '2028-01-15',
          removed_date: null,
          data_source: 'field' as const,
        },
      ]

      render(
        <FixtureTable
          fixtures={mockFixtures}
          poles={[mockPoleWithActiveWarranty, mockPoleWithExpiringWarranty]}
          onEditFixture={vi.fn()}
        />
      )

      expect(screen.getByRole('columnheader', { name: /Ngày Tháo Dỡ/i })).toBeInTheDocument()
      expect(screen.getByText('2026-05-20')).toBeInTheDocument()
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // TẦNG 3: EMPTY STATES & EDGE CASES
  // =========================================================================
  describe('3. Empty States & Edge Cases', () => {
    it('PoleTable hiển thị dấu "—" khi cột không gắn bóng đèn (không crash)', () => {
      render(
        <PoleTable
          poles={[mockPoleWithoutFixture]}
          cabinets={[mockCabinet]}
          segments={[mockSegment]}
          onViewDetail={vi.fn()}
          onEdit={vi.fn()}
          onViewCabinetDetail={vi.fn()}
        />
      )

      // Khi không có fixture, ô mã bóng hiển thị "—"
      const dashes = screen.getAllByText('—')
      expect(dashes.length).toBeGreaterThan(0)
    })

    it('PoleTable hiển thị thông báo rỗng với colSpan=9 khi danh sách cột rỗng', () => {
      render(
        <PoleTable
          poles={[]}
          cabinets={[mockCabinet]}
          segments={[mockSegment]}
          onViewDetail={vi.fn()}
          onEdit={vi.fn()}
          onViewCabinetDetail={vi.fn()}
        />
      )

      const emptyCell = screen.getByText(/Không tìm thấy cột đèn nào phù hợp/i).closest('td')
      expect(emptyCell).toHaveAttribute('colSpan', '9')
    })

    it('PoleDetailModal xử lý an toàn khi isOpen=false hoặc pole là null', () => {
      const { container } = render(
        <PoleDetailModal
          isOpen={false}
          pole={null}
          cabinets={[mockCabinet]}
          segments={[mockSegment]}
          onClose={vi.fn()}
        />
      )
      expect(container.innerHTML).toBe('')
    })

    it('Zero-Mock Fallback: validateImportRow không gán hardcode 2026-12-31 khi warranty_expiry rỗng', () => {
      const context: ValidationContext = {
        cabinets: [mockCabinet],
        segments: [mockSegment],
        poles: [],
        fixtures: [],
      }

      const rowWithoutExpiry: Record<string, string> = {
        external_ref: 'POLE-TEST-NULL',
        segment_external_ref: 'SEG-01',
        commune_id: 'commune_tl8',
        geom_wkt: 'POINT(106.4896 10.9701)',
        data_source: 'field',
        lamp_watt: '100',
        // không có warranty_expiry
      }

      const review = validateImportRow('poles_and_fixtures', rowWithoutExpiry, context, 0)
      expect(review.actionType).not.toBe('invalid')
      // Khẳng định giá trị trả về trong data không bị gán bừa chuỗi '2026-12-31'
      expect((review.data as any).warranty_expiry).toBeUndefined()
    })
  })

  // =========================================================================
  // TẦNG 4: ERROR CASES - SIMULATE BACKEND 400 / 500
  // =========================================================================
  describe('4. Error Cases - Giả lập Backend trả về lỗi 400, 500', () => {
    it('bắt lỗi HTTP 400 Bad Request an toàn khi tải danh sách cột đèn thất bại', () => {
      const requestingState = assetReducer(undefined, fetchAssetsRequest())
      expect(requestingState.isLoadingAssets).toBe(true)

      const error400Msg = 'Yêu cầu không hợp lệ: Bộ lọc bảo hành không đúng định dạng (HTTP 400)'
      const failedState = assetReducer(requestingState, fetchAssetsFailure(error400Msg))

      expect(failedState.isLoadingAssets).toBe(false)
      expect(failedState.loadAssetsError).toBe(error400Msg)
      expect(failedState.poles).toEqual([])
    })

    it('bắt lỗi HTTP 500 Internal Server Error và bảo toàn danh sách cột đèn cũ trong Redux State', () => {
      const stateWithExistingPoles = {
        ...assetReducer(undefined, { type: '@@INIT' }),
        poles: [mockPoleWithActiveWarranty, mockPoleWithExpiringWarranty],
        isLoadingAssets: true,
      }

      const error500Msg = 'Lỗi máy chủ cơ sở dữ liệu GIS không phản hồi (HTTP 500)'
      const failedState = assetReducer(stateWithExistingPoles, fetchAssetsFailure(error500Msg))

      expect(failedState.isLoadingAssets).toBe(false)
      expect(failedState.loadAssetsError).toBe(error500Msg)
      // Dữ liệu cũ được bảo toàn, tránh làm trắng trang người dùng
      expect(failedState.poles).toHaveLength(2)
      expect(failedState.poles[0].external_ref).toBe('POLE-ACTIVE')
      expect(failedState.poles[1].external_ref).toBe('POLE-EXPIRING')
    })

    it('hiển thị chính xác tên địa bàn từ Backend (commune_name) thay vì mock cứng hoặc chỉ hiện id', () => {
      const poleWithCommuneName: PoleListItem = {
        ...mockPoleWithActiveWarranty,
        pole_id: 'pole_with_name_01',
        external_ref: 'POLE-CNAME-01',
        commune_id: 'COM-002',
        commune_name: 'Xã Tân An Hội',
      }
      const poleFallbackId: PoleListItem = {
        ...mockPoleWithActiveWarranty,
        pole_id: 'pole_fallback_02',
        external_ref: 'POLE-FALLBACK-02',
        commune_id: 'COM-005',
        commune_name: undefined,
      }

      render(
        <PoleTable
          poles={[poleWithCommuneName, poleFallbackId]}
          segments={[mockSegment]}
          cabinets={[mockCabinet]}
          onViewDetail={vi.fn()}
          onEdit={vi.fn()}
          onViewCabinetDetail={vi.fn()}
        />
      )

      // Cột 1 có commune_name -> hiển thị "Xã Tân An Hội"
      expect(screen.getByText('Xã Tân An Hội')).toBeInTheDocument()
      // Cột 2 chưa có commune_name -> formatFriendlyCommuneName tự động map COM-005 sang "Xã Phú Hòa Đông"
      expect(screen.getByText('Xã Phú Hòa Đông')).toBeInTheDocument()
    })
  })
})
