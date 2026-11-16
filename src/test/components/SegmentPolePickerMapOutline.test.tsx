import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import rootReducer from '../../redux/rootReducer'
import { SegmentPolePickerMap } from '../../components/SegmentPolePickerMap'

// MapLibre giả: ghi lại nguồn / lớp và cho phát sự kiện 'load'
const maps = vi.hoisted(() => [] as Array<{
  sources: Record<string, { data: unknown }>
  layers: Record<string, { id: string; source: string; type: string }>
  emit: (event: string) => void
}>)

vi.mock('maplibre-gl', () => {
  class MockMap {
    sources: Record<string, { data: unknown; setData: (d: unknown) => void }> = {}
    layers: Record<string, { id: string; source: string; type: string }> = {}
    handlers: Record<string, Array<() => void>> = {}
    constructor() {
      maps.push(this)
    }
    on(event: string, a: unknown, b?: unknown) {
      const cb = (typeof a === 'function' ? a : b) as () => void
      ;(this.handlers[event] ??= []).push(cb)
      return this
    }
    emit(event: string) {
      ;(this.handlers[event] ?? []).forEach((cb) => cb())
    }
    addControl() {}
    addSource(id: string, src: { data: unknown }) {
      const entry = { data: src.data, setData: (d: unknown) => (entry.data = d) }
      this.sources[id] = entry
    }
    getSource(id: string) {
      return this.sources[id]
    }
    addLayer(layer: { id: string; source: string; type: string }) {
      this.layers[layer.id] = layer
    }
    getLayer(id: string) {
      return this.layers[id]
    }
    setFilter() {}
    setPaintProperty() {}
    fitBounds() {}
    easeTo() {}
    getZoom() {
      return 16
    }
    resize() {}
    remove() {}
    getCanvas() {
      return document.createElement('canvas')
    }
    queryRenderedFeatures() {
      return []
    }
  }
  class MockMarker {
    setLngLat() {
      return this
    }
    addTo() {
      return this
    }
    on() {
      return this
    }
    remove() {}
    getLngLat() {
      return { lng: 0, lat: 0 }
    }
  }
  const lib = { Map: MockMap, Marker: MockMarker, NavigationControl: class {} }
  return { ...lib, default: lib }
})

const BBOX = { min_lng: 106.45, min_lat: 10.95, max_lng: 106.55, max_lat: 11.05 }

const renderMap = (communeBbox: typeof BBOX | null) => {
  const init = rootReducer(undefined, { type: 'init' })
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      ...init,
      auth: {
        ...init.auth,
        user: {
          ...(init.auth.user ?? {}),
          communes: communeBbox ? [{ commune_id: 'COM-001', name: 'Xã A', bbox: communeBbox }] : [],
        },
      } as typeof init.auth,
    },
  })
  render(
    <Provider store={store}>
      <SegmentPolePickerMap poles={[]} selected={[]} onTogglePole={vi.fn()} communeId="COM-001" />
    </Provider>
  )
  const map = maps[maps.length - 1]
  act(() => map.emit('load'))
  return map
}

beforeEach(() => {
  maps.length = 0
})

describe('Bản đồ trong form tuyến: viền khung xã', () => {
  it('vẽ viền theo khung (bbox) của xã, nằm dưới đường tuyến', () => {
    const map = renderMap(BBOX)

    const data = map.sources['pick-commune-outline'].data as GeoJSON.Feature<GeoJSON.Polygon>
    expect(data.geometry.coordinates[0]).toEqual([
      [106.45, 10.95],
      [106.55, 10.95],
      [106.55, 11.05],
      [106.45, 11.05],
      [106.45, 10.95],
    ])
    expect(map.layers['pick-commune-outline']).toMatchObject({ type: 'line', source: 'pick-commune-outline' })
    // Lớp viền thêm trước lớp đường tuyến nên nằm dưới
    const order = Object.keys(map.layers)
    expect(order.indexOf('pick-commune-outline')).toBeLessThan(order.indexOf('pick-line-core'))
  })

  it('không biết khung xã thì không vẽ gì', () => {
    const map = renderMap(null)
    expect(map.sources['pick-commune-outline'].data).toEqual({ type: 'FeatureCollection', features: [] })
  })
})
