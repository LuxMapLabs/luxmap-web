import apiClient from '../../config/apiClient'
import type { SetPasswordRequest } from '../../types/auth/password'

export const passwordAPI = {
  /**
   * Đặt mật khẩu từ link mời hoặc đặt lại (POST /api/v1/auth/password/set)
   * Token dùng một lần; thành công trả 204, token sai hoặc hết hạn trả 400.
   */
  setPassword: async (data: SetPasswordRequest): Promise<void> => {
    await apiClient.post('/auth/password/set', data)
  },
}

export default passwordAPI
