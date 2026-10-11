import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { store } from '../../../../redux/store'
import { GisMapLegend } from '../../../../pages/gis-map/components/GisMapLegend'
import { GisDrawerPanel, type GisDrawerPanelProps } from '../../../../pages/gis-map/components/GisDrawerPanel'
import type { PoleFeature } from '../../../../pages/gis-map/GisMapPage'
import mapReducer, {
  fetchMapLayersRequest,
  fetchMapLayersSuccess,
  fetchMapLayersFailure,
  fetchCabinetTopologyRequest,
  fetchCabinetTopologySuccess,
  fetchCabinetTopologyFailure,
  fetchPoleDetailRequest,
  fetchPoleDetailSuccess,
  fetchPoleDetailFailure,
  clearCabinetTopology,
} from '../../../../feature/map/mapSlice'
import type {
  CabinetPropertiesFeature,
  CabinetTopologyEdgePropertiesFeature,
} from '../../../../types/map/cabinets'
import type {
  PolePropertiesFeature,
  PoleMapDetail,
} from '../../../../types/map/poles'
import type { SegmentPropertiesFeature } from '../../../../types/map/segments'
import {
  validateImportRow,
  type ValidationContext,
} from '../../../../validations/assetImport.schema'

describe('GIS Map Flow, Topology & Drawer Panel Test Suite (Task 1)', () => {
  // Mock Data chuẩn DTO 100% từ src/types/
  const mockPoleFeature: PolePropertiesFeature = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [106.4896, 10.9701] },
    properties: {
      pole_id: 'POL-001',
      segment_id: 'SEG-001',
      commune_id: 'commune_tl8',
      fixture_status: 'unknown',
      open_fault_count: 0,
      has_iot_node: false,
      near_sensitive_poi: false,
    },
  }

  const mockNormalPoleFeature: PolePropertiesFeature = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [106.4899, 10.9705] },
    properties: {
      pole_id: 'POL-002',
      segment_id: 'SEG-001',
      commune_id: 'commune_tl8',
      fixture_status: 'normal',
      open_fault_count: 0,
      has_iot_node: false,
      near_sensitive_poi: true,
    },
  }

  const mockCabinetFeature: CabinetPropertiesFeature = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [106.489, 10.97] },
    properties: {
      cabinet_id: 'CAB-001',
      cabinet_name: 'Tủ điện Tỉnh Lộ 8',
      commune_id: 'commune_tl8',
      feeder_ids: ['F-01', 'F-02'],
    },
  }

  const mockSegmentFeature: SegmentPropertiesFeature = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [106.48, 10.97],
        [106.49, 10.98],
      ],
    },
    properties: {
      segment_id: 'SEG-001',
      segment_name: 'Tuyến Tỉnh Lộ 8',
      road_class: 'inter_commune',
      length_m: 1500,
      pole_count: 30,
      controller_node_ids: [],
      has_active_segment_fault: false,
    },
  }

  const mockTopologyEdge: CabinetTopologyEdgePropertiesFeature = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [106.489, 10.97],
        [106.4896, 10.9701],
      ],
    },
    properties: {
      feeder_id: 'F-01',
      segment_id: 'SEG-001',
      branch: 1,
      order: 1,
      from_id: 'CAB-001',
      to_pole_id: 'POL-001',
      feeder_source: 'verified',
    },
  }

  const mockPoleDetail: PoleMapDetail = {
    pole_id: 'POL-001',
    segment_id: 'SEG-001',
    segment_name: 'Tuyến Tỉnh Lộ 8',
    commune_id: 'commune_tl8',
    location: {
      lat: 10.9701,
      lng: 106.4896,
    },
    current_status: {
      fixture_status: 'unknown',
    },
    luminance_baselines: [],
    luminance_history: [],
    runtime_history: [],
    open_faults: [],
    recent_frames: [],
    note: 'Cột mới chưa kiểm tra',
  }

  const defaultDrawerProps: GisDrawerPanelProps = {
    selectedPole: null,
    setSelectedPole: vi.fn(),
    setSelectedSegmentId: vi.fn(),
    activeSegmentDetail: {
      id: 'SEG-001',
      name: 'Tuyến Tỉnh Lộ 8',
      cabinet: 'CAB-001',
      road: 'Tỉnh Lộ 8',
      poleCount: 30,
      lengthM: 1500,
    },
    handleSelectPole: vi.fn(),
    selectedCabinet: null,
    setSelectedCabinet: vi.fn(),
    onToggleCabinet: vi.fn(),
    cabinets: [],
    effectivePoles: [],
  }

  describe('1. Happy Path - Map Redux Flow & UI Components', () => {
    it('Redux fetchMapLayersSuccess cập nhật toàn bộ layer bản đồ từ Backend', () => {
      const initialState = mapReducer(undefined, { type: '@@INIT' })
      const nextState = mapReducer(
        initialState,
        fetchMapLayersSuccess({
          poles: [mockPoleFeature, mockNormalPoleFeature],
          cabinets: [mockCabinetFeature],
          segments: [mockSegmentFeature],
        })
      )

      expect(nextState.isLoadingMap).toBe(false)
      expect(nextState.poles).toHaveLength(2)
      expect(nextState.cabinets).toHaveLength(1)
      expect(nextState.segments).toHaveLength(1)
      expect(nextState.mapError).toBeNull()
    })

    it('Redux fetchCabinetTopologySuccess lưu trữ sơ đồ topology các cạnh Trụ -> Cột', () => {
      const requestingState = mapReducer(
        undefined,
        fetchCabinetTopologyRequest('CAB-001')
      )
      expect(requestingState.isLoadingTopology).toBe(true)
      expect(requestingState.selectedCabinetId).toBe('CAB-001')

      const successState = mapReducer(
        requestingState,
        fetchCabinetTopologySuccess({
          cabinetId: 'CAB-001',
          edges: [mockTopologyEdge],
        })
      )

      expect(successState.isLoadingTopology).toBe(false)
      expect(successState.cabinetTopologyEdges).toHaveLength(1)
      expect(successState.cabinetTopologyEdges[0].properties.to_pole_id).toBe('POL-001')
      expect(successState.cabinetTopologyEdges[0].properties.feeder_source).toBe('verified')
    })

    it('Redux fetchPoleDetailSuccess cập nhật thông tin chi tiết cột', () => {
      const requestingState = mapReducer(undefined, fetchPoleDetailRequest('POL-001'))
      expect(requestingState.isLoadingPoleDetail).toBe(true)

      const successState = mapReducer(
        requestingState,
        fetchPoleDetailSuccess(mockPoleDetail)
      )

      expect(successState.isLoadingPoleDetail).toBe(false)
      expect(successState.poleDetail?.pole_id).toBe('POL-001')
      expect(successState.poleDetail?.current_status.fixture_status).toBe('unknown')
      expect(successState.poleDetailError).toBeNull()
    })

    it('GisMapLegend render đầy đủ các chỉ mục chú giải và nhãn "Chưa quét"', () => {
      render(<GisMapLegend />)

      // Chú giải bản đồ
      expect(screen.getByText('Chú giải bản đồ')).toBeInTheDocument()
      expect(screen.getByText('Đạt chuẩn')).toBeInTheDocument()
      expect(screen.getByText('Đèn mờ')).toBeInTheDocument()
      expect(screen.getByText('Hỏng / Tắt')).toBeInTheDocument()
      expect(screen.getByText('Chưa quét')).toBeInTheDocument()
      expect(screen.getByText('Tủ điện điều khiển (Cấp điện / Ngắt)')).toBeInTheDocument()
      expect(screen.getByText('Sơ đồ cấp nguồn (Trụ → Cột)')).toBeInTheDocument()
      expect(screen.getByText('Tuyến đường giao thông (Trục tim đường)')).toBeInTheDocument()
    })

    it('GisDrawerPanel hiển thị nhãn "Chưa quét" cho cột chưa qua AI camera quét đêm', () => {
      const poleItem: PoleFeature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [106.4896, 10.9701] },
        properties: {
          pole_id: 'POL-001',
          segment_id: 'SEG-001',
          fixture_status: 'unknown',
        },
      }

      render(
        <Provider store={store}>
          <GisDrawerPanel
            {...defaultDrawerProps}
            selectedPole={poleItem}
            effectivePoles={[poleItem]}
          />
        </Provider>
      )

      expect(screen.getAllByText('Chưa quét').length).toBeGreaterThan(0)
    })

    it('GisDrawerPanel chế độ xem Tuyến đường chỉ hiển thị thông số hạ tầng và KHÔNG CÒN thông số IoT rác', () => {
      render(
        <Provider store={store}>
          <GisDrawerPanel
            {...defaultDrawerProps}
            selectedPole={null}
            selectedCabinet={null}
          />
        </Provider>
      )

      // Thông tin tuyến đường hạ tầng
      expect(screen.getAllByText('Tuyến Tỉnh Lộ 8').length).toBeGreaterThan(0)
      expect(screen.getByText('Thông tin tuyến')).toBeInTheDocument()
      expect(screen.getByText('Chiều dài tuyến:')).toBeInTheDocument()

      // BẢO ĐẢM KỶ LUẬT TASK 1: Không còn các card thông số IoT giả lập
      expect(screen.queryByText('Thông số Tủ NODE-CTRL / IoT')).toBeNull()
      expect(screen.queryByText('Điện áp 221.4V')).toBeNull()
      expect(screen.queryByText('Dòng điện 18.6A')).toBeNull()
    })

    it('validateImportRow chấp nhận dòng dữ liệu CSV có đủ 100% các cột bắt buộc', () => {
      const validRow = {
        external_ref: 'POL-FULL-01',
        segment_external_ref: 'SEG-TL08',
        commune_id: 'commune_tl8',
        geom_wkt: 'POINT(106.4896 10.9701)',
        data_source: 'field',
      }

      const context: ValidationContext = {
        poles: [],
        fixtures: [],
        cabinets: [],
        segments: [
          {
            segment_id: 'SEG-TL08',
            external_ref: 'SEG-TL08',
            segment_name: 'Tuyến Tỉnh Lộ 8',
            road_class: 'inter_commune',
            length_m: 1000,
            commune_id: 'commune_tl8',
            data_source: 'field',
            pole_count: 10,
            updated_at: null,
          },
        ],
      }

      const result = validateImportRow('poles', validRow, context, 0)
      expect(result.actionType).toBe('new')
      expect(result.externalRef).toBe('POL-FULL-01')
      expect(result.errorMsg).toBeUndefined()
    })
  })

  describe('2. Edge Cases - Dữ liệu rỗng, Thu gọn chú giải & Kiểm tra tính toàn vẹn 100%', () => {
    it('GisMapLegend có thể thu gọn và mở rộng lại mượt mà', () => {
      render(<GisMapLegend />)

      // Nút thu nhỏ chú thích
      const collapseBtn = screen.getByTitle('Thu nhỏ chú thích')
      fireEvent.click(collapseBtn)

      // Bảng thu gọn chỉ còn nút icon
      expect(screen.queryByText('Đạt chuẩn')).toBeNull()
      const expandBtn = screen.getByTitle('Mở chú giải bản đồ')
      expect(expandBtn).toBeInTheDocument()

      // Mở lại
      fireEvent.click(expandBtn)
      expect(screen.getByText('Đạt chuẩn')).toBeInTheDocument()
    })

    it('validateImportRow chặn ngay và trả về invalid khi thiếu bất kỳ ô dữ liệu nào trong cột bắt buộc', () => {
      const rowMissingWkt = {
        external_ref: 'POL-INCOMPLETE',
        segment_external_ref: 'SEG-TL08',
        commune_id: 'commune_tl8',
        geom_wkt: '', // Rỗng
        data_source: 'field',
      }

      const context: ValidationContext = {
        poles: [],
        fixtures: [],
        cabinets: [],
        segments: [],
      }

      const result = validateImportRow('poles', rowMissingWkt, context, 2)
      expect(result.actionType).toBe('invalid')
      expect(result.errorMsg).toBe(
        "Dòng 3: Cột 'geom_wkt' không có dữ liệu (bắt buộc điền đầy đủ)."
      )
    })

    it('validateImportRow chặn khi tệp CSV tủ điện có geom_wkt rỗng', () => {
      const rowEmptyWktCabinet = {
        external_ref: 'CAB-ERR',
        cabinet_name: 'Tủ Thiếu Tọa Độ',
        commune_id: 'commune_tl8',
        geom_wkt: '   ',
        data_source: 'field',
      }

      const context: ValidationContext = {
        poles: [],
        fixtures: [],
        cabinets: [],
        segments: [],
      }

      const result = validateImportRow('cabinets', rowEmptyWktCabinet, context, 0)
      expect(result.actionType).toBe('invalid')
      expect(result.errorMsg).toBe(
        "Dòng 1: Cột 'geom_wkt' không có dữ liệu (bắt buộc điền đầy đủ)."
      )
    })

    it('Redux clearCabinetTopology dọn dẹp sạch state topology khi bỏ chọn tủ', () => {
      const stateWithEdges = {
        ...mapReducer(undefined, { type: '@@INIT' }),
        selectedCabinetId: 'CAB-001',
        cabinetTopologyEdges: [mockTopologyEdge],
      }

      const clearedState = mapReducer(stateWithEdges, clearCabinetTopology())
      expect(clearedState.selectedCabinetId).toBeNull()
      expect(clearedState.cabinetTopologyEdges).toEqual([])
    })
  })

  describe('3. Error Cases - Giả lập Backend trả về mã lỗi 400, 422, 500', () => {
    it('bắt lỗi 400 (Bad Request) khi truy vấn layer bản đồ thiếu bbox hoặc sai query param', () => {
      const loadingState = mapReducer(
        undefined,
        fetchMapLayersRequest({ bbox: undefined })
      )
      expect(loadingState.isLoadingMap).toBe(true)

      const error400Msg =
        'Yêu cầu không hợp lệ (HTTP 400): Tham số bbox là bắt buộc và phải có định dạng minLng,minLat,maxLng,maxLat'
      const failedState = mapReducer(loadingState, fetchMapLayersFailure(error400Msg))

      expect(failedState.isLoadingMap).toBe(false)
      expect(failedState.mapError).toBe(error400Msg)
      expect(failedState.poles).toEqual([])
    })

    it('bắt lỗi 422 (Unprocessable Entity) khi tải topology với cabinetId không tồn tại', () => {
      const loadingState = mapReducer(
        undefined,
        fetchCabinetTopologyRequest('CAB-NON-EXISTENT')
      )
      expect(loadingState.isLoadingTopology).toBe(true)

      const error422Msg =
        'Dữ liệu không xử lý được (HTTP 422): Không tìm thấy tủ điện hoặc tủ chưa có liên kết topology'
      const failedState = mapReducer(loadingState, fetchCabinetTopologyFailure(error422Msg))

      expect(failedState.isLoadingTopology).toBe(false)
      expect(failedState.topologyError).toBe(error422Msg)
      expect(failedState.cabinetTopologyEdges).toEqual([])
    })

    it('bắt lỗi 500 (Internal Server Error) khi máy chủ gặp sự cố truy vấn chi tiết cột', () => {
      const loadingState = mapReducer(undefined, fetchPoleDetailRequest('POL-001'))
      expect(loadingState.isLoadingPoleDetail).toBe(true)

      const error500Msg = 'Lỗi máy chủ nội bộ (HTTP 500): Không thể kết nối cơ sở dữ liệu GIS'
      const failedState = mapReducer(loadingState, fetchPoleDetailFailure(error500Msg))

      expect(failedState.isLoadingPoleDetail).toBe(false)
      expect(failedState.poleDetailError).toBe(error500Msg)
      expect(failedState.poleDetail).toBeNull()
    })
  })
})
