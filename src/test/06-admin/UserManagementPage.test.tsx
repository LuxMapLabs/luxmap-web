import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { UserManagementPage } from '../../pages/users/UserManagementPage'
import { UserTable } from '../../pages/users/components/UserTable'
import adminUsers, { fetchUsersSuccess } from '../../feature/users/userSlice'
import type { UserAccountItem } from '../../types/admin/users'

const self: UserAccountItem = {
  user_id: 'self-id', username: 'admin', email: 'admin@example.com',
  full_name: 'Signed-in Admin', role: 'system_admin', status: 'active',
}
const other: UserAccountItem = {
  user_id: 'other-id', username: 'engineer', email: 'engineer@example.com',
  full_name: 'Other User', role: 'manager', status: 'active', commune_ids: ['commune-1'],
}
const selfLockLabel = 'Không thể khoá tài khoản của chính bạn'

const renderPage = (items = [other, self]) => {
  const store = configureStore({
    reducer: {
      adminUsers,
      auth: () => ({ user: self }),
      adminCommunes: () => ({ communes: [{ commune_id: 'commune-1', name: 'Xã An Bình' }] }),
    },
  })
  render(<Provider store={store}><UserManagementPage /></Provider>)
  act(() => { store.dispatch(fetchUsersSuccess({ items, total: items.length })) })
  return store
}

const rowFor = (name: string) => screen.getByRole('row', { name: new RegExp(name) })

describe('UserManagementPage self row', () => {
  it('hides the signed-in user row and reflects visible rows in the footer', () => {
    renderPage()
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(1)
    expect(within(rows[0]).getByText('Other User')).toBeInTheDocument()
    expect(screen.queryByText('Signed-in Admin')).not.toBeInTheDocument()
    expect(screen.queryByText('Bạn')).not.toBeInTheDocument()
    expect(screen.getByText(/Hiển thị/)).toHaveTextContent(
      'Hiển thị 1 - 1 trên tổng số 1 bản ghi tài khoản'
    )
  })

  it('keeps lock action working for other rows while self is hidden', () => {
    const store = renderPage()
    const dispatch = vi.spyOn(store, 'dispatch')
    expect(screen.queryByText('Signed-in Admin')).not.toBeInTheDocument()
    const otherLock = within(rowFor('Other User')).getByRole('button', {
      name: 'Khóa tài khoản (Thao tác bảo mật)',
    })
    expect(otherLock).toBeEnabled()
    fireEvent.click(otherLock)
    expect(screen.getByText('Khóa Tài Khoản')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận Khóa' }))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'adminUsers/lockUserRequest',
      payload: 'other-id',
    })
  })

  it('uses only user_id to hide self, keeping another account that shares username and email', () => {
    renderPage([{ ...other, username: self.username, email: self.email }, self])
    expect(screen.queryByText('Signed-in Admin')).not.toBeInTheDocument()
    const row = rowFor('Other User')
    expect(within(row).queryByText('Bạn')).not.toBeInTheDocument()
    expect(within(row).getByTitle('Khóa tài khoản (Thao tác bảo mật)')).toBeEnabled()
    fireEvent.click(within(row).getByTitle('Chỉnh sửa tài khoản'))
    expect(screen.getAllByRole('combobox')[2]).toBeEnabled()
    expect(screen.queryByText('Không thể đổi vai trò của chính bạn')).not.toBeInTheDocument()
  })

  it.each(['  SIGNED-IN  ', ' ADMIN ', ' ADMIN@EXAMPLE.COM '])(
    'does not return the hidden self account when searching for %s',
    (query) => {
      renderPage()
      fireEvent.change(screen.getByPlaceholderText('Tìm theo họ tên, tài khoản, email...'), {
        target: { value: query },
      })
      expect(screen.queryByText('Signed-in Admin')).not.toBeInTheDocument()
      expect(screen.queryByText('Bạn')).not.toBeInTheDocument()
      expect(screen.queryByText('Other User')).not.toBeInTheDocument()
    }
  )

  it('still finds other accounts by name/username/email search', () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Tìm theo họ tên, tài khoản, email...'), {
      target: { value: ' ENGINEER ' },
    })
    expect(screen.getByText('Other User')).toBeInTheDocument()
    expect(screen.queryByText('Signed-in Admin')).not.toBeInTheDocument()
  })

  it('does not inject self when the server page does not contain it', () => {
    renderPage([other])
    expect(screen.queryByText('Signed-in Admin')).not.toBeInTheDocument()
    expect(screen.queryByText('Bạn')).not.toBeInTheDocument()
  })
})

describe('UserTable self actions', () => {
  it.each(['active', 'locked'])('disables self lock/unlock for status %s and leaves other actions unchanged', (status) => {
    const onToggleLock = vi.fn()
    const onEdit = vi.fn()
    const onInvite = vi.fn()
    const invitedSelf = { ...self, status: 'invited' }
    const lockedOther = { ...other, status: 'locked' }
    const store = configureStore({ reducer: { adminCommunes: () => ({ communes: [] }) } })
    const view = render(<Provider store={store}>
      <UserTable users={[{ ...self, status }, lockedOther]} currentUserId="self-id"
        onToggleLock={onToggleLock} onEdit={onEdit} onInvite={onInvite} />
    </Provider>)
    const selfButton = screen.getByRole('button', { name: selfLockLabel })
    expect(selfButton).toBeDisabled()
    fireEvent.click(selfButton)
    expect(onToggleLock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTitle('Mở khóa tài khoản'))
    expect(onToggleLock).toHaveBeenCalledExactlyOnceWith(lockedOther)
    view.rerender(<Provider store={store}>
      <UserTable users={[invitedSelf]} currentUserId="self-id"
        onToggleLock={onToggleLock} onEdit={onEdit} onInvite={onInvite} />
    </Provider>)
    fireEvent.click(screen.getByTitle('Chỉnh sửa tài khoản'))
    expect(onEdit).toHaveBeenCalledExactlyOnceWith(invitedSelf)
    fireEvent.click(screen.getByTitle('Gửi lại email mời đặt mật khẩu'))
    expect(onInvite).toHaveBeenCalledExactlyOnceWith(invitedSelf)
  })

  it('does not mark missing IDs as self', () => {
    const store = configureStore({ reducer: { adminCommunes: () => ({ communes: [] }) } })
    render(<Provider store={store}>
      <UserTable users={[{ ...other, user_id: null }]} currentUserId={null}
        onToggleLock={vi.fn()} onEdit={vi.fn()} onInvite={vi.fn()} />
    </Provider>)
    expect(screen.queryByText('Bạn')).not.toBeInTheDocument()
    expect(screen.getByTitle('Khóa tài khoản (Thao tác bảo mật)')).toBeEnabled()
  })
})
