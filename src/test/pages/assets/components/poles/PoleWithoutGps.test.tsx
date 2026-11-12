import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import rootReducer from '../../../../../redux/rootReducer'
import { PoleTable } from '../../../../../pages/assets/components/poles/components/PoleTable'
import { EditPoleModal } from '../../../../../pages/assets/components/poles/components/EditPoleModal'
import { PoleDetailModal } from '../../../../../pages/assets/components/poles/components/PoleDetailModal'
import { validateImportRow, type ValidationContext } from '../../../../../validations/assetImport.schema'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { SegmentListItem } from '../../../../../types/assets/segments'

vi.mock('../../../../../hooks/useShowCommune', () => ({ useShowCommune: () => false }))
// Bản đồ MapLibre không chạy được trong jsdom; chỉ cần biết khi nào nó được gắn
vi.mock('../../../../../pages/assets/components/poles/components/EditPoleMap', () => ({
  EditPoleMap: () => <div data-testid="edit-pole-map" />,
}))

const segment: SegmentListItem = {
  segment_id: 'seg_01',
  external_ref: 'SEG-01',
  segment_name: 'Tuyến Tỉnh Lộ 8',
  road_class: 'inter_commune',
  length_m: 1500,
  commune_id: 'commune_tl8',
  commune_name: 'Xã Phú Hòa Đông',
  data_source: 'field',
  pole_count: 3,
  has_geometry: true,
  updated_at: '2026-11-11T00:00:00Z',
}

// Kiểu sinh từ BE chưa cho location null, nhưng BE trả null cho cột chưa có GPS
const noGpsPole: PoleListItem = {
  pole_id: 'pole_nogps',
  external_ref: 'POLE-NOGPS',
  segment_id: 'seg_01',
  commune_id: 'commune_tl8',
  commune_name: 'Xã Phú Hòa Đông',
  data_source: 'field',
  near_sensitive_poi: false,
  location: null as unknown as PoleListItem['location'],
  updated_at: '2026-11-11T00:00:00Z',
}

const renderWithStore = (ui: React.ReactElement) => {
  const store = configureStore({ reducer: rootReducer })
  return render(<Provider store={store}>{ui}</Provider>)
}

