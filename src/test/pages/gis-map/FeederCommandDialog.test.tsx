import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeederCommandDialog, type FeederCommandTarget } from '../../../pages/gis-map/components/FeederCommandDialog'

const target = (over: Partial<FeederCommandTarget> = {}): FeederCommandTarget => ({
  feederId: 'FDR-010',
  nodeId: 'NODE-001',
  mode: 'on',
  initial: null,
  feederName: 'Lộ 1 - Tủ B - Tỉnh Lộ 8',
  feederCode: 'FDR-CAB-TL8-B',
  poleCount: 22,
  ...over,
})

const renderDialog = (over: Partial<FeederCommandTarget> = {}, sending = false) => {
  const onSend = vi.fn()
  const onClose = vi.fn()
  render(<FeederCommandDialog target={target(over)} sending={sending} onSend={onSend} onClose={onClose} />)
  return { onSend, onClose }
}

describe('FeederCommandDialog', () => {
  it('names the feeder the same way as its row: name, code, node and how many poles it affects', () => {
    renderDialog()
    const dialog = screen.getByRole('dialog', { name: 'Xác nhận bật mạch FDR-010' })
    expect(dialog).toHaveTextContent('Bật cả mạch?')
    expect(dialog).toHaveTextContent('Lộ 1 - Tủ B - Tỉnh Lộ 8')
    expect(dialog).toHaveTextContent('FDR-CAB-TL8-B')
    expect(dialog).toHaveTextContent('NODE-001')
    expect(dialog).toHaveTextContent('22 cột đèn')
  })

  it('falls back to the feeder id and "Cả mạch" when the row gave no name, code or count', () => {
    renderDialog({ feederName: undefined, feederCode: undefined, poleCount: undefined, mode: 'off' })
    const dialog = screen.getByRole('dialog', { name: 'Xác nhận tắt mạch FDR-010' })
    expect(dialog).toHaveTextContent('Mạch FDR-010')
    expect(dialog).toHaveTextContent('Cả mạch')
  })

  it('confirm sends without a schedule; Esc, the X and the backdrop close without sending', () => {
    const { onSend, onClose } = renderDialog()
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Đóng hộp lệnh' }))
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(3)
    expect(onSend).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận Bật' }))
    expect(onSend).toHaveBeenCalledWith()
  })

  it('a click inside the dialog does not close it', () => {
    const { onClose } = renderDialog()
    fireEvent.mouseDown(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('cannot be closed or sent twice while the command is being sent', () => {
    const { onSend, onClose } = renderDialog({}, true)
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement as HTMLElement)
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Đang gửi/ })).toBeDisabled()
    expect(onSend).not.toHaveBeenCalled()
  })

  it('AUTO: shows the schedule in 24-hour HH:mm and sends it', () => {
    const { onSend } = renderDialog({ mode: 'auto', initial: { day_start: '05:30', night_start: '18:15' } })
    expect(screen.getByRole('dialog', { name: 'Lịch AUTO mạch FDR-010' })).toHaveTextContent('Chạy AUTO theo lịch')
    expect(screen.getByLabelText('Bắt đầu ban đêm')).toHaveValue('18:15')
    fireEvent.change(screen.getByLabelText('Bắt đầu ban ngày'), { target: { value: '06:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi AUTO' }))
    expect(onSend).toHaveBeenCalledWith({ day_start: '06:00', night_start: '18:15' })
  })

  it('AUTO: refuses a time that is not HH:mm', () => {
    const { onSend } = renderDialog({ mode: 'auto' })
    fireEvent.change(screen.getByLabelText('Bắt đầu ban ngày'), { target: { value: '6h' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi AUTO' }))
    expect(screen.getByText('Lịch AUTO cần hai giờ khác nhau theo định dạng HH:mm.')).toBeInTheDocument()
    expect(onSend).not.toHaveBeenCalled()
  })
})
