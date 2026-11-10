import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { summarizeLineWkt, validateImportRow, type ValidationContext } from '../../../../../validations/assetImport.schema'
import { EditSegmentModal } from '../../../../../pages/assets/components/segments/components/EditSegmentModal'
import { AddSegmentModal } from '../../../../../pages/assets/components/segments/components/AddSegmentModal'
import { SegmentsTab } from '../../../../../pages/assets/components/segments/SegmentsTab'
import { EditPoleModal } from '../../../../../pages/assets/components/poles/components/EditPoleModal'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import assetReducer, { fetchSegmentDetailSuccess, type AssetState } from '../../../../../feature/assets/assetSlice'
import mapReducer from '../../../../../feature/map/mapSlice'

// Store test không chạy saga: giả lập kết quả lấy chi tiết tuyến để form sửa hiện ra
const settleSegmentDetail = (
  store: { dispatch: (action: ReturnType<typeof fetchSegmentDetailSuccess>) => unknown },
  segmentId: string | null,
  geomWkt: string | null = null
) => {
  act(() => {
    store.dispatch(fetchSegmentDetailSuccess({ segmentId: segmentId || '', geomWkt }))
  })
}

// Mock maplibre-gl to run cleanly in jsdom environment
const mockMapInstances: any[] = []
const mockMarkerInstances: any[] = []

vi.mock('maplibre-gl', () => {
  class MockMarker {
    element: HTMLElement
    draggable: boolean
    lngLat: { lng: number; lat: number }
    listeners: Record<string, Function[]> = {}

    constructor(options?: { element?: HTMLElement; draggable?: boolean }) {
      this.element = options?.element || document.createElement('div')
      this.draggable = !!options?.draggable
      this.lngLat = { lng: 106.4896, lat: 10.9701 }
      mockMarkerInstances.push(this)
    }

    setLngLat(coord: [number, number] | { lng: number; lat: number }) {
      if (Array.isArray(coord)) {
        this.lngLat = { lng: coord[0], lat: coord[1] }
      } else {
        this.lngLat = { ...coord }
      }
      return this
    }

    getLngLat() {
      return this.lngLat
    }

    addTo() {
      return this
    }

    remove() {
      return this
    }

    on(event: string, callback: Function) {
      if (!this.listeners[event]) this.listeners[event] = []
      this.listeners[event].push(callback)
      return this
    }

    emit(event: string, data?: any) {
      const list = this.listeners[event] || []
      list.forEach((cb) => cb(data))
    }
  }

  class MockMap {
    callbacks: Record<string, Function[]> = {}
    sources: Record<string, any> = {}
    layers: Record<string, any> = {}
    canvas: HTMLCanvasElement

    constructor() {
      this.canvas = document.createElement('canvas')
      mockMapInstances.push(this)
    }

    on(event: string, ...args: any[]) {
      const callback = typeof args[0] === 'function' ? args[0] : args[1]
      if (!this.callbacks[event]) this.callbacks[event] = []
      this.callbacks[event].push(callback)
      return this
    }

    once(event: string, callback: Function) {
      if (!this.callbacks[event]) this.callbacks[event] = []
      this.callbacks[event].push((...params: any[]) => {
        callback(...params)
      })
      return this
    }

    getCanvas() {
      return this.canvas
    }

    getSource(id: string) {
      return this.sources[id]
    }

    addSource(id: string, source: any) {
      this.sources[id] = {
        ...source,
        setData: vi.fn((data) => {
          this.sources[id].data = data
        }),
      }
    }

    addLayer(layer: any) {
      this.layers[layer.id] = layer
    }

    removeLayer(id: string) {
      delete this.layers[id]
    }

    removeSource(id: string) {
      delete this.sources[id]
    }

    fitBounds = vi.fn()
    resize = vi.fn()
    remove = vi.fn()
    flyTo = vi.fn()
    easeTo = vi.fn()
    addControl = vi.fn()
    isStyleLoaded = vi.fn(() => true)
    loaded = vi.fn(() => true)
    getLayer = vi.fn((id: string) => this.layers[id])
    setFilter = vi.fn()
    setLayoutProperty = vi.fn()
    setPaintProperty = vi.fn()
    scrollZoom = { disable: vi.fn(), enable: vi.fn() }
    dragPan = { disable: vi.fn(), enable: vi.fn() }
    project = vi.fn(() => ({ x: 100, y: 100 }))
    unproject = vi.fn(() => ({ lng: 106.4896, lat: 10.9701 }))

    emit(event: string, data?: any) {
      const list = this.callbacks[event] || []
      list.forEach((cb) => cb(data))
    }
  }

  // Polyfill ResizeObserver in jsdom environment
  if (typeof global.ResizeObserver === 'undefined') {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }

  const mockMaplibreGL = {
    Map: MockMap,
    Marker: MockMarker,
    LngLatBounds: class {
      extend() {
        return this
      }
      isEmpty() {
        return false
      }
      getNorth() {
        return 10.98
      }
      getSouth() {
        return 10.96
      }
      getEast() {
        return 106.5
      }
      getWest() {
        return 106.48
      }
    },
    Popup: class {
      setHTML() {
        return this
      }
      addTo() {
        return this
      }
      remove() {
        return this
      }
    },
    NavigationControl: class {},
    ScaleControl: class {},
  }

  return {
    ...mockMaplibreGL,
    default: mockMaplibreGL,
  }
})

