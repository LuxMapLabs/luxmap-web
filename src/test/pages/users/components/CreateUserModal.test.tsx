import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { CreateUserModal } from '../../../../pages/users/components/CreateUserModal'

const renderModal = (onSubmit = vi.fn()) => {
  const store = configureStore({
    reducer: { adminCommunes: () => ({ communes: [] }) },
  })
  render(
    <Provider store={store}>
      <CreateUserModal isOpen onClose={() => {}} onSubmit={onSubmit} />
    </Provider>,
  )
  return onSubmit
}

const fill = (fullName: string) => {
  fireEvent.change(screen.getByPlaceholderText('Ví dụ: Nguyễn Văn A'), { target: { value: fullName } })
  fireEvent.change(screen.getByPlaceholderText('nguyenvana@gmail.com'), { target: { value: 'a@gmail.com' } })
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'system_admin' } })
  fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản/ }))
}

describe('CreateUserModal', () => {
  it('không có ô tên đăng nhập và không gửi username', () => {
    const onSubmit = renderModal()
    expect(screen.queryByText(/Tên đăng nhập \(Username\)/)).toBeNull()

    fill('Nguyễn Văn Đạt')
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('username')
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('commune_ids')
  })

  it('từ chối họ tên có số hoặc ký tự đặc biệt', () => {
    const onSubmit = renderModal()
    fill('ddd1')

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/chỉ gồm chữ cái, khoảng trắng và dấu gạch ngang/)).toBeTruthy()
  })
})
