/**
 * Token & Session Storage Manager
 * Quản lý lưu trữ Access Token, Refresh Token và Thông tin User
 * Hỗ trợ 2 chế độ:
 * - Không duy trì đăng nhập (rememberMe = false): Lưu vào sessionStorage (mất khi đóng browser/tab, giữ khi F5)
 * - Duy trì đăng nhập (rememberMe = true): Lưu vào localStorage (giữ khi đóng browser và mở lại)
 */

import { User } from '../types/auth'

const ACCESS_TOKEN_KEY = 'luxmap_access_token'
const REFRESH_TOKEN_KEY = 'luxmap_refresh_token'
const USER_KEY = 'luxmap_user_profile'
const REMEMBER_ME_KEY = 'luxmap_remember_me'

// Tương thích ngược với các key cũ nếu có
const LEGACY_ACCESS_KEY = 'accessToken'
const LEGACY_REFRESH_KEY = 'refreshToken'

export const tokenStorage = {
  /**
   * Kiểm tra xem người dùng có tick Duy trì đăng nhập hay không
   */
  isRemembered(): boolean {
    return localStorage.getItem(REMEMBER_ME_KEY) === 'true'
  },

  /**
   * Lấy Access Token:
   * Kiểm tra sessionStorage trước (phiên hiện tại), sau đó đến localStorage
   */
  getAccessToken(): string | null {
    return (
      sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
      sessionStorage.getItem(LEGACY_ACCESS_KEY) ||
      localStorage.getItem(ACCESS_TOKEN_KEY) ||
      localStorage.getItem(LEGACY_ACCESS_KEY)
    )
  },

  /**
   * Lấy Refresh Token:
   * Kiểm tra sessionStorage trước, sau đó đến localStorage
   */
  getRefreshToken(): string | null {
    return (
      sessionStorage.getItem(REFRESH_TOKEN_KEY) ||
      sessionStorage.getItem(LEGACY_REFRESH_KEY) ||
      localStorage.getItem(REFRESH_TOKEN_KEY) ||
      localStorage.getItem(LEGACY_REFRESH_KEY)
    )
  },

  /**
   * Lấy thông tin User đã lưu
   */
  getUser(): User | null {
    try {
      const userStr =
        sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY)
      if (!userStr) return null
      return JSON.parse(userStr) as User
    } catch {
      return null
    }
  },

  /**
   * Lưu Token và User khi Đăng nhập thành công
   * @param accessToken JWT Access Token
   * @param refreshToken Refresh Token
   * @param user Thông tin người dùng đã chuẩn hóa
   * @param rememberMe true: lưu localStorage, false: lưu sessionStorage
   */
  setAuth(
    accessToken: string,
    refreshToken: string,
    user: User,
    rememberMe: boolean
  ): void {
    const userStr = JSON.stringify(user)

    if (rememberMe) {
      // 1. Lưu lâu dài vào localStorage
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      localStorage.setItem(USER_KEY, userStr)
      localStorage.setItem(REMEMBER_ME_KEY, 'true')

      // Dọn sạch sessionStorage để tránh dữ liệu cũ/lệch phiên
      sessionStorage.removeItem(ACCESS_TOKEN_KEY)
      sessionStorage.removeItem(REFRESH_TOKEN_KEY)
      sessionStorage.removeItem(USER_KEY)
      sessionStorage.removeItem(LEGACY_ACCESS_KEY)
      sessionStorage.removeItem(LEGACY_REFRESH_KEY)
    } else {
      // 2. Chỉ lưu trong phiên hiện tại vào sessionStorage (F5 còn, tắt browser mất)
      sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      sessionStorage.setItem(USER_KEY, userStr)

      // Dọn sạch localStorage để khi đóng browser mở lại không bị tự động login
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(REMEMBER_ME_KEY)
      localStorage.removeItem(LEGACY_ACCESS_KEY)
      localStorage.removeItem(LEGACY_REFRESH_KEY)
    }
  },

  /**
   * Cập nhật Access Token mới (khi Refresh Token thành công)
   */
  updateAccessToken(newAccessToken: string): void {
    if (this.isRemembered()) {
      localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken)
    } else {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken)
    }
  },

  /**
   * Cập nhật Refresh Token mới (khi Token Rotation)
   */
  updateRefreshToken(newRefreshToken: string): void {
    if (this.isRemembered()) {
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)
    } else {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)
    }
  },

  /**
   * Cập nhật thông tin User mới nhất (sau khi gọi /auth/me thành công)
   */
  updateUser(user: User): void {
    const userStr = JSON.stringify(user)
    if (this.isRemembered()) {
      localStorage.setItem(USER_KEY, userStr)
    } else {
      sessionStorage.setItem(USER_KEY, userStr)
    }
  },

  /**
   * Xóa sạch toàn bộ phiên đăng nhập (Đăng xuất hoặc Token hết hạn)
   */
  clearAll(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(LEGACY_ACCESS_KEY)
    sessionStorage.removeItem(LEGACY_REFRESH_KEY)

    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(REMEMBER_ME_KEY)
    localStorage.removeItem(LEGACY_ACCESS_KEY)
    localStorage.removeItem(LEGACY_REFRESH_KEY)
  },
}

export default tokenStorage
