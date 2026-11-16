import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { IotCommandHistoryModal, HISTORY_PAGE_SIZE } from '../../../pages/gis-map/components/IotCommandHistoryModal'
import iotAPI from '../../../feature/iot/iotAPI'

vi.mock('../../../feature/iot/iotAPI', () => ({ default: { getCommandHistory: vi.fn() } }))

const api = vi.mocked(iotAPI)

const item = (id: string, mode: string, command: string | null, status: 'success' | 'pending' | 'expired', extra = {}) => ({
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
  { feederId: 'FDR-010', label: 'FDR-CAB-TL8-B', nodeId: 'NODE-004' },
  { feederId: 'FDR-011', label: 'FDR-CAB-TL8-C', nodeId: 'NODE-005' },
]

describe('IotCommandHistoryModal (GET /iot/nodes/{nodeId}/command/history)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    render(<IotCommandHistoryModal title="Tủ CAB-009" feeders={feeders} initialFeederId="FDR-010" onClose={vi.fn()} />)

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

  it('filters by status on the loaded commands, with counts', async () => {
    render(<IotCommandHistoryModal title="Tủ" feeders={feeders} onClose={vi.fn()} />)
    await screen.findAllByTestId('iot-command-row')

    const status = screen.getByRole('group', { name: 'Trạng thái' })
    fireEvent.click(within(status).getByRole('button', { name: 'Thành công (1)' }))

    const rows = screen.getAllByTestId('iot-command-row')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Tắt')
    expect(api.getCommandHistory).toHaveBeenCalledTimes(1)
  })

  it('switching feeder reads the other node', async () => {
    render(<IotCommandHistoryModal title="Tủ" feeders={feeders} onClose={vi.fn()} />)
    await screen.findAllByTestId('iot-command-row')

    fireEvent.click(screen.getByRole('button', { name: 'FDR-CAB-TL8-C' }))

    await waitFor(() => expect(api.getCommandHistory).toHaveBeenLastCalledWith('NODE-005', { page: 1, page_size: HISTORY_PAGE_SIZE }))
  })

  it('pages with numbered buttons and Trước / Sau', async () => {
    api.getCommandHistory
      .mockResolvedValueOnce({ page: 1, page_size: HISTORY_PAGE_SIZE, total: 25, items: [item('c25', 'MANUAL', 'OFF', 'success')] })
      .mockResolvedValueOnce({ page: 3, page_size: HISTORY_PAGE_SIZE, total: 25, items: [item('c5', 'MANUAL', 'ON', 'success')] })
    render(<IotCommandHistoryModal title="Tủ" feeders={feeders} onClose={vi.fn()} />)
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
    render(<IotCommandHistoryModal title="Tủ" feeders={feeders} onClose={vi.fn()} />)
    expect(await screen.findByText('Chưa rõ trạng thái')).toBeInTheDocument()
  })

  it('a feeder without a node calls nothing and says so', () => {
    render(<IotCommandHistoryModal title="Mạch FDR-012" feeders={[]} onClose={vi.fn()} />)
    expect(screen.getByText('Mạch chưa gắn node IoT nên chưa có lệnh nào.')).toBeInTheDocument()
    expect(api.getCommandHistory).not.toHaveBeenCalled()
  })
})
