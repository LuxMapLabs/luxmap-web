import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import {
  ElectricalMonitorDock,
  INITIAL_SAMPLES,
  type ElectricalMonitorTarget,
} from '../../pages/gis-map/components/ElectricalMonitorDock'
import { FeederElectricalSummary, SPARKLINE_SAMPLES } from '../../pages/gis-map/components/FeederElectricalSummary'
import { ELECTRICAL_POLL_MS } from '../../hooks/iot/useElectricalSeries'
import { buildMonitorTarget } from '../../utils/iot/electricalMonitor'
import { bucketElectricalPoints } from '../../utils/iot/electricalSeries'
import iotAPI from '../../feature/iot/iotAPI'
import type { FeederListItem } from '../../types/assets/feeders'

vi.mock('../../feature/iot/iotAPI', () => ({
  default: { getElectricalHistoryPage: vi.fn(), getElectricalHistory: vi.fn() },
}))

const api = vi.mocked(iotAPI)

const sample = (cursor: number, minute: number, current: number) => ({
  cursor,
  reading: {
    received_at: `2026-11-16T01:${String(minute).padStart(2, '0')}:00Z`,
    data: { voltage: 5, current, power: current * 5, lamp_command: 'ON' },
  },
})

const target: ElectricalMonitorTarget = {
  title: 'Tủ A - Tỉnh Lộ 8',
  feeders: [
    { feeder_id: 'FDR-009', label: 'FDR-CAB-TL8-A', node_id: 'NODE-001' },
    { feeder_id: 'FDR-010', label: 'FDR-CAB-TL8-B', node_id: 'NODE-002' },
    { feeder_id: 'FDR-011', label: 'FDR-CAB-TL8-C', node_id: null },
  ],
  activeFeederId: 'FDR-009',
}

const renderDock = (t: ElectricalMonitorTarget = target, onSelectFeeder = vi.fn()) =>
  render(<ElectricalMonitorDock target={t} onSelectFeeder={onSelectFeeder} onClose={vi.fn()} />)

