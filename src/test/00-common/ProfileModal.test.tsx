import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

import rootReducer from '../../redux/rootReducer'
import { ProfileModal } from '../../components/ProfileModal'
import type { CurrentUserResponse } from '../../types/auth/me'

const user = {
  user_id: 'U-1',
  username: 'engineer',
  full_name: 'Quản lý Một',
  email: 'manager@example.com',
  role: 'manager',
  commune_ids: ['COM-001'],
  communes: [{ commune_id: 'COM-001', name: 'Phường Long Bình' }],
  avatar_url: null,
} as unknown as CurrentUserResponse

const renderModal = () => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  })
  const view = render(
    <Provider store={store}>
      <ProfileModal isOpen onClose={vi.fn()} user={user} />
    </Provider>
  )
  const input = view.container.querySelector('input[type="file"]') as HTMLInputElement
  return { store, input }
}

const pick = (input: HTMLInputElement, file: File) => fireEvent.change(input, { target: { files: [file] } })

describe('ProfileModal', () => {
  it('shows name and email read-only, with no separate edit mode', () => {
    renderModal()
    expect(screen.getByText('Họ và tên')).toBeInTheDocument()
    expect(screen.getAllByText('Quản lý Một').length).toBeGreaterThan(0)
    expect(screen.getByText('manager@example.com')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByText('Chỉnh sửa hồ sơ')).not.toBeInTheDocument()
  })

  it('offers the avatar picker straight away, accepting JPEG and PNG', () => {
    const { input } = renderModal()
    expect(screen.getByRole('button', { name: 'Đổi ảnh đại diện' })).toBeInTheDocument()
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png')
  })

  it('uploads a PNG and refuses other formats', () => {
    const { store, input } = renderModal()

    pick(input, new File(['gif'], 'a.gif', { type: 'image/gif' }))
    expect(screen.getByText('Chỉ chấp nhận ảnh JPEG hoặc PNG.')).toBeInTheDocument()
    expect(store.getState().avatar.isSubmitting).toBe(false)

    pick(input, new File(['png'], 'a.png', { type: 'image/png' }))
    expect(screen.queryByText('Chỉ chấp nhận ảnh JPEG hoặc PNG.')).not.toBeInTheDocument()
    expect(store.getState().avatar.isSubmitting).toBe(true)
  })
})
