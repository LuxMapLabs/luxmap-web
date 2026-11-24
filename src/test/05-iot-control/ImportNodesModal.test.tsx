import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import { ImportNodesModal } from '../../pages/iot-bridge/components/ImportNodesModal'
import iotBridgeReducer from '../../feature/iot/iotBridgeSlice'
import iotBridgeSaga from '../../feature/iot/iotBridgeSaga'
import iotAPI from '../../feature/iot/iotAPI'
import { communeAPI } from '../../feature/communes/communeAPI'
import { assetAPI } from '../../feature/assets/assetAPI'
import { saveWorkbookFile } from '../../utils/assets/workbookStyler'
import { styleIotNodeWorkbook } from '../../utils/iot/nodeWorkbookStyler'
import { renderWithSagaStore } from '../utils/sagaStore'

vi.mock('../../feature/iot/iotAPI', () => ({
  default: {
    getServers: vi.fn(),
    getNodes: vi.fn(),
    importNodes: vi.fn(),
    getNodeImportTemplate: vi.fn(),
  },
}))

vi.mock('../../feature/communes/communeAPI', () => ({
  communeAPI: { getCommunes: vi.fn() },
}))

vi.mock('../../feature/assets/assetAPI', () => ({
  assetAPI: { getCabinets: vi.fn(), getFeeders: vi.fn() },
}))

vi.mock('../../utils/assets/workbookStyler', () => ({
  saveWorkbookFile: vi.fn(),
}))

vi.mock('../../utils/iot/nodeWorkbookStyler', () => ({
  styleIotNodeWorkbook: vi.fn(),
}))

const api = vi.mocked(iotAPI)
const communes = vi.mocked(communeAPI)
const assets = vi.mocked(assetAPI)
const saveFile = vi.mocked(saveWorkbookFile)
const styleFile = vi.mocked(styleIotNodeWorkbook)

const renderModal = (onClose = vi.fn()) =>
  renderWithSagaStore(<ImportNodesModal onClose={onClose} />, {
    reducers: { iotBridge: iotBridgeReducer },
    sagas: [iotBridgeSaga],
  })

