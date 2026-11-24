import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import { EditUserModal, type EditUserModalProps } from '../../pages/users/components/EditUserModal'
import { UserManagementPage } from '../../pages/users/UserManagementPage'
import adminUsers, {
  fetchUsersSuccess,
  updateUserSuccess,
  updateUserFailure,
  changeUserEmailRequest,
  setSelectedUser,
} from '../../feature/users/userSlice'
import adminUserSaga from '../../feature/users/userSaga'
import { userAPI } from '../../feature/users/userAPI'
import type { UserAccountItem } from '../../types/admin/users'
import { makeSagaStore } from '../utils/sagaStore'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

const user: UserAccountItem = {
  user_id: 'user-1',
  username: 'engineer',
  full_name: 'Nguyễn Văn A',
  email: 'a@gmail.com',
  role: 'manager',
  commune_ids: ['commune-1'],
  date_of_birth: '1995-05-10',
  gender: 'male',
  address: '123 Đường A',
  phone_number: '0912345678',
  identity_type: 'citizen_id',
  identity_number: '001095000123',
}

const renderModal = (overrides: Partial<EditUserModalProps> = {}) => {
  const store = configureStore({
    reducer: {
      adminCommunes: () => ({
        communes: [
          { commune_id: 'commune-1', name: 'Xã An Bình' },
          { commune_id: 'commune-2', name: 'Xã Bình Minh' },
          { commune_id: 'commune-3', name: '' },
        ],
      }),
    },
  })
  let props: EditUserModalProps = {
    isOpen: true,
    user,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    onChangeEmail: vi.fn(),
    ...overrides,
  }
  const view = render(
    <Provider store={store}>
      <EditUserModal {...props} />
    </Provider>
  )
  return {
    ...props,
    rerender: (next: Partial<EditUserModalProps>) => {
      props = { ...props, ...next }
      view.rerender(
        <Provider store={store}>
          <EditUserModal {...props} />
        </Provider>
      )
    },
  }
}

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
const roleSelect = () => screen.getByRole('combobox', { name: /Vai trò/ })
const changeRole = (role = 'superior') => fireEvent.change(roleSelect(), { target: { value: role } })
const changeName = (value = 'Nguyễn Văn B') =>
  fireEvent.change(screen.getByPlaceholderText('Ví dụ: Nguyễn Văn A'), { target: { value } })
const popup = () => screen.getByRole('dialog', { name: 'Xác nhận thay đổi quyền?' })
const confirm = () => fireEvent.click(within(popup()).getByRole('button', { name: 'Xác nhận' }))

