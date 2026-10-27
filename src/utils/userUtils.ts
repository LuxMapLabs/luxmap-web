/**
 * Utility functions for resolving human-readable user names across admin views
 */

export interface ResolvableUser {
  user_id?: string | null
  full_name?: string | null
  username?: string | null
}

export interface CurrentUserRef {
  id?: string | null
  userId?: string | null
  fullName?: string | null
  username?: string | null
}

/**
 * Ánh xạ mã định danh người dùng (ví dụ: USR-001) sang họ tên thật
 * Ưu tiên: currentUser -> danh sách users trong Redux -> fallback
 */
export function resolveUserDisplayName(
  userId?: string | null,
  users?: ResolvableUser[],
  currentUser?: CurrentUserRef | null,
  systemFallback: string = 'Hệ thống (Server)'
): string {
  if (!userId || !userId.trim()) return systemFallback

  const trimmedId = userId.trim()

  // 1. So khớp trực tiếp với tài khoản đang đăng nhập
  if (currentUser) {
    const isMe =
      (currentUser.userId && currentUser.userId === trimmedId) ||
      (currentUser.id && currentUser.id === trimmedId)
    if (isMe && currentUser.fullName?.trim()) {
      return currentUser.fullName.trim()
    }
  }

  // 2. So khớp với danh sách người dùng trong Redux
  if (users && users.length > 0) {
    const found = users.find((u) => u.user_id === trimmedId)
    if (found?.full_name?.trim()) {
      return found.full_name.trim()
    }
    if (found?.username?.trim()) {
      return `@${found.username.trim()}`
    }
  }

  // 3. Fallback cho tài khoản khởi tạo mặc định nếu là Admin
  if (trimmedId === 'USR-001') {
    if (currentUser?.fullName?.trim()) return currentUser.fullName.trim()
    return 'Quản trị hệ thống'
  }

  return trimmedId
}
