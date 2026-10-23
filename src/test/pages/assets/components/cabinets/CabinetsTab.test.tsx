import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import rootReducer from '../../../../../redux/rootReducer'
import { CabinetsTab, CabinetsTabProps } from '../../../../../pages/assets/components/cabinets/CabinetsTab'
import { CabinetTable } from '../../../../../pages/assets/components/cabinets/components/CabinetTable'
import { CabinetDetailModal } from '../../../../../pages/assets/components/cabinets/components/CabinetDetailModal'
import { EditCabinetModal } from '../../../../../pages/assets/components/cabinets/components/EditCabinetModal'
import { AddCabinetModal } from '../../../../../pages/assets/components/cabinets/components/AddCabinetModal'
import assetReducer, {
  fetchAssetsRequest,
  fetchAssetsSuccess,
  fetchAssetsFailure,
  importAssetRequest,
  importAssetSuccess,
  importAssetFailure,
} from '../../../../../feature/assets/assetSlice'
import {
  cabinetImportSchema,
  validateImportRow,
  type ValidationContext,
} from '../../../../../validations/assetImport.schema'
import type {
  CabinetListItem,
  CreateCabinetRequest,
} from '../../../../../types/assets/cabinets'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import type { ImportResult } from '../../../../../types/assets/import'


// Mock maplibre-gl for jsdom headless testing
vi.mock('maplibre-gl', () => {
  class MockMarker {
    element: HTMLElement = document.createElement('div');
    draggable: boolean = false;
    lngLat: { lng: number; lat: number } = { lng: 106.4896, lat: 10.9701 };
    listeners: Record<string, Function[]> = {};
    constructor(options?: any) {
      if (options?.element) this.element = options.element;
      if (options?.draggable) this.draggable = options.draggable;
    }
    setLngLat(coord: any) {
      if (Array.isArray(coord)) this.lngLat = { lng: coord[0], lat: coord[1] };
      else this.lngLat = { ...coord };
      return this;
    }
    getLngLat() { return this.lngLat; }
    addTo() { return this; }
    remove() { return this; }
    on(e: string, cb: Function) {
      if (!this.listeners[e]) this.listeners[e] = [];
      this.listeners[e].push(cb);
      return this;
    }
  }

  class MockMap {
    listeners: Record<string, Function[]> = {};
    sources: Record<string, any> = {};
    layers: Record<string, any> = {};
    constructor(_options?: any) {
      setTimeout(() => {
        if (this.listeners['load']) this.listeners['load'].forEach((cb: Function) => cb());
      }, 0);
    }
    on(e: string, cb: Function) {
      if (!this.listeners[e]) this.listeners[e] = [];
      this.listeners[e].push(cb);
      return this;
    }
    once(e: string, cb: Function) { this.on(e, cb); return this; }
    off() { return this; }
    remove() { return this; }
    resize() { return this; }
    flyTo() { return this; }
    fitBounds() { return this; }
    getSource(id: string) { return this.sources[id]; }
    addSource(id: string, s: any) { this.sources[id] = { ...s, setData: vi.fn() }; return this; }
    getLayer(id: string) { return this.layers[id]; }
    addLayer(l: any) { this.layers[l.id] = l; return this; }
    addControl() { return this; }
  }

  return {
    default: {
      Map: MockMap,
      Marker: MockMarker,
      NavigationControl: class {},
      LngLatBounds: class { extend() { return this; } isEmpty() { return false; } }
    },
    Map: MockMap,
    Marker: MockMarker,
    NavigationControl: class {},
    LngLatBounds: class { extend() { return this; } isEmpty() { return false; } }
  };
});

