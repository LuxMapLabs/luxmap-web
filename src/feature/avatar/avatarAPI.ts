import apiClient from '../../config/apiClient'
import type { AvatarResponse } from '../../types/auth/me'

// avatar_url từ backend là đường dẫn tuyệt đối kèm /api/v1; apiClient đã có sẵn baseURL nên bỏ tiền tố này
const toClientPath = (avatarUrl: string): string => avatarUrl.replace(/^\/api\/v1/, '')

export const avatarAPI = {
  /**
   * Tải ảnh đại diện lên (JPEG, tối đa 1 MB)
   * POST /api/v1/auth/me/avatar
   */
  upload: async (file: File): Promise<AvatarResponse> => {
    const form = new FormData()
    form.append('file', file)
    // apiClient mặc định là application/json nên axios sẽ biến FormData thành JSON và làm mất file;
    // khai báo multipart để giữ nguyên FormData (trình duyệt tự thêm boundary)
    const response = await apiClient.post<AvatarResponse>('/auth/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  /**
   * Gỡ ảnh đại diện
   * DELETE /api/v1/auth/me/avatar
   */
  remove: async (): Promise<void> => {
    await apiClient.delete('/auth/me/avatar')
  },

  /**
   * Lấy ảnh theo avatar_url (của chính mình hoặc của user khác qua /admin/users/{id}/avatar).
   * Endpoint cần Bearer token nên phải tải dạng blob, không gắn thẳng vào thẻ img.
   */
  fetchBlob: async (avatarUrl: string): Promise<Blob> => {
    const response = await apiClient.get<Blob>(toClientPath(avatarUrl), { responseType: 'blob' })
    return response.data
  },
}

export default avatarAPI
