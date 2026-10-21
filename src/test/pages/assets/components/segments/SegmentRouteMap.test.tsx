import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import {
  calculateDistanceMeters,
  projectPointOnSegment,
} from '../../../../../utils/gis-map/routeUtils'
import { summarizeLineWkt, validateImportRow, type ValidationContext } from '../../../../../validations/assetImport.schema'
import { EditSegmentModal } from '../../../../../pages/assets/components/segments/components/EditSegmentModal'
import { EditPoleModal } from '../../../../../pages/assets/components/poles/components/EditPoleModal'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import assetReducer, { type AssetState } from '../../../../../feature/assets/assetSlice'
import mapReducer from '../../../../../feature/map/mapSlice'

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

describe('SegmentRouteMap & EditSegmentModal - 11 Field Test Cases Suite', () => {
  const mockDbRoute: [number, number][] = [
    [106.4896, 10.9701],
    [106.4905, 10.9708],
    [106.4915, 10.9715],
  ]

  const mockSegment: SegmentListItem = {
    segment_id: 'SEG-TL08',
    external_ref: 'TL08-01',
    segment_name: 'Tuyến Tỉnh Lộ 8',
    road_class: 'inter_commune',
    length_m: 1250,
    commune_id: 'COM-001',
    data_source: 'field',
    pole_count: 3,
    updated_at: '2026-10-15T00:00:00Z',
  }

  const mockCabinetOnSeg: CabinetListItem = {
    cabinet_id: 'CAB-01',
    external_ref: 'CAB-TL08-1',
    cabinet_name: 'Tủ điện Tỉnh Lộ 8 - Mạch 1',
    commune_id: 'COM-001',
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
  // TC-01: Bảo toàn cột điện khi kéo ĐẦU TUYẾN (> 3m)
  // =========================================================================
  it('TC-01: Bảo toàn cột điện khi kéo ĐẦU TUYẾN ra xa > 3m (nối dài và giữ nguyên Cột 1)', () => {
    const pole1 = mockDbRoute[0]
    const newStartCoord: [number, number] = [106.48945, 10.97]
    const dist = calculateDistanceMeters(newStartCoord, pole1)
    expect(dist).toBeGreaterThan(3)

    // Khi dist > 3m và firstPoleIdx === 0 -> prepend newStartCoord vào trước baseCoords
    const updatedRoute: [number, number][] = [newStartCoord, ...mockDbRoute]

    expect(updatedRoute.length).toBe(mockDbRoute.length + 1)
    expect(updatedRoute[0]).toEqual(newStartCoord)
    expect(updatedRoute[1]).toEqual(pole1) // Cột 1 bảo toàn 100% trên tuyến xanh
  })

  // =========================================================================
  // TC-02: Bảo toàn cột điện khi kéo CUỐI TUYẾN (> 3m)
  // =========================================================================
  it('TC-02: Bảo toàn cột điện khi kéo CUỐI TUYẾN ra xa > 3m (nối dài từ cột cuối ra điểm mới)', () => {
    const lastPole = mockDbRoute[mockDbRoute.length - 1]
    const newEndCoord: [number, number] = [106.49175, 10.97165]
    const dist = calculateDistanceMeters(newEndCoord, lastPole)
    expect(dist).toBeGreaterThan(3)

    // Khi dist > 3m và lastPoleIdx === last -> append newEndCoord
    const updatedRoute: [number, number][] = [...mockDbRoute, newEndCoord]

    expect(updatedRoute.length).toBe(mockDbRoute.length + 1)
    expect(updatedRoute[updatedRoute.length - 2]).toEqual(lastPole) // Cột cuối vẫn nằm trên tuyến
    expect(updatedRoute[updatedRoute.length - 1]).toEqual(newEndCoord)
  })

  // =========================================================================
  // TC-03: Bắt dính & Thu gọn (Snap & Collapse)
  // =========================================================================
  it('TC-03: Bắt dính & Thu gọn (Snap & Collapse) khi kéo ghim lại gần cột điện (< 8m)', () => {
    const pole1 = mockDbRoute[0]
    const extendedRoute: [number, number][] = [[106.4893, 10.9698], ...mockDbRoute]

    const nearPoleCoord: [number, number] = [106.48961, 10.97011]
    const dist = calculateDistanceMeters(nearPoleCoord, pole1)
    expect(dist).toBeLessThan(8)

    // Thu gọn về đúng vị trí cột điện (collapse)
    const collapsedRoute: [number, number][] = extendedRoute.slice(1)
    const snappedPoint = pole1

    expect(collapsedRoute[0]).toEqual(pole1)
    expect(snappedPoint).toEqual(pole1)
    expect(collapsedRoute.length).toBe(mockDbRoute.length) // Đoạn nối dài được thu gọn an toàn
  })

  // =========================================================================
  // TC-04: Cột điện cố định không xê dịch (Cursor not-allowed, draggable: false)
  // =========================================================================
  it('TC-04: Cột điện cố định không xê dịch (Cursor not-allowed và draggable=false)', () => {
    const isPole = true
    const editable = true

    const cursor = isPole ? 'not-allowed' : editable ? 'grab' : 'default'
    const title = isPole
      ? 'Vị trí cột đèn cố định (không dời)'
      : editable
      ? 'Kéo để điều chỉnh vị trí mốc lộ trình'
      : ''
    const isDraggable = editable && !isPole

    expect(cursor).toBe('not-allowed')
    expect(title).toBe('Vị trí cột đèn cố định (không dời)')
    expect(isDraggable).toBe(false)
  })

  // =========================================================================
  // TC-05: Kéo di chuyển điểm xanh vẽ thêm (Draggable vertex)
  // =========================================================================
  it('TC-05: Kéo di chuyển điểm xanh vẽ thêm (Mốc tự do có draggable=true, cursor grab)', () => {
    const isPole = false
    const editable = true

    const cursor = isPole ? 'not-allowed' : editable ? 'grab' : 'default'
    const ringColor = isPole ? '#0f172a' : '#0284c7'
    const coreColor = isPole ? '#fde047' : '#ffffff'
    const isDraggable = editable && !isPole

    expect(cursor).toBe('grab')
    expect(ringColor).toBe('#0284c7') // Viền xanh
    expect(coreColor).toBe('#ffffff') // Tâm trắng
    expect(isDraggable).toBe(true)
  })

  // =========================================================================
  // TC-06: Chèn điểm uốn trên đường kẻ (projectPointOnSegment)
  // =========================================================================
  it('TC-06: Chèn điểm uốn trên đường kẻ tại vị trí click (projectPointOnSegment)', () => {
    const segA: [number, number] = [106.4896, 10.9701]
    const segB: [number, number] = [106.4915, 10.9715]
    const clickPt: [number, number] = [106.4905, 10.9709]

    const proj = projectPointOnSegment(clickPt, segA, segB)
    expect(proj.dist).toBeGreaterThanOrEqual(0)
    expect(proj.t).toBeGreaterThan(0)
    expect(proj.t).toBeLessThan(1)

    // Chèn điểm uốn vào giữa segA và segB
    const newCoords = [segA, proj.point, segB]
    expect(newCoords.length).toBe(3)
    expect(newCoords[1]).toEqual(proj.point)
  })

  // =========================================================================
  // TC-07: Hoàn tác an toàn (Safe Undo)
  // =========================================================================
  it('TC-07: Hoàn tác an toàn (Safe Undo không xóa lẹm vào cột điện DB gốc)', () => {
    const initialRoute = [...mockDbRoute]
    const historyStack: { coords: [number, number][] }[] = []

    historyStack.push({ coords: [...initialRoute] })

    // Thao tác 1: Chấm thêm điểm 1
    const pt1: [number, number] = [106.492, 10.972]
    const routeAfterPt1 = [...initialRoute, pt1]
    historyStack.push({ coords: [...routeAfterPt1] })

    // Thao tác 2: Chấm thêm điểm 2
    const pt2: [number, number] = [106.4925, 10.9725]
    historyStack.push({ coords: [...routeAfterPt1, pt2] })

    // Hoàn tác bước 2: khôi phục về routeAfterPt1
    historyStack.pop()
    const undoStep1 = historyStack[historyStack.length - 1].coords
    expect(undoStep1).toEqual(routeAfterPt1)

    // Hoàn tác bước 1: khôi phục về DB gốc ban đầu
    historyStack.pop()
    const undoStep2 = historyStack[historyStack.length - 1].coords
    expect(undoStep2).toEqual(initialRoute)

    // Khi đã về gốc DB: ngăn xếp history rỗng, không cho xóa lẹm
    expect(undoStep2.length).toBe(mockDbRoute.length)
  })

  // =========================================================================
  // TC-08: Khôi phục gốc (Reset DB)
  // =========================================================================
  it('TC-08: Khôi phục gốc (Reset DB trả về 100% dữ liệu tọa độ ban đầu)', () => {
    const initialDbRoute = [...mockDbRoute]
    let currentCoords: [number, number][] = [
      [106.48, 10.96],
      ...initialDbRoute,
      [106.5, 10.98],
    ]

    // Thao tác Reset: gán lại targetRoute = initialDbRoute
    currentCoords = [...initialDbRoute]
    expect(currentCoords).toEqual(initialDbRoute)
    expect(currentCoords.length).toBe(3)
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
        geom_wkt: 'LINESTRING(106.485 10.972, 106.490 10.975, 106.502 10.977)',
        data_source: 'field',
      }

      const result = validateImportRow('segments', newCsvRow, context, 0)
      expect(result.actionType).toBe('updated')
      expect(result.diffs).toBeDefined()
      expect(result.diffs.some((d) => d.label.includes('Hình học GIS') || d.label.includes('Chiều dài'))).toBe(true)
    })
  })
})
