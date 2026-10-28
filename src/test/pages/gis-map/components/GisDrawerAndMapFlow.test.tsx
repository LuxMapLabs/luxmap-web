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
      warranty_status: 'unknown',
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
      warranty_status: 'active',
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
          allTopologyEdges: [mockTopologyEdge],
        })
      )

      expect(nextState.isLoadingMap).toBe(false)
      expect(nextState.poles).toHaveLength(2)
      expect(nextState.cabinets).toHaveLength(1)
      expect(nextState.segments).toHaveLength(1)
      expect(nextState.allTopologyEdges).toHaveLength(1)
      expect(nextState.allTopologyEdges[0].properties.to_pole_id).toBe('POL-001')
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
      expect(screen.getByText('Tủ điện điều khiển')).toBeInTheDocument()
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

    it('GisDrawerPanel Zero-Mock: render đúng placeholder khi không có ảnh khảo sát và badge "Bình thường" khi không có lỗi', () => {
      const normalPole: PoleFeature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [106.4899, 10.9705] },
        properties: {
          pole_id: 'POL-002',
          segment_id: 'SEG-001',
          fixture_status: 'normal',
          open_fault_count: 0,
        },
      }

      // Đưa poleDetail không có ảnh và không có lỗi vào Redux Store
      const cleanPoleDetail: PoleMapDetail = {
        ...mockPoleDetail,
        pole_id: 'POL-002',
        current_status: { fixture_status: 'normal' },
        open_faults: [],
        recent_frames: [],
      }

      const testStore = store
      testStore.dispatch(fetchPoleDetailSuccess(cleanPoleDetail))

      render(
        <Provider store={testStore}>
          <GisDrawerPanel
            {...defaultDrawerProps}
            selectedPole={normalPole}
            effectivePoles={[normalPole]}
          />
        </Provider>
      )

      // 1. Kiểm tra placeholder khi không có ảnh (không còn ảnh Unsplash ngẫu nhiên)
      expect(screen.getByText('Chưa có ảnh khảo sát thực địa')).toBeInTheDocument()

      // 2. Kiểm tra badge "Bình thường" trên accordion khi không có lỗi
      expect(screen.getByText('Sự cố đang ghi nhận')).toBeInTheDocument()
      expect(screen.getByText('Bình thường')).toBeInTheDocument()

      // 3. Không còn bất kỳ dấu vết nào của mock data incidentHistory cũ
      expect(screen.queryByText(/Cháy chấn lưu LED 60W/i)).toBeNull()
      expect(screen.queryByText(/Nguyễn Văn Hùng/i)).toBeNull()
      expect(screen.queryByText(/WO-2026-0824/i)).toBeNull()
    })

    it('GisDrawerPanel Zero-Mock: render đúng danh sách open_faults thực tế từ Backend và tự động mở accordion', () => {
      const faultyPole: PoleFeature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [106.4896, 10.9701] },
        properties: {
          pole_id: 'POL-001',
          segment_id: 'SEG-001',
          fixture_status: 'out',
          open_fault_count: 2,
        },
      }

      const faultyPoleDetail: PoleMapDetail = {
        ...mockPoleDetail,
        pole_id: 'POL-001',
        current_status: { fixture_status: 'out' },
        open_faults: [
          {
            fault_id: 'FLT-2026-001',
            fault_type: 'lamp_out',
            severity: 'critical',
            fault_status: 'detected',
            priority_score: 95,
          },
          {
            fault_id: 'FLT-2026-002',
            fault_type: 'node_offline',
            severity: 'medium',
            fault_status: 'confirmed',
            priority_score: 60,
          },
        ],
        recent_frames: [
          {
            frame_id: 'FRM-001',
            sweep_id: 'SWP-001',
            thumbnail_url: 'https://cdn.luxmap.vn/frames/frm-001-thumb.jpg',
          },
        ],
      }

      const testStore = store
      testStore.dispatch(fetchPoleDetailSuccess(faultyPoleDetail))

      render(
        <Provider store={testStore}>
          <GisDrawerPanel
            {...defaultDrawerProps}
            selectedPole={faultyPole}
            effectivePoles={[faultyPole]}
          />
        </Provider>
      )

      // 1. Kiểm tra ảnh hiện trường thực tế render đúng
      const actualImg = screen.getByRole('img', { name: 'POL-001' })
      expect(actualImg).toHaveAttribute('src', 'https://cdn.luxmap.vn/frames/frm-001-thumb.jpg')

      // 2. Kiểm tra header Accordion hiển thị đúng số lượng sự cố
      expect(screen.getByText('2 sự cố')).toBeInTheDocument()

      // 3. Kiểm tra danh sách open_faults render với mã sự cố và tên tiếng Việt
      expect(screen.getByText('FLT-2026-001')).toBeInTheDocument()
      expect(screen.getByText('Đèn tắt hoàn toàn')).toBeInTheDocument()
      expect(screen.getByText('Khẩn cấp')).toBeInTheDocument()
      expect(screen.getByText('Mới phát hiện')).toBeInTheDocument()
      expect(screen.getByText('Ưu tiên: 95đ')).toBeInTheDocument()

      expect(screen.getByText('FLT-2026-002')).toBeInTheDocument()
      expect(screen.getByText('Cảm biến IoT mất tín hiệu')).toBeInTheDocument()
      expect(screen.getByText('Trung bình')).toBeInTheDocument()
      expect(screen.getByText('Đã xác nhận')).toBeInTheDocument()
      expect(screen.getByText('Ưu tiên: 60đ')).toBeInTheDocument()
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

    it('GisDrawerPanel render đúng giao diện Mạch điện khi selectedFeeder có giá trị', () => {
      const mockFeeder = {
        feeder_id: 'FDR-009',
        feeder_name: 'Lộ 1 - Tủ A - Tỉnh Lộ 8',
        external_ref: 'FDR-CAB-TL8-A',
        cabinet_name: 'Tủ A',
        segment_id: 'SEG-001',
        pole_count: 24,
      }

      render(
        <Provider store={store}>
          <GisDrawerPanel
            {...defaultDrawerProps}
            selectedPole={null}
            selectedCabinet={null}
            selectedFeeder={mockFeeder}
            feederStatusMap={{ 'FDR-009': 'active' }}
          />
        </Provider>
      )

      expect(screen.getAllByText('Lộ 1 - Tủ A - Tỉnh Lộ 8').length).toBeGreaterThan(0)
      expect(screen.getByText('Điều khiển nguồn Mạch điện')).toBeInTheDocument()
      expect(screen.getByText('Thông số Kỹ thuật Mạch điện')).toBeInTheDocument()
      expect(screen.getByText('Tủ A')).toBeInTheDocument()
      expect(screen.getAllByText('ĐANG CẤP ĐIỆN').length).toBeGreaterThan(0)
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
            commune_name: null,
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

    it('GisDrawerPanel hiển thị danh sách Mạch điện của tủ, nút toggle switch từng mạch và không còn nút Aptomat đơn lẻ', () => {
      const mockCabinet = {
        cabinet_id: 'CAB-008',
        external_ref: 'CAB-008',
        cabinet_name: 'Tủ A - Tỉnh Lộ 8',
        landmark_note: 'Gần UBND xã Phú Hòa Đông',
        status: 'active',
        feeder_ids: ['FDR-01', 'FDR-02'],
        current_load_kw: 12.5,
        voltage_v: 220,
        power_factor: 0.95,
      }

      const mockConnectedPoles: PoleFeature[] = [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [106.4896, 10.9701] },
          properties: {
            pole_id: 'POL-001',
            external_ref: 'POL-01',
            segment_id: 'SEG-001',
            cabinet_id: 'CAB-008',
            feeder_id: 'FDR-01',
            fixture_status: 'normal',
          },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [106.4897, 10.9702] },
          properties: {
            pole_id: 'POL-002',
            external_ref: 'POL-02',
            segment_id: 'SEG-001',
            cabinet_id: 'CAB-008',
            feeder_id: 'FDR-02',
            fixture_status: 'normal',
          },
        },
      ]

      const handleToggleFeeder = vi.fn()

      render(
        <Provider store={store}>
          <GisDrawerPanel
            {...defaultDrawerProps}
            selectedPole={null}
            selectedCabinet={mockCabinet}
            effectivePoles={mockConnectedPoles}
            onToggleFeeder={handleToggleFeeder}
            feederStatusMap={{ 'FDR-01': 'active', 'FDR-02': 'fault' }}
          />
        </Provider>
      )

      // 1. Subtitle Header không còn undefined
      expect(screen.queryByText(/undefined/i)).toBeNull()
      expect(screen.getByText(/CAB-008 · Gần UBND xã Phú Hòa Đông/)).toBeInTheDocument()

      // 2. Không còn nút ngắt Aptomat đơn lẻ cũ
      expect(screen.queryByText('Ngắt Aptomat (Tắt Đèn Lộ Này)')).toBeNull()
      expect(screen.queryByText('Đóng Aptomat Cấp Điện')).toBeNull()

      // 3. Hiển thị Section danh sách mạch điện
      expect(screen.getByText(/Danh sách Mạch điện của Tủ/)).toBeInTheDocument()
      expect(screen.getAllByText('FDR-01').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('FDR-02').length).toBeGreaterThanOrEqual(1)

      // 4. Trạng thái từng mạch
      expect(screen.getAllByText('Đang cấp điện').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Đã ngắt')).toBeInTheDocument()

      // 5. Nút bấm toggle switch gọi onToggleFeeder khi click
      const switchBtns = screen.getAllByRole('button', { name: /Bấm để/i })
      expect(switchBtns.length).toBeGreaterThanOrEqual(2)
      fireEvent.click(switchBtns[0])
      expect(handleToggleFeeder).toHaveBeenCalledWith('FDR-01', expect.any(String))
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