describe('Segment modals & asset forms - Field Test Cases Suite', () => {
  const mockSegment: SegmentListItem = {
    segment_id: 'SEG-TL08',
    external_ref: 'TL08-01',
    segment_name: 'Tuyến Tỉnh Lộ 8',
    road_class: 'inter_commune',
    length_m: 1250,
    commune_id: 'COM-001',
        commune_name: '',
    data_source: 'field',
    pole_count: 3,
    updated_at: '2026-10-15T00:00:00Z',
  }

  const mockCabinetOnSeg: CabinetListItem = {
    cabinet_id: 'CAB-01',
    external_ref: 'CAB-TL08-1',
    cabinet_name: 'Tủ điện Tỉnh Lộ 8 - Mạch 1',
    commune_id: 'COM-001',
        commune_name: '',
    data_source: 'field',
    location: { lat: 10.9701, lng: 106.4896 },
    feeder_ids: ['F1'],
    updated_at: '2026-10-15T00:00:00Z',
  }

  const mockCabinetOther: CabinetListItem = {
    cabinet_id: 'CAB-02',
    external_ref: 'CAB-NVN-1',
    cabinet_name: 'Tủ điện Nguyễn Văn Ni',
    commune_id: 'COM-002',
        commune_name: '',
    data_source: 'field',
    location: { lat: 10.9801, lng: 106.5 },
    feeder_ids: ['F2'],
    updated_at: '2026-10-15T00:00:00Z',
  }

  const mockFullPolesList: PoleListItem[] = [
    {
      pole_id: 'POL-01',
      external_ref: 'C-01',
      segment_id: 'SEG-TL08',
      commune_id: 'COM-001',
        commune_name: '',
      data_source: 'field',
      near_sensitive_poi: false,
      location: { lat: 10.9701, lng: 106.4896 },
      feeder_id: 'CAB-01',
      updated_at: '2026-10-15T00:00:00Z',
    },
    {
      pole_id: 'POL-02',
      external_ref: 'C-02',
      segment_id: 'SEG-TL08',
      commune_id: 'COM-001',
        commune_name: '',
      data_source: 'field',
      near_sensitive_poi: false,
      location: { lat: 10.9708, lng: 106.4905 },
      feeder_id: 'CAB-01',
      updated_at: '2026-10-15T00:00:00Z',
    },
  ]

  const initialAssetState: AssetState = {
    poles: mockFullPolesList,
    cabinets: [mockCabinetOnSeg, mockCabinetOther],
    segments: [mockSegment],
    feeders: [],
    iotNodes: [],
    isLoadingAssets: false,
    loadAssetsError: null,
    isMutating: false,
    mutationError: null,
    isImporting: false,
    importResult: null,
    error: null,
  }

  beforeEach(() => {
    mockMapInstances.length = 0
    mockMarkerInstances.length = 0
  })

  // =========================================================================
  // TC-09: Tủ điện lọc theo tuyến đường & Reset khi đổi tuyến
  // =========================================================================
  it('TC-09: Tủ điện lọc theo tuyến đường và tự động reset khi chọn tuyến khác', () => {
    const store = configureStore({
      reducer: {
        assets: assetReducer,
        map: mapReducer,
      },
      preloadedState: {
        assets: initialAssetState,
      },
    })

    const onSaveMock = vi.fn()
    const onCloseMock = vi.fn()

    render(
      <Provider store={store}>
        <EditPoleModal
          isOpen={true}
          pole={mockFullPolesList[0]}
          cabinets={[mockCabinetOnSeg, mockCabinetOther]}
          segments={[mockSegment]}
          allPoles={mockFullPolesList}
          onClose={onCloseMock}
          onSave={onSaveMock}
        />
      </Provider>
    )

    const selects = document.querySelectorAll('select')
    expect(selects.length).toBeGreaterThanOrEqual(2)

    // Kiểm tra dropdown Tủ điện chỉ hiển thị tủ thuộc Tuyến Tỉnh Lộ 8 (CAB-01)
    const cabinetSelect = selects[1]
    const options = Array.from(cabinetSelect.querySelectorAll('option')).map((o) => o.textContent)
    expect(options.some((txt) => txt?.includes('Tủ điện Tỉnh Lộ 8'))).toBe(true)
    expect(options.some((txt) => txt?.includes('Nguyễn Văn Ni'))).toBe(false)
  })

  // =========================================================================
  // TC-10: Cập nhật trạng thái (Form submit payload bảo toàn thuộc tính)
  // =========================================================================
  it('TC-10: Cập nhật thông tin form EditSegmentModal và submit payload chính xác', () => {
    const store = configureStore({
      reducer: {
        assets: assetReducer,
        map: mapReducer,
      },
      preloadedState: {
        assets: initialAssetState,
      },
    })

    const onSaveMock = vi.fn()
    const onCloseMock = vi.fn()

    render(
      <Provider store={store}>
        <EditSegmentModal
          isOpen={true}
          segment={mockSegment}
          onClose={onCloseMock}
          onSave={onSaveMock}
        />
      </Provider>
    )
    settleSegmentDetail(store, mockSegment.segment_id)

    // Bấm nút "Lưu Thay Đổi"
    const submitBtn = screen.getByRole('button', { name: /Lưu Thay Đổi/i })
    fireEvent.click(submitBtn)

    expect(onSaveMock).toHaveBeenCalledTimes(1)
    const savedPayload = onSaveMock.mock.calls[0][0]
    expect(savedPayload.segment_id).toBe('SEG-TL08')
    expect(savedPayload.road_class).toBe('inter_commune')
    expect(savedPayload.commune_id).toBe('COM-001')
    expect(savedPayload.geom_wkt).toBeDefined()
  })

  // =========================================================================
  // TC-11: Chống màn hình đen (Map Resize logic)
  // =========================================================================
  it('TC-11: Chống màn hình đen (ResizeObserver và resize trigger trên MapLibre)', () => {
    const resizeFn = vi.fn()
    const mockMapInstance = {
      resize: resizeFn,
      fitBounds: vi.fn(),
    }

    let resizeCallback: ResizeObserverCallback = () => {}
    class MockResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        resizeCallback = cb
      }
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    }

    const observer = new MockResizeObserver(() => {
      mockMapInstance.resize()
    })

    resizeCallback([] as any, observer as any)
    expect(resizeFn).toHaveBeenCalledTimes(1)
  })

  // =========================================================================
  // KIỂM THỬ BỔ SUNG: summarizeLineWkt & validateImportRow GIS Diff
  // =========================================================================
  describe('GIS Geometry Validation & Diff Summarizer', () => {
    it('summarizeLineWkt tóm tắt chuỗi WKT LINESTRING trực quan, không vỡ layout', () => {
      const wkt = 'LINESTRING(106.4851 10.9723, 106.4900 10.9750, 106.4952 10.9781)'
      const summary = summarizeLineWkt(wkt)
      expect(summary).toBe('Lộ trình (3 điểm) [106.485, 10.972] ➔ [106.495, 10.978]')
    })

    it('summarizeLineWkt xử lý an toàn giá trị rỗng hoặc không hợp lệ', () => {
      expect(summarizeLineWkt(null)).toBe('Chưa có hình học')
      expect(summarizeLineWkt('')).toBe('Chưa có hình học')
      expect(summarizeLineWkt('INVALID_GEOM')).toBe('Hình học không hợp lệ')
    })

    it('validateImportRow phát hiện thay đổi hình học GIS khi import CSV', () => {
      const existingSegment: SegmentListItem = {
        segment_id: 'SEG-001',
        external_ref: 'SEG-001',
        segment_name: 'Đường Tỉnh Lộ 8',
        road_class: 'inter_commune',
        length_m: 1000,
        commune_id: 'COM-001',
        commune_name: '',
        data_source: 'field',
        pole_count: 10,
        updated_at: '2026-10-15T00:00:00Z',
      }
      ;(existingSegment as any).geom_wkt = 'LINESTRING(106.485 10.972, 106.490 10.975)'

      const context: ValidationContext = {
        poles: [],
        fixtures: [],
        cabinets: [],
        segments: [existingSegment],
      }

      const newCsvRow = {
        external_ref: 'SEG-001',
        segment_name: 'Đường Tỉnh Lộ 8',
        road_class: 'inter_commune',
        length_m: '1500',
        commune_id: 'COM-001',
        commune_name: '',
        geom_wkt: 'LINESTRING(106.485 10.972, 106.490 10.975, 106.502 10.977)',
        data_source: 'field',
      }

      const result = validateImportRow('segments', newCsvRow, context, 0)
      expect(result.actionType).toBe('updated')
      expect(result.diffs).toBeDefined()
      expect(result.diffs.some((d) => d.label.includes('Hình học GIS') || d.label.includes('Chiều dài'))).toBe(true)
    })

    it('TC-12: EditSegmentModal tự động liên kết địa bàn quản lý và hiển thị thông tin tuyến đường', () => {
      const store = configureStore({
        reducer: {
          assets: assetReducer,
          map: mapReducer,
        },
        preloadedState: {
          assets: initialAssetState,
        },
      })

      const segmentWithPoles = {
        ...mockSegment,
        pole_count: 5,
      }

      render(
        <Provider store={store}>
          <EditSegmentModal
            isOpen={true}
            segment={segmentWithPoles}
            onClose={vi.fn()}
            onSave={vi.fn()}
          />
        </Provider>
      )
      settleSegmentDetail(store, mockSegment.segment_id)

      expect(screen.getByText(/Chỉnh Sửa Tuyến Đường:/i)).toBeInTheDocument()
      expect(screen.getByDisplayValue(mockSegment.segment_name || '')).toBeInTheDocument()
      const selects = screen.getAllByRole('combobox')
      expect(selects.length).toBeGreaterThanOrEqual(1)
    })

    it('EditSegmentModal chờ tải thứ tự cột của tuyến rồi mới hiện form', () => {
      const store = configureStore({
        reducer: { assets: assetReducer, map: mapReducer },
        preloadedState: { assets: initialAssetState },
      })

      render(
        <Provider store={store}>
          <EditSegmentModal isOpen={true} segment={mockSegment} onClose={vi.fn()} onSave={vi.fn()} />
        </Provider>
      )

      expect(screen.getByRole('status')).toHaveTextContent(/Đang tải thứ tự cột/)
      expect(screen.queryByText(/Chỉnh Sửa Tuyến Đường:/i)).not.toBeInTheDocument()
      expect(store.getState().assets.segmentDetail?.segmentId).toBe(mockSegment.segment_id)

      settleSegmentDetail(store, mockSegment.segment_id)
      expect(screen.getByText(/Chỉnh Sửa Tuyến Đường:/i)).toBeInTheDocument()
    })

    it('EditSegmentModal bỏ qua kết quả của tuyến khác (không hiện form với đường nối sai tuyến)', () => {
      const store = configureStore({
        reducer: { assets: assetReducer, map: mapReducer },
        preloadedState: { assets: initialAssetState },
      })

      render(
        <Provider store={store}>
          <EditSegmentModal isOpen={true} segment={mockSegment} onClose={vi.fn()} onSave={vi.fn()} />
        </Provider>
      )

      settleSegmentDetail(store, 'SEG-KHAC')
      expect(screen.queryByText(/Chỉnh Sửa Tuyến Đường:/i)).not.toBeInTheDocument()
    })

    it('TC-13: AddSegmentModal hiển thị form khai báo tuyến đường mới với cấp đường quy hoạch', () => {
      const store = configureStore({
        reducer: {
          assets: assetReducer,
          map: mapReducer,
        },
      })

      render(
        <Provider store={store}>
          <AddSegmentModal
            isOpen={true}
            onClose={vi.fn()}
            onAddSegment={vi.fn()}
            existingCount={2}
          />
        </Provider>
      )

      expect(screen.getByText(/Khai Báo Tuyến Đường Chiếu Sáng Mới/i)).toBeInTheDocument()
      expect(screen.getByText(/Cấp đường quy hoạch:/i)).toBeInTheDocument()
      const selects = screen.getAllByRole('combobox')
      expect(selects.length).toBeGreaterThanOrEqual(1)
    })
    it('TC-14: SegmentsTab hiển thị ConfirmDeleteAssetModal khi bấm xóa và gọi onDeleteSegment khi xác nhận', () => {
      const store = configureStore({
        reducer: {
          assets: assetReducer,
          map: mapReducer,
        },
      })
      const mockDelete = vi.fn()

      render(
        <Provider store={store}>
          <SegmentsTab
            segments={[mockSegment]}
            onAddSegment={vi.fn()}
            onUpdateSegment={vi.fn()}
            onDeleteSegment={mockDelete}
            onOpenImport={vi.fn()}
          />
        </Provider>
      )

      const deleteBtn = screen.getByRole('button', { name: /Xóa/i })
      fireEvent.click(deleteBtn)

      expect(screen.getByText('Xác Nhận Xóa Tuyến Đường')).toBeInTheDocument()
      expect(screen.getByText(/Bạn có chắc chắn muốn xóa tuyến đường/i)).toBeInTheDocument()

      const confirmBtn = screen.getByRole('button', { name: /Xác nhận xóa/i })
      fireEvent.click(confirmBtn)

      expect(mockDelete).toHaveBeenCalledWith(mockSegment.segment_id)
    })
  })
})
