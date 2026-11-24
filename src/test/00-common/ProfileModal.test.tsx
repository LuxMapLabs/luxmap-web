import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

// jsdom has no canvas: the downscale itself is the browser's job, here we check what the modal does with its result.
vi.mock('../../utils/imageUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/imageUtils')>()),
  convertToJpeg: vi.fn(),
}))

import rootReducer from '../../redux/rootReducer'
import { ProfileModal } from '../../components/ProfileModal'
import { convertToJpeg, fitWithin } from '../../utils/imageUtils'
import type { CurrentUserResponse } from '../../types/auth/me'
import { avatarSubmitDone, removeAvatarRequest } from '../../feature/avatar/avatarSlice'
import { changePasswordRequest } from '../../feature/password/passwordSlice'
import {
  changeUserEmailRequest,
  changeUserEmailSuccess,
  updateUserRequest,
  updateUserSuccess,
} from '../../feature/users/userSlice'
import { loginSuccess, updateCurrentUserProfile } from '../../feature/auth/authSlice'

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

const renderModal = (profileUser = user) => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  })
  const onClose = vi.fn()
  const modal = (isOpen: boolean, currentUser = profileUser) => (
    <Provider store={store}>
      <ProfileModal isOpen={isOpen} onClose={onClose} user={currentUser} />
    </Provider>
  )
  // Spy before the first render: handlers from that render capture store.dispatch.
  const dispatch = vi.spyOn(store, 'dispatch')
  const view = render(modal(true))
  const input = view.container.querySelector('input[type="file"]') as HTMLInputElement
  return { store, input, dispatch, onClose, rerender: (isOpen: boolean, currentUser = profileUser) => view.rerender(modal(isOpen, currentUser)) }
}

const pick = (input: HTMLInputElement, file: File) => fireEvent.change(input, { target: { files: [file] } })
const bytes = (count: number, name: string, type: string) => new File([new Uint8Array(count)], name, { type })

