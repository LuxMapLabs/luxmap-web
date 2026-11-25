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
  forgotPasswordRequest,
  forgotPasswordSuccess,
  forgotPasswordFailure,
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
      isRequestingReset: false,
      resetRequestSent: false,
      resetRequestError: null,
    })
  })

  it('forgotPasswordRequest bật isRequestingReset và xoá lỗi cũ', () => {
    const failed = passwordReducer(undefined, forgotPasswordFailure('Lỗi cũ'))
    const next = passwordReducer(failed, forgotPasswordRequest({ email: 'user@example.com' }))
    expect(next.isRequestingReset).toBe(true)
    expect(next.resetRequestSent).toBe(false)
    expect(next.resetRequestError).toBeNull()
  })

  it('forgotPasswordSuccess và forgotPasswordFailure cập nhật trạng thái đúng', () => {
    const ok = passwordReducer(undefined, forgotPasswordSuccess())
    expect(ok.isRequestingReset).toBe(false)
    expect(ok.resetRequestSent).toBe(true)
    expect(ok.resetRequestError).toBeNull()

    const bad = passwordReducer(ok, forgotPasswordFailure('Email không hợp lệ.'))
    expect(bad.isRequestingReset).toBe(false)
    expect(bad.resetRequestSent).toBe(false)
    expect(bad.resetRequestError).toBe('Email không hợp lệ.')
  })

  it('resetPasswordState đưa 3 field forgotPassword về mặc định', () => {
    const dirty = passwordReducer(
      passwordReducer(undefined, forgotPasswordSuccess()),
      forgotPasswordFailure('Lỗi gửi email')
    )
    const next = passwordReducer(dirty, resetPasswordState())
    expect(next.isRequestingReset).toBe(false)
    expect(next.resetRequestSent).toBe(false)
    expect(next.resetRequestError).toBeNull()
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

describe('passwordSaga - forgotPassword', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('gọi API đúng payload { email } thì bật resetRequestSent và không bật toast', async () => {
    const spy = vi.spyOn(passwordAPI, 'forgotPassword').mockResolvedValue({
      message: 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.',
    })
    const store = makeSagaStore({
      reducers: { password: passwordReducer },
      sagas: [passwordSaga],
    })

    store.dispatch(forgotPasswordRequest({ email: 'user@example.com' }))

    await waitFor(() => {
      const state = store.getState().password
      expect(spy).toHaveBeenCalledWith({ email: 'user@example.com' })
      expect(state.isRequestingReset).toBe(false)
      expect(state.resetRequestSent).toBe(true)
      expect(state.resetRequestError).toBeNull()
      expect(toast.success).not.toHaveBeenCalled()
      expect(toast.error).not.toHaveBeenCalled()
    })
  })

  it('lỗi 429 thì lưu resetRequestError đúng message 429 và không bật toast', async () => {
    vi.spyOn(passwordAPI, 'forgotPassword').mockRejectedValue({
      response: { status: 429 },
    })
    const store = makeSagaStore({
      reducers: { password: passwordReducer },
      sagas: [passwordSaga],
    })

    store.dispatch(forgotPasswordRequest({ email: 'user@example.com' }))

    await waitFor(() => {
      const state = store.getState().password
      expect(state.isRequestingReset).toBe(false)
      expect(state.resetRequestSent).toBe(false)
      expect(state.resetRequestError).toBe(
        'Bạn đã yêu cầu quá nhiều lần. Vui lòng đợi một lát rồi thử lại.'
      )
      expect(toast.error).not.toHaveBeenCalled()
      expect(toast.success).not.toHaveBeenCalled()
    })
  })

  it('lỗi mất mạng (không response) thì lưu message mất mạng và không bật toast', async () => {
    vi.spyOn(passwordAPI, 'forgotPassword').mockRejectedValue(new Error('Network Error'))
    const store = makeSagaStore({
      reducers: { password: passwordReducer },
      sagas: [passwordSaga],
    })

    store.dispatch(forgotPasswordRequest({ email: 'user@example.com' }))

    await waitFor(() => {
      const state = store.getState().password
      expect(state.isRequestingReset).toBe(false)
      expect(state.resetRequestSent).toBe(false)
      expect(state.resetRequestError).toBe(
        'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng rồi thử lại.'
      )
      expect(toast.error).not.toHaveBeenCalled()
    })
  })
})
