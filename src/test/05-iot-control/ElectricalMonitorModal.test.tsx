import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import {
  ElectricalMonitorModal,
  HISTORY_PAGE_SAMPLES,
  type ElectricalMonitorTarget,
} from '../../pages/gis-map/components/ElectricalMonitorModal'
import { FeederElectricalSummary, SPARKLINE_SAMPLES } from '../../pages/gis-map/components/FeederElectricalSummary'
import { ELECTRICAL_POLL_MS } from '../../hooks/iot/useElectricalSeries'
import { buildMonitorTarget } from '../../utils/iot/electricalMonitor'
import iotAPI from '../../feature/iot/iotAPI'
import type { FeederListItem } from '../../types/assets/feeders'

vi.mock('../../feature/iot/iotAPI', () => ({
  default: {
    getFeederElectricalHistory: vi.fn(),
    getFeederElectrical: vi.fn(),
    getNodes: vi.fn(),
    getServers: vi.fn(),
  },
}))

const api = vi.mocked(iotAPI)

const sample = (
  _cursor: number,
  minute: number,
  current: number,
  _nodeId: string | null = 'NODE-001',
  _serverId: string | null = 'srv-1'
) => ({
  period_start: `2026-11-16T01:${String(minute).padStart(2, '0')}:00Z`,
  period_end: `2026-11-16T01:${String(minute).padStart(2, '0')}:30Z`,
  sample_count: 3,
  voltage_avg: 5,
  current_ma_avg: current,
  power_mw_avg: current * 5,
  is_complete: true,
})

const target: ElectricalMonitorTarget = {
  title: 'Tủ A - Tỉnh Lộ 8',
  cabinetId: 'CAB-TL8',
  feeders: [
    { feeder_id: 'FDR-009', label: 'FDR-CAB-TL8-A', name: 'Mạch A - Tỉnh Lộ 8', node_id: 'NODE-001' },
    { feeder_id: 'FDR-010', label: 'FDR-CAB-TL8-B', name: 'Mạch B - Tỉnh Lộ 8', node_id: 'NODE-002' },
    { feeder_id: 'FDR-011', label: 'FDR-CAB-TL8-C', name: 'Mạch C - Tỉnh Lộ 8', node_id: null },
  ],
  activeFeederId: 'FDR-009',
}

const renderModal = (t: ElectricalMonitorTarget = target, onSelectFeeder = vi.fn(), onClose = vi.fn()) =>
  render(<ElectricalMonitorModal target={t} onSelectFeeder={onSelectFeeder} onClose={onClose} />)

