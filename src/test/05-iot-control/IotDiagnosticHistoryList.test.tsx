import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithSagaStore } from '../utils/sagaStore'
import iotMonitorReducer, { DIAGNOSTIC_HISTORY_PAGE_SIZE } from '../../feature/iot/iotMonitorSlice'
import iotMonitorSaga from '../../feature/iot/iotMonitorSaga'
import { IotDiagnosticHistoryList } from '../../components/IotDiagnosticHistoryList'
import { IotCommandHistoryList } from '../../components/IotCommandHistoryList'
import iotAPI from '../../feature/iot/iotAPI'

vi.mock('../../feature/iot/iotAPI', () => ({
  default: {
    getFeederDiagnosticHistory: vi.fn(),
    getCommandHistory: vi.fn(),
  },
}))

const api = vi.mocked(iotAPI)

const renderWithStore = (ui: React.ReactElement) =>
  renderWithSagaStore(ui, {
    reducers: { iotMonitor: iotMonitorReducer },
    sagas: [iotMonitorSaga],
  })

describe('IotDiagnosticHistoryList (GET /iot/feeders/{feederId}/diagnostics/history)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getFeederDiagnosticHistory.mockReset()
    api.getCommandHistory.mockReset()
  })

  it('fetches 7-day range by default, renders statuses & evidence, and omits from/to when clicking Tất cả', async () => {
    api.getFeederDiagnosticHistory.mockResolvedValue({
      page: 1,
      page_size: DIAGNOSTIC_HISTORY_PAGE_SIZE,
      total: 3,
      items: [
        {
          history_id: 1,
          feeder_id: 'FDR-009',
          node_id: 'NODE-009',
          code: 'current_drop',
          status: 'active',
          started_at: '2026-11-19T01:00:00Z',
          ended_at: '2026-11-19T01:20:00Z',
          closed_at: null,
          anomaly: {
            code: 'current_drop',
            observed: 185.2,
            reference: 200,
            deviation_percent: -7.4,
            limit: 5,
          },
        },
        {
          history_id: 2,
          feeder_id: 'FDR-009',
          node_id: 'NODE-009',
          code: 'ds3231_read_failed',
          status: 'resolved',
          started_at: '2026-11-18T10:00:00Z',
          ended_at: '2026-11-18T10:30:00Z',
          closed_at: '2026-11-18T11:15:00Z',
          anomaly: {
            code: 'ds3231_read_failed',
          },
        },
        {
          history_id: 3,
          feeder_id: 'FDR-009',
          node_id: 'NODE-008',
          code: 'voltage_loss',
          status: 'interrupted',
          started_at: '2026-11-17T08:00:00Z',
          ended_at: '2026-11-17T08:00:20Z',
          closed_at: null,
        },
      ],
    })

    renderWithStore(<IotDiagnosticHistoryList feederId="FDR-009" />)

    await waitFor(() => expect(api.getFeederDiagnosticHistory).toHaveBeenCalledTimes(1))
    const [calledFeeder, calledParams] = api.getFeederDiagnosticHistory.mock.calls[0]
    expect(calledFeeder).toBe('FDR-009')
    expect(calledParams?.page).toBe(1)
    expect(calledParams?.page_size).toBe(20)
    expect(calledParams?.to).toBeUndefined()
    expect(typeof calledParams?.from).toBe('string')
    expect(Number.isNaN(Date.parse(calledParams!.from!))).toBe(false)

    const rows = await screen.findAllByTestId('iot-diagnostic-row')
    expect(rows).toHaveLength(3)

    // Row 1: current_drop, active, evidence with lệch -7.4%
    expect(rows[0]).toHaveTextContent('Sụt dòng điện (>5% so với danh định)')
    expect(rows[0]).toHaveTextContent('Đang lỗi')
    expect(rows[0]).toHaveTextContent('lệch -7.4%')
    expect(rows[0]).toHaveTextContent('20 phút')

    // Row 2: hardware fault, resolved, no evidence line
    expect(rows[1]).toHaveTextContent('DS3231: Đọc giờ qua I²C thất bại')
    expect(rows[1]).toHaveTextContent('Đã phục hồi')
    expect(rows[1]).toHaveTextContent('1 giờ 15 phút')
    expect(rows[1]).not.toHaveTextContent('đo ')
    expect(rows[1]).not.toHaveTextContent('lệch ')

    // Row 3: interrupted
    expect(rows[2]).toHaveTextContent('Gián đoạn')
    expect(rows[2]).toHaveTextContent('< 1 phút')

    // Click "Tất cả" -> refetch without from/to
    const rangeGroup = screen.getByRole('group', { name: 'Khoảng thời gian' })
    fireEvent.click(within(rangeGroup).getByRole('button', { name: 'Tất cả' }))

    await waitFor(() => expect(api.getFeederDiagnosticHistory).toHaveBeenCalledTimes(2))
    expect(api.getFeederDiagnosticHistory).toHaveBeenLastCalledWith('FDR-009', {
      page: 1,
      page_size: 20,
      from: undefined,
      to: undefined,
    })
  })

  it('shows empty state when no diagnostic episodes exist in range', async () => {
    api.getFeederDiagnosticHistory.mockResolvedValue({
      page: 1,
      page_size: 20,
      total: 0,
      items: [],
    })

    renderWithStore(<IotDiagnosticHistoryList feederId="FDR-009" />)

    expect(
      await screen.findByText('Chưa ghi nhận đợt lỗi nào trong khoảng này.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Lịch sử chỉ có từ khi hệ thống bắt đầu ghi, không có dữ liệu trước đó.')
    ).toBeInTheDocument()
  })

  it('shows error alert when API fails and retries on click', async () => {
    api.getFeederDiagnosticHistory.mockRejectedValueOnce({
      response: { data: { error: { message: 'Lỗi máy chủ' } } },
    })

    renderWithStore(<IotDiagnosticHistoryList feederId="FDR-009" />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Không tải được lịch sử sự cố')
    expect(alert).toHaveTextContent('Lỗi máy chủ')

    api.getFeederDiagnosticHistory.mockResolvedValueOnce({
      page: 1,
      page_size: 20,
      total: 0,
      items: [],
    })

    fireEvent.click(within(alert).getByRole('button', { name: /Thử lại/ }))

    await waitFor(() => expect(api.getFeederDiagnosticHistory).toHaveBeenCalledTimes(2))
    expect(
      await screen.findByText('Chưa ghi nhận đợt lỗi nào trong khoảng này.')
    ).toBeInTheDocument()
  })

  it('does not call API and shows unassigned message when feederId is null', () => {
    renderWithStore(<IotDiagnosticHistoryList feederId={null} />)

    expect(
      screen.getByText('Node chưa gắn mạch nên chưa có lịch sử sự cố.')
    ).toBeInTheDocument()
    expect(api.getFeederDiagnosticHistory).not.toHaveBeenCalled()
  })

  it('shows view mode group and switching to "Theo ngày" prompts for date range without extra API call', async () => {
    api.getFeederDiagnosticHistory.mockResolvedValue({
      page: 1,
      page_size: 20,
      total: 0,
      items: [],
    })

    renderWithStore(<IotDiagnosticHistoryList feederId="FDR-009" />)

    await waitFor(() => expect(api.getFeederDiagnosticHistory).toHaveBeenCalledTimes(1))

    const viewModeGroup = screen.getByRole('group', { name: 'Kiểu xem' })
    const recentBtn = within(viewModeGroup).getByRole('button', { name: 'Gần nhất' })
    const byDateBtn = within(viewModeGroup).getByRole('button', { name: 'Theo ngày' })
    expect(recentBtn).toHaveAttribute('aria-pressed', 'true')
    expect(byDateBtn).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(byDateBtn)

    expect(byDateBtn).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Chọn khoảng ngày để xem')).toBeInTheDocument()
    expect(api.getFeederDiagnosticHistory).toHaveBeenCalledTimes(1)
  })
})