describe('ElectricalMonitorDock (bảng giám sát điện dưới bản đồ GIS)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Trang đầu: mới nhất trước.
    api.getElectricalHistoryPage.mockResolvedValue({ page: 1, page_size: 200, total: 2, items: [sample(11, 2, 98.5), sample(10, 1, 100)] })
    api.getElectricalHistory.mockResolvedValue({ items: [], next_cursor: 11, has_more: false })
  })

  afterEach(() => vi.useRealTimers())

  it('loads the newest samples of the active feeder node and shows the latest values, power first', async () => {
    renderDock()
    await waitFor(() =>
      expect(api.getElectricalHistoryPage).toHaveBeenCalledWith('NODE-001', { page: 1, page_size: INITIAL_SAMPLES })
    )
    const latest = await screen.findByTestId('iot-latest-sample')
    // Mẫu mới nhất là cursor 11 (98.5 mA), không phải phần tử cuối của trang.
    await waitFor(() => expect(latest).toHaveTextContent('492.5 mW'))
    expect(latest).toHaveTextContent('98.5 mA')
    expect(screen.getByRole('button', { name: /Công suất/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/2 mẫu/)).toBeInTheDocument()
  })

  it('switches the charted metric', async () => {
    renderDock()
    await screen.findByText(/2 mẫu/)
    fireEvent.click(screen.getByRole('button', { name: /Điện áp/ }))
    expect(screen.getByRole('button', { name: /Điện áp/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Công suất/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows one tab per feeder of the cabinet and switching tab reads that feeder node', async () => {
    const onSelect = vi.fn()
    const { rerender } = renderDock(target, onSelect)
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['FDR-CAB-TL8-A', 'FDR-CAB-TL8-B', 'FDR-CAB-TL8-C'])
    fireEvent.click(screen.getByRole('tab', { name: 'FDR-CAB-TL8-B' }))
    expect(onSelect).toHaveBeenCalledWith('FDR-010')

    rerender(<ElectricalMonitorDock target={{ ...target, activeFeederId: 'FDR-010' }} onSelectFeeder={onSelect} onClose={vi.fn()} />)
    await waitFor(() => expect(api.getElectricalHistoryPage).toHaveBeenCalledWith('NODE-002', { page: 1, page_size: INITIAL_SAMPLES }))
  })

  it('a feeder without an IoT node says so and calls no API', () => {
    renderDock({ ...target, activeFeederId: 'FDR-011' })
    expect(screen.getByText(/chưa gắn thiết bị IoT/)).toBeInTheDocument()
    expect(api.getElectricalHistoryPage).not.toHaveBeenCalled()
  })

  it('polls for new samples with after = the largest cursor it holds, and appends them', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.getElectricalHistory.mockResolvedValueOnce({ items: [sample(12, 3, 0.4)], next_cursor: 12, has_more: false })
    renderDock()
    await screen.findByText(/2 mẫu/)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS)
    })

    expect(api.getElectricalHistory).toHaveBeenCalledWith('NODE-001', 11, 100)
    expect(await screen.findByText(/3 mẫu/)).toBeInTheDocument()
    expect(screen.getByTestId('iot-latest-sample')).toHaveTextContent('0.4 mA')
  })

  it('never overlaps polls while the backend is slow, and polls quietly without reloading the chart', async () => {
    // Node ghi một mẫu mỗi 10 s: hỏi theo đúng nhịp đó
    expect(ELECTRICAL_POLL_MS).toBe(10_000)
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let answer: (v: unknown) => void = () => {}
    api.getElectricalHistory.mockImplementationOnce(() => new Promise((r) => (answer = r)) as never)
    renderDock()
    await screen.findByText(/2 mẫu/)

    // BE chưa trả lời lần hỏi đầu: qua ba chu kỳ vẫn chỉ một request
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS * 3)
    })
    expect(api.getElectricalHistory).toHaveBeenCalledTimes(1)
    // Đang chờ vẫn giữ số và biểu đồ cũ, không quay lại trạng thái đang tải
    expect(screen.getByTestId('iot-latest-sample')).toHaveTextContent('98.5 mA')
    expect(document.querySelector('.animate-spin')).toBeNull()

    await act(async () => {
      answer({ items: [sample(12, 3, 0.4)], next_cursor: 12, has_more: false })
    })
    expect(await screen.findByText(/3 mẫu/)).toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS)
    })
    expect(api.getElectricalHistory).toHaveBeenCalledTimes(2)
    expect(api.getElectricalHistory).toHaveBeenLastCalledWith('NODE-001', 12, 100)
  })

  it('stops polling once the dock is closed (unmounted)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { unmount } = renderDock()
    await screen.findByText(/2 mẫu/)
    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS * 2)
    })
    expect(api.getElectricalHistory).not.toHaveBeenCalled()
  })

  it('shows the backend message when the node has no measurement source (503)', async () => {
    api.getElectricalHistoryPage.mockRejectedValue({ response: { data: { error: { message: 'Chưa cấu hình nguồn điều khiển cho thiết bị IoT.' } } } })
    renderDock()
    expect(await screen.findByText('Chưa cấu hình nguồn điều khiển cho thiết bị IoT.')).toBeInTheDocument()
    expect(screen.getByText('Chưa có mẫu điện nào.')).toBeInTheDocument()
  })

  it('keeps retrying after a failed first load, so the chart starts once the source is configured', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.getElectricalHistoryPage.mockRejectedValueOnce({ response: { data: { error: { message: 'Chưa cấu hình nguồn điều khiển cho thiết bị IoT.' } } } })
    renderDock()
    expect(await screen.findByText('Chưa cấu hình nguồn điều khiển cho thiết bị IoT.')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS)
    })

    expect(api.getElectricalHistoryPage).toHaveBeenCalledTimes(2)
    expect(await screen.findByText(/2 mẫu/)).toBeInTheDocument()
    expect(screen.queryByText('Chưa cấu hình nguồn điều khiển cho thiết bị IoT.')).not.toBeInTheDocument()
  })
})