describe('Cột chưa có GPS', () => {
  it('PoleTable hiện nhãn "Chưa có GPS" thay vì tọa độ', () => {
    render(
      <PoleTable
        poles={[noGpsPole]}
        cabinets={[]}
        segments={[segment]}
        onViewDetail={vi.fn()}
        onEdit={vi.fn()}
        onViewCabinetDetail={vi.fn()}
      />
    )
    expect(screen.getByText('Chưa có GPS')).toBeInTheDocument()
  })

  it('PoleDetailModal không bịa tọa độ khi cột chưa có GPS', () => {
    render(<PoleDetailModal isOpen pole={noGpsPole} segments={[segment]} onClose={vi.fn()} />)
    expect(screen.getByText(/GPS: Chưa có GPS/)).toBeInTheDocument()
    expect(screen.queryByText(/10\.9701/)).not.toBeInTheDocument()
  })

  it('EditPoleModal: cột chưa có GPS không hiện bản đồ và lưu với location null', () => {
    const onSave = vi.fn()
    renderWithStore(
      <EditPoleModal isOpen pole={noGpsPole} segments={[segment]} onClose={vi.fn()} onSave={onSave} />
    )
    expect(screen.getByText('Cột chưa có GPS')).toBeInTheDocument()
    expect(screen.queryByTestId('edit-pole-map')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0].location).toBeNull()
  })

  it('EditPoleModal: bấm "Gắn vị trí cho cột" thì hiện bản đồ và bắt buộc nhập tọa độ', () => {
    const onSave = vi.fn()
    renderWithStore(
      <EditPoleModal isOpen pole={noGpsPole} segments={[segment]} onClose={vi.fn()} onSave={onSave} />
    )
    fireEvent.click(screen.getByRole('button', { name: /Gắn vị trí cho cột/i }))
    expect(screen.getByTestId('edit-pole-map')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('Vui lòng nhập đầy đủ Vĩ độ và Kinh độ!')).toBeInTheDocument()
  })

  describe('Import cột', () => {
    const context: ValidationContext = { cabinets: [], segments: [segment], poles: [], fixtures: [] }
    const base: Record<string, string> = {
      external_ref: 'POLE-IMP-01',
      segment_external_ref: 'SEG-01',
      commune_id: 'commune_tl8',
      data_source: 'field',
    }

    it('geom_wkt để trống vẫn hợp lệ và gửi geom_wkt null', () => {
      const review = validateImportRow('poles', { ...base, geom_wkt: '' }, context, 0)
      expect(review.actionType).toBe('new')
      expect((review.data as { geom_wkt?: string | null }).geom_wkt).toBeNull()
    })

    it('thiếu hẳn cột geom_wkt vẫn hợp lệ', () => {
      const review = validateImportRow('poles', base, context, 0)
      expect(review.actionType).toBe('new')
    })

    it('geom_wkt sai định dạng vẫn bị từ chối', () => {
      const review = validateImportRow('poles', { ...base, geom_wkt: 'POINT(abc)' }, context, 0)
      expect(review.actionType).toBe('invalid')
    })

    it('cột đã có GPS, file để trống geom_wkt thì không tính là thay đổi tọa độ', () => {
      const existing: PoleListItem = {
        ...noGpsPole,
        external_ref: 'POLE-IMP-01',
        location: { lat: 10.97, lng: 106.48 },
      }
      const review = validateImportRow('poles', { ...base, geom_wkt: '' }, { ...context, poles: [existing] }, 0)
      expect(review.actionType).toBe('unchanged')
    })

    it('cột chưa có GPS, file có geom_wkt thì ghi nhận là gắn tọa độ', () => {
      const existing: PoleListItem = { ...noGpsPole, external_ref: 'POLE-IMP-01' }
      const review = validateImportRow(
        'poles',
        { ...base, geom_wkt: 'POINT(106.48 10.97)' },
        { ...context, poles: [existing] },
        0
      )
      expect(review.actionType).toBe('updated')
      expect(review.diffs.some((d) => d.label === 'Tọa độ GIS' && d.oldVal === 'Chưa có GPS')).toBe(true)
    })
  })
})

describe('Import tuyến chưa có hình', () => {
  const context: ValidationContext = { cabinets: [], segments: [], poles: [], fixtures: [] }
  const base: Record<string, string> = {
    external_ref: 'SEG-NEW',
    segment_name: 'Tuyến mới',
    road_class: 'inter_commune',
    length_m: '800',
    commune_id: 'commune_tl8',
    data_source: 'field',
  }

  it('geom_wkt để trống vẫn hợp lệ và không gửi geom_wkt', () => {
    const review = validateImportRow('segments', { ...base, geom_wkt: '' }, context, 0)
    expect(review.actionType).toBe('new')
    expect('geom_wkt' in (review.data as object)).toBe(false)
  })

  it('geom_wkt sai định dạng vẫn bị từ chối', () => {
    const review = validateImportRow('segments', { ...base, geom_wkt: 'POINT(1 1)' }, context, 0)
    expect(review.actionType).toBe('invalid')
  })

  it('không có geom_wkt thì length_m để trống vẫn hợp lệ và không gửi length_m', () => {
    const review = validateImportRow('segments', { ...base, length_m: '', geom_wkt: '' }, context, 0)
    expect(review.actionType).toBe('new')
    expect('length_m' in (review.data as object) && (review.data as { length_m?: number }).length_m).toBeFalsy()
  })

  it('có geom_wkt mà thiếu length_m thì bị từ chối', () => {
    const review = validateImportRow(
      'segments',
      { ...base, length_m: '', geom_wkt: 'LINESTRING(106.1 10.1, 106.2 10.2)' },
      context,
      0
    )
    expect(review.actionType).toBe('invalid')
  })
})
