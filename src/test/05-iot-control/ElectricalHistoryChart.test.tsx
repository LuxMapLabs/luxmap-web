import React, { useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor, act } from '@testing-library/react'
import { renderWithSagaStore } from '../utils/sagaStore'
import iotMonitorReducer from '../../feature/iot/iotMonitorSlice'
import iotMonitorSaga from '../../feature/iot/iotMonitorSaga'
import {
  ElectricalHistoryChart,
  ElectricalRangeToggle,
} from '../../components/ElectricalHistoryChart'
import { FeederElectricalSummary, SPARKLINE_SAMPLES } from '../../pages/gis-map/components/FeederElectricalSummary'
import { ELECTRICAL_POLL_MS } from '../../hooks/iot/useElectricalSeries'
import { useElectricalChunks } from '../../hooks/iot/useElectricalChunks'
import type { ElectricalChunkState, ElectricalPoint, ElectricalRange } from '../../utils/iot/electricalSeries'
import iotAPI from '../../feature/iot/iotAPI'

vi.mock('../../feature/iot/iotAPI', () => ({
  default: {
    getFeederElectricalHistory: vi.fn(),
    getFeederElectricalHistoryReceived: vi.fn(),
  },
}))

vi.mock('../../hooks/iot/useElectricalChunks', () => ({
  useElectricalChunks: vi.fn(),
}))

const api = vi.mocked(iotAPI)
const mockUseElectricalChunks = vi.mocked(useElectricalChunks)

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

const makePoint = (timeMs: number, current: number): ElectricalPoint => ({
  key: new Date(timeMs).toISOString(),
  cursor: timeMs,
  time: timeMs,
  current,
  voltage: 5,
  power: current * 5,
  lamp: null,
  node: null,
})

interface MockChunksReturn {
  points: ElectricalPoint[]
  latest: ElectricalPoint | null
  chunks: Record<number, ElectricalChunkState>
  viewLoading: boolean
  error: string | null
}

