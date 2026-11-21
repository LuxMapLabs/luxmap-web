import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { EditUserModal, type EditUserModalProps } from '../../pages/users/components/EditUserModal'
import { UserManagementPage } from '../../pages/users/UserManagementPage'
import adminUsers, { fetchUsersSuccess, updateUserSuccess, updateUserFailure } from '../../feature/users/userSlice'
import type { UserAccountItem } from '../../types/admin/users'

const user: UserAccountItem = {
  user_id: 'user-1', username: 'engineer', full_name: 'Nguyễn Văn A',
  email: 'a@gmail.com', role: 'manager', commune_ids: ['commune-1'],
}

const renderModal = (overrides: Partial<EditUserModalProps> = {}) => {
  const store = configureStore({
    reducer: { adminCommunes: () => ({ communes: [
      { commune_id: 'commune-1', name: 'Xã An Bình' },
      { commune_id: 'commune-2', name: 'Xã Bình Minh' },
      { commune_id: 'commune-3', name: '' },
    ] }) },
  })
  let props: EditUserModalProps = {
    isOpen: true, user, onClose: vi.fn(), onSubmit: vi.fn(), ...overrides,
  }
  const view = render(<Provider store={store}><EditUserModal {...props} /></Provider>)
  return {
    ...props,
    rerender: (next: Partial<EditUserModalProps>) => {
      props = { ...props, ...next }
      view.rerender(<Provider store={store}><EditUserModal {...props} /></Provider>)
    },
  }
}

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
const changeRole = (role = 'superior') => fireEvent.change(screen.getByRole('combobox'), { target: { value: role } })
const changeName = (value = 'Nguyễn Văn B') => fireEvent.change(screen.getByPlaceholderText('Ví dụ: Nguyễn Văn A'), { target: { value } })
const popup = () => screen.getByRole('dialog', { name: 'Xác nhận thay đổi quyền?' })
const confirm = () => fireEvent.click(within(popup()).getByRole('button', { name: 'Xác nhận' }))

