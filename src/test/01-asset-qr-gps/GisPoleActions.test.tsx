import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act, cleanup, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore, type Action, type Middleware } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import iotMonitorSaga from '../../feature/iot/iotMonitorSaga'

// Thẻ cầu IoT trong panel tự gọi API khi mở cột: chặn để test không ra mạng
vi.mock('../../feature/iot/iotAPI', () => ({
  default: {
    getPoleControl: vi.fn(() => Promise.resolve(null)),
    getCommand: vi.fn(() => Promise.resolve({})),
    sendCommand: vi.fn(),
    getFeederElectricalHistory: vi.fn(() => new Promise(() => {})),
    getCommandHistory: vi.fn(() => Promise.resolve({ items: [] })),
    getDiagnostics: vi.fn(() => Promise.resolve({})),
    getElectrical: vi.fn(() => Promise.resolve({})),
    getNodes: vi.fn(() => Promise.resolve({ total: 0, items: [] })),
    getServers: vi.fn(() => Promise.resolve([])),
  },
}))

// Form Sửa cột có bản đồ MapLibre, không chạy được trong jsdom
vi.mock('../../pages/assets/components/poles/components/EditPoleMap', () => ({
  EditPoleMap: () => <div data-testid="edit-pole-map" />,
}))

import iotAPI from '../../feature/iot/iotAPI'
import rootReducer from '../../redux/rootReducer'
import { loginSuccess } from '../../feature/auth/authSlice'
import { fetchPoleDetailSuccess } from '../../feature/map/mapSlice'
import {
  retireFixtureRequest,
  createFixtureRequest,
  updateFixtureRequest,
  updatePoleRequest,
  fetchAssetsSuccess,
  fetchSegmentDetailSuccess,
  mutationSuccess,
  mutationFailure,
} from '../../feature/assets/assetSlice'
import type { PoleListItem } from '../../types/assets/poles'
import { GisDrawerPanel, type GisDrawerPanelProps } from '../../pages/gis-map/components/GisDrawerPanel'
import type { PoleFeature } from '../../pages/gis-map/GisMapPage'
import type { PoleMapDetail } from '../../types/map/poles'
import type { CurrentUserResponse } from '../../types/auth/me'

const POLE: PoleFeature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [106.84, 10.84] },
  properties: {
    pole_id: 'POLE-0061',
    external_ref: 'KS-01',
    segment_id: 'SEG-001',
    fixture_status: 'normal',
    open_fault_count: 0,
    has_iot_node: false,
  },
} as PoleFeature

const DETAIL: PoleMapDetail = {
  pole_id: 'POLE-0061',
  segment_id: 'SEG-001',
  segment_name: 'Tuyến 1',
  commune_id: 'COM-001',
  location: { lat: 10.84, lng: 106.84 },
  fixtures: [
    { fixture_id: 'FIX-0001', lamp_watt: 60, lamp_count: 1, install_date: '2026-01-10' },
    { fixture_id: 'FIX-0002', lamp_watt: 100, lamp_count: 1, install_date: '2026-03-02' },
  ],
  current_status: { fixture_status: 'normal' },
  luminance_baselines: [],
  luminance_history: [],
  runtime_history: [],
  open_faults: [],
  recent_frames: [],
}

// Cùng cột trong danh sách tài sản (form Sửa cột / Gắn bộ đèn đọc từ đây). Nguồn dữ liệu cố ý khác `field`.
const POLE_ITEM: PoleListItem = {
  pole_id: 'POLE-0061',
  external_ref: 'KS-01',
  segment_id: 'SEG-001',
  commune_id: 'COM-001',
  commune_name: 'Xã 1',
  data_source: 'calibration_rig',
  near_sensitive_poi: false,
  location: { lat: 10.84, lng: 106.84 },
  updated_at: null,
}

