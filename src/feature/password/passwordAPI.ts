import apiClient from '../../config/apiClient'
import type { ChangePasswordRequest, SetPasswordRequest } from '../../types/auth/password'

export const passwordAPI = {
  /**
   * Đặt mật khẩu từ link mời hoặc đặt lại (POST /api/v1/auth/password/set)
   * Token dùng một lần; thành công trả 204, token sai hoặc hết hạn trả 400.
   */
  setPassword: async (data: SetPasswordRequest): Promise<void> => {
    await apiClient.post('/auth/password/set', data)
  },

  /**
   * Tự đổi mật khẩu cho người dùng đang đăng nhập (POST /api/v1/auth/password/change)
   * Thành công trả 204 No Content, sau đó cần đăng nhập lại.
   */
  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await apiClient.post('/auth/password/change', data)
  },
}

export default passwordAPI