describe('ImportNodesModal (POST /api/v1/iot/nodes/import)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getServers.mockResolvedValue([])
    api.getNodes.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] })
    communes.getCommunes.mockResolvedValue({ page: 1, page_size: 200, total: 0, items: [] } as never)
    assets.getCabinets.mockResolvedValue({ items: [] } as never)
    assets.getFeeders.mockResolvedValue({ items: [] } as never)
  })

  it('rejects non-.xlsx file and does not call importNodes', async () => {
    renderModal()
    const input = screen.getByLabelText('Chọn file Excel nhập node IoT')
    const badFile = new File(['hello'], 'nodes.csv', { type: 'text/csv' })

    fireEvent.change(input, { target: { files: [badFile] } })

    expect(await screen.findByRole('alert')).toHaveTextContent(/\.xlsx/)
    const importBtn = screen.getByRole('button', { name: 'Nhập' })
    expect(importBtn).toBeDisabled()
    fireEvent.click(importBtn)
    expect(api.importNodes).not.toHaveBeenCalled()
  })

  it('calls iotAPI.importNodes with the selected valid .xlsx file when clicking "Nhập"', async () => {
    api.importNodes.mockResolvedValue({
      sheet: 'Nodes',
      total: 1,
      created: 1,
      existing: 0,
      failed: 0,
      items: [
        {
          row: 2,
          server_id: 'iot-server-01',
          feeder_id: 'FDR-001',
          device_id: 'LUXMAP-P001',
          status: 'created',
          node_id: 'NODE-001',
        },
      ],
    })

    renderModal()
    const input = screen.getByLabelText('Chọn file Excel nhập node IoT')
    const validFile = new File(['xlsx-bytes'], 'iot-nodes.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    fireEvent.change(input, { target: { files: [validFile] } })
    expect(screen.getByText('iot-nodes.xlsx')).toBeInTheDocument()

    const importBtn = screen.getByRole('button', { name: 'Nhập' })
    expect(importBtn).toBeEnabled()
    fireEvent.click(importBtn)

    await waitFor(() => expect(api.importNodes).toHaveBeenCalledWith(validFile))
    expect(await screen.findByText('NODE-001')).toBeInTheDocument()
  })

  it('renders created, existing, and failed rows with proper chips, error message, and error field', async () => {
    api.importNodes.mockResolvedValue({
      sheet: 'Nodes',
      total: 3,
      created: 1,
      existing: 1,
      failed: 1,
      items: [
        {
          row: 2,
          server_id: 'iot-server-01',
          feeder_id: 'FDR-001',
          device_id: 'DEV-001',
          status: 'created',
          node_id: 'NODE-101',
        },
        {
          row: 3,
          server_id: 'iot-server-01',
          feeder_id: 'FDR-002',
          device_id: 'DEV-002',
          status: 'existing',
          node_id: 'NODE-102',
        },
        {
          row: 4,
          server_id: 'iot-server-01',
          feeder_id: 'FDR-999',
          device_id: 'DEV-003',
          status: 'failed',
          error: {
            code: 'FEEDER_NOT_FOUND',
            message: 'Không tìm thấy mạch điện.',
            field: 'feeder_id',
          },
        },
      ],
    })

    renderModal()
    const input = screen.getByLabelText('Chọn file Excel nhập node IoT')
    const file = new File(['xlsx'], 'batch.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Nhập' }))

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(4) // 1 header + 3 data rows

    expect(within(rows[1]).getByText('Đã tạo')).toBeInTheDocument()
    expect(within(rows[1]).getByText('NODE-101')).toBeInTheDocument()

    expect(within(rows[2]).getByText('Đã có')).toBeInTheDocument()
    expect(within(rows[2]).getByText('NODE-102')).toBeInTheDocument()

    expect(within(rows[3]).getByText('Lỗi')).toBeInTheDocument()
    expect(within(rows[3]).getByText('Không tìm thấy mạch điện.')).toBeInTheDocument()
    expect(within(rows[3]).getByText(/Cột:/)).toBeInTheDocument()
    expect(within(rows[3]).getByText('feeder_id')).toBeInTheDocument()
    expect(within(rows[3]).getByText('FEEDER_NOT_FOUND')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Nhập file khác' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Đóng' }).length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty state when items is empty', async () => {
    api.importNodes.mockResolvedValue({
      sheet: 'Nodes',
      total: 0,
      created: 0,
      existing: 0,
      failed: 0,
      items: [],
    })

    renderModal()
    const input = screen.getByLabelText('Chọn file Excel nhập node IoT')
    const file = new File(['xlsx'], 'empty.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Nhập' }))

    expect(await screen.findByText('File không có dòng dữ liệu nào.')).toBeInTheDocument()
  })

  it('displays error alert when API rejects', async () => {
    api.importNodes.mockRejectedValue({
      response: { data: { error: { message: 'Tệp Excel không có sheet Nodes.' } } },
    })

    renderModal()
    const input = screen.getByLabelText('Chọn file Excel nhập node IoT')
    const file = new File(['xlsx'], 'invalid-sheet.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Nhập' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Tệp Excel không có sheet Nodes.')
  })

  it('styles the template then saves it when clicking "Tải file mẫu"', async () => {
    const buffer = new ArrayBuffer(16)
    const styled = new ArrayBuffer(32)
    api.getNodeImportTemplate.mockResolvedValue(buffer)
    styleFile.mockResolvedValue(styled)

    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /Tải file mẫu/ }))

    await waitFor(() => expect(api.getNodeImportTemplate).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(saveFile).toHaveBeenCalledWith(styled, 'Mau-nhap-node-iot.xlsx'))
  })
})
