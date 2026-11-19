import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import { renderWithSagaStore } from '../utils/sagaStore'
import iotMonitorReducer from '../../feature/iot/iotMonitorSlice'
import iotMonitorSaga from '../../feature/iot/iotMonitorSaga'
import { IotCommandHistoryModal, HISTORY_PAGE_SIZE } from '../../pages/gis-map/components/IotCommandHistoryModal'
import iotAPI from '../../feature/iot/iotAPI'

vi.mock('../../feature/iot/iotAPI', () => ({ default: { getCommandHistory: vi.fn() } }))

const api = vi.mocked(iotAPI)

const item = (
  id: string,
  mode: 'AUTO' | 'MANUAL',
  command: 'ON' | 'OFF' | null,
  status: 'success' | 'pending' | 'expired',
  extra = {}
) => ({
  command_id: id,
  node_id: 'NODE-004',
  feeder_id: 'FDR-010',
  device_id: 'LUXMAP-P004',
  mode,
  command,
  status,
  requested_by: 'Nguyễn Quản Lý',
  requested_at: '2026-11-16T01:00:00Z',
  bridge_accepted_at: '2026-11-16T01:00:02Z',
  ...extra,
})

const feeders = [
  { feederId: 'FDR-010', label: 'FDR-CAB-TL8-B', name: 'Mạch B - Tỉnh Lộ 8', nodeId: 'NODE-004' },
  { feederId: 'FDR-011', label: 'FDR-CAB-TL8-C', name: 'Mạch C - Tỉnh Lộ 8', nodeId: 'NODE-005' },
]

const renderModal = (ui: React.ReactElement) =>
  renderWithSagaStore(ui, {
    reducers: { iotMonitor: iotMonitorReducer },
    sagas: [iotMonitorSaga],
  })