const setup = (
  role: string,
  overrides: Partial<GisDrawerPanelProps> = {},
  detail: PoleMapDetail = DETAIL,
  assetsOverrides: Record<string, unknown> = {}
) => {
  const dispatched: Action[] = []
  const recorder: Middleware = () => (next) => (action) => {
    dispatched.push(action as Action)
    return next(action)
  }
  const sagaMiddleware = createSagaMiddleware()
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefault) => getDefault({ serializableCheck: false }).concat(recorder, sagaMiddleware),
  })
  sagaMiddleware.run(iotMonitorSaga)
  store.dispatch(loginSuccess({ user: { user_id: 'U-1', username: 'u', role } as unknown as CurrentUserResponse }))
  store.dispatch(fetchPoleDetailSuccess(detail))
  store.dispatch(
    fetchAssetsSuccess({
      poles: [POLE_ITEM],
      cabinets: [],
      segments: [],
      feeders: [],
      ...assetsOverrides,
    } as never)
  )

  const props: GisDrawerPanelProps = {
    selectedPole: POLE,
    setSelectedPole: vi.fn(),
    setSelectedSegmentId: vi.fn(),
    activeSegmentDetail: { id: 'SEG-001', name: 'Tuyến 1', cabinet: '', road: '', poleCount: 1, lengthM: 100 },
    handleSelectPole: vi.fn(),
    cabinets: [],
    effectivePoles: [POLE],
    ...overrides,
  }
  render(
    <Provider store={store}>
      <GisDrawerPanel {...props} />
    </Provider>
  )
  return { dispatched, props, store }
}

describe('Panel cột trên Bản đồ GIS: sửa cột và tháo bộ đèn', () => {
  it('Quản lý thấy đúng một nút sửa cột (không còn nút dời riêng) và một nút tháo cho từng bộ đèn', () => {
    setup('manager')
    expect(screen.getAllByRole('button', { name: /Sửa cột/ })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /Dời vị trí cột/ })).not.toBeInTheDocument()
    const retire = screen.getAllByRole('button', { name: /Tháo bộ đèn/ })
    expect(retire).toHaveLength(2)
    expect(screen.getByText('FIX-0001')).toBeInTheDocument()
    expect(screen.getByText('FIX-0002')).toBeInTheDocument()
    // "Bóng" ở đây là bộ đèn; mỗi dòng ghi cả số bóng trong bộ
    const row = screen.getByText('FIX-0001').parentElement as HTMLElement
    expect(row.textContent).toMatch(/60 W \(1 bóng\)/)
  })

  it('Cấp giám sát chỉ xem: không có thao tác sửa cột', () => {
    setup('superior')
    expect(screen.queryByText('Thao tác')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Sửa cột/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Tháo bộ đèn/ })).not.toBeInTheDocument()
  })

  it('tháo bộ đèn thứ hai: hỏi lại bằng form tháo dỡ, xác nhận thì gửi kèm mã cột để tải lại bản đồ', () => {
    const { dispatched } = setup('manager')
    fireEvent.click(screen.getAllByRole('button', { name: /Tháo bộ đèn/ })[1])

    expect(screen.getByText('Tháo Dỡ Bộ Đèn')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận tháo dỡ/ }))

    const sent = dispatched.filter((a) => a.type === retireFixtureRequest.type) as ReturnType<
      typeof retireFixtureRequest
    >[]
    expect(sent).toHaveLength(1)
    expect(sent[0].payload.fixtureId).toBe('FIX-0002')
    expect(sent[0].payload.poleId).toBe('POLE-0061')
    expect(sent[0].payload.data.removed_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(screen.queryByText('Tháo Dỡ Bộ Đèn')).not.toBeInTheDocument()
  })

  it('huỷ form tháo dỡ thì không gửi gì', () => {
    const { dispatched } = setup('manager')
    fireEvent.click(screen.getAllByRole('button', { name: /Tháo bộ đèn/ })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(dispatched.some((a) => a.type === retireFixtureRequest.type)).toBe(false)
  })
})