describe('EditUserModal', () => {
  it('disables saving unchanged or whitespace-only changes', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled()
    changeName('  Nguyễn Văn A  ')
    fireEvent.change(screen.getByPlaceholderText('nguyenvana@gmail.com'), { target: { value: ' a@gmail.com ' } })
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled()
  })

  it('submits a name-only change directly with trimmed values', () => {
    const { onSubmit } = renderModal()
    changeName('  Nguyễn Văn B  ')
    save()
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('user-1', {
      full_name: 'Nguyễn Văn B', email: 'a@gmail.com', role: 'manager', commune_ids: ['commune-1'],
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('submits an email-only change directly', () => {
    const { onSubmit } = renderModal()
    fireEvent.change(screen.getByPlaceholderText('nguyenvana@gmail.com'), { target: { value: 'b@gmail.com' } })
    save()
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('confirms role changes with human labels before sending the existing payload', () => {
    const { onSubmit } = renderModal()
    changeRole()
    save()
    expect(within(popup()).getByText('Quản lý')).toBeInTheDocument()
    expect(within(popup()).getByText('Cấp giám sát')).toBeInTheDocument()
    expect(within(popup()).getByText(/tối đa 60 phút/)).toBeInTheDocument()
    expect(within(popup()).queryByText(/địa bàn mới/)).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    confirm()
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('user-1', {
      full_name: 'Nguyễn Văn A', email: 'a@gmail.com', role: 'superior', commune_ids: ['commune-1'],
    })
  })

  it('shows old and new commune names and the scope consequence', () => {
    const { onSubmit } = renderModal()
    fireEvent.click(screen.getByRole('radio', { name: 'Xã Bình Minh' }))
    save()
    expect(within(popup()).getByText('Xã An Bình')).toBeInTheDocument()
    expect(within(popup()).getByText('Xã Bình Minh')).toBeInTheDocument()
    expect(within(popup()).getByText(/Phạm vi dữ liệu tài khoản được phép xem sẽ thay đổi theo địa bàn mới/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    confirm()
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('user-1', {
      full_name: 'Nguyễn Văn A', email: 'a@gmail.com', role: 'manager', commune_ids: ['commune-2'],
    })
  })

  it('includes name and email changes in the complete confirmation summary', () => {
    renderModal()
    changeRole()
    changeName()
    fireEvent.change(screen.getByPlaceholderText('nguyenvana@gmail.com'), { target: { value: 'b@gmail.com' } })
    save()
    for (const text of ['Họ và tên', 'Email', 'Nguyễn Văn A', 'Nguyễn Văn B', 'a@gmail.com', 'b@gmail.com']) {
      expect(within(popup()).getByText(text)).toBeInTheDocument()
    }
  })

  it('cancel returns to the edited form without sending anything', () => {
    const { onSubmit } = renderModal()
    changeRole()
    changeName()
    save()
    fireEvent.click(within(popup()).getByRole('button', { name: 'Huỷ' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox')).toHaveValue('superior')
    expect(screen.getByPlaceholderText('Ví dụ: Nguyễn Văn A')).toHaveValue('Nguyễn Văn B')
  })

  it('Escape closes only the popup', () => {
    const { onClose, onSubmit } = renderModal()
    changeRole()
    save()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox')).toHaveValue('superior')
  })

  it('disables every popup button and Escape while submitting, closes on finish and allows retry', () => {
    const { rerender, onSubmit } = renderModal()
    changeRole()
    save()
    confirm()
    rerender({ isSubmitting: true })
    for (const button of within(popup()).getAllByRole('button')) expect(button).toBeDisabled()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(popup()).toBeInTheDocument()
    fireEvent.click(within(popup()).getByRole('button', { name: 'Xác nhận' }))
    expect(onSubmit).toHaveBeenCalledOnce()
    rerender({ isSubmitting: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('superior')
    save()
    expect(popup()).toBeInTheDocument()
  })

  it('resets confirmation and form when closing and reopening the same user', () => {
    const { rerender } = renderModal()
    changeRole()
    save()
    rerender({ isOpen: false })
    rerender({ isOpen: true })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('manager')
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled()
  })

  it('resets confirmation when the edited user changes', () => {
    const { rerender } = renderModal()
    changeRole()
    save()
    rerender({ user: { ...user, user_id: 'user-2', full_name: 'Nguyễn Văn C' } })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ví dụ: Nguyễn Văn A')).toHaveValue('Nguyễn Văn C')
  })

  it('keeps validation before confirmation', () => {
    const { onSubmit } = renderModal()
    changeRole()
    changeName('')
    save()
    expect(screen.getByText('Họ và tên không được để trống')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows whole-system scope and omits commune_ids for system admins', () => {
    const { onSubmit } = renderModal()
    changeRole('system_admin')
    save()
    expect(within(popup()).getByText('Phạm vi toàn hệ thống')).toBeInTheDocument()
    confirm()
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('user-1', {
      full_name: 'Nguyễn Văn A', email: 'a@gmail.com', role: 'system_admin',
    })
  })

  it('ignores stored communes for an unchanged system admin', () => {
    renderModal({ user: { ...user, role: 'system_admin', commune_ids: ['*', 'commune-1'] } })
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled()
  })

  it('falls back to commune id when a name is missing', () => {
    renderModal({ user: { ...user, commune_ids: ['unknown-id'] } })
    fireEvent.click(screen.getByRole('radio', { name: 'commune-3' }))
    save()
    expect(within(popup()).getByText('unknown-id')).toBeInTheDocument()
    expect(within(popup()).getByText('commune-3')).toBeInTheDocument()
  })

  it('shows a dash for empty original scope', () => {
    renderModal({ user: { ...user, commune_ids: [] } })
    fireEvent.click(screen.getByRole('radio', { name: 'Xã Bình Minh' }))
    save()
    expect(within(popup()).getByText('-')).toBeInTheDocument()
  })
})


describe('UserManagementPage edit completion', () => {
  it.each(['success', 'error'])('waits for completion and handles %s', (result) => {
    const store = configureStore({
      reducer: {
        adminUsers,
        auth: () => ({ user: null }),
        adminCommunes: () => ({ communes: [{ commune_id: 'commune-1', name: 'Xã An Bình' }] }),
      },
    })
    render(<Provider store={store}><UserManagementPage /></Provider>)
    act(() => { store.dispatch(fetchUsersSuccess({ items: [user], total: 1 })) })
    fireEvent.click(screen.getByTitle('Chỉnh sửa tài khoản'))
    // The other comboboxes belong to the page filters.
    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: 'superior' } })
    save()
    confirm()
    expect(store.getState().adminUsers.isSubmitting).toBe(true)
    expect(screen.getByText('Cập nhật thông tin tài khoản')).toBeInTheDocument()
    expect(within(popup()).getByRole('button', { name: 'Xác nhận' })).toBeDisabled()
    act(() => {
      store.dispatch(result === 'success'
        ? updateUserSuccess({ ...user, role: 'superior' })
        : updateUserFailure('Không thể cập nhật tài khoản'))
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    if (result === 'success') {
      expect(screen.queryByText('Cập nhật thông tin tài khoản')).not.toBeInTheDocument()
    } else {
      expect(screen.getByText('Cập nhật thông tin tài khoản')).toBeInTheDocument()
      expect(screen.getAllByRole('combobox')[2]).toHaveValue('superior')
      expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeEnabled()
      save()
      expect(popup()).toBeInTheDocument()
    }
  })
})
