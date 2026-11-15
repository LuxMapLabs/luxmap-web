import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { EditSegmentModal } from '../../../../../pages/assets/components/segments/components/EditSegmentModal'
import assetReducer, { fetchSegmentDetailSuccess } from '../../../../../feature/assets/assetSlice'
import mapReducer from '../../../../../feature/map/mapSlice'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { PickablePole } from '../../../../../components/SegmentPolePickerMap'

// Bản đồ MapLibre không chạy được trong jsdom: thay bằng nút chọn cột và ghi lại đường được vẽ
vi.mock('../../../../../components/SegmentPolePickerMap', () => ({
  SegmentPolePickerMap: ({
    poles,
    onTogglePole,
    fixedLine,
  }: {
    poles: PickablePole[]
    onTogglePole: (id: string) => void
    fixedLine?: [number, number][]
  }) => (
    <div data-testid="picker-map" data-fixed-line={JSON.stringify(fixedLine ?? null)}>
      {poles.map((p) => (
        <button key={p.id} type="button" onClick={() => onTogglePole(p.id)}>
          chọn {p.id}
        </button>
      ))}
    </div>
  ),
}))

const pole = (id: string, lng: number, lat: number, segmentId: string | null): PoleListItem => ({
  pole_id: id,
  external_ref: id,
  segment_id: segmentId,
  commune_id: 'COM-001',
  commune_name: 'Phước Thiện',
  data_source: 'field',
  near_sensitive_poi: false,
  location: { lat, lng },
  updated_at: '2026-11-15T00:00:00Z',
})

const segment: SegmentListItem = {
  segment_id: 'SEG-003',
  external_ref: 'osm-way-1',
  segment_name: 'Tuyến B',
  road_class: 'inter_village',
  length_m: 1215,
  commune_id: 'COM-001',
  commune_name: 'Phước Thiện',
  data_source: 'field',
  pole_count: 2,
  has_geometry: true,
  updated_at: '2026-11-15T00:00:00Z',
}

// Hình theo con đường: chạy song song cách cột ~10 m, đỉnh không trùng cột nào
const ROAD = 'LINESTRING(106.7995 10.80009, 106.8005 10.80009, 106.8015 10.80009, 106.8025 10.80009)'
// Đường nối thẳng qua hai cột (bản nháp)
const JOINED = 'LINESTRING(106.8 10.8, 106.801 10.8)'

const open = (poles: PoleListItem[], geomWkt: string) => {
  const store = configureStore({
    reducer: { assets: assetReducer, map: mapReducer },
    preloadedState: { assets: { ...assetReducer(undefined, { type: 'init' }), poles, segments: [segment] } },
  })
  const onSave = vi.fn()
  render(
    <Provider store={store}>
      <EditSegmentModal isOpen segment={segment} onClose={vi.fn()} onSave={onSave} />
    </Provider>
  )
  act(() => {
    store.dispatch(fetchSegmentDetailSuccess({ segmentId: 'SEG-003', geomWkt }))
  })
  return onSave
}

const save = () => fireEvent.click(screen.getByRole('button', { name: /Lưu Thay Đổi/i }))

const own = [pole('POLE-0001', 106.8, 10.8, 'SEG-003'), pole('POLE-0002', 106.801, 10.8, 'SEG-003')]

describe('Sửa tuyến đã có hình theo con đường', () => {
  it('đổi tên rồi lưu: gửi lại đúng hình và chiều dài đang lưu, không nối lại theo cột', () => {
    const onSave = open(own, ROAD)

    expect(screen.getByText(/Tuyến đã có hình theo con đường/)).toBeInTheDocument()
    expect(JSON.parse(screen.getByTestId('picker-map').dataset.fixedLine as string)).toHaveLength(4)

    fireEvent.change(screen.getByDisplayValue('Tuyến B'), { target: { value: 'Tuyến B mới' } })
    save()

    expect(onSave).toHaveBeenCalledTimes(1)
    const [updated, poleIds] = onSave.mock.calls[0]
    expect(updated.segment_name).toBe('Tuyến B mới')
    expect(updated.geom_wkt).toBe(ROAD)
    expect(updated.length_m).toBe(1215)
    expect(poleIds).toEqual(expect.arrayContaining(['POLE-0001', 'POLE-0002']))
  })

  it('chọn thêm cột nằm xa hình quá 25 m: chặn lưu và nêu mã cột', () => {
    const onSave = open([...own, pole('POLE-0003', 106.801, 10.8005, null)], ROAD)

    fireEvent.click(screen.getByRole('button', { name: 'chọn POLE-0003' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/1 cột nằm cách hình tuyến quá 25 m \(POLE-0003\)/)
    save()

    expect(onSave).not.toHaveBeenCalled()
  })

  it('chọn thêm cột sát hình: lưu được, hình vẫn giữ nguyên', () => {
    const onSave = open([...own, pole('POLE-0003', 106.802, 10.8, null)], ROAD)

    fireEvent.click(screen.getByRole('button', { name: 'chọn POLE-0003' }))
    save()

    expect(onSave).toHaveBeenCalledTimes(1)
    const [updated, poleIds] = onSave.mock.calls[0]
    expect(updated.geom_wkt).toBe(ROAD)
    expect(poleIds).toContain('POLE-0003')
  })

  it('cột đã thuộc tuyến từ trước mà nằm xa: chỉ nhắc, vẫn đổi tên được', () => {
    const onSave = open([...own, pole('POLE-0003', 106.801, 10.8005, 'SEG-003')], ROAD)

    expect(screen.getByText(/1 cột của tuyến đang nằm cách hình tuyến quá 25 m/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    save()

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0].geom_wkt).toBe(ROAD)
  })
})

describe('Sửa tuyến mà hình chỉ là bản nháp nối cột', () => {
  it('chọn thêm cột: đường nối lại qua cột mới như trước', () => {
    const onSave = open([...own, pole('POLE-0003', 106.802, 10.8, null)], JOINED)

    expect(screen.queryByText(/Tuyến đã có hình theo con đường/)).not.toBeInTheDocument()
    expect(screen.getByTestId('picker-map').dataset.fixedLine).toBe('null')

    fireEvent.click(screen.getByRole('button', { name: 'chọn POLE-0003' }))
    save()

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0].geom_wkt).toBe('LINESTRING(106.8 10.8, 106.801 10.8, 106.802 10.8)')
  })

  it('bấm "Sửa hình bằng kéo thả": hình thôi chạy theo cột, cột chọn thêm không nối vào nữa', () => {
    const onSave = open([...own, pole('POLE-0003', 106.8005, 10.80005, null)], JOINED)

    fireEvent.click(screen.getByRole('button', { name: /Sửa hình bằng kéo thả/ }))
    expect(JSON.parse(screen.getByTestId('picker-map').dataset.fixedLine as string)).toEqual([
      [106.8, 10.8],
      [106.801, 10.8],
    ])
    fireEvent.click(screen.getByRole('button', { name: 'chọn POLE-0003' }))
    save()

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0].geom_wkt).toBe('LINESTRING(106.8 10.8, 106.801 10.8)')
    expect(onSave.mock.calls[0][1]).toContain('POLE-0003')
  })
})
