import { describe, it, expect, vi } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import passwordReducer, {
  forgotPasswordFailure,
  forgotPasswordSuccess,
} from '../../feature/password/passwordSlice'
import { ForgotPasswordPage } from '../../pages/forgot-password/ForgotPasswordPage'

const renderPage = () => {
  const store = configureStore({ reducer: { password: passwordReducer } })
  const dispatchSpy = vi.spyOn(store, 'dispatch')
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/forgot-password']}>
        <ForgotPasswordPage />
      </MemoryRouter>
    </Provider>,
  )
  return { store, dispatchSpy }
}

const submitEmail = (email: string) => {
  fireEvent.change(document.getElementById('forgot-email') as HTMLInputElement, {
    target: { value: email },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' }))
}

describe('ForgotPasswordPage', () => {
  it('từ chối email sai định dạng và không dispatch forgotPasswordRequest', () => {
    const { dispatchSpy } = renderPage()
    submitEmail('abc')

    const input = document.getElementById('forgot-email') as HTMLInputElement
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe('forgot-email-error')
    expect(document.getElementById('forgot-email-error')?.textContent).toContain(
      'Email không đúng định dạng',
    )
    expect(
      dispatchSpy.mock.calls.some(
        ([a]) => (a as { type: string }).type === 'password/forgotPasswordRequest',
      ),
    ).toBe(false)
  })

  it('báo lỗi khi để trống email', () => {
    renderPage()
    submitEmail('')

    expect(screen.getByText('Vui lòng nhập email')).toBeTruthy()
  })

  it('email hợp lệ có khoảng trắng thì trim và dispatch forgotPasswordRequest', () => {
    const { dispatchSpy } = renderPage()
    submitEmail('  user@example.com  ')

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'password/forgotPasswordRequest',
      payload: { email: 'user@example.com' },
    })
  })

  it('khi nhận forgotPasswordSuccess thì hiện màn hình đã gửi', () => {
    const { store } = renderPage()
    act(() => {
      store.dispatch(forgotPasswordSuccess())
    })

    const status = screen.getByRole('status')
    expect(status.textContent).toContain('Kiểm tra email của bạn')
    expect(status.textContent).toMatch(/Liên kết có hiệu lực 1\u00A0giờ/)
  })

  it('khi nhận forgotPasswordFailure thì hiện thông báo lỗi trong role="alert"', () => {
    const { store } = renderPage()
    const errorMessage = 'Bạn đã yêu cầu quá nhiều lần. Vui lòng đợi một lát rồi thử lại.'
    act(() => {
      store.dispatch(forgotPasswordFailure(errorMessage))
    })

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain(errorMessage)
  })
})