describe('EditUserModal', () => {
  it('disables saving unchanged or whitespace-only changes and renders email as readonly', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled()
    expect(screen.getByLabelText('Địa chỉ Email')).toBeDisabled()
    expect(screen.getByLabelText('Địa chỉ Email')).toHaveValue('a@gmail.com')

    changeName('  Nguyễn Văn A  ')
    fireEvent.change(screen.getByLabelText('Địa chỉ'), { target: { value: '  123 Đường A  ' } })
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled()
  })

  it('submits a name-only change directly with only the changed field (no email)', () => {
    const { onSubmit } = renderModal()
    changeName('  Nguyễn Văn B  ')
    save()
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('user-1', {
      full_name: 'Nguyễn Văn B',
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('submits only changed profile fields and omits cleared fields', () => {
    const { onSubmit } = renderModal()
    fireEvent.change(screen.getByLabelText('Ngày sinh'), { target: { value: '1996-08-20' } })
    fireEvent.change(screen.getByLabelText('Giới tính'), { target: { value: 'female' } })
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '+84987654321' } })
    // Xoá trống địa chỉ -> không gửi trường này
    fireEvent.change(screen.getByLabelText('Địa chỉ'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Loại giấy tờ'), { target: { value: 'passport' } })
    fireEvent.change(screen.getByLabelText('Số giấy tờ'), { target: { value: 'P1234567' } })

    save()
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('user-1', {
      date_of_birth: '1996-08-20',
      gender: 'female',
      phone_number: '+84987654321',
      identity_type: 'passport',
      identity_number: 'P1234567',
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('validates phone number format and length when provided', () => {
    const { onSubmit } = renderModal()
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '123-abc' } })
    save()
    expect(screen.getByText(/Số điện thoại không hợp lệ/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('opens ChangeEmailModal when clicking "Đổi email", validates, and invokes onChangeEmail', () => {
    const { onChangeEmail } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Đổi email' }))

    const dialog = screen.getByRole('dialog', { name: 'Đổi địa chỉ email' })
    expect(within(dialog).getByLabelText('Email hiện tại')).toHaveValue('a@gmail.com')
    expect(
      within(dialog).getByText('Thư thông báo gửi tới email mới, mật khẩu giữ nguyên.')
    ).toBeInTheDocument()

    // Same email -> rejected
    fireEvent.change(within(dialog).getByLabelText(/Email mới/), {
      target: { value: 'a@gmail.com' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))
    expect(within(dialog).getByText('Email mới phải khác email hiện tại')).toBeInTheDocument()
    expect(onChangeEmail).not.toHaveBeenCalled()

    // Invalid format -> rejected
    fireEvent.change(within(dialog).getByLabelText(/Email mới/), {
      target: { value: 'not-an-email' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))
    expect(within(dialog).getByText('Định dạng email không hợp lệ')).toBeInTheDocument()
    expect(onChangeEmail).not.toHaveBeenCalled()

    // Valid new email -> submitted
    fireEvent.change(within(dialog).getByLabelText(/Email mới/), {
      target: { value: '  new@gmail.com  ' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))
    expect(onChangeEmail).toHaveBeenCalledExactlyOnceWith('user-1', 'new@gmail.com')
  })

  it('disables own role and commune controls while saving a name change directly', () => {
    const { onSubmit } = renderModal({ isSelf: true })
    expect(roleSelect()).toBeDisabled()
    expect(roleSelect()).toHaveAccessibleDescription('Không thể đổi vai trò của chính bạn')
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: 'Xã Bình Minh' }))
    changeName('  Nguyễn Văn B  ')
    save()
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('user-1', {
      full_name: 'Nguyễn Văn B',
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('confirms role changes with human labels before sending the payload', () => {
    const { onSubmit } = renderModal({ isSelf: false })
    expect(roleSelect()).toBeEnabled()
    expect(screen.queryByText('Không thể đổi vai trò của chính bạn')).not.toBeInTheDocument()
    changeRole()
    save()
    expect(within(popup()).getByText('Quản lý')).toBeInTheDocument()
    expect(within(popup()).getByText('Cấp giám sát')).toBeInTheDocument()
    expect(within(popup()).getByText(/tối đa 60 phút/)).toBeInTheDocument()
    expect(within(popup()).queryByText(/địa bàn mới/)).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    confirm()
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('user-1', {
      role: 'superior',
      commune_ids: ['commune-1'],
    })
  })

  it('shows old and new commune names and the scope consequence', () => {
    const { onSubmit } = renderModal()
    fireEvent.click(screen.getByRole('radio', { name: 'Xã Bình Minh' }))
    save()
    expect(within(popup()).getByText('Xã An Bình')).toBeInTheDocument()
    expect(within(popup()).getByText('Xã Bình Minh')).toBeInTheDocument()
    expect(
      within(popup()).getByText(/Phạm vi dữ liệu tài khoản được phép xem sẽ thay đổi theo địa bàn mới/)
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    confirm()
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('user-1', {
      commune_ids: ['commune-2'],
    })
  })

  it('includes name changes in the confirmation summary without email', () => {
    renderModal()
    changeRole()
    changeName()
    save()
    for (const text of ['Họ và tên', 'Nguyễn Văn A', 'Nguyễn Văn B']) {
      expect(within(popup()).getByText(text)).toBeInTheDocument()
    }
    expect(within(popup()).queryByText('Email')).not.toBeInTheDocument()
  })

  it('cancel returns to the edited form without sending anything', () => {
    const { onSubmit } = renderModal()
    changeRole()
    changeName()
    save()
    fireEvent.click(within(popup()).getByRole('button', { name: 'Huỷ' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(roleSelect()).toHaveValue('superior')
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
    expect(roleSelect()).toHaveValue('superior')
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
    expect(roleSelect()).toHaveValue('superior')
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
    expect(roleSelect()).toHaveValue('manager')
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
      role: 'system_admin',
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
    render(
      <Provider store={store}>
        <UserManagementPage />
      </Provider>
    )
    act(() => {
      store.dispatch(fetchUsersSuccess({ items: [user], total: 1 }))
    })
    fireEvent.click(screen.getByTitle('Chỉnh sửa tài khoản'))
    // The other comboboxes belong to the page filters.
    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: 'superior' } })
    save()
    confirm()
    expect(store.getState().adminUsers.isSubmitting).toBe(true)
    expect(screen.getByText('Cập nhật thông tin tài khoản')).toBeInTheDocument()
    expect(within(popup()).getByRole('button', { name: 'Xác nhận' })).toBeDisabled()
    act(() => {
      store.dispatch(
        result === 'success'
          ? updateUserSuccess({ ...user, role: 'superior' })
          : updateUserFailure('Không thể cập nhật tài khoản')
      )
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

describe('changeUserEmail slice & saga', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('updates user in list and selectedUser and shows warning when notification_sent is false', async () => {
    const updatedUser: UserAccountItem = { ...user, email: 'changed@gmail.com' }
    const spy = vi.spyOn(userAPI, 'changeUserEmail').mockResolvedValue({
      user: updatedUser,
      notification_sent: false,
    })

    const store = makeSagaStore({
      reducers: { adminUsers },
      sagas: [adminUserSaga],
    })
    store.dispatch(fetchUsersSuccess({ items: [user], total: 1 }))
    store.dispatch(setSelectedUser(user))
    store.dispatch(changeUserEmailRequest({ id: 'user-1', data: { email: 'changed@gmail.com' } }))

    await waitFor(() => {
      const state = store.getState().adminUsers
      expect(state.isSubmitting).toBe(false)
      expect(state.users[0].email).toBe('changed@gmail.com')
      expect(state.selectedUser?.email).toBe('changed@gmail.com')
      expect(spy).toHaveBeenCalledWith('user-1', { email: 'changed@gmail.com' })
      expect(toast.warning).toHaveBeenCalled()
    })
  })

  it('sets actionError and shows error toast when changeUserEmail API rejects', async () => {
    vi.spyOn(userAPI, 'changeUserEmail').mockRejectedValue({
      response: { data: { error: { message: 'Email đã tồn tại.' } } },
    })

    const store = makeSagaStore({
      reducers: { adminUsers },
      sagas: [adminUserSaga],
    })
    store.dispatch(changeUserEmailRequest({ id: 'user-1', data: { email: 'dup@gmail.com' } }))

    await waitFor(() => {
      const state = store.getState().adminUsers
      expect(state.isSubmitting).toBe(false)
      expect(state.actionError).toBe('Email đã tồn tại.')
      expect(toast.error).toHaveBeenCalled()
    })
  })
})
