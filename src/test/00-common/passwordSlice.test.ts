import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import passwordReducer, {
  setPasswordRequest,
  setPasswordSuccess,
  setPasswordFailure,
  changePasswordRequest,
  changePasswordSuccess,
  changePasswordFailure,
  resetPasswordState,
} from '../../feature/password/passwordSlice'
import { logout } from '../../feature/auth/authSlice'
import passwordSaga from '../../feature/password/passwordSaga'
import passwordAPI from '../../feature/password/passwordAPI'
import { makeSagaStore } from '../utils/sagaStore'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

describe('passwordSlice', () => {
  it('request bật isSubmitting và xóa lỗi cũ', () => {
    const failed = passwordReducer(undefined, setPasswordFailure('Lỗi cũ'))
    const next = passwordReducer(
      failed,
      setPasswordRequest({ token: 't', new_password: 'x'.repeat(12) })
    )
    expect(next.isSubmitting).toBe(true)
    expect(next.error).toBeNull()
  })

  it('success và failure cập nhật trạng thái đúng', () => {
    const ok = passwordReducer(undefined, setPasswordSuccess())
    expect(ok.isSuccess).toBe(true)
    expect(ok.isSubmitting).toBe(false)

    const bad = passwordReducer(ok, setPasswordFailure('Hết hạn'))
    expect(bad.isSuccess).toBe(false)
    expect(bad.error).toBe('Hết hạn')
  })

  it('changePasswordRequest/Success/Failure cập nhật state riêng, không ảnh hưởng setPassword', () => {
    const setOk = passwordReducer(undefined, setPasswordSuccess())
    const changing = passwordReducer(
      setOk,
      changePasswordRequest({ old_password: 'old-password-1', new_password: 'new-password-1' })
    )
    expect(changing.isChanging).toBe(true)
    expect(changing.changeSuccess).toBe(false)
    expect(changing.changeError).toBeNull()
    expect(changing.isSuccess).toBe(true)

    const changed = passwordReducer(changing, changePasswordSuccess())
    expect(changed.isChanging).toBe(false)
    expect(changed.changeSuccess).toBe(true)
    expect(changed.changeError).toBeNull()

    const failed = passwordReducer(changed, changePasswordFailure('Mật khẩu hiện tại không đúng'))
    expect(failed.isChanging).toBe(false)
    expect(failed.changeSuccess).toBe(false)
    expect(failed.changeError).toBe('Mật khẩu hiện tại không đúng')
    expect(failed.error).toBeNull()
  })

  it('reset đưa cả state setPassword và changePassword về ban đầu', () => {
    const dirty = passwordReducer(
      passwordReducer(undefined, setPasswordSuccess()),
      changePasswordFailure('Lỗi đổi mật khẩu')
    )
    const next = passwordReducer(dirty, resetPasswordState())
    expect(next).toEqual({
      isSubmitting: false,
      isSuccess: false,
      error: null,
      isChanging: false,
      changeSuccess: false,
      changeError: null,
    })
  })
})

describe('passwordSaga - changePassword', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('thành công thì dispatch changePasswordSuccess, toast và logout', async () => {
    const spy = vi.spyOn(passwordAPI, 'changePassword').mockResolvedValue(undefined)
    const store = makeSagaStore({
      reducers: {
        password: passwordReducer,
        loggedOut: (state = false, action) => (logout.match(action) ? true : state),
      },
      sagas: [passwordSaga],
    })

    store.dispatch(
      changePasswordRequest({ old_password: 'old-password-1', new_password: 'new-password-123' })
    )

    await waitFor(() => {
      const state = store.getState()
      expect(spy).toHaveBeenCalledWith({
        old_password: 'old-password-1',
        new_password: 'new-password-123',
      })
      expect(state.password.isChanging).toBe(false)
      expect(state.password.changeSuccess).toBe(true)
      expect(state.loggedOut).toBe(true)
      expect(toast.success).toHaveBeenCalledWith(
        'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'
      )
    })
  })

  it('lỗi 400 có detail thì lưu changeError và không bật toast', async () => {
    vi.spyOn(passwordAPI, 'changePassword').mockRejectedValue({
      response: { status: 400, data: { detail: 'Mật khẩu hiện tại không chính xác.' } },
    })
    const store = makeSagaStore({
      reducers: { password: passwordReducer },
      sagas: [passwordSaga],
    })

    store.dispatch(
      changePasswordRequest({ old_password: 'wrong-password', new_password: 'new-password-123' })
    )

    await waitFor(() => {
      const state = store.getState().password
      expect(state.isChanging).toBe(false)
      expect(state.changeError).toBe('Mật khẩu hiện tại không chính xác.')
      expect(toast.error).not.toHaveBeenCalled()
    })
  })
})