describe('ElectricalMonitorModal (popup giám sát điện tủ GIS)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getFeederElectrical.mockResolvedValue({ status: 'online', power_state: 'on' })
    api.getNodes.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 })
    api.getServers.mockResolvedValue([])
    // Trang đầu: mới nhất trước.
    api.getFeederElectricalHistory.mockResolvedValue({
      page: 1,
      page_size: 200,
      total: 2,
      items: [sample(11, 2, 98.5), sample(10, 1, 100)],
    })
  })

  afterEach(() => vi.useRealTimers())

  it('renders with role="dialog", closes on Escape and closes on clicking the close button', async () => {
    const onClose = vi.fn()
    renderModal(target, vi.fn(), onClose)
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    const closeBtn = screen.getByRole('button', { name: 'Đóng giám sát điện' })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('loads the newest samples of the active feeder node and shows the latest values, power first', async () => {
    renderModal()
    await waitFor(() =>
      expect(api.getFeederElectricalHistory).toHaveBeenCalledWith('FDR-009', { page: 1, page_size: HISTORY_PAGE_SAMPLES })
    )
    const latest = await screen.findByTestId('iot-latest-sample')
    // Mẫu mới nhất là cursor 11 (98.5 mA), không phải phần tử cuối của trang.
    await waitFor(() => expect(latest).toHaveTextContent('492.5 mW'))
    expect(latest).toHaveTextContent('98.5 mA')
    expect(screen.getByRole('button', { name: /Công suất/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/2 mẫu/)).toBeInTheDocument()
  })

  it('switches the charted metric', async () => {
    renderModal()
    await screen.findByText(/2 mẫu/)
    fireEvent.click(screen.getByRole('button', { name: /Điện áp/ }))
    expect(screen.getByRole('button', { name: /Điện áp/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Công suất/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking "1 giờ" then "24 giờ" does NOT increase getFeederElectricalHistory calls (switch range without API)', async () => {
    renderModal()
    await waitFor(() =>
      expect(api.getFeederElectricalHistory).toHaveBeenCalledWith('FDR-009', { page: 1, page_size: HISTORY_PAGE_SAMPLES })
    )
    const initialCalls = api.getFeederElectricalHistory.mock.calls.length

    const btn1h = screen.getByRole('button', { name: '1 giờ' })
    fireEvent.click(btn1h)
    expect(btn1h).toHaveAttribute('aria-pressed', 'true')
    expect(api.getFeederElectricalHistory).toHaveBeenCalledTimes(initialCalls)

    const btn24h = screen.getByRole('button', { name: '24 giờ' })
    fireEvent.click(btn24h)
    expect(btn24h).toHaveAttribute('aria-pressed', 'true')
    expect(api.getFeederElectricalHistory).toHaveBeenCalledTimes(initialCalls)
  })

  it('does NOT display "Mạch chưa có mẫu điện nào." while backfilling older pages', async () => {
    let resolvePage2: (v: unknown) => void = () => {}
    const page1Items = Array.from({ length: HISTORY_PAGE_SAMPLES }, (_, i) =>
      sample(1000 - i, 2, 98.5)
    )
    api.getFeederElectricalHistory
      .mockResolvedValueOnce({
        page: 1,
        page_size: HISTORY_PAGE_SAMPLES,
        total: 300,
        items: page1Items,
      })
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePage2 = resolve }) as never)

    renderModal()
    expect(await screen.findByText(/98.5 mA/)).toBeInTheDocument()
    expect(screen.getByText(/Đang tải lịch sử/)).toBeInTheDocument()
    expect(screen.queryByText('Mạch chưa có mẫu điện nào.')).not.toBeInTheDocument()

    await act(async () => {
      resolvePage2({
        page: 2,
        page_size: HISTORY_PAGE_SAMPLES,
        total: 300,
        items: [sample(10, 1, 100)],
      })
    })
    expect(screen.queryByText('Mạch chưa có mẫu điện nào.')).not.toBeInTheDocument()
  })

  it('displays the active feeder name in the feeder picker button with 3 feeders', () => {
    renderModal(target)
    const pickerBtn = screen.getByRole('button', { name: /Mạch A - Tỉnh Lộ 8/ })
    expect(pickerBtn).toBeInTheDocument()
    expect(pickerBtn).toHaveAttribute('aria-haspopup', 'listbox')
    expect(pickerBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('clicking › calls onSelectFeeder with the next feeder, and ‹ is disabled on the first feeder', () => {
    const onSelect = vi.fn()
    renderModal(target, onSelect)
    const prevBtn = screen.getByRole('button', { name: 'Mạch trước' })
    const nextBtn = screen.getByRole('button', { name: 'Mạch sau' })
    expect(prevBtn).toBeDisabled()
    expect(nextBtn).not.toBeDisabled()

    fireEvent.click(nextBtn)
    expect(onSelect).toHaveBeenCalledWith('FDR-010')
  })

  it('opens popover, filters with search input down to 1 item', () => {
    renderModal(target)
    const pickerBtn = screen.getByRole('button', { name: /Mạch A - Tỉnh Lộ 8/ })
    fireEvent.click(pickerBtn)
    expect(pickerBtn).toHaveAttribute('aria-expanded', 'true')

    const searchInput = screen.getByRole('combobox')
    expect(searchInput).toBeInTheDocument()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)

    fireEvent.change(searchInput, { target: { value: 'Mạch B' } })
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option')).toHaveTextContent('Mạch B - Tỉnh Lộ 8')
  })

  it('navigates with ArrowDown + Enter in search input to call onSelectFeeder', () => {
    const onSelect = vi.fn()
    renderModal(target, onSelect)
    const pickerBtn = screen.getByRole('button', { name: /Mạch A - Tỉnh Lộ 8/ })
    fireEvent.click(pickerBtn)

    const searchInput = screen.getByRole('combobox')
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' })
    fireEvent.keyDown(searchInput, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('FDR-010')
  })

  it('Escape closes popover without calling onClose, second Escape calls onClose', () => {
    const onClose = vi.fn()
    renderModal(target, vi.fn(), onClose)
    const pickerBtn = screen.getByRole('button', { name: /Mạch A - Tỉnh Lộ 8/ })
    fireEvent.click(pickerBtn)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    const searchInput = screen.getByRole('combobox')
    fireEvent.keyDown(searchInput, { key: 'Escape' })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders static text and no aria-haspopup="listbox" button when cabinet has only 1 feeder', () => {
    const singleTarget: ElectricalMonitorTarget = {
      title: 'Tủ 1 mạch',
      cabinetId: 'CAB-1',
      feeders: [
        { feeder_id: 'FDR-001', label: 'FDR-CAB-1-L1', name: 'Mạch 1', node_id: 'NODE-001' },
      ],
      activeFeederId: 'FDR-001',
    }
    renderModal(singleTarget)
    expect(screen.queryByRole('button', { name: 'Mạch trước' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mạch sau' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Mạch 1/ })).not.toBeInTheDocument()
    expect(screen.getByText('Mạch 1')).toBeInTheDocument()
    expect(document.querySelector('[aria-haspopup="listbox"]')).toBeNull()
  })

  it('a feeder without an IoT node (FDR-011) calls API and does not poll', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderModal({ ...target, activeFeederId: 'FDR-011' })
    await waitFor(() =>
      expect(api.getFeederElectricalHistory).toHaveBeenCalledWith('FDR-011', { page: 1, page_size: HISTORY_PAGE_SAMPLES })
    )
    expect(screen.getByText(/không gắn node · chỉ xem lịch sử đo trước đây/)).toBeInTheDocument()
    expect(screen.getByText('Không gắn node · chỉ xem lịch sử')).toBeInTheDocument()

    // Advance timers: không hỏi định kỳ
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS * 2)
    })
    expect(api.getFeederElectricalHistory).toHaveBeenCalledTimes(1)
  })

  it('deduplicates samples with the same server_id:cursor', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.getFeederElectricalHistory
      .mockResolvedValueOnce({ page: 1, page_size: 200, total: 2, items: [sample(11, 2, 98.5), sample(10, 1, 100)] })
      .mockResolvedValueOnce({ page: 1, page_size: 20, total: 2, items: [sample(11, 2, 98.5)] })

    renderModal()
    await screen.findByText(/2 mẫu/)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS)
    })

    // Vẫn là 2 mẫu, không bị nhân đôi
    expect(await screen.findByText(/2 mẫu/)).toBeInTheDocument()
  })

  it('polls for new samples with page 1, page_size: 20 and appends them', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.getFeederElectricalHistory
      .mockResolvedValueOnce({ page: 1, page_size: 200, total: 2, items: [sample(11, 2, 98.5), sample(10, 1, 100)] })
      .mockResolvedValueOnce({ page: 1, page_size: 20, total: 3, items: [sample(12, 3, 0.4)] })
    renderModal()
    await screen.findByText(/2 mẫu/)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS)
    })

    expect(api.getFeederElectricalHistory).toHaveBeenCalledWith('FDR-009', { page: 1, page_size: 20 })
    expect(await screen.findByText(/3 mẫu/)).toBeInTheDocument()
    expect(screen.getByTestId('iot-latest-sample')).toHaveTextContent('0.4 mA')
  })

  it('never overlaps polls while the backend is slow, and polls quietly without reloading the chart', async () => {
    expect(ELECTRICAL_POLL_MS).toBe(10_000)
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let answer: (v: unknown) => void = () => {}
    api.getFeederElectricalHistory
      .mockResolvedValueOnce({ page: 1, page_size: 200, total: 2, items: [sample(11, 2, 98.5), sample(10, 1, 100)] })
      .mockImplementationOnce(() => new Promise((r) => (answer = r)) as never)
    renderModal()
    await screen.findByText(/2 mẫu/)

    // BE chưa trả lời lần hỏi đầu: qua ba chu kỳ vẫn chỉ một request định kỳ (tổng cộng 2 request)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS * 3)
    })
    expect(api.getFeederElectricalHistory).toHaveBeenCalledTimes(2)
    // Đang chờ vẫn giữ số và biểu đồ cũ, không quay lại trạng thái đang tải
    expect(screen.getByTestId('iot-latest-sample')).toHaveTextContent('98.5 mA')
    expect(document.querySelector('.animate-spin')).toBeNull()

    await act(async () => {
      answer({ page: 1, page_size: 20, total: 3, items: [sample(12, 3, 0.4)] })
    })
    expect(await screen.findByText(/3 mẫu/)).toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS)
    })
    expect(api.getFeederElectricalHistory).toHaveBeenCalledTimes(3)
    expect(api.getFeederElectricalHistory).toHaveBeenLastCalledWith('FDR-009', { page: 1, page_size: 20 })
  })

  it('stops polling once the modal is closed (unmounted)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { unmount } = renderModal()
    await screen.findByText(/2 mẫu/)
    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS * 2)
    })
    expect(api.getFeederElectricalHistory).toHaveBeenCalledTimes(1)
  })

  it('polls getFeederElectrical periodically when feeder has a node, but only calls once when feeder has no node', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.getFeederElectrical.mockResolvedValue({ status: 'online', power_state: 'on' })

    // Mạch có node (FDR-009)
    const { unmount } = renderModal(target)
    await waitFor(() => expect(api.getFeederElectrical).toHaveBeenCalledWith('FDR-009'))
    expect(api.getFeederElectrical).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS)
    })
    expect(api.getFeederElectrical).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS)
    })
    expect(api.getFeederElectrical).toHaveBeenCalledTimes(3)
    unmount()

    // Mạch không có node (FDR-011)
    api.getFeederElectrical.mockClear()
    renderModal({ ...target, activeFeederId: 'FDR-011' })
    await waitFor(() => expect(api.getFeederElectrical).toHaveBeenCalledWith('FDR-011'))
    expect(api.getFeederElectrical).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS * 2)
    })
    // Không hỏi định kỳ vì không có node
    expect(api.getFeederElectrical).toHaveBeenCalledTimes(1)
  })

  it('shows the backend message when the node has no measurement source (503)', async () => {
    api.getFeederElectricalHistory.mockRejectedValue({
      response: { data: { error: { message: 'Chưa cấu hình nguồn điều khiển cho thiết bị IoT.' } } },
    })
    renderModal()
    expect(await screen.findByText('Chưa cấu hình nguồn điều khiển cho thiết bị IoT.')).toBeInTheDocument()
    expect(screen.getByText('Chưa có mẫu điện nào.')).toBeInTheDocument()
  })

  it('keeps retrying after a failed first load, so the chart starts once the source is configured', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.getFeederElectricalHistory.mockRejectedValueOnce({
      response: { data: { error: { message: 'Chưa cấu hình nguồn điều khiển cho thiết bị IoT.' } } },
    })
    renderModal()
    expect(await screen.findByText('Chưa cấu hình nguồn điều khiển cho thiết bị IoT.')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS)
    })

    expect(api.getFeederElectricalHistory).toHaveBeenCalledTimes(2)
    expect(await screen.findByText(/2 mẫu/)).toBeInTheDocument()
    expect(screen.queryByText('Chưa cấu hình nguồn điều khiển cho thiết bị IoT.')).not.toBeInTheDocument()
  })
})

