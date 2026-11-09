import { describe, it, expect } from 'vitest'
import passwordReducer, {
  setPasswordRequest,
  setPasswordSuccess,
  setPasswordFailure,
  resetPasswordState,
} from '../../../feature/password/passwordSlice'

describe('passwordSlice', () => {
  it('request bật isSubmitting và xóa lỗi cũ', () => {
    const failed = passwordReducer(undefined, setPasswordFailure('Lỗi cũ'))
    const next = passwordReducer(failed, setPasswordRequest({ token: 't', new_password: 'x'.repeat(12) }))
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

  it('reset đưa về trạng thái ban đầu', () => {
    const next = passwordReducer(passwordReducer(undefined, setPasswordSuccess()), resetPasswordState())
    expect(next).toEqual({ isSubmitting: false, isSuccess: false, error: null })
  })
})