describe('IotCommandHistoryList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCommandHistory.mockReset()
  })

  it('loads command rows for nodeId and filters by status', async () => {
    api.getCommandHistory.mockResolvedValue({
      page: 1,
      page_size: 10,
      total: 2,
      items: [
        {
          command_id: 'cmd-1',
          node_id: 'NODE-009',
          feeder_id: 'FDR-009',
          device_id: 'DEV-009',
          mode: 'MANUAL',
          command: 'ON',
          status: 'success',
          requested_by: 'Quản lý A',
          requested_at: '2026-11-19T01:00:00Z',
        },
        {
          command_id: 'cmd-2',
          node_id: 'NODE-009',
          feeder_id: 'FDR-009',
          device_id: 'DEV-009',
          mode: 'MANUAL',
          command: 'OFF',
          status: 'expired',
          requested_by: 'Quản lý A',
          requested_at: '2026-11-19T00:30:00Z',
        },
      ],
    })

    renderWithStore(<IotCommandHistoryList nodeId="NODE-009" />)

    const rows = await screen.findAllByTestId('iot-command-row')
    expect(rows).toHaveLength(2)

    const statusGroup = screen.getByRole('group', { name: 'Trạng thái' })
    fireEvent.click(within(statusGroup).getByRole('button', { name: 'Thành công' }))
    expect(screen.getAllByTestId('iot-command-row')).toHaveLength(1)
  })
})