describe('Mở khung tuyến từ khung cột / mạch điện', () => {
  it('bấm tên tuyến trong khung cột: bỏ chọn cột, mở khung đúng tuyến của cột', () => {
    const { props } = setup('manager')
    fireEvent.click(screen.getByRole('button', { name: /Tuyến 1/ }))
    expect(props.setSelectedPole).toHaveBeenCalledWith(null)
    expect(props.setSelectedSegmentId).toHaveBeenCalledWith('SEG-001')
  })

  it('cột chưa thuộc tuyến: ghi "Chưa gán", không có nút mở tuyến (không mở nhầm tuyến đầu danh sách)', () => {
    setup('manager', {
      selectedPole: { ...POLE, properties: { ...POLE.properties, segment_id: '' } } as PoleFeature,
    })
    expect(screen.queryByRole('button', { name: /Tuyến 1/ })).not.toBeInTheDocument()
    expect(screen.getByText('Chưa gán')).toBeInTheDocument()
  })

  it('bấm tên tuyến trong khung mạch điện: bỏ chọn mạch, mở khung tuyến của mạch', () => {
    const setSelectedFeeder = vi.fn()
    const { props } = setup('manager', {
      selectedPole: null,
      selectedFeeder: { feeder_id: 'FDR-010', external_ref: 'FDR-CAB-TL8-B', segment_id: 'SEG-001' },
      setSelectedFeeder,
    })
    fireEvent.click(screen.getByRole('button', { name: /Tuyến 1/ }))
    expect(setSelectedFeeder).toHaveBeenCalledWith(null)
    expect(props.setSelectedSegmentId).toHaveBeenCalledWith('SEG-001')
  })
})

