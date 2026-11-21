import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { PoleFeature } from '../../pages/gis-map/GisMapPage'

const created: { id: string; removed: boolean }[] = []

vi.mock('maplibre-gl', () => {
  class Marker {
    private el: HTMLElement
    private rec: { id: string; removed: boolean }
    constructor(opts: { element: HTMLElement }) {
      this.el = opts.element
      this.rec = { id: '', removed: false }
      created.push(this.rec)
    }
    setLngLat() {
      return this
    }
    addTo() {
      return this
    }
    remove() {
      this.rec.removed = true
      return this
    }
    getElement() {
      return this.el
    }
  }
  return { Marker, Popup: class {} }
})

import { useGisMarkers } from '../../hooks/gis-map/useGisMarkers'
import { poleMarkerSignature } from '../../utils/gis-map/markerUtils'

const pole = (id: string, props: Record<string, unknown> = {}, lng = 106.5): PoleFeature =>
  ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, 10.97] },
    properties: { pole_id: id, fixture_status: 'normal', power_state: 'on', ...props },
  }) as unknown as PoleFeature

const fakeMap = {
  getZoom: () => 16,
  getContainer: () => document.createElement('div'),
  on: vi.fn(),
  off: vi.fn(),
  getLayer: () => undefined,
} as never

const baseProps = {
  map: fakeMap,
  isMapLoaded: true,
  cabinets: [],
  selectedPole: null,
  selectedCabinet: null,
  popupRef: { current: null },
  isHoveringMarkerRef: { current: false },
  activeHoverSourceRef: { current: null },
  onSelectPole: vi.fn(),
  onSelectCabinet: vi.fn(),
}

const alive = () => created.filter((m) => !m.removed).length

beforeEach(() => {
  created.length = 0
})

describe('Marker cột đèn cập nhật tại chỗ khi dữ liệu làm mới', () => {
  it('lần đầu dựng đủ marker', () => {
    renderHook(() => useGisMarkers({ ...baseProps, filteredFeatures: [pole('P1'), pole('P2'), pole('P3')] }))
    expect(created).toHaveLength(3)
    expect(alive()).toBe(3)
  })

  it('làm mới với dữ liệu y hệt (mảng mới): không xoá, không tạo lại marker nào', () => {
    const { rerender } = renderHook(
      (props: { features: PoleFeature[] }) => useGisMarkers({ ...baseProps, filteredFeatures: props.features }),
      { initialProps: { features: [pole('P1'), pole('P2'), pole('P3')] } }
    )
    rerender({ features: [pole('P1'), pole('P2'), pole('P3')] })
    expect(created).toHaveLength(3)
    expect(alive()).toBe(3)
  })

  it('mạch tắt/bật làm đổi power_state của 1 cột: chỉ dựng lại đúng marker đó', () => {
    const { rerender } = renderHook(
      (props: { features: PoleFeature[] }) => useGisMarkers({ ...baseProps, filteredFeatures: props.features }),
      { initialProps: { features: [pole('P1'), pole('P2'), pole('P3')] } }
    )
    rerender({ features: [pole('P1'), pole('P2', { power_state: 'off' }), pole('P3')] })
    expect(created).toHaveLength(4) // chỉ thêm 1 marker mới
    expect(alive()).toBe(3)
    expect(created.filter((m) => m.removed)).toHaveLength(1) // và gỡ 1 marker cũ
  })

  it('cột bị lọc ẩn thì gỡ marker, cột mới thì thêm marker', () => {
    const { rerender } = renderHook(
      (props: { features: PoleFeature[] }) => useGisMarkers({ ...baseProps, filteredFeatures: props.features }),
      { initialProps: { features: [pole('P1'), pole('P2')] } }
    )
    rerender({ features: [pole('P2'), pole('P9')] })
    expect(alive()).toBe(2)
    expect(created).toHaveLength(3)
  })

  it('gỡ hook thì gỡ hết marker', () => {
    const { unmount } = renderHook(() => useGisMarkers({ ...baseProps, filteredFeatures: [pole('P1'), pole('P2')] }))
    unmount()
    expect(alive()).toBe(0)
  })
})

describe('poleMarkerSignature', () => {
  const flags = { isSelected: false, isManagedBySelectedCabinet: false, isOtherCabinetSelected: false }

  it('cùng dữ liệu thì cùng chữ ký', () => {
    expect(poleMarkerSignature(pole('P1'), flags)).toBe(poleMarkerSignature(pole('P1'), flags))
  })

  it('đổi trạng thái đèn, mạch, vị trí hoặc chọn thì đổi chữ ký', () => {
    const base = poleMarkerSignature(pole('P1'), flags)
    expect(poleMarkerSignature(pole('P1', { fixture_status: 'out' }), flags)).not.toBe(base)
    expect(poleMarkerSignature(pole('P1', { power_state: 'off' }), flags)).not.toBe(base)
    expect(poleMarkerSignature(pole('P1', {}, 106.6), flags)).not.toBe(base)
    expect(poleMarkerSignature(pole('P1'), { ...flags, isSelected: true })).not.toBe(base)
  })
})
