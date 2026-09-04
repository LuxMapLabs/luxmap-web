/**
 * Token Storage Manager
 * Chuyên biệt quản lý lưu trữ Access Token và Refresh Token
 * Hỗ trợ 2 chế độ:
 * - Không duy trì đăng nhập (rememberMe = false): Lưu vào sessionStorage (mất khi đóng browser/tab, giữ khi F5)
 * - Duy trì đăng nhập (rememberMe = true): Lưu vào localStorage (giữ khi đóng browser và mở lại)
 * 
 * LƯU Ý BẢO MẬT: Tuyệt đối không lưu User Profile hay Role tại đây.
 * Toàn bộ User Profile được quản lý tập trung bên trong Redux Store.
 */

const ACCESS_TOKEN_KEY = 'luxmap_access_token'
const REFRESH_TOKEN_KEY = 'luxmap_refresh_token'
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
   * Lưu Token khi Đăng nhập thành công
   * @param accessToken JWT Access Token
   * @param refreshToken Refresh Token
   * @param rememberMe true: lưu localStorage, false: lưu sessionStorage
   */
  setTokens(
    accessToken: string,
    refreshToken: string,
    rememberMe: boolean
  ): void {
    if (rememberMe) {
      // 1. Lưu lâu dài vào localStorage
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      localStorage.setItem(REMEMBER_ME_KEY, 'true')

      // Dọn sạch sessionStorage
      sessionStorage.removeItem(ACCESS_TOKEN_KEY)
      sessionStorage.removeItem(REFRESH_TOKEN_KEY)
      sessionStorage.removeItem(LEGACY_ACCESS_KEY)
      sessionStorage.removeItem(LEGACY_REFRESH_KEY)
    } else {
      // 2. Chỉ lưu trong phiên hiện tại vào sessionStorage (F5 còn, tắt browser mất)
      sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)

      // Dọn sạch localStorage
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
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
   * Xóa sạch toàn bộ token (khi Đăng xuất hoặc Token hết hạn)
   */
  clearAll(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
    sessionStorage.removeItem(LEGACY_ACCESS_KEY)
    sessionStorage.removeItem(LEGACY_REFRESH_KEY)

    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(REMEMBER_ME_KEY)
    localStorage.removeItem(LEGACY_ACCESS_KEY)
    localStorage.removeItem(LEGACY_REFRESH_KEY)
  },
}

export default tokenStorage