describe('Khung cột trên Bản đồ GIS: sửa thông tin cột và gắn bộ đèn', () => {
  it('cột đang có bộ đèn (một hay hai bộ): không có nút gắn, phải tháo bộ cũ trước', () => {
    setup('manager')
    expect(screen.queryByRole('button', { name: /Gắn/ })).not.toBeInTheDocument()
    cleanup()
    setup('manager', {}, { ...DETAIL, fixtures: [DETAIL.fixtures![0]] })
    expect(screen.queryByRole('button', { name: /Gắn/ })).not.toBeInTheDocument()
  })

  it('cột chưa có bộ đèn: gắn bộ đèn, gửi kèm mã cột để tải lại bản đồ, nguồn dữ liệu theo cột', () => {
    const { dispatched } = setup('manager', {}, { ...DETAIL, fixtures: [] })
    fireEvent.click(screen.getByRole('button', { name: 'Gắn bộ đèn' }))
    expect(screen.getByText('Gắn bộ đèn cho cột KS-01')).toBeInTheDocument()
    // Không phải chọn tuyến / cột như ở tab tài sản
    expect(screen.queryByLabelText(/Tuyến đường/)).not.toBeInTheDocument()

    // Nút trong khung cột và nút gửi của form cùng nhãn; form vẽ sau nên là nút cuối.
    const buttons = screen.getAllByRole('button', { name: 'Gắn bộ đèn' })
    const submit = buttons[buttons.length - 1]
    fireEvent.click(submit)

    const sent = dispatched.filter((a) => a.type === createFixtureRequest.type) as ReturnType<
      typeof createFixtureRequest
    >[]
    expect(sent).toHaveLength(1)
    expect(sent[0].payload.poleId).toBe('POLE-0061')
    expect(sent[0].payload.data.pole_id).toBe('POLE-0061')
    expect(sent[0].payload.data.data_source).toBe('calibration_rig')
  })

  it('Sửa bộ đèn: mở cùng form gắn, điền sẵn thông số, lưu thì gửi mã bộ đèn kèm mã cột', () => {
    const { dispatched, store } = setup('manager', {}, { ...DETAIL, fixtures: [DETAIL.fixtures![0]] })
    fireEvent.click(screen.getByRole('button', { name: /^Sửa$/ }))

    expect(screen.getByText('Sửa bộ đèn FIX-0001 (cột KS-01)')).toBeInTheDocument()
    expect((screen.getByLabelText('Công suất (W)') as HTMLSelectElement).value).toBe('60')

    fireEvent.change(screen.getByLabelText('Công suất (W)'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/ }))

    const sent = dispatched.filter((a) => a.type === updateFixtureRequest.type) as ReturnType<
      typeof updateFixtureRequest
    >[]
    expect(sent).toHaveLength(1)
    expect(sent[0].payload.fixtureId).toBe('FIX-0001')
    expect(sent[0].payload.poleId).toBe('POLE-0061')
    expect(sent[0].payload.data.lamp_watt).toBe(100)
    expect(sent[0].payload.data.install_date).toBe('2026-01-10')
    // Đang lưu thì form vẫn mở; lưu xong mới đóng
    expect(screen.getByRole('button', { name: /Đang lưu…/ })).toBeDisabled()
    act(() => {
      store.dispatch(mutationSuccess())
    })
    expect(screen.queryByText(/Sửa bộ đèn FIX-0001/)).not.toBeInTheDocument()
  })

  it('Sửa bộ đèn: lưu lỗi thì giữ form và những gì đã nhập', () => {
    const { store } = setup('manager', {}, { ...DETAIL, fixtures: [DETAIL.fixtures![0]] })
    fireEvent.click(screen.getByRole('button', { name: /^Sửa$/ }))
    fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: 'thực tế chỉ thay 1 bóng' } })
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/ }))
    act(() => {
      store.dispatch(mutationFailure('Resource not found.'))
    })
    expect(screen.getByText('Sửa bộ đèn FIX-0001 (cột KS-01)')).toBeInTheDocument()
    expect((screen.getByLabelText('Ghi chú') as HTMLTextAreaElement).value).toBe('thực tế chỉ thay 1 bóng')
    expect(screen.getByRole('button', { name: /Lưu thay đổi/ })).toBeEnabled()
  })

  it('bộ đèn có ghi chú: hiện dưới dòng bộ đèn và điền sẵn vào form sửa', () => {
    setup('manager', {}, { ...DETAIL, fixtures: [{ ...DETAIL.fixtures![0], note: 'thực tế chỉ thay 1 bóng' }] })
    expect(screen.getByText('Ghi chú: thực tế chỉ thay 1 bóng')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Sửa$/ }))
    expect((screen.getByLabelText('Ghi chú') as HTMLTextAreaElement).value).toBe('thực tế chỉ thay 1 bóng')
  })

  it('cột chưa có bộ đèn: nút ghi "Gắn bộ đèn"', () => {
    setup('manager', {}, { ...DETAIL, fixtures: [] })
    expect(screen.getByRole('button', { name: 'Gắn bộ đèn' })).toBeEnabled()
  })

  it('Sửa thông tin cột: mở form Sửa cột, lưu thì yêu cầu tải lại bản đồ', () => {
    const { dispatched, store } = setup('manager')
    fireEvent.click(screen.getByRole('button', { name: /Sửa cột/ }))
    expect(screen.getByText('Chỉnh sửa cột đèn: KS-01')).toBeInTheDocument()
    // Form chờ hình tuyến để kiểm hành lang 25 m trước khi cho lưu
    act(() => {
      store.dispatch(fetchSegmentDetailSuccess({ segmentId: 'SEG-001', geomWkt: 'LINESTRING(106.83 10.84, 106.85 10.84)' }))
    })

    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/ }))

    const sent = dispatched.filter((a) => a.type === updatePoleRequest.type) as ReturnType<
      typeof updatePoleRequest
    >[]
    expect(sent).toHaveLength(1)
    expect(sent[0].payload.poleId).toBe('POLE-0061')
    expect(sent[0].payload.refreshMap).toBe(true)
    expect(sent[0].payload.data.data_source).toBe('calibration_rig')
  })

  const openAndSavePole = () => {
    const ctx = setup('manager')
    fireEvent.click(screen.getByRole('button', { name: /Sửa cột/ }))
    act(() => {
      ctx.store.dispatch(fetchSegmentDetailSuccess({ segmentId: 'SEG-001', geomWkt: 'LINESTRING(106.83 10.84, 106.85 10.84)' }))
    })
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/ }))
    return ctx
  }

  it('Sửa cột: đang lưu thì form vẫn mở, nút báo "Đang lưu…"; lưu xong mới đóng', () => {
    const { store } = openAndSavePole()
    expect(screen.getByText('Chỉnh sửa cột đèn: KS-01')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Đang lưu…/ })).toBeDisabled()

    act(() => {
      store.dispatch(mutationSuccess())
    })
    expect(screen.queryByText('Chỉnh sửa cột đèn: KS-01')).not.toBeInTheDocument()
  })

  it('Sửa cột: lưu lỗi thì giữ form để sửa lại, nút lưu bấm được lại', () => {
    const { store } = openAndSavePole()
    act(() => {
      store.dispatch(mutationFailure('POLE_OFF_SEGMENT'))
    })
    expect(screen.getByText('Chỉnh sửa cột đèn: KS-01')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lưu thay đổi/ })).toBeEnabled()
  })

  it('khung cột không có thẻ IoT: không gọi API IoT nào, IoT chỉ xem ở tủ điện', async () => {
    vi.mocked(iotAPI.getCommand).mockClear()
    vi.mocked(iotAPI.getCommandHistory).mockClear()
    setup('manager')
    await act(async () => {})
    expect(iotAPI.getCommand).not.toHaveBeenCalled()
    expect(iotAPI.getCommandHistory).not.toHaveBeenCalled()
    expect(screen.queryByText(/qua IoT/)).not.toBeInTheDocument()
  })

  it('khung cột không còn mục "Độ sáng 3 đêm gần nhất"', () => {
    setup('manager')
    expect(screen.queryByText('Độ sáng 3 đêm gần nhất')).not.toBeInTheDocument()
    expect(screen.queryByText(/Chưa có dữ liệu đo quang thông/)).not.toBeInTheDocument()
  })

  it('Cấp giám sát: không có nút sửa cột hay gắn bộ đèn', () => {
    setup('superior', {}, { ...DETAIL, fixtures: [] })
    expect(screen.queryByRole('button', { name: /Sửa cột/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Gắn bộ đèn/ })).not.toBeInTheDocument()
  })
})