describe('FeederElectricalSummary (dòng số đo trong mạch của khung tủ)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getFeederElectricalHistory.mockResolvedValue({
      page: 1,
      page_size: 30,
      total: 2,
      items: [sample(11, 2, 98.5), sample(10, 1, 100)],
    })
  })

  it('shows the latest power, current and voltage of the feeder node, and opens the chart', async () => {
    const open = vi.fn()
    render(<FeederElectricalSummary feederId="FDR-009" nodeId="NODE-001" onOpenChart={open} />)
    await waitFor(() =>
      expect(api.getFeederElectricalHistory).toHaveBeenCalledWith('FDR-009', { page: 1, page_size: SPARKLINE_SAMPLES })
    )
    expect(await screen.findByText('492.5 mW')).toBeInTheDocument()
    expect(screen.getByTestId('feeder-electrical-summary')).toHaveTextContent('98.5 mA · 5.000 V')
    fireEvent.click(screen.getByRole('button', { name: /Biểu đồ/ }))
    expect(open).toHaveBeenCalled()
  })

  it('a feeder without an IoT node and no samples shows unattached message', async () => {
    api.getFeederElectricalHistory.mockResolvedValueOnce({ page: 1, page_size: 30, total: 0, items: [] })
    render(<FeederElectricalSummary feederId="FDR-011" nodeId={null} onOpenChart={vi.fn()} />)
    await waitFor(() =>
      expect(api.getFeederElectricalHistory).toHaveBeenCalledWith('FDR-011', { page: 1, page_size: SPARKLINE_SAMPLES })
    )
    expect(await screen.findByText(/chưa gắn IoT/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Biểu đồ/ })).not.toBeInTheDocument()
  })

  it('a feeder without an IoT node but with samples shows numbers and "Không gắn node"', async () => {
    render(<FeederElectricalSummary feederId="FDR-011" nodeId={null} onOpenChart={vi.fn()} />)
    await waitFor(() =>
      expect(api.getFeederElectricalHistory).toHaveBeenCalledWith('FDR-011', { page: 1, page_size: SPARKLINE_SAMPLES })
    )
    expect(await screen.findByText('492.5 mW')).toBeInTheDocument()
    expect(screen.getByText(/Không gắn node · mẫu cuối/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Biểu đồ/ })).toBeInTheDocument()
  })
})