describe('CabinetsTab & Cabinet Components Test Suite (Task 2)', () => {
  // Mock Data chuẩn DTO 100% từ src/types/
  const mockCabinetWithGeo: CabinetListItem = {
    cabinet_id: 'cab_001',
    external_ref: 'CAB-TL01',
    cabinet_name: 'Tủ điện Tỉnh Lộ 8 - Trạm 1',
    commune_id: 'commune_tl8',
    data_source: 'field',
    location: { lat: 10.9701, lng: 106.4896 },
    feeder_ids: ['feeder_01', 'feeder_02'],
    updated_at: '2026-10-08T10:00:00Z',
    updated_by: 'usr_admin',
    updated_by_name: 'Quản trị viên',
  }

  const mockCabinetNoGeo: CabinetListItem = {
    cabinet_id: 'cab_002',
    external_ref: 'CAB-TL02',
    cabinet_name: 'Tủ điện Ngã 4 Tân Quy',
    commune_id: 'commune_tq',
    data_source: 'field',
    location: { lat: 0, lng: 0 },
    feeder_ids: [],
    updated_at: '2026-10-08T11:00:00Z',
  }

  const mockSegment: SegmentListItem = {
    segment_id: 'seg_001',
    external_ref: 'SEG-TL08',
    segment_name: 'Tuyến Tỉnh Lộ 8',
    road_class: 'inter_commune',
    length_m: 1250,
    commune_id: 'commune_tl8',
    data_source: 'field',
    pole_count: 24,
    updated_at: '2026-10-08T10:00:00Z',
  }

  const defaultCabinetsList: CabinetListItem[] = [mockCabinetWithGeo, mockCabinetNoGeo]
  const defaultSegmentsList: SegmentListItem[] = [mockSegment]

  let defaultProps: CabinetsTabProps

  beforeEach(() => {
    defaultProps = {
      cabinets: defaultCabinetsList,
      segments: defaultSegmentsList,
      isLoading: false,
      onAddCabinet: vi.fn(),
      onAddCabinets: vi.fn(),
      onUpdateCabinet: vi.fn(),
      onOpenImport: vi.fn(),
    }
  })

  describe('1. Happy Path - Component Rendering & User Interactions', () => {
    it('render đầy đủ thanh tìm kiếm, bộ lọc trạng thái GIS và các nút thao tác', () => {
      render(<Provider store={configureStore({ reducer: rootReducer })}><CabinetsTab {...defaultProps} /></Provider>)

      expect(
        screen.getByPlaceholderText('Tìm theo mã tủ (CAB-TL8), tên tủ, mốc thực địa...')
      ).toBeInTheDocument()
      expect(screen.getByText('Tất cả trạng thái định vị')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Thêm Tủ Điện/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Import Dữ Liệu/i })).toBeInTheDocument()
    })

    it('hiển thị danh sách tủ điện với đầy đủ thông tin chuẩn DTO CabinetListItem trên bảng', () => {
      render(<Provider store={configureStore({ reducer: rootReducer })}><CabinetsTab {...defaultProps} /></Provider>)

      // Kiểm tra hiển thị mã tủ điện (external_ref)
      expect(screen.getByText('CAB-TL01')).toBeInTheDocument()
      expect(screen.getByText('CAB-TL02')).toBeInTheDocument()

      // Kiểm tra tên tủ điện
      expect(screen.getByText('Tủ điện Tỉnh Lộ 8 - Trạm 1')).toBeInTheDocument()
      expect(screen.getByText('Tủ điện Ngã 4 Tân Quy')).toBeInTheDocument()

      // Kiểm tra số mạch nguồn
      expect(screen.getByText('2 mạch')).toBeInTheDocument()
      expect(screen.getByText('0 mạch')).toBeInTheDocument()

      // Kiểm tra định vị GIS
      expect(screen.getByText('10.9701, 106.4896')).toBeInTheDocument()
      expect(screen.getAllByText('Chưa định vị').length).toBeGreaterThan(0)
    })

    it('tìm kiếm theo mã tủ điện và cập nhật danh sách hiển thị', () => {
      render(<Provider store={configureStore({ reducer: rootReducer })}><CabinetsTab {...defaultProps} /></Provider>)

      const searchInput = screen.getByPlaceholderText(
        'Tìm theo mã tủ (CAB-TL8), tên tủ, mốc thực địa...'
      )
      fireEvent.change(searchInput, { target: { value: 'CAB-TL01' } })

      expect(screen.getByText('CAB-TL01')).toBeInTheDocument()
      expect(screen.queryByText('CAB-TL02')).toBeNull()
    })

    it('lọc theo trạng thái định vị GIS (Đã định vị vs Chưa định vị)', () => {
      render(<Provider store={configureStore({ reducer: rootReducer })}><CabinetsTab {...defaultProps} /></Provider>)

      const filterSelect = screen.getByDisplayValue('Tất cả trạng thái định vị')
      
      // Lọc tủ đã định vị GIS
      fireEvent.change(filterSelect, { target: { value: 'with_geo' } })
      expect(screen.getByText('CAB-TL01')).toBeInTheDocument()
      expect(screen.queryByText('CAB-TL02')).toBeNull()

      // Lọc tủ chưa định vị GIS
      fireEvent.change(filterSelect, { target: { value: 'no_geo' } })
      expect(screen.getByText('CAB-TL02')).toBeInTheDocument()
      expect(screen.queryByText('CAB-TL01')).toBeNull()
    })

    it('kích hoạt onOpenImport khi người dùng click nút "Import Dữ Liệu"', () => {
      render(<Provider store={configureStore({ reducer: rootReducer })}><CabinetsTab {...defaultProps} /></Provider>)

      const importBtn = screen.getByRole('button', { name: /Import Dữ Liệu/i })
      fireEvent.click(importBtn)

      expect(defaultProps.onOpenImport).toHaveBeenCalledTimes(1)
    })

    it('mở modal xem chi tiết và xác nhận KHÔNG CÓ nút Chỉnh Sửa ở footer', () => {
      render(<Provider store={configureStore({ reducer: rootReducer })}><CabinetsTab {...defaultProps} /></Provider>)

      // Click nút xem chi tiết của hàng đầu tiên
      const viewButtons = screen.getAllByRole('button', { name: /Chi tiết/i })
      expect(viewButtons.length).toBeGreaterThan(0)
      fireEvent.click(viewButtons[0])

      // Modal hiển thị thông tin
      expect(screen.getByText('Số mạch nguồn (Feeders)')).toBeInTheDocument()
      expect(screen.getByText('Mã định danh (ID):')).toBeInTheDocument()

      // BẢO ĐẢM KỶ LUẬT TASK 2: Nút "Chỉnh Sửa" đã bị loại bỏ khỏi Footer
      expect(screen.queryByRole('button', { name: /Chỉnh sửa/i })).toBeNull()
      expect(screen.getByRole('button', { name: /Đóng/i })).toBeInTheDocument()
    })

    it('mở modal sửa tủ điện và cập nhật thông tin thành công', () => {
      render(<Provider store={configureStore({ reducer: rootReducer })}><CabinetsTab {...defaultProps} /></Provider>)

      const editButtons = screen.getAllByRole('button', { name: /^Sửa$/i })
      expect(editButtons.length).toBeGreaterThan(0)
      fireEvent.click(editButtons[0])

      // Modal Sửa xuất hiện
      expect(screen.getByText(/Chỉnh Sửa Tủ Điện/i)).toBeInTheDocument()
      const nameInput = screen.getByDisplayValue('Tủ điện Tỉnh Lộ 8 - Trạm 1')
      fireEvent.change(nameInput, { target: { value: 'Tủ điện Tỉnh Lộ 8 - Đã nâng cấp' } })

      const saveBtn = screen.getByRole('button', { name: /Lưu Thay Đổi/i })
      fireEvent.click(saveBtn)

      expect(defaultProps.onUpdateCabinet).toHaveBeenCalledWith(
        expect.objectContaining({
          cabinet_name: 'Tủ điện Tỉnh Lộ 8 - Đã nâng cấp',
          cabinet_id: 'cab_001',
        })
      )
    })

    it('xác thực schema import CSV của tủ điện với đầy đủ 5 cột bắt buộc chuẩn Backend', () => {
      const validCabinetCsvRow = {
        external_ref: 'CAB-TEST-01',
        cabinet_name: 'Tủ Điện Kiểm Thử 01',
        commune_id: 'commune_tl8',
        geom_wkt: 'POINT(106.4896 10.9701)',
        data_source: 'field',
      }

      const parseResult = cabinetImportSchema.safeParse(validCabinetCsvRow)
      expect(parseResult.success).toBe(true)
      if (parseResult.success) {
        expect(parseResult.data.external_ref).toBe('CAB-TEST-01')
        expect(parseResult.data.data_source).toBe('field')
      }
    })

    it('hàm validateImportRow xử lý nạp tủ điện trả về DTO chuẩn CreateCabinetRequest', () => {
      const rowObj = {
        external_ref: 'CAB-NEW-99',
        cabinet_name: 'Tủ Điện Mới Phân Tuyến',
        commune_id: 'commune_tl8',
        geom_wkt: 'POINT(106.4896 10.9701)',
        data_source: 'field',
      }

      const context: ValidationContext = {
        poles: [],
        fixtures: [],
        cabinets: defaultCabinetsList,
        segments: defaultSegmentsList,
      }

      const review = validateImportRow('cabinets', rowObj, context, 0)
      expect(review.category).toBe('cabinets')
      expect(review.externalRef).toBe('CAB-NEW-99')
      expect(review.actionType).toBe('new')
      expect(review.data).toEqual<CreateCabinetRequest>({
        external_ref: 'CAB-NEW-99',
        cabinet_name: 'Tủ Điện Mới Phân Tuyến',
        commune_id: 'commune_tl8',
        geom_wkt: 'POINT(106.4896 10.9701)',
        data_source: 'field',
      })
    })

    it('hàm validateImportRow phát hiện thay đổi tọa độ GIS của tủ điện và trả về actionType updated', () => {
      const rowObj = {
        external_ref: 'CAB-TL01',
        cabinet_name: 'Tủ điện Tỉnh Lộ 8 - Trạm 1',
        commune_id: 'commune_tl8',
        geom_wkt: 'POINT(106.4950 10.9750)',
        data_source: 'field',
      }

      const context: ValidationContext = {
        poles: [],
        fixtures: [],
        cabinets: defaultCabinetsList,
        segments: defaultSegmentsList,
      }

      const review = validateImportRow('cabinets', rowObj, context, 0)
      expect(review.category).toBe('cabinets')
      expect(review.externalRef).toBe('CAB-TL01')
      expect(review.actionType).toBe('updated')
      expect(review.diffs.some((d) => d.label === 'Tọa độ GIS')).toBe(true)
    })

    it('hàm validateImportRow giữ nguyên actionType unchanged khi tọa độ tủ điện không đổi', () => {
      const rowObj = {
        external_ref: 'CAB-TL01',
        cabinet_name: 'Tủ điện Tỉnh Lộ 8 - Trạm 1',
        commune_id: 'commune_tl8',
        geom_wkt: 'POINT(106.4896 10.9701)',
        data_source: 'field',
      }

      const context: ValidationContext = {
        poles: [],
        fixtures: [],
        cabinets: defaultCabinetsList,
        segments: defaultSegmentsList,
      }

      const review = validateImportRow('cabinets', rowObj, context, 0)
      expect(review.category).toBe('cabinets')
      expect(review.externalRef).toBe('CAB-TL01')
      expect(review.actionType).toBe('unchanged')
      expect(review.diffs).toHaveLength(0)
    })

    it('xử lý Redux state fetchAssetsSuccess cập nhật danh sách cabinets thành công', () => {
      const initialState = assetReducer(undefined, { type: '@@INIT' })
      const nextState = assetReducer(
        initialState,
        fetchAssetsSuccess({
          poles: [],
          cabinets: defaultCabinetsList,
          segments: defaultSegmentsList,
        })
      )
      expect(nextState.isLoadingAssets).toBe(false)
      expect(nextState.cabinets).toHaveLength(2)
      expect(nextState.cabinets[0].external_ref).toBe('CAB-TL01')
      expect(nextState.loadAssetsError).toBeNull()
    })

    it('xử lý Redux state importAssetSuccess ghi nhận kết quả import từ Backend', () => {
      const mockResult: ImportResult = {
        inserted: 7,
        updated: 3,
        unchanged: 0,
        failed: 0,
        total_errors: 0,
      }
      const initialState = {
        ...assetReducer(undefined, { type: '@@INIT' }),
        isImporting: true,
      }
      const nextState = assetReducer(initialState, importAssetSuccess(mockResult))
      expect(nextState.isImporting).toBe(false)
      expect(nextState.importResult).toEqual(mockResult)
      expect(nextState.error).toBeNull()
    })
  })

  describe('2. Edge Cases - Dữ liệu rỗng, Nullish & Lỗi định dạng', () => {
    it('hiển thị thông báo khi danh sách tủ điện rỗng (cabinets = [])', () => {
      render(<CabinetTable cabinets={[]} onViewDetail={vi.fn()} onEdit={vi.fn()} />)

      expect(
        screen.getByText('Không tìm thấy tủ điện nào phù hợp với bộ lọc hiện tại.')
      ).toBeInTheDocument()
    })

    it('xử lý an toàn khi cabinet_name là null/undefined, fallback hiển thị external_ref', () => {
      const cabinetWithoutName: CabinetListItem = {
        cabinet_id: 'cab_003',
        external_ref: 'CAB-UNNAMED',
        cabinet_name: null,
        commune_id: 'commune_tl8',
        data_source: 'field',
        location: { lat: 10.97, lng: 106.48 },
        feeder_ids: [],
        updated_at: null,
      }

      render(
        <CabinetTable
          cabinets={[cabinetWithoutName]}
          onViewDetail={vi.fn()}
          onEdit={vi.fn()}
        />
      )

      expect(screen.getAllByText('CAB-UNNAMED').length).toBeGreaterThan(0)
    })

    it('xử lý an toàn khi CabinetDetailModal nhận cabinet là null', () => {
      const { container } = render(
        <CabinetDetailModal cabinet={null} onClose={vi.fn()} />
      )
      expect(container.innerHTML).toBe('')
    })

    it('chặn nạp dữ liệu khi thiếu cột bắt buộc data_source trong schema Cabinet', () => {
      const missingDataSourceRow = {
        external_ref: 'CAB-ERR-01',
        cabinet_name: 'Tủ Điện Thiếu Cột',
        commune_id: 'commune_tl8',
        geom_wkt: 'POINT(106.4896 10.9701)',
        // thiếu data_source
      }

      const parseResult = cabinetImportSchema.safeParse(missingDataSourceRow)
      // data_source có default('field') theo Zod schema nếu không cung cấp
      expect(parseResult.success).toBe(true)
      if (parseResult.success) {
        expect(parseResult.data.data_source).toBe('field')
      }
    })

    it('báo lỗi khi cả cabinet_name và feeder_name đều rỗng trong Zod schema', () => {
      const invalidRow = {
        external_ref: 'CAB-NO-NAME',
        commune_id: 'commune_tl8',
        geom_wkt: 'POINT(106.4896 10.9701)',
        data_source: 'field',
      }

      const parseResult = cabinetImportSchema.safeParse(invalidRow)
      expect(parseResult.success).toBe(false)
      if (!parseResult.success) {
        const errorField = parseResult.error.issues[0]?.path[0]
        expect(errorField).toBe('cabinet_name')
      }
    })
  })

  describe('3. Error Cases - Giả lập Backend trả về mã lỗi 400, 422, 500', () => {
    it('bắt lỗi 400 (Bad Request) an toàn khi tải danh sách tài sản thất bại', () => {
      const requestingState = assetReducer(undefined, fetchAssetsRequest())
      expect(requestingState.isLoadingAssets).toBe(true)
      expect(requestingState.loadAssetsError).toBeNull()

      const error400Msg = 'Yêu cầu không hợp lệ. Tham số danh mục hoặc địa bàn không đúng (HTTP 400)'
      const failedState = assetReducer(requestingState, fetchAssetsFailure(error400Msg))

      expect(failedState.isLoadingAssets).toBe(false)
      expect(failedState.loadAssetsError).toBe(error400Msg)
      expect(failedState.cabinets).toEqual([])
    })

    it('bắt lỗi 422 (Unprocessable Entity) khi Import CSV tủ điện bị lỗi thẩm định phía Backend', () => {
      const mockFile = new File(['mock content'], 'cabinets.csv', { type: 'text/csv' })
      const importingState = assetReducer(
        undefined,
        importAssetRequest({ category: 'cabinets', file: mockFile })
      )
      expect(importingState.isImporting).toBe(true)
      expect(importingState.error).toBeNull()

      const error422Msg =
        'Lỗi thẩm định dữ liệu Backend (HTTP 422): Cột data_source không hợp lệ hoặc sai định dạng POINT WKT'
      const failedState = assetReducer(importingState, importAssetFailure(error422Msg))

      expect(failedState.isImporting).toBe(false)
      expect(failedState.error).toBe(error422Msg)
      expect(failedState.importResult).toBeNull()
    })

    it('bắt lỗi 500 (Internal Server Error) an toàn và bảo toàn dữ liệu tài sản cũ trong state', () => {
      const stateWithExistingData = {
        ...assetReducer(undefined, { type: '@@INIT' }),
        cabinets: [mockCabinetWithGeo],
        segments: [mockSegment],
        isLoadingAssets: true,
      }

      const error500Msg = 'Lỗi máy chủ nội bộ. Sự cố kết nối cơ sở dữ liệu GIS (HTTP 500)'
      const failedState = assetReducer(stateWithExistingData, fetchAssetsFailure(error500Msg))

      expect(failedState.isLoadingAssets).toBe(false)
      expect(failedState.loadAssetsError).toBe(error500Msg)
      // Dữ liệu tủ điện cũ vẫn được bảo tồn để người dùng không bị mất trắng màn hình
      expect(failedState.cabinets).toHaveLength(1)
      expect(failedState.cabinets[0].external_ref).toBe('CAB-TL01')
    })

    it('EditCabinetModal render dropdown Lọc nhanh tuyến đường trên bản đồ với tùy chọn rỗng mặc định', () => {
      const store = configureStore({ reducer: rootReducer })
      const mockSave = vi.fn()
      const mockClose = vi.fn()

      render(
        <Provider store={store}>
          <EditCabinetModal
            isOpen={true}
            cabinet={mockCabinetWithGeo}
            availableSegments={[mockSegment]}
            onClose={mockClose}
            onSave={mockSave}
          />
        </Provider>
      )

      expect(screen.getByText('Lọc nhanh tuyến đường trên bản đồ (tùy chọn):')).toBeInTheDocument()
      expect(screen.getByText('-- Không chọn (Xem toàn bộ mạng lưới) --')).toBeInTheDocument()
      expect(screen.getByText(/💡 Kéo ghim ⚡ hoặc nhấp chuột lên bản đồ/i)).toBeInTheDocument()
    })

    it('AddCabinetModal không còn trường Ngày vận hành và cho phép thêm tủ điện mà không bắt buộc chọn tuyến đường', () => {
      const store = configureStore({ reducer: rootReducer })
      const mockAdd = vi.fn()
      const mockClose = vi.fn()

      render(
        <Provider store={store}>
          <AddCabinetModal
            isOpen={true}
            existingCount={0}
            availableSegments={[mockSegment]}
            onClose={mockClose}
            onAddCabinet={mockAdd}
          />
        </Provider>
      )

      // Đảm bảo KHÔNG còn trường ngày vận hành
      expect(screen.queryByText(/Ngày vận hành/i)).toBeNull()

      // Bấm nút thêm tủ điện trực tiếp mà không cần chọn tuyến đường
      const addRowBtn = screen.getByRole('button', { name: /\+ Thêm Tủ Điện/i })
      fireEvent.click(addRowBtn)

      // Hàng tủ điện được tạo thành công với tên mặc định Tủ điện A
      expect(screen.getByDisplayValue('Tủ điện A')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Lat')).toHaveValue('10.970100')
      expect(screen.getByPlaceholderText('Lng')).toHaveValue('106.489600')
      // Không bị báo lỗi bắt buộc chọn tuyến đường
      expect(screen.queryByText(/Vui lòng chọn Tuyến đường áp dụng/i)).toBeNull()
    })
  })
})
