import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { FeederHistoryModal } from '../../components/FeederHistoryModal'
import iotMonitorReducer from '../../feature/iot/iotMonitorSlice'
import iotMonitorSaga from '../../feature/iot/iotMonitorSaga'
import iotAPI from '../../feature/iot/iotAPI'
import { renderWithSagaStore } from '../utils/sagaStore'

vi.mock('../../feature/iot/iotAPI', () => ({
  default: {
    getFeederElectricalHistory: vi.fn(),
    getFeederElectricalHistoryReceived: vi.fn(),
    getFeederDiagnosticHistory: vi.fn(),
    getCommandHistory: vi.fn(),
  },
}))

const api = vi.mocked(iotAPI)

const renderModal = (ui: React.ReactElement) =>
  renderWithSagaStore(ui, {
    reducers: { iotMonitor: iotMonitorReducer },
    sagas: [iotMonitorSaga],
  })

describe('FeederHistoryModal (modal lịch sử theo mạch)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getFeederElectricalHistory.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] })
    api.getFeederElectricalHistoryReceived.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] })
    api.getFeederDiagnosticHistory.mockResolvedValue({ page: 1, page_size: 20, total: 0, items: [] })
    api.getCommandHistory.mockResolvedValue({ page: 1, page_size: 10, total: 0, items: [] })
  })

  it('opens on electrical tab by default with view mode group and dialog name "Lịch sử mạch FDR-001"', async () => {
    renderModal(<FeederHistoryModal feederId="FDR-001" onClose={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'Lịch sử mạch FDR-001' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Kiểu xem' })).toBeInTheDocument()
    await waitFor(() =>
      expect(api.getFeederElectricalHistory).toHaveBeenCalledWith(
        'FDR-001',
        expect.objectContaining({ page: 1 })
      )
    )
  })

  it('shows "Lịch sử lệnh" tab only when nodeId is provided', () => {
    const { unmount } = renderModal(<FeederHistoryModal feederId="FDR-001" onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Lịch sử lệnh' })).not.toBeInTheDocument()
    unmount()

    renderModal(<FeederHistoryModal feederId="FDR-001" nodeId="NODE-001" onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Lịch sử lệnh' })).toBeInTheDocument()
  })

  it('calls getFeederDiagnosticHistory with feederId when initialTab="faults"', async () => {
    renderModal(<FeederHistoryModal feederId="FDR-001" initialTab="faults" onClose={vi.fn()} />)

    await waitFor(() =>
      expect(api.getFeederDiagnosticHistory).toHaveBeenCalledWith(
        'FDR-001',
        expect.objectContaining({ page: 1, page_size: 20 })
      )
    )
    expect(api.getFeederElectricalHistory).not.toHaveBeenCalled()
  })

  it('shows time basis toggle only when allowReceivedTime is enabled', () => {
    const { unmount } = renderModal(<FeederHistoryModal feederId="FDR-001" onClose={vi.fn()} />)
    expect(screen.queryByRole('group', { name: 'Trục thời gian' })).not.toBeInTheDocument()
    unmount()

    renderModal(<FeederHistoryModal feederId="FDR-001" allowReceivedTime onClose={vi.fn()} />)
    expect(screen.getByRole('group', { name: 'Trục thời gian' })).toBeInTheDocument()
  })

  it('calls onClose when pressing Escape', () => {
    const onClose = vi.fn()
    renderModal(<FeederHistoryModal feederId="FDR-001" onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
