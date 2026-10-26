import apiClient from '../../config/apiClient'
import type { SystemStatusResponse } from '../../types/admin/system'

export const adminSystemAPI = {
  /**
   * Lấy dữ liệu giám sát sức khỏe toàn hệ thống (Background jobs, Storage, Survey Processing)
   * GET /api/v1/admin/system/status
   */
  getSystemStatus: async (): Promise<SystemStatusResponse> => {
    const response = await apiClient.get<SystemStatusResponse>('/admin/system/status')
    return response.data
  },
}
