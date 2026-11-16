import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type * as maplibregl from 'maplibre-gl'
import { PICKING_CLASS, useSegmentReshapeMode } from '../../hooks/gis-map/useSegmentReshapeMode'
import { startReshape, type SegmentReshape } from '../../utils/gis-map/segmentReshape'

/** Bản đồ giả: đủ cho hook gắn / gỡ sự kiện bấm, lớp vẽ và class trên khung bản đồ. */
const fakeMap = () => {
  const container = document.createElement('div')
  const handlers = new Map<string, (e: unknown) => void>()
  const map = {
    getContainer: () => container,
    on: vi.fn((type: string, fn: (e: unknown) => void) => handlers.set(type, fn)),
    off: vi.fn((type: string) => handlers.delete(type)),
    getSource: vi.fn(() => undefined),
    getLayer: vi.fn(() => undefined),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
  }
  return { map: map as unknown as maplibregl.Map, container, handlers }
}

describe('useSegmentReshapeMode: bấm chọn điểm trên bản đồ', () => {
  it('đang lấy hình: gắn class cho cú bấm xuyên qua chấm cột, bấm thì báo toạ độ; thôi lấy hình thì gỡ', () => {
    const { map, container, handlers } = fakeMap()
    const onPick = vi.fn()
    const { rerender } = renderHook(
      ({ reshape }: { reshape: SegmentReshape | null }) => useSegmentReshapeMode(map, true, reshape, onPick),
      { initialProps: { reshape: startReshape('SEG-003', 'Tuyến B', 1200) as SegmentReshape | null } }
    )
    expect(container.classList.contains(PICKING_CLASS)).toBe(true)

    handlers.get('click')?.({ lngLat: { lng: 106.49, lat: 10.97 } })
    expect(onPick).toHaveBeenCalledWith([106.49, 10.97])

    rerender({ reshape: null })
    expect(container.classList.contains(PICKING_CLASS)).toBe(false)
    expect(handlers.has('click')).toBe(false)
  })

  it('không lấy hình: không đụng tới khung bản đồ', () => {
    const { map, container } = fakeMap()
    renderHook(() => useSegmentReshapeMode(map, true, null, vi.fn()))
    expect(container.classList.contains(PICKING_CLASS)).toBe(false)
    expect(map.on).not.toHaveBeenCalled()
  })
})