const setRecentChunksMock = (overrides?: Partial<MockChunksReturn>) => {
  const now = Date.now()
  const defaultPoints = [makePoint(now - 120_000, 100), makePoint(now - 60_000, 98.5)]
  const points = overrides?.points ?? defaultPoints
  const latest =
    overrides && 'latest' in overrides ? (overrides.latest ?? null) : (points[points.length - 1] ?? null)
  const result: MockChunksReturn = {
    points,
    latest,
    chunks: overrides?.chunks ?? {},
    viewLoading: overrides?.viewLoading ?? false,
    error: overrides?.error ?? null,
  }
  mockUseElectricalChunks.mockImplementation((feederId) =>
    feederId
      ? result
      : { points: [], latest: null, chunks: {}, viewLoading: false, error: null }
  )
  return result
}

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
    setRecentChunksMock()
    // Dữ liệu mặc định cho chế độ Theo ngày (useElectricalSeries)
    api.getFeederElectricalHistory.mockResolvedValue({
      page: 1,
      page_size: 200,
      total: 2,
      items: [sample(11, 2, 98.5), sample(10, 1, 100)],
    })
  })

  afterEach(() => vi.useRealTimers())

  it('loads the newest samples via useElectricalChunks and shows the latest values, power first', () => {
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    expect(mockUseElectricalChunks).toHaveBeenCalledWith(
      'FDR-009',
      expect.objectContaining({ timeBasis: 'measured_at', live: true, direction: 0 })
    )
    expect(api.getFeederElectricalHistory).not.toHaveBeenCalled()

    const latest = screen.getByTestId('iot-latest-sample')
    expect(latest).toHaveTextContent('492.5 mW')
    expect(latest).toHaveTextContent('98.5 mA')
    expect(screen.getByRole('button', { name: /Công suất/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/2 mẫu trong 6 giờ/)).toBeInTheDocument()
  })

  it('switches the charted metric', () => {
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    expect(screen.getByText(/2 mẫu/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Điện áp/ }))
    expect(screen.getByRole('button', { name: /Điện áp/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Công suất/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking "1 giờ" then "12 giờ" updates view window on useElectricalChunks without calling legacy API', () => {
    renderWithMonitor(<ChartWithRangeToggle />)

    const btn1h = screen.getByRole('button', { name: '1 giờ' })
    fireEvent.click(btn1h)
    expect(btn1h).toHaveAttribute('aria-pressed', 'true')
    const call1h = mockUseElectricalChunks.mock.calls[mockUseElectricalChunks.mock.calls.length - 1]
    expect(call1h[1].view.to - call1h[1].view.from).toBe(3_600_000)

    const btn12h = screen.getByRole('button', { name: '12 giờ' })
    fireEvent.click(btn12h)
    expect(btn12h).toHaveAttribute('aria-pressed', 'true')
    const call12h = mockUseElectricalChunks.mock.calls[mockUseElectricalChunks.mock.calls.length - 1]
    expect(call12h[1].view.to - call12h[1].view.from).toBe(12 * 3_600_000)

    expect(screen.queryByRole('button', { name: '24 giờ' })).not.toBeInTheDocument()
    expect(api.getFeederElectricalHistory).not.toHaveBeenCalled()
  })

  it('shows initial skeleton when viewLoading && points.length === 0 and does NOT show empty or legacy backfilling badge', () => {
    setRecentChunksMock({ points: [], latest: null, viewLoading: true })
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)

    expect(screen.queryByText('Mạch chưa có mẫu điện nào.')).not.toBeInTheDocument()
    expect(screen.queryByText(/Đang tải thêm lịch sử/)).not.toBeInTheDocument()
  })

  it('shows empty state "Mạch chưa có mẫu điện nào." only when !viewLoading && points.length === 0', () => {
    setRecentChunksMock({ points: [], latest: null, viewLoading: false })
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)

    expect(screen.getByText('Mạch chưa có mẫu điện nào.')).toBeInTheDocument()
    expect(screen.getByText(/Biểu đồ tự hiện khi node gửi mẫu/)).toBeInTheDocument()
  })

  it('thanh tiến trình mảnh chỉ hiện sau 300ms khi viewLoading và biến mất ngay khi hết loading', () => {
    vi.useFakeTimers()
    setRecentChunksMock({ viewLoading: true })

    const { rerender } = renderWithMonitor(
      <ElectricalHistoryChart feederId="FDR-009" live range="6h" />
    )

    // Ngay lúc đầu và trước 300ms: không nhấp nháy thanh tiến trình
    expect(screen.queryByTestId('electrical-loading-bar')).not.toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(screen.queryByTestId('electrical-loading-bar')).not.toBeInTheDocument()

    // Vượt 300ms: thanh tiến trình 2px xuất hiện, có aria-hidden và animate-pulse
    act(() => {
      vi.advanceTimersByTime(1)
    })
    const bar = screen.getByTestId('electrical-loading-bar')
    expect(bar).toBeInTheDocument()
    expect(bar).toHaveAttribute('aria-hidden', 'true')
    expect(bar.className).toContain('h-0.5')
    expect(bar.className).toContain('animate-pulse')
    expect(bar.className).toContain('motion-reduce:animate-none')

    // Hết viewLoading: biến mất ngay
    setRecentChunksMock({ viewLoading: false })
    rerender(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    expect(screen.queryByTestId('electrical-loading-bar')).not.toBeInTheDocument()
  })

  it('không hiện thanh tiến trình nếu viewLoading kết thúc trước 300ms', () => {
    vi.useFakeTimers()
    setRecentChunksMock({ viewLoading: true })

    const { rerender } = renderWithMonitor(
      <ElectricalHistoryChart feederId="FDR-009" live range="6h" />
    )
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(screen.queryByTestId('electrical-loading-bar')).not.toBeInTheDocument()

    setRecentChunksMock({ viewLoading: false })
    rerender(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.queryByTestId('electrical-loading-bar')).not.toBeInTheDocument()
  })

  it('không hiện chữ lỗi hay nút "Tải lại" ở chế độ Gần nhất dù hook trả error', () => {
    // Trường hợp rỗng kèm error
    setRecentChunksMock({
      points: [],
      latest: null,
      viewLoading: false,
      error: 'Chưa cấu hình nguồn điều khiển cho thiết bị IoT.',
    })
    const { rerender } = renderWithMonitor(
      <ElectricalHistoryChart feederId="FDR-009" live range="6h" />
    )
    expect(
      screen.queryByText('Chưa cấu hình nguồn điều khiển cho thiết bị IoT.')
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Tải lại/i })).not.toBeInTheDocument()
    expect(screen.getByText('Mạch chưa có mẫu điện nào.')).toBeInTheDocument()

    // Trường hợp đang có dữ liệu kèm error
    setRecentChunksMock({
      viewLoading: false,
      error: 'Lỗi mạng tạm thời',
    })
    rerender(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    expect(screen.queryByText('Lỗi mạng tạm thời')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Tải lại/i })).not.toBeInTheDocument()
  })

  it('a feeder without an IoT node (FDR-011) passes live=false to useElectricalChunks', () => {
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-011" live={false} range="6h" />)
    expect(mockUseElectricalChunks).toHaveBeenCalledWith(
      'FDR-011',
      expect.objectContaining({ live: false })
    )
    expect(screen.getByText('Không gắn node · chỉ xem lịch sử')).toBeInTheDocument()
  })

  it('passes timeBasis="measured_at" by default and timeBasis="received_at" when specified', () => {
    const { unmount } = renderWithMonitor(
      <ElectricalHistoryChart feederId="FDR-009" live range="6h" />
    )
    expect(mockUseElectricalChunks).toHaveBeenLastCalledWith(
      'FDR-009',
      expect.objectContaining({ timeBasis: 'measured_at' })
    )
    unmount()

    renderWithMonitor(
      <ElectricalHistoryChart feederId="FDR-009" live range="6h" timeBasis="received_at" />
    )
    expect(mockUseElectricalChunks).toHaveBeenLastCalledWith(
      'FDR-009',
      expect.objectContaining({ timeBasis: 'received_at' })
    )
  })

  it('dateRange 1 ngày dùng useElectricalChunks (live=false), không có dải ngày và vẫn có thanh trượt', () => {
    const from = new Date(2026, 10, 15, 0, 0, 0, 0)
    const to = new Date(2026, 10, 16, 0, 0, 0, 0)
    const pts = [
      makePoint(to.getTime() - 120_000, 100),
      makePoint(to.getTime() - 60_000, 98.5),
    ]
    setRecentChunksMock({ points: pts })

    renderWithMonitor(
      <ElectricalHistoryChart feederId="FDR-009" live range="6h" dateRange={{ from, to }} />
    )

    expect(mockUseElectricalChunks).toHaveBeenLastCalledWith(
      'FDR-009',
      expect.objectContaining({
        live: false,
        bounds: { from: from.getTime(), to: to.getTime() },
        view: { from: to.getTime() - 6 * 3_600_000, to: to.getTime() },
      })
    )
    expect(api.getFeederElectricalHistory).not.toHaveBeenCalled()
    expect(screen.getByText('Xem theo khoảng ngày, không tự cập nhật')).toBeInTheDocument()
    expect(screen.getByText(/2 mẫu trong 6 giờ/)).toBeInTheDocument()
    expect(screen.getByText(/Khoảng đã chọn .* · Trung bình mỗi phút/)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Chọn ngày xem' })).not.toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Di chuyển khung thời gian' })).toBeInTheDocument()
  })

  it('dateRange nhiều ngày KHÔNG còn chip ngày, track bằng đúng [bounds.from, bounds.to], mặc định mở ở cuối khoảng', () => {
    const from = new Date(2026, 10, 12, 0, 0, 0, 0) // 12/11 00:00
    const to = new Date(2026, 10, 16, 0, 0, 0, 0)   // 16/11 00:00 -> 4 ngày
    setRecentChunksMock({ points: [] })

    renderWithMonitor(
      <ElectricalHistoryChart feederId="FDR-009" live={false} range="6h" dateRange={{ from, to }} />
    )

    // Bỏ dải chip ngày, thay bằng một thanh trượt phủ cả khoảng đã chọn
    expect(screen.queryByRole('group', { name: 'Chọn ngày xem' })).not.toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Di chuyển khung thời gian' })).toBeInTheDocument()

    const lastCall = mockUseElectricalChunks.mock.calls[mockUseElectricalChunks.mock.calls.length - 1]
    expect(lastCall[1].live).toBe(false)
    expect(lastCall[1].track).toEqual({ from: from.getTime(), to: to.getTime() })
    expect(lastCall[1].bounds).toEqual({ from: from.getTime(), to: to.getTime() })
    expect(lastCall[1].view).toEqual({ from: to.getTime() - 6 * 3_600_000, to: to.getTime() })
  })

  it('dateRange khi hook trả error hoặc points rỗng KHÔNG hiện chữ lỗi/không có số đo và vẫn giữ thanh trượt', () => {
    const from = new Date(2026, 10, 12, 0, 0, 0, 0)
    const to = new Date(2026, 10, 15, 0, 0, 0, 0)
    setRecentChunksMock({
      points: [],
      latest: null,
      viewLoading: false,
      error: 'Lỗi tải dữ liệu khoảng ngày.',
    })

    const { rerender } = renderWithMonitor(
      <ElectricalHistoryChart feederId="FDR-009" live={false} range="6h" dateRange={{ from, to }} />
    )

    expect(screen.queryByText('Lỗi tải dữ liệu khoảng ngày.')).not.toBeInTheDocument()
    expect(screen.queryByText('Không có số đo nào trong khoảng này.')).not.toBeInTheDocument()
    expect(screen.queryByText('Mạch chưa có mẫu điện nào.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Tải lại/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Chọn ngày xem' })).not.toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Di chuyển khung thời gian' })).toBeInTheDocument()

    // Kể cả khi viewLoading = true với points rỗng cũng không thay bằng skeleton che mất thanh trượt
    setRecentChunksMock({ points: [], latest: null, viewLoading: true, error: null })
    rerender(
      <ElectricalHistoryChart feederId="FDR-009" live={false} range="6h" dateRange={{ from, to }} />
    )
    expect(screen.getByRole('slider', { name: 'Di chuyển khung thời gian' })).toBeInTheDocument()
  })

  it('shows "Dao động trong ô" legend at range 6h and hides "Đèn bật" and "Đổi node"', () => {
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    expect(screen.getByText(/2 mẫu/)).toBeInTheDocument()

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

  it('dateRange 12 ngày phủ cả khoảng trên 1 thanh trượt duy nhất và vẫn dùng bước gom của range đang chọn', () => {
    const from = new Date(2026, 10, 2, 0, 0, 0, 0)
    const to = new Date(2026, 10, 14, 0, 0, 0, 0)
    setRecentChunksMock({ points: [] })

    renderWithMonitor(
      <ElectricalHistoryChart feederId="FDR-009" live={false} range="12h" dateRange={{ from, to }} />
    )

    expect(screen.queryByRole('group', { name: 'Chọn ngày xem' })).not.toBeInTheDocument()
    expect(screen.getByText(/Trung bình mỗi 5 phút/)).toBeInTheDocument()
    expect(screen.queryByText(/Chỉ xem được tối đa 3 ngày/)).not.toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Di chuyển khung thời gian' })).toBeInTheDocument()

    const lastCall = mockUseElectricalChunks.mock.calls[mockUseElectricalChunks.mock.calls.length - 1]
    expect(lastCall[1].track).toEqual({ from: from.getTime(), to: to.getTime() })
  })

  it('dateRange giữ khung xem luôn nằm trong track (kể cả kết thúc 01:40 và khi đổi sang 12 giờ sau khi kéo)', () => {
    // Khoảng 20/11 00:00 → 25/11 01:40
    const from = new Date(2026, 10, 20, 0, 0, 0, 0)
    const to = new Date(2026, 10, 25, 1, 40, 0, 0)
    setRecentChunksMock({ points: [] })

    const DateRangeWithToggle: React.FC = () => {
      const [range, setRange] = useState<ElectricalRange>('6h')
      return (
        <div>
          <ElectricalRangeToggle value={range} onChange={setRange} />
          <ElectricalHistoryChart
            feederId="FDR-009"
            live={false}
            range={range}
            dateRange={{ from, to }}
          />
        </div>
      )
    }

    renderWithMonitor(<DateRangeWithToggle />)

    // Mặc định: track = [bounds.from, bounds.to], view nằm trong track và view.to === bounds.to
    const initialArgs =
      mockUseElectricalChunks.mock.calls[mockUseElectricalChunks.mock.calls.length - 1][1]
    expect(initialArgs.track).toEqual({ from: from.getTime(), to: to.getTime() })
    expect(initialArgs.view.to).toBe(to.getTime())
    expect(initialArgs.view.from).toBeGreaterThanOrEqual(initialArgs.track.from)
    expect(initialArgs.view.to).toBeLessThanOrEqual(initialArgs.track.to)

    // Đưa thanh trượt về đầu khoảng (Home) rồi bấm "12 giờ": windowEnd tự kẹp lên bounds.from + 12h nên view vẫn nằm gọn trong track
    const slider = screen.getByRole('slider', { name: 'Di chuyển khung thời gian' })
    fireEvent.keyDown(slider, { key: 'Home' })
    fireEvent.click(screen.getByRole('button', { name: '12 giờ' }))

    const after12h =
      mockUseElectricalChunks.mock.calls[mockUseElectricalChunks.mock.calls.length - 1][1]
    expect(after12h.track).toEqual({ from: from.getTime(), to: to.getTime() })
    expect(after12h.view.from).toBe(from.getTime())
    expect(after12h.view.to).toBe(from.getTime() + 12 * 3_600_000)
    expect(after12h.view.from).toBeGreaterThanOrEqual(after12h.track.from)
    expect(after12h.view.to).toBeLessThanOrEqual(after12h.track.to)
  })

  it('thanh trượt khung thời gian không vượt quá dải 24 giờ khi kéo hoặc bấm phím mũi tên và cập nhật direction', () => {
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    expect(screen.getByText(/2 mẫu trong 6 giờ/)).toBeInTheDocument()

    const slider = screen.getByRole('slider', { name: 'Di chuyển khung thời gian' })
    const track = screen.getByTestId('electrical-window-track')
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 480,
      bottom: 36,
      width: 480,
      height: 36,
      toJSON: () => ({}),
    })

    const minVal = Number(slider.getAttribute('aria-valuemin'))
    const maxVal = Number(slider.getAttribute('aria-valuemax'))
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(maxVal)
    // Với khung 6h trong dải 24h: max - min = 18 giờ
    expect(maxVal - minVal).toBe(18 * 3_600_000)

    // Kéo quá mép trái: kẹp chặt tại minVal và direction = -1
    fireEvent.pointerDown(slider, { pointerId: 1, clientX: 400 })
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: -5000 })
    fireEvent.pointerUp(slider, { pointerId: 1, clientX: -5000 })
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(minVal)
    expect(mockUseElectricalChunks).toHaveBeenLastCalledWith(
      'FDR-009',
      expect.objectContaining({ direction: -1 })
    )

    // Bấm ArrowLeft thêm nữa vẫn giữ nguyên tại minVal
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(minVal)

    // Kéo quá mép phải: kẹp chặt tại maxVal và direction = 1
    fireEvent.pointerDown(slider, { pointerId: 2, clientX: 50 })
    fireEvent.pointerMove(slider, { pointerId: 2, clientX: 5000 })
    fireEvent.pointerUp(slider, { pointerId: 2, clientX: 5000 })
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(maxVal)
    expect(mockUseElectricalChunks).toHaveBeenLastCalledWith(
      'FDR-009',
      expect.objectContaining({ direction: 1 })
    )

    // Bấm ArrowLeft 1 bước (1/12 của 6h = 30 phút) rồi ArrowRight về lại maxVal
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(maxVal - 30 * 60_000)
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(maxVal)
  })

  it('đổi khoảng 1h/6h/12h giữ mốc cuối đang xem và kẹp lại trong dải 24 giờ', () => {
    renderWithMonitor(<ChartWithRangeToggle />)
    expect(screen.getByText(/2 mẫu trong 6 giờ/)).toBeInTheDocument()

    const slider = screen.getByRole('slider', { name: 'Di chuyển khung thời gian' })
    const initialMax = Number(slider.getAttribute('aria-valuemax'))
    const trackStart = initialMax - 24 * 3_600_000

    // Trên 6h: lùi 4 bước mũi tên (4 * 30 phút = 2 giờ) -> mốc cuối = initialMax - 2h
    for (let i = 0; i < 4; i++) {
      fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    }
    const pinnedAfterLeft = initialMax - 2 * 3_600_000
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(pinnedAfterLeft)

    // Đổi sang 1h: giữ đúng mốc cuối đang xem
    fireEvent.click(screen.getByRole('button', { name: '1 giờ' }))
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(pinnedAfterLeft)

    // Trên 1h: nhảy về sát mép trái nhất (trackStart + 1h)
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(trackStart + 3_600_000)

    // Đổi sang 12h: mốc cuối cũ không đủ chứa 12h nên được kẹp lên trackStart + 12h (không vượt trái dải 24h)
    fireEvent.click(screen.getByRole('button', { name: '12 giờ' }))
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(trackStart + 12 * 3_600_000)
    expect(Number(slider.getAttribute('aria-valuemin'))).toBe(trackStart + 12 * 3_600_000)
  })

  it('kéo sang trái thì khung đứng yên khi giờ hiện tại tiến tới; về sát phải thì tự trượt và không tự đổi direction', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-24T12:00:00.000Z'))
    setRecentChunksMock()

    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    expect(screen.getByText(/2 mẫu trong 6 giờ/)).toBeInTheDocument()

    const slider = screen.getByRole('slider', { name: 'Di chuyển khung thời gian' })
    const t0Max = Number(slider.getAttribute('aria-valuemax'))

    // Tự trượt theo setInterval lúc ban đầu không làm đổi direction (vẫn là 0)
    act(() => {
      vi.advanceTimersByTime(ELECTRICAL_POLL_MS)
    })
    const t1Max = Number(slider.getAttribute('aria-valuemax'))
    expect(t1Max).toBe(t0Max + ELECTRICAL_POLL_MS)
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(t1Max)
    expect(mockUseElectricalChunks).toHaveBeenLastCalledWith(
      'FDR-009',
      expect.objectContaining({ direction: 0 })
    )

    // Lùi khung sang trái 30 phút (tách khỏi mép phải)
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    const pinnedEnd = t1Max - 30 * 60_000
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(pinnedEnd)

    // Chu kỳ tiếp theo: dải trượt sang phải nhưng khung vẫn đứng yên ở mốc đã kéo
    act(() => {
      vi.advanceTimersByTime(ELECTRICAL_POLL_MS)
    })
    const t2Max = Number(slider.getAttribute('aria-valuemax'))
    expect(t2Max).toBe(t1Max + ELECTRICAL_POLL_MS)
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(pinnedEnd)

    // Đưa khung sát về mép phải để quay lại chế độ bám thời gian thực
    fireEvent.keyDown(slider, { key: 'End' })
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(t2Max)

    // Chu kỳ tiếp theo: khung tự trượt theo mốc hiện tại mới
    act(() => {
      vi.advanceTimersByTime(ELECTRICAL_POLL_MS)
    })
    const t3Max = Number(slider.getAttribute('aria-valuemax'))
    expect(t3Max).toBe(t2Max + ELECTRICAL_POLL_MS)
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(t3Max)
  })

  it('nút "Về hiện tại" chỉ hiện khi đã kéo/bấm phím khỏi mép phải, bấm thì quay về mép phải và ẩn đi', () => {
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    expect(screen.getByText(/2 mẫu trong 6 giờ/)).toBeInTheDocument()

    // Mặc định đang ở mép phải: không hiện nút "Về hiện tại"
    expect(screen.queryByRole('button', { name: 'Về hiện tại' })).not.toBeInTheDocument()

    const slider = screen.getByRole('slider', { name: 'Di chuyển khung thời gian' })
    const maxVal = Number(slider.getAttribute('aria-valuemax'))

    // Bấm ArrowLeft khỏi mép phải -> nút "Về hiện tại" xuất hiện
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(maxVal - 30 * 60_000)
    const backBtn = screen.getByRole('button', { name: 'Về hiện tại' })
    expect(backBtn).toBeInTheDocument()

    // Bấm "Về hiện tại" -> khung quay về mép phải và nút ẩn đi
    fireEvent.click(backBtn)
    expect(Number(slider.getAttribute('aria-valuenow'))).toBe(maxVal)
    expect(screen.queryByRole('button', { name: 'Về hiện tại' })).not.toBeInTheDocument()
  })

  it('hiển thị nhãn ngày giờ dạng dd/MM HH:mm trên dải 24 giờ và aria-valuetext có ngày', () => {
    renderWithMonitor(<ElectricalHistoryChart feederId="FDR-009" live range="6h" />)
    expect(screen.getByText(/2 mẫu trong 6 giờ/)).toBeInTheDocument()

    const labelsBox = screen.getByTestId('electrical-window-labels')
    const dateTimeMatches = labelsBox.textContent?.match(/\d{2}\/\d{2} \d{2}:\d{2}/g) ?? []
    // Đủ 5 nhãn đều có ngày/tháng và giờ:phút; nhãn đầu và nhãn cuối khác ngày nhau (cách đúng 24 giờ)
    expect(dateTimeMatches).toHaveLength(5)
    expect(dateTimeMatches[0]).not.toBe(dateTimeMatches[4])

    const slider = screen.getByRole('slider', { name: 'Di chuyển khung thời gian' })
    const valueText = slider.getAttribute('aria-valuetext') ?? ''
    expect(valueText).toMatch(/^\d{2}\/\d{2} \d{2}:\d{2} – \d{2}\/\d{2} \d{2}:\d{2}$/)
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
