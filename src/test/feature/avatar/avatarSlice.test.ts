import { describe, it, expect } from 'vitest'
import avatarReducer, {
  fetchAvatarRequest,
  fetchAvatarSuccess,
  fetchAvatarFailure,
  uploadAvatarRequest,
  avatarSubmitDone,
} from '../../../feature/avatar/avatarSlice'
import authReducer, { checkAuthSuccess, setAvatarUrl } from '../../../feature/auth/authSlice'

const URL1 = '/api/v1/auth/me/avatar?v=1'

describe('avatarSlice', () => {
  it('fetchAvatarRequest đánh dấu đang tải, không gọi lặp khi đã có hoặc đã lỗi', () => {
    let s = avatarReducer(undefined, fetchAvatarRequest(URL1))
    expect(s.pending[URL1]).toBe(true)

    s = avatarReducer(s, fetchAvatarSuccess({ url: URL1, objectUrl: 'blob:x' }))
    expect(s.pending[URL1]).toBeUndefined()
    expect(s.images[URL1]).toBe('blob:x')

    const failed = avatarReducer(undefined, fetchAvatarFailure(URL1))
    expect(failed.failed[URL1]).toBe(true)
    expect(avatarReducer(failed, fetchAvatarRequest(URL1)).pending[URL1]).toBeUndefined()
  })

  it('upload bật isSubmitting và avatarSubmitDone tắt lại', () => {
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    const s = avatarReducer(undefined, uploadAvatarRequest(file))
    expect(s.isSubmitting).toBe(true)
    expect(avatarReducer(s, avatarSubmitDone()).isSubmitting).toBe(false)
  })
})

describe('authSlice - setAvatarUrl', () => {
  it('cập nhật avatar_url của người dùng hiện tại và cho phép gỡ về null', () => {
    let s = authReducer(undefined, checkAuthSuccess({ user: { user_id: 'u1', avatar_url: null } }))
    s = authReducer(s, setAvatarUrl(URL1))
    expect(s.user?.avatar_url).toBe(URL1)
    s = authReducer(s, setAvatarUrl(null))
    expect(s.user?.avatar_url).toBeNull()
  })
})
