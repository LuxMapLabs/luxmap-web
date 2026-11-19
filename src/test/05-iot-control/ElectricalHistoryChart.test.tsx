import React, { useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor, act } from '@testing-library/react'
import { renderWithSagaStore } from '../utils/sagaStore'
import iotMonitorReducer from '../../feature/iot/iotMonitorSlice'
import iotMonitorSaga from '../../feature/iot/iotMonitorSaga'
import {
  ElectricalHistoryChart,
  ElectricalRangeToggle,
  HISTORY_PAGE_SAMPLES,
} from '../../components/ElectricalHistoryChart'
import { FeederElectricalSummary, SPARKLINE_SAMPLES } from '../../pages/gis-map/components/FeederElectricalSummary'
import { ELECTRICAL_POLL_MS } from '../../hooks/iot/useElectricalSeries'
import type { ElectricalRange } from '../../utils/iot/electricalSeries'
import iotAPI from '../../feature/iot/iotAPI'

vi.mock('../../feature/iot/iotAPI', () => ({
  default: {
    getFeederElectricalHistory: vi.fn(),
    getFeederElectricalHistoryReceived: vi.fn(),
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

const renderWithMonitor = (ui: React.ReactElement) =>
  renderWithSagaStore(ui, {
    reducers: { iotMonitor: iotMonitorReducer },
    sagas: [iotMonitorSaga],
  })

const ChartWithRangeToggle: React.FC<{ feederId?: string; live?: boolean }> = ({
  feederId = 'FDR-009',
  live = true,
}) => {
  const [range, setRange] = useState<ElectricalRange>('6h')
  return (
    <div>
      <ElectricalRangeToggle value={range} onChange={setRange} />
      <ElectricalHistoryChart feederId={feederId} live={live} range={range} />
    </div>
  )
}

describe('ElectricalHistoryChart (biểu đồ lịch sử điện của mạch)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Trang đầu: mới nhất trước.
    api.getFeederElectricalHistory.mockResolvedValue({
      page: 1,
      page_size: 200,
      total: 2,
      items: [sample(11, 2, 98.5), sample(10, 1, 100)],
    })
  })

  afterEach(() => vi.useRealTimers())

  it('loads the newest samples of the active feeder node and shows the latest values, power first', async () => {
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
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
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    await screen.findByText(/2 mẫu/)
    fireEvent.click(screen.getByRole('button', { name: /Điện áp/ }))
    expect(screen.getByRole('button', { name: /Điện áp/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Công suất/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking "1 giờ" then "24 giờ" does NOT increase getFeederElectricalHistory calls (switch range without API)', async () => {
    renderWithMonitor(<ChartWithRangeToggle />)
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

    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    expect(await screen.findByText(/98.5 mA/)).toBeInTheDocument()
    expect(screen.getByText(/Đang tải thêm lịch sử/)).toBeInTheDocument()
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

  it('a feeder without an IoT node (FDR-011) calls API and does not poll', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-011" live={false} range="6h" />)
    await waitFor(() =>
      expect(api.getFeederElectricalHistory).toHaveBeenCalledWith('FDR-011', { page: 1, page_size: HISTORY_PAGE_SAMPLES })
    )
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

    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
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
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
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
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
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

  it('stops polling once the component is unmounted', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { unmount } = renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    await screen.findByText(/2 mẫu/)
    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS * 2)
    })
    expect(api.getFeederElectricalHistory).toHaveBeenCalledTimes(1)
  })

  it('shows the backend message when the node has no measurement source (503)', async () => {
    api.getFeederElectricalHistory.mockRejectedValue({
      response: { data: { error: { message: 'Chưa cấu hình nguồn điều khiển cho thiết bị IoT.' } } },
    })
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    expect(await screen.findByText('Chưa cấu hình nguồn điều khiển cho thiết bị IoT.')).toBeInTheDocument()
    expect(screen.getByText('Chưa có mẫu điện nào.')).toBeInTheDocument()
  })

  it('keeps retrying after a failed first load, so the chart starts once the source is configured', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.getFeederElectricalHistory.mockRejectedValueOnce({
      response: { data: { error: { message: 'Chưa cấu hình nguồn điều khiển cho thiết bị IoT.' } } },
    })
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    expect(await screen.findByText('Chưa cấu hình nguồn điều khiển cho thiết bị IoT.')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS)
    })

    expect(api.getFeederElectricalHistory).toHaveBeenCalledTimes(2)
    expect(await screen.findByText(/2 mẫu/)).toBeInTheDocument()
    expect(screen.queryByText('Chưa cấu hình nguồn điều khiển cho thiết bị IoT.')).not.toBeInTheDocument()
  })

  it('calls getFeederElectricalHistory by default and does NOT call getFeederElectricalHistoryReceived', async () => {
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    await waitFor(() =>
      expect(api.getFeederElectricalHistory).toHaveBeenCalledWith('FDR-009', {
        page: 1,
        page_size: HISTORY_PAGE_SAMPLES,
      })
    )
    expect(api.getFeederElectricalHistoryReceived).not.toHaveBeenCalled()
  })

  it('calls getFeederElectricalHistoryReceived when timeBasis="received_at" and does NOT call getFeederElectricalHistory', async () => {
    api.getFeederElectricalHistoryReceived.mockResolvedValue({
      page: 1,
      page_size: HISTORY_PAGE_SAMPLES,
      total: 2,
      items: [sample(11, 2, 98.5), sample(10, 1, 100)],
    })
    renderWithMonitor(
      <ElectricalHistoryChart feederId="FDR-009" live range="6h" timeBasis="received_at" />
    )
    await waitFor(() =>
      expect(api.getFeederElectricalHistoryReceived).toHaveBeenCalledWith('FDR-009', {
        page: 1,
        page_size: HISTORY_PAGE_SAMPLES,
      })
    )
    expect(api.getFeederElectricalHistory).not.toHaveBeenCalled()
  })

  it('dateRange calls API with from/to and page_size 200, and does NOT poll after 30s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const from = new Date('2026-11-15T00:00:00.000Z')
    const to = new Date('2026-11-16T00:00:00.000Z')
    renderWithMonitor(
      <ElectricalHistoryChart feederId="FDR-009" live range="6h" dateRange={{ from, to }} />
    )

    await waitFor(() =>
      expect(api.getFeederElectricalHistory).toHaveBeenCalledWith('FDR-009', {
        page: 1,
        page_size: 200,
        from: from.toISOString(),
        to: to.toISOString(),
      })
    )
    expect(screen.getByText('Xem theo khoảng ngày, không tự cập nhật')).toBeInTheDocument()
    expect(screen.getByText(/2 khoảng trong khoảng đã chọn/)).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })

    expect(api.getFeederElectricalHistory).toHaveBeenCalledTimes(1)
    expect(api.getFeederElectricalHistory).not.toHaveBeenCalledWith(
      'FDR-009',
      expect.objectContaining({ page_size: 20 })
    )
  })

  it('dateRange paginates when page 1 returns 200 items with total 250, then stops', async () => {
    const from = new Date('2026-11-15T00:00:00.000Z')
    const to = new Date('2026-11-16T00:00:00.000Z')
    const makeItem = (idx: number) => {
      const start = new Date(Date.UTC(2026, 10, 15, 0, 0, idx * 30))
      const end = new Date(start.getTime() + 30_000)
      return {
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        sample_count: 3,
        voltage_avg: 5,
        current_ma_avg: 100,
        power_mw_avg: 500,
        is_complete: true,
      }
    }
    const page1Items = Array.from({ length: 200 }, (_, i) => makeItem(250 - i))
    const page2Items = Array.from({ length: 50 }, (_, i) => makeItem(50 - i))

    api.getFeederElectricalHistory
      .mockResolvedValueOnce({ page: 1, page_size: 200, total: 250, items: page1Items })
      .mockResolvedValueOnce({ page: 2, page_size: 200, total: 250, items: page2Items })

    renderWithMonitor(
      <ElectricalHistoryChart feederId="FDR-009" live range="6h" dateRange={{ from, to }} />
    )

    await waitFor(() =>
      expect(api.getFeederElectricalHistory).toHaveBeenCalledWith('FDR-009', {
        page: 2,
        page_size: 200,
        from: from.toISOString(),
        to: to.toISOString(),
      })
    )
    expect(api.getFeederElectricalHistory).toHaveBeenCalledTimes(2)
    expect(await screen.findByText(/250 khoảng trong khoảng đã chọn/)).toBeInTheDocument()
  })

  it('dateRange shows error on API failure and does NOT retry', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const from = new Date('2026-11-15T00:00:00.000Z')
    const to = new Date('2026-11-16T00:00:00.000Z')
    api.getFeederElectricalHistory.mockRejectedValue({
      response: { data: { error: { message: 'Lỗi tải dữ liệu khoảng ngày.' } } },
    })

    renderWithMonitor(
      <ElectricalHistoryChart feederId="FDR-009" live range="6h" dateRange={{ from, to }} />
    )

    expect(await screen.findByText('Lỗi tải dữ liệu khoảng ngày.')).toBeInTheDocument()
    expect(screen.queryByText('Tự thử lại sau 10 giây')).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ELECTRICAL_POLL_MS * 2)
    })
    expect(api.getFeederElectricalHistory).toHaveBeenCalledTimes(1)
  })

  it('dateRange shows empty state message when no samples in range', async () => {
    const from = new Date('2026-11-15T00:00:00.000Z')
    const to = new Date('2026-11-16T00:00:00.000Z')
    api.getFeederElectricalHistory.mockResolvedValueOnce({
      page: 1,
      page_size: 200,
      total: 0,
      items: [],
    })

    renderWithMonitor(
      <ElectricalHistoryChart feederId="FDR-009" live range="6h" dateRange={{ from, to }} />
    )

    expect(await screen.findByText('Không có số đo nào trong khoảng này.')).toBeInTheDocument()
    expect(screen.queryByText(/node gửi mẫu/)).not.toBeInTheDocument()
  })

  it('shows "Dao động trong ô" legend at range 6h and hides "Đèn bật" and "Đổi node"', async () => {
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    await screen.findByText(/2 mẫu/)

    const legend = screen.getByText('Dao động trong ô')
    expect(legend).toBeInTheDocument()
    expect(legend.closest('span[title]')).toHaveAttribute(
      'title',
      'Thấp nhất và cao nhất của các số trung bình 30 giây trong mỗi ô gom'
    )
    expect(screen.queryByText('Đèn bật')).not.toBeInTheDocument()
    expect(screen.queryByText('Đổi node')).not.toBeInTheDocument()
    expect(screen.queryByText('Thấp–cao')).not.toBeInTheDocument()
  })

  it('dateRange of 12 days calls API with from/to without warning and uses 1-hour bucket label', async () => {
    const from = new Date('2026-11-02T00:00:00.000Z')
    const to = new Date('2026-11-14T00:00:00.000Z')
    renderWithMonitor(
      <ElectricalHistoryChart feederId="FDR-009" live={false} range="6h" dateRange={{ from, to }} />
    )

    await waitFor(() =>
      expect(api.getFeederElectricalHistory).toHaveBeenCalledWith('FDR-009', {
        page: 1,
        page_size: 200,
        from: from.toISOString(),
        to: to.toISOString(),
      })
    )
    expect(screen.getByText(/trung bình mỗi 1 giờ/)).toBeInTheDocument()
    expect(screen.queryByText(/Chỉ xem được tối đa 3 ngày/)).not.toBeInTheDocument()
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

  it('shows the latest power, current and voltage of the feeder node', async () => {
    renderWithMonitor(<FeederElectricalSummary feederId="FDR-009" nodeId="NODE-001" />)
    await waitFor(() =>
      expect(api.getFeederElectricalHistory).toHaveBeenCalledWith('FDR-009', { page: 1, page_size: SPARKLINE_SAMPLES })
    )
    expect(await screen.findByText('492.5 mW')).toBeInTheDocument()
    expect(screen.getByTestId('feeder-electrical-summary')).toHaveTextContent('98.5 mA · 5.000 V')
    expect(screen.queryByRole('button', { name: /Xem lịch sử/ })).not.toBeInTheDocument()
  })

  it('a feeder without an IoT node and no samples shows unattached message', async () => {
    api.getFeederElectricalHistory.mockResolvedValueOnce({ page: 1, page_size: 30, total: 0, items: [] })
    renderWithMonitor(<FeederElectricalSummary feederId="FDR-011" nodeId={null} />)
    await waitFor(() =>
      expect(api.getFeederElectricalHistory).toHaveBeenCalledWith('FDR-011', { page: 1, page_size: SPARKLINE_SAMPLES })
    )
    expect(await screen.findByText(/chưa gắn IoT/)).toBeInTheDocument()
  })

  it('a feeder without an IoT node but with samples shows numbers and "Không gắn node"', async () => {
    renderWithMonitor(<FeederElectricalSummary feederId="FDR-011" nodeId={null} />)
    await waitFor(() =>
      expect(api.getFeederElectricalHistory).toHaveBeenCalledWith('FDR-011', { page: 1, page_size: SPARKLINE_SAMPLES })
    )
    expect(await screen.findByText('492.5 mW')).toBeInTheDocument()
    expect(screen.getByText(/Không gắn node · mẫu cuối/)).toBeInTheDocument()
  })

  it('renders latest measurements without any recharts sparkline wrapper', async () => {
    const { container } = renderWithMonitor(
      <FeederElectricalSummary feederId="FDR-009" nodeId="NODE-001" />
    )
    expect(await screen.findByText('492.5 mW')).toBeInTheDocument()
    expect(container.querySelector('.recharts-wrapper')).toBeNull()
  })
})