describe('ProfileModal', () => {
  beforeEach(() => {
    vi.mocked(convertToJpeg).mockReset()
  })

  it('shows name and email read-only, with no separate edit mode', () => {
    renderModal()
    expect(screen.getByText('Họ và tên')).toBeInTheDocument()
    expect(screen.getAllByText('Quản lý Một').length).toBeGreaterThan(0)
    expect(screen.getByText('manager@example.com')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByText('Chỉnh sửa hồ sơ')).not.toBeInTheDocument()
  })

  it('lists the role as a "Chức vụ" row next to the name', () => {
    renderModal()
    const term = screen.getByText('Chức vụ')
    expect(term.nextElementSibling).toHaveTextContent(/^Quản lý$/)
  })

  it('opens avatar menu from camera button, shows "Gỡ ảnh đại diện" only when avatar_url exists, and closes menu on Escape without closing modal', () => {
    const { input, onClose, rerender } = renderModal()
    const cameraBtn = screen.getByRole('button', { name: 'Đổi ảnh đại diện' })
    expect(cameraBtn).toHaveAttribute('aria-haspopup', 'menu')
    expect(cameraBtn).toHaveAttribute('aria-expanded', 'false')
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png')

    // Chưa có ảnh: chỉ hiện "Tải ảnh mới" + ghi chú, không hiện "Gỡ ảnh đại diện"
    fireEvent.click(cameraBtn)
    expect(cameraBtn).toHaveAttribute('aria-expanded', 'true')
    const menu = screen.getByRole('menu')
    const uploadItem = within(menu).getByRole('menuitem', { name: 'Tải ảnh mới' })
    expect(uploadItem).toHaveFocus()
    expect(within(menu).queryByRole('menuitem', { name: 'Gỡ ảnh đại diện' })).not.toBeInTheDocument()
    expect(within(menu).getByText('JPEG hoặc PNG, tối đa 1 MB')).toBeInTheDocument()

    // Esc đóng menu, trả focus về nút camera và KHÔNG đóng modal
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(cameraBtn).toHaveFocus()
    expect(onClose).not.toHaveBeenCalled()

    // Có ảnh: hiện cả "Tải ảnh mới" và "Gỡ ảnh đại diện", mũi tên xuống/lên chuyển mục
    rerender(true, { ...user, avatar_url: '/api/v1/auth/me/avatar' })
    fireEvent.click(screen.getByRole('button', { name: 'Đổi ảnh đại diện' }))
    const openMenu = screen.getByRole('menu')
    const removeItem = within(openMenu).getByRole('menuitem', { name: 'Gỡ ảnh đại diện' })
    fireEvent.keyDown(openMenu, { key: 'ArrowDown' })
    expect(removeItem).toHaveFocus()
  })

  it('asks for confirmation before dispatching avatar removal', () => {
    const { dispatch } = renderModal({ ...user, avatar_url: '/api/v1/auth/me/avatar' })
    fireEvent.click(screen.getByRole('button', { name: 'Đổi ảnh đại diện' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Gỡ ảnh đại diện' }))
    expect(screen.getByRole('dialog', { name: 'Gỡ ảnh đại diện?' })).toBeInTheDocument()
    expect(dispatch).not.toHaveBeenCalledWith(removeAvatarRequest())
  })

  it('dispatches removal once and prevents further submission or dismissal while busy', () => {
    const { dispatch, onClose } = renderModal({ ...user, avatar_url: '/api/v1/auth/me/avatar' })
    fireEvent.click(screen.getByRole('button', { name: 'Đổi ảnh đại diện' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Gỡ ảnh đại diện' }))
    const confirm = screen.getByRole('button', { name: 'Gỡ ảnh' })
    fireEvent.click(confirm)
    expect(dispatch.mock.calls.filter(([action]) => removeAvatarRequest.match(action))).toHaveLength(1)
    expect(confirm).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Huỷ' })).toBeDisabled()
    fireEvent.click(confirm)
    fireEvent.keyDown(confirm, { key: 'Escape' })
    expect(dispatch.mock.calls.filter(([action]) => removeAvatarRequest.match(action))).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Gỡ ảnh đại diện?' })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('cancels without dispatching removal', () => {
    const { dispatch } = renderModal({ ...user, avatar_url: '/api/v1/auth/me/avatar' })
    fireEvent.click(screen.getByRole('button', { name: 'Đổi ảnh đại diện' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Gỡ ảnh đại diện' }))
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
    expect(screen.queryByRole('dialog', { name: 'Gỡ ảnh đại diện?' })).not.toBeInTheDocument()
    expect(dispatch).not.toHaveBeenCalledWith(removeAvatarRequest())
  })

  it('closes only the confirmation on Escape, keeping the profile open', () => {
    const { onClose, dispatch } = renderModal({ ...user, avatar_url: '/api/v1/auth/me/avatar' })
    fireEvent.click(screen.getByRole('button', { name: 'Đổi ảnh đại diện' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Gỡ ảnh đại diện' }))
    // Start on a dialog button so the event bubbles through document before window.
    fireEvent.keyDown(screen.getByRole('button', { name: 'Gỡ ảnh' }), { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Gỡ ảnh đại diện?' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Hồ sơ cá nhân' })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalledWith(removeAvatarRequest())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it.each([true, false])('closes the confirmation when removal finishes (success: %s)', (success) => {
    const { store, rerender } = renderModal({ ...user, avatar_url: '/api/v1/auth/me/avatar' })
    fireEvent.click(screen.getByRole('button', { name: 'Đổi ảnh đại diện' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Gỡ ảnh đại diện' }))
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ ảnh' }))
    if (success) rerender(true, { ...user, avatar_url: null })
    act(() => { store.dispatch(avatarSubmitDone()) })
    expect(screen.queryByRole('dialog', { name: 'Gỡ ảnh đại diện?' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Hồ sơ cá nhân' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Đổi ảnh đại diện' }))
    expect(screen.queryByRole('menuitem', { name: 'Gỡ ảnh đại diện' }) !== null).toBe(!success)
  })

  it('resets confirmation when the profile closes or the user changes', () => {
    const { rerender } = renderModal({ ...user, avatar_url: '/api/v1/auth/me/avatar' })
    fireEvent.click(screen.getByRole('button', { name: 'Đổi ảnh đại diện' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Gỡ ảnh đại diện' }))
    rerender(false)
    rerender(true)
    expect(screen.queryByRole('dialog', { name: 'Gỡ ảnh đại diện?' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Đổi ảnh đại diện' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Gỡ ảnh đại diện' }))
    rerender(true, { ...user, user_id: 'U-2', avatar_url: '/api/v1/auth/me/avatar' })
    expect(screen.queryByRole('dialog', { name: 'Gỡ ảnh đại diện?' })).not.toBeInTheDocument()
  })

  it('refuses formats other than JPEG and PNG without converting', () => {
    const { store, input } = renderModal()
    pick(input, bytes(3, 'a.gif', 'image/gif'))
    expect(screen.getByText('Chỉ chấp nhận ảnh JPEG hoặc PNG.')).toBeInTheDocument()
    expect(convertToJpeg).not.toHaveBeenCalled()
    expect(store.getState().avatar.isSubmitting).toBe(false)
  })

  it('downscales a photo over 1 MB to a 1024 px JPEG and uploads that', async () => {
    const small = bytes(150_000, 'photo.jpg', 'image/jpeg')
    vi.mocked(convertToJpeg).mockResolvedValue(small)
    const { store, input } = renderModal()

    pick(input, bytes(5 * 1024 * 1024, 'photo.png', 'image/png'))

    await waitFor(() => expect(store.getState().avatar.isSubmitting).toBe(true))
    expect(convertToJpeg).toHaveBeenCalledWith(expect.objectContaining({ name: 'photo.png' }), 0.85, 1024)
    expect(screen.queryByText(/Ảnh quá lớn|Không đọc được/)).not.toBeInTheDocument()
  })

  it('reports an image the browser cannot decode', async () => {
    vi.mocked(convertToJpeg).mockRejectedValue(new Error('decode'))
    const { store, input } = renderModal()
    pick(input, bytes(10, 'broken.png', 'image/png'))
    expect(await screen.findByText('Không đọc được ảnh này, vui lòng chọn ảnh khác.')).toBeInTheDocument()
    expect(store.getState().avatar.isSubmitting).toBe(false)
  })

  it('refuses when the converted image is still over 1 MB', async () => {
    vi.mocked(convertToJpeg).mockResolvedValue(bytes(1024 * 1024 + 1, 'big.jpg', 'image/jpeg'))
    const { store, input } = renderModal()
    pick(input, bytes(10, 'big.png', 'image/png'))
    expect(await screen.findByText('Ảnh quá lớn, vui lòng chọn ảnh khác.')).toBeInTheDocument()
    expect(store.getState().avatar.isSubmitting).toBe(false)
  })

  it('switches to Bảo mật tab, validates inputs, and dispatches changePasswordRequest on valid submit', async () => {
    const { dispatch } = renderModal()

    // Mặc định mở tab Thông tin
    const infoTab = screen.getByRole('tab', { name: 'Thông tin' })
    const securityTab = screen.getByRole('tab', { name: 'Bảo mật' })
    expect(infoTab).toHaveAttribute('aria-selected', 'true')
    expect(securityTab).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByText('Thông tin do Quản trị viên quản lý')).toBeInTheDocument()

    // Chuyển sang tab Bảo mật
    fireEvent.click(securityTab)
    expect(securityTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Bảo mật' })).toBeInTheDocument()

    const oldInput = screen.getByLabelText('Mật khẩu hiện tại')
    const newInput = screen.getByLabelText('Mật khẩu mới')
    const confirmInput = screen.getByLabelText('Nhập lại mật khẩu mới')
    const submitBtn = screen.getByRole('button', { name: 'Cập nhật mật khẩu' })

    expect(oldInput).toHaveAttribute('autocomplete', 'current-password')
    expect(newInput).toHaveAttribute('autocomplete', 'new-password')
    expect(confirmInput).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByRole('note')).toHaveTextContent(
      'Sau khi đổi mật khẩu, bạn sẽ bị đăng xuất khỏi mọi thiết bị và cần đăng nhập lại bằng mật khẩu mới.'
    )

    // 1. Thiếu mật khẩu hiện tại
    fireEvent.change(newInput, { target: { value: 'mat-khau-moi-123' } })
    fireEvent.change(confirmInput, { target: { value: 'mat-khau-moi-123' } })
    fireEvent.click(submitBtn)
    expect(await screen.findByText('Vui lòng nhập mật khẩu hiện tại')).toBeInTheDocument()

    // 2. Mật khẩu mới < 12 ký tự
    fireEvent.change(oldInput, { target: { value: 'mat-khau-cu-123' } })
    fireEvent.change(newInput, { target: { value: 'ngan-qua' } })
    fireEvent.change(confirmInput, { target: { value: 'ngan-qua' } })
    fireEvent.click(submitBtn)
    expect(await screen.findByText('Mật khẩu phải có ít nhất 12 ký tự')).toBeInTheDocument()

    // 3. Nhập lại không khớp
    fireEvent.change(newInput, { target: { value: 'mat-khau-moi-123' } })
    fireEvent.change(confirmInput, { target: { value: 'mat-khau-khac-456' } })
    fireEvent.click(submitBtn)
    expect(await screen.findByText('Mật khẩu nhập lại không khớp')).toBeInTheDocument()

    // 4. Trùng mật khẩu cũ
    fireEvent.change(oldInput, { target: { value: 'mat-khau-cu-123' } })
    fireEvent.change(newInput, { target: { value: 'mat-khau-cu-123' } })
    fireEvent.change(confirmInput, { target: { value: 'mat-khau-cu-123' } })
    fireEvent.click(submitBtn)
    expect(await screen.findByText('Mật khẩu mới phải khác mật khẩu hiện tại')).toBeInTheDocument()

    expect(
      dispatch.mock.calls.filter(([action]) => changePasswordRequest.match(action))
    ).toHaveLength(0)

    // 5. Hợp lệ -> dispatch changePasswordRequest
    fireEvent.change(oldInput, { target: { value: 'mat-khau-cu-123' } })
    fireEvent.change(newInput, { target: { value: 'mat-khau-moi-456' } })
    fireEvent.change(confirmInput, { target: { value: 'mat-khau-moi-456' } })
    fireEvent.click(submitBtn)

    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        changePasswordRequest({
          old_password: 'mat-khau-cu-123',
          new_password: 'mat-khau-moi-456',
        })
      )
    )
  })

  it('displays formatted personal info fields and falls back to "-" for missing values', () => {
    renderModal({
      ...user,
      date_of_birth: '1995-05-09',
      gender: 'female',
      phone_number: '0912345678',
      address: null,
      identity_type: 'citizen_id',
      identity_number: '001095000123',
    })

    expect(screen.getByText('Ngày sinh').nextElementSibling).toHaveTextContent('09/05/1995')
    expect(screen.getByText('Giới tính').nextElementSibling).toHaveTextContent('Nữ')
    expect(screen.getByText('Số điện thoại').nextElementSibling).toHaveTextContent('0912345678')
    expect(screen.getByText('Địa chỉ').nextElementSibling).toHaveTextContent('-')
    expect(screen.getByText('Loại giấy tờ').nextElementSibling).toHaveTextContent(
      'Căn cước công dân'
    )
    expect(screen.getByText('Số giấy tờ').nextElementSibling).toHaveTextContent('001095000123')
  })

  it('supports arrow-key tab navigation, preserves password inputs across tab switches, and resets on reopen', () => {
    const { rerender } = renderModal()
    const infoTab = screen.getByRole('tab', { name: 'Thông tin' })
    const securityTab = screen.getByRole('tab', { name: 'Bảo mật' })

    // Dùng phím mũi tên phải chuyển sang Bảo mật
    fireEvent.keyDown(infoTab, { key: 'ArrowRight' })
    expect(securityTab).toHaveAttribute('aria-selected', 'true')
    expect(securityTab).toHaveFocus()

    fireEvent.change(screen.getByLabelText('Mật khẩu hiện tại'), {
      target: { value: 'old-secret-123' },
    })
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), {
      target: { value: 'new-secret-456' },
    })

    // Mũi tên trái quay về Thông tin rồi quay lại Bảo mật -> không mất dữ liệu đã nhập
    fireEvent.keyDown(securityTab, { key: 'ArrowLeft' })
    expect(infoTab).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(securityTab)
    expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveValue('old-secret-123')
    expect(screen.getByLabelText('Mật khẩu mới')).toHaveValue('new-secret-456')

    // Đóng và mở lại modal -> reset form và quay về tab Thông tin
    rerender(false)
    rerender(true)
    expect(screen.getByRole('tab', { name: 'Thông tin' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: 'Bảo mật' }))
    expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveValue('')
    expect(screen.getByLabelText('Mật khẩu mới')).toHaveValue('')
  })

  it('shows password strength meter, updates "Khác mật khẩu hiện tại" rule, blocks same-password submit, and resets scrollTop on tab switch', async () => {
    const { dispatch } = renderModal()
    const scrollContainer = screen.getByRole('tabpanel', { name: 'Thông tin' }).parentElement as HTMLDivElement
    scrollContainer.scrollTop = 240

    // Chuyển sang tab Bảo mật -> cuộn về đầu
    fireEvent.click(screen.getByRole('tab', { name: 'Bảo mật' }))
    expect(scrollContainer.scrollTop).toBe(0)

    const meter = screen.getByRole('meter', { name: 'Độ mạnh mật khẩu' })
    expect(screen.getByTestId('password-strength')).toBeInTheDocument()
    expect(meter).toHaveAttribute('aria-valuenow', '0')

    const oldInput = screen.getByLabelText('Mật khẩu hiện tại')
    const newInput = screen.getByLabelText('Mật khẩu mới')
    const confirmInput = screen.getByLabelText('Nhập lại mật khẩu mới')
    const differsRule = screen.getByText('Khác mật khẩu hiện tại').closest('li')!

    expect(differsRule).toHaveTextContent('chưa đạt')

    // Mật khẩu mới trùng mật khẩu cũ -> quy tắc chưa đạt và submit không dispatch
    fireEvent.change(oldInput, { target: { value: 'qT7#vLx9!mZp2Rw8' } })
    fireEvent.change(newInput, { target: { value: 'qT7#vLx9!mZp2Rw8' } })
    fireEvent.change(confirmInput, { target: { value: 'qT7#vLx9!mZp2Rw8' } })
    expect(differsRule).toHaveTextContent('chưa đạt')
    await waitFor(() => expect(meter).toHaveAttribute('aria-valuetext', 'Mạnh'))

    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }))
    expect(await screen.findByText('Mật khẩu mới phải khác mật khẩu hiện tại')).toBeInTheDocument()
    expect(
      dispatch.mock.calls.filter(([action]) => changePasswordRequest.match(action))
    ).toHaveLength(0)

    // Đổi mật khẩu mới khác mật khẩu cũ -> quy tắc chuyển sang đã đạt
    fireEvent.change(newInput, { target: { value: 'kP4@nW8$zB6!vQ2y' } })
    expect(differsRule).toHaveTextContent('đã đạt')

    // Cuộn xuống ở tab Bảo mật rồi chuyển lại Thông tin -> scrollTop về 0
    scrollContainer.scrollTop = 180
    fireEvent.click(screen.getByRole('tab', { name: 'Thông tin' }))
    expect(scrollContainer.scrollTop).toBe(0)
  })

  it('shows "Sửa hồ sơ" and "Đổi email" only for system_admin; non-admin remains read-only', () => {
    renderModal(user)
    expect(screen.queryByRole('button', { name: 'Sửa hồ sơ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đổi email' })).not.toBeInTheDocument()
    expect(screen.getByText('Thông tin do Quản trị viên quản lý')).toBeInTheDocument()

    const adminUser: CurrentUserResponse = {
      ...user,
      user_id: 'ADMIN-1',
      username: 'sysadmin',
      full_name: 'Quản trị Hệ thống',
      email: 'admin@example.com',
      role: 'system_admin',
      commune_ids: ['*'],
      phone_number: '0901234567',
    }
    renderModal(adminUser)
    expect(screen.getByRole('button', { name: 'Sửa hồ sơ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đổi email' })).toBeInTheDocument()
  })

  it('allows admin to edit own profile, validates VN phone, dispatches only changed fields, and supports cancel', () => {
    const adminUser: CurrentUserResponse = {
      ...user,
      user_id: 'ADMIN-1',
      username: 'sysadmin',
      full_name: 'Quản trị Hệ thống',
      email: 'admin@example.com',
      role: 'system_admin',
      commune_ids: ['*'],
      phone_number: '0901234567',
      address: 'Hà Nội',
    }
    const { store, dispatch, onClose } = renderModal(adminUser)

    fireEvent.click(screen.getByRole('button', { name: 'Sửa hồ sơ' }))
    const saveBtn = screen.getByRole('button', { name: 'Lưu thay đổi' })
    expect(saveBtn).toBeDisabled()

    // SĐT sai định dạng -> không dispatch
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '12345' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.click(saveBtn)
    expect(screen.getByText(/Số điện thoại không hợp lệ/)).toBeInTheDocument()
    expect(dispatch.mock.calls.filter(([a]) => updateUserRequest.match(a))).toHaveLength(0)

    // Hủy khôi phục giá trị gốc và thoát chế độ sửa
    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: 'Tên Tạm' } })
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(screen.getByRole('button', { name: 'Sửa hồ sơ' })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    // Mở lại sửa, đổi họ tên + SĐT (+84) -> dispatch chỉ các trường đã đổi (không role/commune_ids/email)
    fireEvent.click(screen.getByRole('button', { name: 'Sửa hồ sơ' }))
    expect(screen.getByLabelText(/Họ và tên/)).toHaveValue('Quản trị Hệ thống')
    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: '  Quản trị Mới  ' } })
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '+84912345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    expect(dispatch).toHaveBeenCalledWith(
      updateUserRequest({
        id: 'ADMIN-1',
        data: {
          full_name: 'Quản trị Mới',
          phone_number: '+84912345678',
        },
      })
    )

    // Hoàn tất cập nhật -> thoát chế độ sửa
    act(() => {
      store.dispatch(
        updateUserSuccess({
          user_id: 'ADMIN-1',
          full_name: 'Quản trị Mới',
          phone_number: '+84912345678',
        })
      )
    })
    expect(screen.getByRole('button', { name: 'Sửa hồ sơ' })).toBeInTheDocument()
  })

  it('allows admin to open ChangeEmailModal and dispatch changeUserEmailRequest', () => {
    const adminUser: CurrentUserResponse = {
      ...user,
      user_id: 'ADMIN-1',
      username: 'sysadmin',
      full_name: 'Quản trị Hệ thống',
      email: 'admin@example.com',
      role: 'system_admin',
    }
    const { store, dispatch } = renderModal(adminUser)

    fireEvent.click(screen.getByRole('button', { name: 'Đổi email' }))
    const dialog = screen.getByRole('dialog', { name: 'Đổi địa chỉ email' })
    fireEvent.change(within(dialog).getByLabelText(/Email mới/), {
      target: { value: 'new-admin@example.com' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))

    expect(dispatch).toHaveBeenCalledWith(
      changeUserEmailRequest({
        id: 'ADMIN-1',
        data: { email: 'new-admin@example.com' },
      })
    )

    // Hoàn tất đổi email -> ChangeEmailModal tự đóng
    act(() => {
      store.dispatch(
        changeUserEmailSuccess({
          user: { user_id: 'ADMIN-1', email: 'new-admin@example.com' },
          notification_sent: true,
        })
      )
    })
    expect(screen.queryByRole('dialog', { name: 'Đổi địa chỉ email' })).not.toBeInTheDocument()
  })

  it('authSlice updateCurrentUserProfile merges only allowed profile fields and skips undefined', () => {
    const { store } = renderModal()
    act(() => {
      store.dispatch(
        loginSuccess({
          user: {
            ...user,
            user_id: 'ADMIN-1',
            username: 'sysadmin',
            role: 'system_admin',
            avatar_url: '/avatar.jpg',
            address: 'Địa chỉ cũ',
          },
        })
      )
      store.dispatch(
        updateCurrentUserProfile({
          user_id: 'ADMIN-1',
          role: 'field_engineer', // không được phép ghi đè
          full_name: 'Tên Mới',
          email: 'new@example.com',
          phone_number: '0912345678',
          address: undefined, // bỏ qua undefined -> giữ địa chỉ cũ
        })
      )
    })

    const updated = store.getState().auth.user
    expect(updated?.full_name).toBe('Tên Mới')
    expect(updated?.email).toBe('new@example.com')
    expect(updated?.phone_number).toBe('0912345678')
    expect(updated?.address).toBe('Địa chỉ cũ')
    expect(updated?.role).toBe('system_admin')
    expect(updated?.avatar_url).toBe('/avatar.jpg')
  })

  it('places "Sửa hồ sơ" in footer for admin in view mode, sets aria-invalid on invalid inputs, and traps Tab focus within dialog', async () => {
    const adminUser: CurrentUserResponse = {
      ...user,
      user_id: 'ADMIN-1',
      username: 'sysadmin',
      full_name: 'Quản trị Hệ thống',
      email: 'admin@example.com',
      role: 'system_admin',
      commune_ids: ['*'],
      phone_number: '0901234567',
    }
    renderModal(adminUser)

    // Nút "Sửa hồ sơ" nằm ở footer (ngoài tabpanel Thông tin)
    const infoPanel = screen.getByRole('tabpanel', { name: 'Thông tin' })
    expect(within(infoPanel).queryByRole('button', { name: 'Sửa hồ sơ' })).not.toBeInTheDocument()
    const editBtn = screen.getByRole('button', { name: 'Sửa hồ sơ' })
    expect(editBtn).toBeInTheDocument()

    // Kiểm tra focus trap: Tab ở phần tử focus được cuối quay về phần tử đầu
    const dialog = screen.getByRole('dialog', { name: 'Hồ sơ cá nhân' })
    const closeIconBtn = within(dialog).getAllByRole('button', { name: 'Đóng' })[0]
    editBtn.focus()
    expect(editBtn).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(closeIconBtn).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(editBtn).toHaveFocus()

    // Bấm "Sửa hồ sơ" -> vào chế độ sửa và kiểm tra aria-invalid + aria-describedby khi lỗi SĐT
    fireEvent.click(editBtn)
    const phoneInput = screen.getByLabelText('Số điện thoại')
    fireEvent.change(phoneInput, { target: { value: '12345' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    expect(phoneInput).toHaveAttribute('aria-invalid', 'true')
    expect(phoneInput).toHaveAttribute('aria-describedby', 'profile-edit-phone-error')
    expect(document.getElementById('profile-edit-phone-error')).toHaveTextContent(
      /Số điện thoại không hợp lệ/
    )

    // Chuyển sang tab Bảo mật -> kiểm tra aria-invalid trên ô mật khẩu khi submit rỗng
    fireEvent.click(screen.getByRole('tab', { name: 'Bảo mật' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }))
    const oldPasswordInput = screen.getByLabelText('Mật khẩu hiện tại')
    await waitFor(() => expect(oldPasswordInput).toHaveAttribute('aria-invalid', 'true'))
    expect(oldPasswordInput).toHaveAttribute('aria-describedby', 'profile-old-password-error')
    expect(
      screen.getByText('Khuyến nghị: chữ hoa, chữ thường, số và ký tự đặc biệt')
    ).toBeInTheDocument()
  })
})

describe('fitWithin', () => {
  it('scales the longest edge down to the limit, keeping the aspect ratio', () => {
    expect(fitWithin(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 })
    expect(fitWithin(3000, 4000, 1024)).toEqual({ width: 768, height: 1024 })
  })

  it('never enlarges, and keeps the size without a limit', () => {
    expect(fitWithin(800, 600, 1024)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(4000, 3000)).toEqual({ width: 4000, height: 3000 })
  })

  it('keeps a very thin image at least one pixel wide', () => {
    expect(fitWithin(10000, 1, 1024)).toEqual({ width: 1024, height: 1 })
  })
})
