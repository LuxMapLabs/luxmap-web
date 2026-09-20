import apiClient from '../../config/apiClient'
import {
  WebLoginRequest,
  WebAuthTokenResponse,
  RegisterRequest,
  ApiResponse,
  CurrentUserResponse,
} from '../../types/auth'

// Biến lưu promise refresh đang bay để tránh gọi đồng thời nhiều request cùng lúc (Race Condition)
let inFlightRefreshPromise: Promise<WebAuthTokenResponse> | null = null

export const authAPI = {
  /**
   * Lấy hồ sơ tài khoản đang đăng nhập từ Database (Contract v1.5 mục 4.7)
   * Đọc trực tiếp từ CSDL nên thông tin họ tên, email và danh sách xã luôn tươi mới nhất.
   */
  getMe: async (): Promise<CurrentUserResponse> => {
    const response = await apiClient.get<CurrentUserResponse>('/auth/me')
    return response.data
  },
  /**
   * Đăng nhập giao diện Web (Contract 2.10.2)
   * Tự động nhận HttpOnly Cookie __Secure-luxmap_rt từ server
   */
  login: async (credentials: WebLoginRequest): Promise<WebAuthTokenResponse> => {
    const isRemember = !!(credentials.remember_me ?? credentials.rememberMe)
    const response = await apiClient.post<WebAuthTokenResponse>('/auth/web/login', {
      username: credentials.username,
      password: credentials.password,
      remember_me: isRemember,
      rememberMe: isRemember,
    })
    return response.data
  },

  /**
   * Cấp lại Access Token qua HttpOnly Cookie (Contract 2.10.2)
   * Không truyền body, browser tự gửi cookie
   * Chống trùng lặp: nếu đang có request refresh đang chạy, tái sử dụng Promise đó
   */
  refresh: async (): Promise<WebAuthTokenResponse> => {
    if (inFlightRefreshPromise) {
      return inFlightRefreshPromise
    }

    inFlightRefreshPromise = apiClient
      .post<WebAuthTokenResponse>('/auth/web/refresh', {})
      .then((response) => response.data)
      .finally(() => {
        inFlightRefreshPromise = null
      })

    return inFlightRefreshPromise
  },

  /**
   * Đăng xuất phiên Web (Contract 2.10.2)
   * Backend xóa cookie và hủy refresh token trong CSDL
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/web/logout', {})
  },

  /**
   * Đăng ký tài khoản mới (dành cho quản trị viên hoặc các luồng đăng ký)
   */
  register: async (data: RegisterRequest): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>('/auth/register', data)
    return response.data
  },
}

export default authAPI