describe('ElectricalMonitorDock: chế độ xem từng mẫu / theo phút / theo giờ', () => {
  // Mẫu k = 0 là mới nhất; cách nhau 3 phút, nên mỗi trang 200 mẫu phủ 10 giờ
  const NEWEST = Date.parse('2026-11-16T12:00:00Z')
  const spaced = (k: number) => ({
    cursor: 100_000 - k,
    reading: { received_at: new Date(NEWEST - k * 180_000).toISOString(), data: { voltage: 5, current: 100, power: 500, lamp_command: 'ON' } },
  })

  beforeEach(() => {
    vi.clearAllMocks()
    api.getElectricalHistoryPage.mockImplementation(async (_node, { page, page_size }) => ({
      page,
      page_size,
      total: 10_000,
      items: Array.from({ length: page_size }, (_, i) => spaced((page - 1) * page_size + i)),
    }))
    api.getElectricalHistory.mockResolvedValue({ items: [], next_cursor: 0, has_more: false })
  })

  it('opens on "Theo phút" (3 hours): one page of 10 hours is enough; there is no single-sample mode', async () => {
    renderDock()
    // 3 giờ / 3 phút + mẫu đầu = 61 mẫu, gộp theo phút còn 61 điểm
    expect(await screen.findByText(/61 mẫu · 61 điểm/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Theo phút' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Từng mẫu' })).not.toBeInTheDocument()
    expect(api.getElectricalHistoryPage).toHaveBeenCalledTimes(1)
  })

  it('"Theo giờ" loads older pages until 24 hours are covered, keeps only that window and averages per hour', async () => {
    renderDock()
    await screen.findByText(/61 mẫu/)
    fireEvent.click(screen.getByRole('button', { name: 'Theo giờ' }))

    // Trang 1–3 phủ 30 giờ ≥ 24 giờ: dừng, không hỏi trang 4
    await waitFor(() => expect(api.getElectricalHistoryPage).toHaveBeenCalledWith('NODE-001', { page: 3, page_size: INITIAL_SAMPLES }))
    expect(api.getElectricalHistoryPage).not.toHaveBeenCalledWith('NODE-001', { page: 4, page_size: INITIAL_SAMPLES })
    // 24 giờ / 3 phút + mẫu đầu = 481 mẫu, gộp còn 24–25 điểm giờ
    expect(await screen.findByText(/481 mẫu · 2[45] điểm/)).toBeInTheDocument()
    expect(screen.getByText(/Trung bình mỗi giờ · 24 giờ gần nhất/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Theo giờ' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('says when the server holds less than the window, and stops paging on a short page', async () => {
    api.getElectricalHistoryPage.mockImplementation(async (_node, { page, page_size }) => ({
      page,
      page_size,
      total: 20,
      items: page === 1 ? Array.from({ length: 20 }, (_, i) => spaced(i)) : [],
    }))
    renderDock()
    await screen.findByText(/20 mẫu/)
    fireEvent.click(screen.getByRole('button', { name: 'Theo phút' }))

    // Trang đầu ngắn hơn page_size: hết dữ liệu, không hỏi trang 2
    await waitFor(() => expect(screen.getByText(/dữ liệu chỉ có từ/)).toBeInTheDocument())
    expect(api.getElectricalHistoryPage).not.toHaveBeenCalledWith('NODE-001', { page: 2, page_size: INITIAL_SAMPLES })
    expect(screen.getByText(/20 mẫu · 20 điểm/)).toBeInTheDocument()
  })
})

describe('bucketElectricalPoints', () => {
  const point = (time: string, power: number | null, cursor: number) => ({
    cursor,
    time: Date.parse(time),
    current: null,
    voltage: 5,
    power,
    lamp: 'ON',
  })

  it('averages each metric per bucket, ignoring nulls, and counts the raw samples', () => {
    const out = bucketElectricalPoints(
      [
        point('2026-11-16T01:00:10Z', 100, 1),
        point('2026-11-16T01:00:50Z', 200, 2),
        point('2026-11-16T01:00:55Z', null, 3),
        point('2026-11-16T01:01:05Z', 50, 4),
      ],
      60_000
    )
    expect(out.map((p) => [new Date(p.time).toISOString(), p.power, p.count, p.cursor, p.current])).toEqual([
      ['2026-11-16T01:00:00.000Z', 150, 3, 3, null],
      ['2026-11-16T01:01:00.000Z', 50, 1, 4, null],
    ])
  })

  it('bucket 0 keeps every sample as its own point', () => {
    expect(bucketElectricalPoints([point('2026-11-16T01:00:10Z', 100, 1)], 0)).toEqual([
      { ...point('2026-11-16T01:00:10Z', 100, 1), count: 1 },
    ])
  })
})

describe('FeederElectricalSummary (dòng số đo trong mạch của khung tủ)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getElectricalHistoryPage.mockResolvedValue({ page: 1, page_size: 30, total: 2, items: [sample(11, 2, 98.5), sample(10, 1, 100)] })
  })

  it('shows the latest power, current and voltage of the feeder node, and opens the chart', async () => {
    const open = vi.fn()
    render(<FeederElectricalSummary nodeId="NODE-001" onOpenChart={open} />)
    await waitFor(() => expect(api.getElectricalHistoryPage).toHaveBeenCalledWith('NODE-001', { page: 1, page_size: SPARKLINE_SAMPLES }))
    expect(await screen.findByText('492.5 mW')).toBeInTheDocument()
    expect(screen.getByTestId('feeder-electrical-summary')).toHaveTextContent('98.5 mA · 5.000 V')
    fireEvent.click(screen.getByRole('button', { name: /Biểu đồ/ }))
    expect(open).toHaveBeenCalled()
  })

  it('a feeder without an IoT node calls no API', () => {
    render(<FeederElectricalSummary nodeId={null} onOpenChart={vi.fn()} />)
    expect(screen.getByText(/chưa gắn IoT/)).toBeInTheDocument()
    expect(api.getElectricalHistoryPage).not.toHaveBeenCalled()
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
    expect(t.feeders).toEqual([
      { feeder_id: 'FDR-009', label: 'FDR-CAB-A1', node_id: 'NODE-001' },
      { feeder_id: 'FDR-010', label: 'FDR-CAB-A2', node_id: null },
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
      feeders: [{ feeder_id: 'FDR-404', label: 'FDR-404', node_id: 'NODE-Y' }],
      activeFeederId: 'FDR-404',
    })
  })
})
