import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import rootReducer from '../../../../../redux/rootReducer'
import { AddSegmentModal } from '../../../../../pages/assets/components/segments/components/AddSegmentModal'
import type { PoleListItem } from '../../../../../types/assets/poles'

// Bản đồ MapLibre không chạy được trong jsdom
vi.mock('../../../../../components/SegmentPolePickerMap', () => ({
  SegmentPolePickerMap: () => <div data-testid="picker-map" />,
}))

const noGpsPole = (id: string): PoleListItem => ({
  pole_id: id,
  external_ref: id,
  segment_id: null,
  commune_id: 'commune_tl8',
  commune_name: 'Xã Phú Hòa Đông',
  data_source: 'field',
  near_sensitive_poi: false,
  location: null as unknown as PoleListItem['location'],
  updated_at: '2026-11-12T00:00:00Z',
})

describe('Tạo tuyến với cột chưa có GPS', () => {
  it('chọn 2 cột chưa GPS: gửi đủ pole_ids, không có hình và không có chiều dài', () => {
    const store = configureStore({
      reducer: rootReducer,
      preloadedState: {
        ...rootReducer(undefined, { type: 'init' }),
        assets: { ...rootReducer(undefined, { type: 'init' }).assets, poles: [noGpsPole('POLE-2026'), noGpsPole('POLE-2027')] },
      },
    })
    const onAdd = vi.fn()
    render(
      <Provider store={store}>
        <AddSegmentModal isOpen onClose={vi.fn()} onAddSegment={onAdd} existingCount={3} />
      </Provider>
    )

    fireEvent.change(screen.getByPlaceholderText(/Tuyến D/), { target: { value: 'Tuyến mới' } })
    fireEvent.click(screen.getByLabelText(/POLE-2026/))
    fireEvent.click(screen.getByLabelText(/POLE-2027/))
    fireEvent.click(screen.getByRole('button', { name: /Tạo tuyến đường/ }))

    expect(onAdd).toHaveBeenCalledTimes(1)
    const [segment, poleIds] = onAdd.mock.calls[0]
    expect(poleIds).toEqual(['POLE-2026', 'POLE-2027'])
    expect('length_m' in segment).toBe(false)
    expect(segment.has_geometry).toBe(false)
    expect('geom_wkt' in segment).toBe(false)
  })

  it('tuyến chưa có cột nào vẫn tạo được, chưa có hình và chưa có chiều dài', () => {
    const onAdd = vi.fn()
    const store = configureStore({ reducer: rootReducer })
    render(
      <Provider store={store}>
        <AddSegmentModal isOpen onClose={vi.fn()} onAddSegment={onAdd} existingCount={0} />
      </Provider>
    )
    fireEvent.change(screen.getByPlaceholderText(/Tuyến D/), { target: { value: 'Tuyến mới' } })
    fireEvent.click(screen.getByRole('button', { name: /Tạo tuyến đường/ }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    const [segment] = onAdd.mock.calls[0]
    expect(segment.has_geometry).toBe(false)
    expect('length_m' in segment).toBe(false)
    expect('geom_wkt' in segment).toBe(false)
  })
})
