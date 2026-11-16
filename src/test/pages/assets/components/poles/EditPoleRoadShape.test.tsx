import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import rootReducer from '../../../../../redux/rootReducer'
import { EditPoleModal } from '../../../../../pages/assets/components/poles/components/EditPoleModal'
import { fetchSegmentDetailSuccess } from '../../../../../feature/assets/assetSlice'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { SegmentListItem } from '../../../../../types/assets/segments'

vi.mock('../../../../../hooks/useShowCommune', () => ({ useShowCommune: () => false }))
// Bản đồ MapLibre không chạy được trong jsdom
vi.mock('../../../../../pages/assets/components/poles/components/EditPoleMap', () => ({
  EditPoleMap: () => <div data-testid="edit-pole-map" />,
}))

const segment: SegmentListItem = {
  segment_id: 'SEG-003',
  external_ref: 'osm-way-1',
  segment_name: 'Tuyến B',
  road_class: 'inter_village',
  length_m: 330,
  commune_id: 'COM-001',
  commune_name: 'Phước Thiện',
  data_source: 'field',
  pole_count: 3,
  has_geometry: true,
  updated_at: '2026-11-15T00:00:00Z',
}

const pole = (id: string, lng: number, lat = 10.8): PoleListItem => ({
  pole_id: id,
  external_ref: id,
  segment_id: 'SEG-003',
  commune_id: 'COM-001',
  commune_name: 'Phước Thiện',
  data_source: 'field',
  near_sensitive_poi: false,
  location: { lat, lng },
  updated_at: '2026-11-15T00:00:00Z',
})

// Hình theo con đường: chạy song song cách cột ~10 m về phía bắc
const ROAD =
  'LINESTRING(106.7995 10.80009, 106.8005 10.80009, 106.8015 10.80009, 106.8025 10.80009)'
const JOINED = 'LINESTRING(106.8 10.8, 106.801 10.8, 106.802 10.8)'

const open = (editing: PoleListItem, geomWkt: string) => {
  const all = [pole('POLE-0001', 106.8), editing, pole('POLE-0003', 106.802)]
  const store = configureStore({ reducer: rootReducer })
  const onSave = vi.fn()
  render(
    <Provider store={store}>
      <EditPoleModal
        isOpen
        pole={editing}
        segments={[segment]}
        allPoles={all}
        onClose={vi.fn()}
        onSave={onSave}
      />
    </Provider>
  )
  act(() => {
    store.dispatch(fetchSegmentDetailSuccess({ segmentId: 'SEG-003', geomWkt }))
  })
  return onSave
}

const setLat = (value: string) => {
  const input = screen.getByPlaceholderText('VD: 10.970187')
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

const save = () => fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }))

describe('Sửa cột trên tuyến đã có hình theo con đường', () => {
  it('dời cột ra xa hình quá 25 m: cảnh báo ngay và chặn lưu', () => {
    const onSave = open(pole('POLE-0002', 106.801), ROAD)

    setLat('10.8005')
    expect(screen.getByRole('alert')).toHaveTextContent(/Cột cách hình tuyến 45,\d m, quá 25 m/)

    save()
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(/1 cột nằm cách hình tuyến quá 25 m \(POLE-0002\)/)).toBeInTheDocument()
  })

  it('dời cột một chút, vẫn sát hình: lưu được', () => {
    const onSave = open(pole('POLE-0002', 106.801), ROAD)

    setLat('10.80005')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    save()
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0].location.lat).toBeCloseTo(10.80005, 6)
  })

  it('cột vốn đã nằm xa mà không dời: chỉ cảnh báo, vẫn lưu được các thông tin khác', () => {
    const onSave = open(pole('POLE-0002', 106.801, 10.8005), ROAD)

    expect(screen.getByRole('alert')).toHaveTextContent(/quá 25 m/)
    save()
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})

describe('Sửa cột trên tuyến chỉ có bản nháp nối cột', () => {
  it('dời cột trong 25 m quanh hình đang lưu: không cảnh báo, lưu được (đường chạy theo cột)', () => {
    const onSave = open(pole('POLE-0002', 106.801), JOINED)

    setLat('10.8001')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    save()
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('dời cột quá 25 m so với hình đang lưu: chặn như backend sẽ chặn ở /location', () => {
    const onSave = open(pole('POLE-0002', 106.801), JOINED)

    setLat('10.8005')
    save()
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(/cách hình tuyến đang lưu \d+ m, quá 25 m/)).toBeInTheDocument()
  })
})
