import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import {
  IotElectricalHistoryModal,
  INITIAL_SAMPLES,
  POLL_MS,
} from '../../../pages/gis-map/components/IotElectricalHistoryModal'
import iotAPI from '../../../feature/iot/iotAPI'

vi.mock('../../../feature/iot/iotAPI', () => ({
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

describe('IotElectricalHistoryModal (biểu đồ lịch sử điện, GIS drawer)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Trang đầu: mới nhất trước.
    api.getElectricalHistoryPage.mockResolvedValue({ page: 1, page_size: 200, total: 2, items: [sample(11, 2, 98.5), sample(10, 1, 100)] })
    api.getElectricalHistory.mockResolvedValue({ items: [], next_cursor: 11, has_more: false })
  })

  afterEach(() => vi.useRealTimers())

  it('loads the newest samples by page and shows the latest values', async () => {
    render(<IotElectricalHistoryModal nodeId="NODE-001" feederId="FDR-010" onClose={vi.fn()} />)

    await waitFor(() =>
      expect(api.getElectricalHistoryPage).toHaveBeenCalledWith('NODE-001', { page: 1, page_size: INITIAL_SAMPLES })
    )
    const latest = await screen.findByTestId('iot-latest-sample')
    // Mẫu mới nhất là cursor 11 (98.5 mA), không phải phần tử cuối của trang.
    expect(latest).toHaveTextContent('98.5 mA')
    expect(screen.getByText('2 mẫu')).toBeInTheDocument()
  })

  it('switches the charted metric, with current (mA) selected first', async () => {
    render(<IotElectricalHistoryModal nodeId="NODE-001" onClose={vi.fn()} />)
    await screen.findByTestId('iot-latest-sample')

    expect(screen.getByRole('button', { name: 'Dòng (mA)' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Điện áp (V)' }))
    expect(screen.getByRole('button', { name: 'Điện áp (V)' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Dòng (mA)' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('polls for new samples with after = the largest cursor it holds, and appends them', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.getElectricalHistory.mockResolvedValueOnce({ items: [sample(12, 3, 0.4)], next_cursor: 12, has_more: false })
    render(<IotElectricalHistoryModal nodeId="NODE-001" onClose={vi.fn()} />)
    await screen.findByText('2 mẫu')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS)
    })

    expect(api.getElectricalHistory).toHaveBeenCalledWith('NODE-001', 11, 100)
    expect(await screen.findByText('3 mẫu')).toBeInTheDocument()
    expect(screen.getByTestId('iot-latest-sample')).toHaveTextContent('0.4 mA')
  })

  it('shows the backend message when the node has no measurement source (503)', async () => {
    api.getElectricalHistoryPage.mockRejectedValue({ response: { data: { error: { message: 'Chưa cấu hình nguồn điều khiển cho thiết bị IoT.' } } } })
    render(<IotElectricalHistoryModal nodeId="NODE-001" onClose={vi.fn()} />)

    expect(await screen.findByText('Chưa cấu hình nguồn điều khiển cho thiết bị IoT.')).toBeInTheDocument()
    expect(screen.getByText('Chưa có mẫu điện nào.')).toBeInTheDocument()
  })
})
