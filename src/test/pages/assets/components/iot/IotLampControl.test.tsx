import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import assetAPI from '../../../../../feature/assets/assetAPI'
import { IotLampControl } from '../../../../../pages/assets/components/iot/components/IotLampControl'

vi.mock('../../../../../feature/assets/assetAPI', () => ({
  default: {
    getIotNodeCommand: vi.fn(),
    sendIotNodeCommand: vi.fn(),
  },
}))

const accepted = { command_id: 'cmd-1', mode: 'MANUAL', command: 'ON', command_acknowledged: false }
const get = vi.mocked(assetAPI.getIotNodeCommand)
const post = vi.mocked(assetAPI.sendIotNodeCommand)

async function open() {
  render(<IotLampControl nodeId="NODE-1" />)
  await act(async () => {})
}
async function send(label = 'Bật') {
  fireEvent.click(screen.getByRole('button', { name: label }))
  expect(post).not.toHaveBeenCalled()
  expect(screen.getByText(/toàn bộ mạch xuất tuyến/)).toBeInTheDocument()
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận gửi lệnh' }))
  })
}
async function tick(ms = 2000) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('IotLampControl', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    get.mockResolvedValue(accepted)
    post.mockResolvedValue(accepted)
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('202 then matching polled ACK succeeds', async () => {
    await open()
    expect(screen.getByText(/MANUAL \/ ON/)).toBeInTheDocument()
    await send()
    expect(post).toHaveBeenCalledWith(
      'NODE-1',
      { mode: 'MANUAL', command: 'ON' },
      expect.any(AbortSignal)
    )
    expect(screen.getByRole('status')).toHaveTextContent('Đang chờ thiết bị xác nhận…')
    expect(screen.getByRole('button', { name: 'Tắt' })).toBeDisabled()
    get.mockResolvedValue({ ...accepted, command_acknowledged: true })
    await tick()
    expect(screen.getByRole('status')).toHaveTextContent('Thiết bị đã xác nhận lệnh')
    await tick(60_000)
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('different polled command ID is superseded even with ACK', async () => {
    await open()
    await send()
    get.mockResolvedValue({ ...accepted, command_id: 'cmd-2', command_acknowledged: true })
    await tick()
    expect(screen.getByRole('status')).toHaveTextContent('Lệnh đã bị lệnh khác thay thế')
    await tick(60_000)
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('POST 503 shows bridge error without success or polling', async () => {
    await open()
    post.mockRejectedValue({ response: { status: 503 } })
    await send()
    expect(screen.getByRole('status')).toHaveTextContent('Không kết nối được IoT Bridge')
    expect(screen.queryByText('Thiết bị đã xác nhận lệnh')).not.toBeInTheDocument()
    await tick(60_000)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('stops polling and aborts in-flight GET on unmount', async () => {
    await open()
    await send()
    get.mockImplementation(() => new Promise(() => {}))
    await tick()
    const signal = get.mock.calls[1][1]
    cleanup()
    expect(signal?.aborted).toBe(true)
    await tick(60_000)
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('times out after 60 seconds even if GET never resolves', async () => {
    await open()
    await send()
    get.mockImplementation(() => new Promise(() => {}))
    await tick(60_000)
    expect(screen.getByRole('status')).toHaveTextContent('Chưa nhận xác nhận từ thiết bị')
    expect(screen.getByRole('button', { name: 'Bật' })).toBeEnabled()
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('uses expires_at to stop before the next poll', async () => {
    await open()
    post.mockResolvedValue({ ...accepted, expires_at: new Date(Date.now() + 1000).toISOString() })
    await send()
    await tick(1000)
    expect(screen.getByRole('status')).toHaveTextContent('Chưa nhận xác nhận từ thiết bị')
    await tick(5000)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('POST ACK alone is not success', async () => {
    await open()
    post.mockResolvedValue({ ...accepted, command_acknowledged: true })
    await send()
    expect(screen.getByRole('status')).toHaveTextContent('Đang chờ thiết bị xác nhận…')
    expect(screen.queryByText('Thiết bị đã xác nhận lệnh')).not.toBeInTheDocument()
    expect(screen.queryByText(/— Thiết bị đã xác nhận/)).not.toBeInTheDocument()
  })

  it.each([
    [403, 'Bạn không có quyền điều khiển đèn'],
    [404, 'Không tìm thấy thiết bị hoặc nguồn IoT chưa được cấu hình'],
    [400, 'Lệnh điều khiển không hợp lệ'],
  ])('maps HTTP %i errors', async (status, message) => {
    await open()
    post.mockRejectedValue({ response: { status } })
    await send()
    expect(screen.getByRole('status')).toHaveTextContent(message)
  })

  it('AUTO sends no command or schedule', async () => {
    await open()
    await send('Tự động')
    expect(post).toHaveBeenCalledWith('NODE-1', { mode: 'AUTO' }, expect.any(AbortSignal))
  })

  it('prefers backend error.message', async () => {
    await open()
    post.mockRejectedValue({
      response: { status: 400, data: { error: { message: 'Relay chưa được gán' } } },
    })
    await send()
    expect(screen.getByRole('status')).toHaveTextContent('Relay chưa được gán')
  })
})