describe('buildMonitorTarget', () => {
  const feeder = (feeder_id: string, external_ref: string, cabinet_id: string, node_id: string | null) =>
    ({
      feeder_id,
      external_ref,
      feeder_name: null,
      commune_id: null,
      commune_name: null,
      has_geometry: false,
      pole_count: 0,
      updated_at: null,
      cabinet: { cabinet_id, cabinet_name: `Tủ ${cabinet_id}`, location: { lat: 0, lng: 0 }, cabinet_source: 'verified' },
      control: node_id ? { node_id, relay_no: 1 } : undefined,
    }) as FeederListItem

  // Dữ liệu dev: mã hiển thị của mạch này trùng mã nội bộ của mạch kia
  const feeders = [
    feeder('FDR-009', 'FDR-CAB-A1', 'CAB-1', 'NODE-001'),
    feeder('FDR-010', 'FDR-CAB-A2', 'CAB-1', null),
    feeder('FDR-011', 'FDR-009', 'CAB-2', 'NODE-003'),
  ]

  it('lists every feeder of the same cabinet as tabs and opens on the asked feeder', () => {
    const t = buildMonitorTarget('FDR-010', feeders)
    expect(t.title).toBe('Tủ CAB-1')
    expect(t.cabinetId).toBe('CAB-1')
    expect(t.feeders).toEqual([
      { feeder_id: 'FDR-009', label: 'FDR-CAB-A1', name: '', node_id: 'NODE-001' },
      { feeder_id: 'FDR-010', label: 'FDR-CAB-A2', name: '', node_id: null },
    ])
    expect(t.activeFeederId).toBe('FDR-010')
  })

  it('matches the internal id before the display code', () => {
    expect(buildMonitorTarget('FDR-009', feeders).title).toBe('Tủ CAB-1')
  })

  it('uses the node known by the caller when the feeder list has none, and works for an unknown feeder', () => {
    expect(buildMonitorTarget('FDR-010', feeders, 'NODE-X').feeders[1].node_id).toBe('NODE-X')
    expect(buildMonitorTarget('FDR-404', feeders, 'NODE-Y')).toEqual({
      title: 'Mạch FDR-404',
      cabinetId: null,
      feeders: [{ feeder_id: 'FDR-404', label: 'FDR-404', name: '', node_id: 'NODE-Y' }],
      activeFeederId: 'FDR-404',
    })
  })
})
