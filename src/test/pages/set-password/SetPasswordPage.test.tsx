import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import passwordReducer from '../../../feature/password/passwordSlice'
import { SetPasswordPage } from '../../../pages/set-password/SetPasswordPage'

const renderPage = (url: string) => {
  const store = configureStore({ reducer: { password: passwordReducer } })
  const dispatchSpy = vi.spyOn(store, 'dispatch')
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[url]}>
        <SetPasswordPage />
      </MemoryRouter>
    </Provider>,
  )
  return { store, dispatchSpy }
}

const fill = (password: string, confirm: string) => {
  fireEvent.change(document.getElementById('new-password') as HTMLInputElement, { target: { value: password } })
  fireEvent.change(document.getElementById('confirm-password') as HTMLInputElement, { target: { value: confirm } })
  fireEvent.click(screen.getByRole('button', { name: 'Đặt mật khẩu' }))
}

describe('SetPasswordPage', () => {
  it('thiếu token trên URL thì báo liên kết không hợp lệ', () => {
    renderPage('/set-password')
    expect(screen.getByText('Liên kết không hợp lệ')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Đặt mật khẩu' })).toBeNull()
  })

  it('từ chối mật khẩu ngắn hơn 12 ký tự và không gọi API', () => {
    const { dispatchSpy } = renderPage('/set-password?token=abc')
    fill('short', 'short')

    expect(screen.getByText(/ít nhất 12 ký tự/)).toBeTruthy()
    expect(dispatchSpy.mock.calls.some(([a]) => (a as { type: string }).type === 'password/setPasswordRequest')).toBe(false)
  })

  it('từ chối khi hai ô mật khẩu không khớp', () => {
    renderPage('/set-password?token=abc')
    fill('a-long-password-1', 'a-long-password-2')

    expect(screen.getByText('Mật khẩu nhập lại không khớp')).toBeTruthy()
  })

  it('hợp lệ thì dispatch setPasswordRequest kèm token', () => {
    const { dispatchSpy } = renderPage('/set-password?token=abc')
    fill('a-long-password-1', 'a-long-password-1')

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'password/setPasswordRequest',
      payload: { token: 'abc', new_password: 'a-long-password-1' },
    })
  })

  it('hiện thanh độ mạnh đổi theo mật khẩu đang nhập', async () => {
    renderPage('/set-password?token=abc')
    const meter = screen.getByRole('meter')
    expect(meter.getAttribute('aria-valuenow')).toBe('0')

    fireEvent.change(document.getElementById('new-password') as HTMLInputElement, { target: { value: 'short' } })
    expect(meter.getAttribute('aria-valuetext')).toBe('Rất yếu')

    fireEvent.change(document.getElementById('new-password') as HTMLInputElement, { target: { value: 'qT7#vLx9!mZp2Rw8' } })
    await waitFor(() => expect(meter.getAttribute('aria-valuetext')).toBe('Mạnh'))
  })
})