describe('Khung mạch điện: Bật / Tắt / AUTO gửi POST /iot/nodes/{nodeId}/command', () => {
  const feeder = (nodeId: string | null) => ({
    feeder_id: 'FDR-010',
    external_ref: 'FDR-CAB-TL8-B',
    segment_id: 'SEG-001',
    control: { node_id: nodeId, relay_no: 1, control_mode: 'auto' },
  })

  it('gửi lệnh tới node gán cho mạch, không qua /lighting/commands', async () => {
    vi.mocked(iotAPI.sendCommand).mockReset().mockResolvedValue({ node_id: 'NODE-004', command_id: 'c1' })
    setup('manager', { selectedPole: null, selectedFeeder: feeder('NODE-004') })

    // Bật / Tắt hỏi lại trước khi gửi
    fireEvent.click(screen.getByRole('button', { name: 'Bật' }))
    const confirm = await screen.findByRole('dialog', { name: 'Xác nhận bật mạch FDR-010' })
    // Hộp ghi mạch bằng mã hiển thị như khung mạch, kèm node
    expect(confirm).toHaveTextContent('FDR-CAB-TL8-B')
    expect(confirm).toHaveTextContent('NODE-004')
    expect(iotAPI.sendCommand).not.toHaveBeenCalled()
    fireEvent.click(within(confirm).getByRole('button', { name: 'Xác nhận Bật' }))
    await waitFor(() => expect(iotAPI.sendCommand).toHaveBeenCalledWith('NODE-004', { mode: 'MANUAL', command: 'ON' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Xác nhận bật mạch FDR-010' })).not.toBeInTheDocument())
    // AUTO luôn kèm lịch: bấm Auto mở form, điền lịch của lệnh AUTO success mới nhất trong lịch sử lệnh
    // (lệnh AUTO pending mới hơn chưa chạy nên không lấy), chưa gửi gì
    vi.mocked(iotAPI.getCommandHistory).mockResolvedValue({
      items: [
        { command_id: 'c3', mode: 'AUTO', command: null, status: 'pending', auto_schedule: { day_start: '07:00', night_start: '19:00' } },
        { command_id: 'c2', mode: 'AUTO', command: null, status: 'success', auto_schedule: { day_start: '05:45', night_start: '17:50' } },
      ],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Auto' }))
    const dialog = await screen.findByRole('dialog', { name: 'Lịch AUTO mạch FDR-010' })
    expect(iotAPI.sendCommand).toHaveBeenCalledTimes(1)
    expect(iotAPI.getCommandHistory).toHaveBeenCalledWith('NODE-004', { page: 1, page_size: 20 })
    expect(screen.getByDisplayValue('05:45')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('07:00')).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi AUTO' }))
    await waitFor(() =>
      expect(iotAPI.sendCommand).toHaveBeenLastCalledWith('NODE-004', {
        mode: 'AUTO',
        command: null,
        auto_type: 'scheduled',
        auto_schedule: { day_start: '05:45', night_start: '17:50' },
      })
    )
  })

  it('gửi lệnh AUTO kiểu Cả ngày (full_time) không kèm auto_schedule', async () => {
    vi.mocked(iotAPI.sendCommand).mockReset().mockResolvedValue({ node_id: 'NODE-004', command_id: 'c2' })
    vi.mocked(iotAPI.getCommandHistory).mockResolvedValue({ items: [] })
    setup('manager', { selectedPole: null, selectedFeeder: feeder('NODE-004') })

    fireEvent.click(screen.getByRole('button', { name: 'Auto' }))
    const dialog = await screen.findByRole('dialog', { name: 'Lịch AUTO mạch FDR-010' })
    fireEvent.click(within(dialog).getByRole('button', { name: /Cả ngày/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Gửi AUTO' }))
    await waitFor(() =>
      expect(iotAPI.sendCommand).toHaveBeenCalledWith('NODE-004', {
        mode: 'AUTO',
        command: null,
        auto_type: 'full_time',
      })
    )
  })

  it('mạch chưa đấu node IoT: không gửi lệnh nào', () => {
    vi.mocked(iotAPI.sendCommand).mockReset()
    setup('manager', { selectedPole: null, selectedFeeder: feeder(null) })

    fireEvent.click(screen.getByRole('button', { name: 'Tắt' }))
    expect(iotAPI.sendCommand).not.toHaveBeenCalled()
  })

  it('nút đang sáng là chế độ lấy từ GET /iot/nodes/{nodeId}/command', async () => {
    vi.mocked(iotAPI.getCommand).mockResolvedValue({
      mode: 'MANUAL',
      command: 'OFF',
    })
    setup('manager', { selectedPole: null, selectedFeeder: feeder('NODE-004') })

    await waitFor(() => expect(screen.getByRole('button', { name: 'Tắt' })).toHaveAttribute('aria-pressed', 'true'))
    expect(iotAPI.getCommand).toHaveBeenCalledWith('NODE-004')
    expect(screen.getByRole('button', { name: 'Bật' })).toHaveAttribute('aria-pressed', 'false')
    // control_mode cũ trong dữ liệu tài sản (auto) không còn quyết nút nào sáng
    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('Nút Lịch sử của mạch nằm ngoài khối số đo và mở modal Lịch sử mạch ngay trên GIS', async () => {
    vi.mocked(iotAPI.getFeederElectricalHistory).mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] })
    setup('manager', { selectedPole: null, selectedFeeder: feeder('NODE-004') })

    const historyBtn = screen.getByRole('button', { name: 'Xem lịch sử mạch' })
    expect(screen.queryByRole('button', { name: /Lịch sử lệnh/ })).not.toBeInTheDocument()
    const summaryEl = await screen.findByTestId('feeder-electrical-summary')
    expect(summaryEl).toHaveTextContent('Chưa có mẫu điện.')
    expect(summaryEl.contains(historyBtn)).toBe(false)

    fireEvent.click(historyBtn)
    expect(await screen.findByRole('dialog', { name: 'Lịch sử mạch FDR-CAB-TL8-B' })).toBeInTheDocument()
  })

  it('Cấp giám sát: không hiện nút Xem lịch sử mạch và nút Lịch sử lệnh', () => {
    setup('superior', { selectedPole: null, selectedFeeder: feeder('NODE-004') })

    expect(screen.queryByRole('button', { name: 'Xem lịch sử mạch' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Lịch sử lệnh/ })).not.toBeInTheDocument()
  })

  it('Tắt: huỷ ở hộp xác nhận thì không gửi lệnh', async () => {
    vi.mocked(iotAPI.sendCommand).mockReset()
    setup('manager', { selectedPole: null, selectedFeeder: feeder('NODE-004') })

    fireEvent.click(screen.getByRole('button', { name: 'Tắt' }))
    const confirm = await screen.findByRole('dialog', { name: 'Xác nhận tắt mạch FDR-010' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Huỷ' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(iotAPI.sendCommand).not.toHaveBeenCalled()
  })
})

describe('Khung tủ điện: danh sách mạch thu gọn, bấm mới mở chi tiết và gọi lịch sử điện', () => {
  it('tủ 3 mạch có node: mã node hiện đủ, không gọi điện trước khi bấm, bấm mở mạch và nút Biểu đồ, bấm mạch khác thì mạch trước đóng', async () => {
    vi.mocked(iotAPI.getNodes).mockResolvedValue({
      total: 3,
      items: [
        { node_id: 'IOT-NODE-001', cabinet_id: 'CAB-001', server_id: 'iot-server-01', status: 'online' },
        { node_id: 'IOT-NODE-002', cabinet_id: 'CAB-001', server_id: 'iot-server-01', status: 'online' },
        { node_id: 'IOT-NODE-003', cabinet_id: 'CAB-001', server_id: 'iot-server-01', status: 'offline' },
      ],
    })
    vi.mocked(iotAPI.getServers).mockResolvedValue([
      { server_id: 'iot-server-01', status: 'online' },
      { server_id: 'iot-server-99', status: 'offline' },
    ])
    vi.mocked(iotAPI.getFeederElectricalHistory).mockClear()

    setup(
      'manager',
      {
        selectedPole: null,
        selectedCabinet: {
          cabinet_id: 'CAB-001',
          cabinet_name: 'Tủ A',
          external_ref: 'CAB-001',
          segment_name: 'Tuyến 1',
          feeders: [
            { feeder_id: 'FDR-001', power_state: 'on' },
            { feeder_id: 'FDR-002', power_state: 'on' },
            { feeder_id: 'FDR-003', power_state: 'off' },
          ],
        },
      },
      DETAIL,
      {
        feeders: [
          {
            feeder_id: 'FDR-001',
            external_ref: 'FDR-001',
            feeder_name: 'Mạch 1 - Lộ 1',
            control: { node_id: 'IOT-NODE-001', relay_no: 1, control_mode: 'auto' },
          },
          {
            feeder_id: 'FDR-002',
            external_ref: 'FDR-002',
            feeder_name: 'Mạch 2 - Lộ 2',
            control: { node_id: 'IOT-NODE-002', relay_no: 1, control_mode: 'auto' },
          },
          {
            feeder_id: 'FDR-003',
            external_ref: 'FDR-003',
            feeder_name: 'Mạch 3 - Lộ 3',
            control: { node_id: 'IOT-NODE-003', relay_no: 1, control_mode: 'auto' },
          },
        ],
      }
    )

    // Dòng Gateway hiện iot-server-01 (không hiện iot-server-99 vì không thuộc node nào của tủ)
    expect(await screen.findByText('iot-server-01')).toBeInTheDocument()
    expect(screen.queryByText('iot-server-99')).not.toBeInTheDocument()

    // Mã node hiện đủ cả 3 node không bị cắt và nhãn ngắn hiển thị
    expect(screen.getByText('IOT-NODE-001')).toBeInTheDocument()
    expect(screen.getByText('IOT-NODE-002')).toBeInTheDocument()
    expect(screen.getByText('IOT-NODE-003')).toBeInTheDocument()
    expect(screen.getAllByText('online').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('mất tín hiệu')).toBeInTheDocument()

    // Trước khi bấm, getFeederElectricalHistory KHÔNG được gọi và không thấy nút Xem lịch sử mạch
    expect(iotAPI.getFeederElectricalHistory).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Xem lịch sử mạch' })).not.toBeInTheDocument()

    // Bấm dòng mạch 1 -> aria-expanded="true" và thấy nút "Xem lịch sử mạch" ngoài khối số đo cùng mã mạch FDR-001
    const btn1 = screen.getByRole('button', { name: /Mạch 1 - Lộ 1/ })
    expect(btn1).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn1)

    expect(btn1).toHaveAttribute('aria-expanded', 'true')
    const historyBtn = screen.getByRole('button', { name: 'Xem lịch sử mạch' })
    expect(historyBtn).toBeInTheDocument()
    const summaryEl = await screen.findByTestId('feeder-electrical-summary')
    expect(summaryEl.contains(historyBtn)).toBe(false)
    fireEvent.click(historyBtn)
    expect(await screen.findByRole('dialog', { name: 'Lịch sử mạch FDR-001' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Lịch sử mạch FDR-001' })).not.toBeInTheDocument()
    expect(within(document.getElementById('feeder-detail-FDR-001')!).getByText('FDR-001')).toBeInTheDocument()

    // Bấm mạch 2 -> mạch 1 đóng, mạch 2 mở
    const btn2 = screen.getByRole('button', { name: /Mạch 2 - Lộ 2/ })
    expect(btn2).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn2)

    expect(btn1).toHaveAttribute('aria-expanded', 'false')
    expect(btn2).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('feeder-detail-FDR-001')).toBeNull()
    expect(document.getElementById('feeder-detail-FDR-002')).not.toBeNull()
  })
})

