/**
 * Token Storage Manager
 * Chuyên biệt quản lý Access Token trên client
 * 
 * BẢO MẬT: 
 * - Refresh Token được lưu trữ và luân chuyển hoàn toàn qua HttpOnly Cookie (__Secure-luxmap_rt).
 * - Client JavaScript không thể và không được can thiệp vào Refresh Token (chống XSS tuyệt đối).
 * - User Profile & Role được quản lý tập trung trong Redux Store.
 */

const ACCESS_TOKEN_KEY = 'luxmap_access_token'
const REMEMBER_ME_KEY = 'luxmap_remember_me'

export const tokenStorage = {
  /**
   * Kiểm tra xem người dùng có chọn "Duy trì đăng nhập" hay không
   */
  isRemembered(): boolean {
    return localStorage.getItem(REMEMBER_ME_KEY) === 'true'
  },

  /**
   * Đánh dấu tuỳ chọn Duy trì đăng nhập
   */
  setRememberMe(value: boolean): void {
    if (value) {
      localStorage.setItem(REMEMBER_ME_KEY, 'true')
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY)
    }
  },

  /**
   * Lấy Access Token từ Storage (sessionStorage trước, localStorage sau)
   */
  getAccessToken(): string | null {
    return (
      sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
      localStorage.getItem(ACCESS_TOKEN_KEY) ||
      null
    )
  },

  /**
   * Lưu Access Token khi Đăng nhập thành công
   */
  setAccessToken(accessToken: string, rememberMe: boolean = false): void {
    this.setRememberMe(rememberMe)

    if (rememberMe) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    } else {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      localStorage.removeItem(ACCESS_TOKEN_KEY)
    }
  },

  /**
   * Cập nhật Access Token mới khi Silent Refresh thành công
   */
  updateAccessToken(newAccessToken: string): void {
    if (this.isRemembered()) {
      localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken)
    } else {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken)
    }
  },


  /**
   * Xóa sạch token khi Đăng xuất
   */
  clearAll(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('refreshToken')

    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REMEMBER_ME_KEY)
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  },
}

export default tokenStorage