describe('IotCommandHistoryModal (GET /iot/nodes/{nodeId}/command/history)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCommandHistory.mockReset()
    api.getCommandHistory.mockResolvedValue({
      page: 1,
      page_size: HISTORY_PAGE_SIZE,
      total: 3,
      items: [
        item('c3', 'AUTO', null, 'pending', { auto_schedule: { day_start: '05:30', night_start: '18:00' } }),
        item('c2', 'MANUAL', 'OFF', 'success'),
        item('c1', 'MANUAL', 'ON', 'expired'),
      ],
    })
  })

  it('reads the history of the chosen feeder node and shows mode, status, sender and AUTO schedule', async () => {
    renderModal(<IotCommandHistoryModal title="Tủ CAB-009" feeders={feeders} initialFeederId="FDR-010" onClose={vi.fn()} />)

    await waitFor(() => expect(api.getCommandHistory).toHaveBeenCalledWith('NODE-004', { page: 1, page_size: HISTORY_PAGE_SIZE }))
    const rows = await screen.findAllByTestId('iot-command-row')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('AUTO')
    expect(rows[0]).toHaveTextContent('Đang chờ')
    expect(rows[0]).toHaveTextContent('ngày từ 05:30 · đêm từ 18:00')
    expect(rows[1]).toHaveTextContent('Tắt')
    expect(rows[1]).toHaveTextContent('Thành công')
    expect(rows[1]).toHaveTextContent('Nguyễn Quản Lý')
    expect(rows[2]).toHaveTextContent('Quá hạn')
  })

  it('filters by status on the loaded commands', async () => {
    renderModal(<IotCommandHistoryModal title="Tủ" feeders={feeders} onClose={vi.fn()} />)
    await screen.findAllByTestId('iot-command-row')

    const status = screen.getByRole('group', { name: 'Trạng thái' })
    fireEvent.click(within(status).getByRole('button', { name: 'Thành công' }))

    const rows = screen.getAllByTestId('iot-command-row')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Tắt')
    expect(api.getCommandHistory).toHaveBeenCalledTimes(1)
  })

  it('switches feeder using FeederPicker button "Mạch sau"', async () => {
    renderModal(<IotCommandHistoryModal title="Tủ" feeders={feeders} onClose={vi.fn()} />)
    await screen.findAllByTestId('iot-command-row')

    const nextBtn = screen.getByRole('button', { name: 'Mạch sau' })
    fireEvent.click(nextBtn)

    await waitFor(() =>
      expect(api.getCommandHistory).toHaveBeenLastCalledWith('NODE-005', { page: 1, page_size: HISTORY_PAGE_SIZE })
    )
  })

  it('switches feeder by opening FeederPicker popover and selecting option', async () => {
    renderModal(<IotCommandHistoryModal title="Tủ" feeders={feeders} onClose={vi.fn()} />)
    await screen.findAllByTestId('iot-command-row')

    const pickerBtn = screen.getByRole('button', { name: /Mạch B - Tỉnh Lộ 8/ })
    expect(pickerBtn).toHaveAttribute('aria-haspopup', 'listbox')
    fireEvent.click(pickerBtn)

    const option = screen.getByRole('option', { name: /Mạch C - Tỉnh Lộ 8/ })
    fireEvent.click(option)

    await waitFor(() =>
      expect(api.getCommandHistory).toHaveBeenLastCalledWith('NODE-005', { page: 1, page_size: HISTORY_PAGE_SIZE })
    )
  })

  it('Escape closes picker without calling onClose, second Escape calls onClose', async () => {
    const onClose = vi.fn()
    renderModal(<IotCommandHistoryModal title="Tủ CAB-009" feeders={feeders} initialFeederId="FDR-010" onClose={onClose} />)
    await screen.findAllByTestId('iot-command-row')

    const pickerBtn = screen.getByRole('button', { name: /Mạch B - Tỉnh Lộ 8/ })
    fireEvent.click(pickerBtn)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    const searchInput = screen.getByRole('combobox')
    fireEvent.keyDown(searchInput, { key: 'Escape' })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows role="alert" with "Không tải được nhật ký lệnh", header "không tải được", disables filters, and retry works', async () => {
    api.getCommandHistory.mockRejectedValueOnce({
      response: { data: { error: { message: 'Lỗi mạng' } } },
    })
    renderModal(<IotCommandHistoryModal title="Tủ CAB-009" feeders={feeders} initialFeederId="FDR-010" onClose={vi.fn()} />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Không tải được nhật ký lệnh')
    expect(alert).toHaveTextContent('Lỗi mạng')

    expect(screen.getByText(/không tải được/)).toBeInTheDocument()
    expect(screen.queryByText(/0 lệnh/)).not.toBeInTheDocument()

    const filterGroup = screen.getByRole('group', { name: 'Trạng thái' })
    const buttons = within(filterGroup).getAllByRole('button')
    for (const b of buttons) {
      expect(b).toBeDisabled()
    }

    // Nút Thử lại
    api.getCommandHistory.mockResolvedValueOnce({
      page: 1,
      page_size: HISTORY_PAGE_SIZE,
      total: 1,
      items: [item('c1', 'MANUAL', 'ON', 'success')],
    })

    const retryBtn = within(alert).getByRole('button', { name: /Thử lại/ })
    fireEvent.click(retryBtn)

    await waitFor(() => expect(api.getCommandHistory).toHaveBeenCalledTimes(2))
    expect(await screen.findByTestId('iot-command-row')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText(/1 lệnh/)).toBeInTheDocument()
  })

  it('ignores late-arriving responses from previous feeder after switching to new feeder', async () => {
    let resolveNodeA: (value: unknown) => void = () => {}
    api.getCommandHistory
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveNodeA = resolve
          }) as never
      )
      .mockResolvedValueOnce({
        page: 1,
        page_size: HISTORY_PAGE_SIZE,
        total: 1,
        items: [item('cmd-b', 'MANUAL', 'ON', 'success', { node_id: 'NODE-005', feeder_id: 'FDR-011' })],
      })

    renderModal(<IotCommandHistoryModal title="Tủ" feeders={feeders} initialFeederId="FDR-010" onClose={vi.fn()} />)

    // While Node A is loading, switch to Node B (FDR-011) via "Mạch sau"
    const nextBtn = screen.getByRole('button', { name: 'Mạch sau' })
    fireEvent.click(nextBtn)

    // Node B loads and renders its row
    await waitFor(() => expect(screen.getByText('FDR-011')).toBeInTheDocument())
    expect(screen.getAllByText('NODE-005').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/1 lệnh/)).toBeInTheDocument()

    // Now Node A resolves late
    await act(async () => {
      resolveNodeA({
        page: 1,
        page_size: HISTORY_PAGE_SIZE,
        total: 10,
        items: [item('cmd-a', 'MANUAL', 'OFF', 'success', { node_id: 'NODE-004', feeder_id: 'FDR-010' })],
      })
    })

    // Assert: commands of A do not overwrite B, header remains B
    expect(screen.queryByText('FDR-010')).not.toBeInTheDocument()
    expect(screen.getByText('FDR-011')).toBeInTheDocument()
    expect(screen.getAllByText('NODE-005').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/1 lệnh/)).toBeInTheDocument()
    expect(screen.queryByText('NODE-004')).not.toBeInTheDocument()
  })

  it('clears error alert and shows "đang tải…" in header when switching from failed node A to loading node B', async () => {
    let resolveNodeB: (value: unknown) => void = () => {}
    api.getCommandHistory
      .mockRejectedValueOnce({
        response: { data: { error: { message: 'Lỗi node A' } } },
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveNodeB = resolve
          }) as never
      )

    renderModal(<IotCommandHistoryModal title="Tủ" feeders={feeders} initialFeederId="FDR-010" onClose={vi.fn()} />)

    // Node A fails with role="alert"
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Lỗi node A')
    expect(screen.getByText(/không tải được/)).toBeInTheDocument()
    expect(screen.getAllByText('NODE-004').length).toBeGreaterThanOrEqual(1)

    // Switch to Node B (which is now loading)
    const nextBtn = screen.getByRole('button', { name: 'Mạch sau' })
    fireEvent.click(nextBtn)

    // Immediately while B is loading: no role="alert", header is "đang tải…" for Node B
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText(/đang tải…/)).toBeInTheDocument()
    expect(screen.getAllByText('NODE-005').length).toBeGreaterThanOrEqual(1)

    // Cleanup: resolve Node B
    await act(async () => {
      resolveNodeB({
        page: 1,
        page_size: HISTORY_PAGE_SIZE,
        total: 1,
        items: [item('cmd-b', 'MANUAL', 'ON', 'success', { node_id: 'NODE-005' })],
      })
    })

    expect(await screen.findByText(/1 lệnh/)).toBeInTheDocument()
    expect(screen.getAllByText('NODE-005').length).toBeGreaterThanOrEqual(1)
  })

  it('pages with numbered buttons and Trước / Sau', async () => {
    api.getCommandHistory
      .mockResolvedValueOnce({ page: 1, page_size: HISTORY_PAGE_SIZE, total: 25, items: [item('c25', 'MANUAL', 'OFF', 'success')] })
      .mockResolvedValueOnce({ page: 3, page_size: HISTORY_PAGE_SIZE, total: 25, items: [item('c5', 'MANUAL', 'ON', 'success')] })
    renderModal(<IotCommandHistoryModal title="Tủ" feeders={feeders} onClose={vi.fn()} />)
    await screen.findAllByTestId('iot-command-row')

    const nav = screen.getByRole('navigation', { name: 'Phân trang' })
    expect(nav).toHaveTextContent('Trang 1 / 3 · 25 lệnh')
    expect(within(nav).getByRole('button', { name: 'Trước' })).toBeDisabled()
    fireEvent.click(within(nav).getByRole('button', { name: '3' }))

    await waitFor(() => expect(api.getCommandHistory).toHaveBeenLastCalledWith('NODE-004', { page: 3, page_size: HISTORY_PAGE_SIZE }))
    expect(await screen.findByText('Trang 3 / 3 · 25 lệnh')).toBeInTheDocument()
    expect(screen.getAllByTestId('iot-command-row')).toHaveLength(1)
    expect(within(nav).getByRole('button', { name: 'Sau' })).toBeDisabled()
  })

  it('a backend without status still shows a status badge ("Chưa rõ trạng thái")', async () => {
    api.getCommandHistory.mockResolvedValueOnce({
      page: 1,
      page_size: HISTORY_PAGE_SIZE,
      total: 1,
      items: [{ ...item('c1', 'MANUAL', 'ON', 'success'), status: undefined }],
    })
    renderModal(<IotCommandHistoryModal title="Tủ" feeders={feeders} onClose={vi.fn()} />)
    expect(await screen.findByText('Chưa rõ trạng thái')).toBeInTheDocument()
  })

  it('a feeder without a node calls nothing and says so', () => {
    renderModal(<IotCommandHistoryModal title="Mạch FDR-012" feeders={[]} onClose={vi.fn()} />)
    expect(screen.getByText('Mạch chưa gắn node IoT nên chưa có lệnh nào.')).toBeInTheDocument()
    expect(api.getCommandHistory).not.toHaveBeenCalled()
  })
})
