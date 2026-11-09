import { describe, it, expect } from 'vitest'
import authReducer, { googleLoginRequest, loginFailure } from '../../../feature/auth/authSlice'

describe('authSlice - đăng nhập Google', () => {
  it('googleLoginRequest bật loading và xóa lỗi cũ', () => {
    const before = authReducer(undefined, loginFailure('Lỗi cũ'))
    const after = authReducer(before, googleLoginRequest({ id_token: 'token' }))

    expect(after.loading).toBe(true)
    expect(after.error).toBeNull()
  })
})
