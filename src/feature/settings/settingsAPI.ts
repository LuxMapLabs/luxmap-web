import apiClient from '../../config/apiClient'
import type { SettingItem, SettingsResponse, UpdateSettingRequest } from '../../types/admin/settings'

export const settingsAPI = {
  /**
   * Lấy danh sách cấu hình hệ thống
   * GET /admin/settings
   */
  getSettings: async (): Promise<SettingsResponse> => {
    const response = await apiClient.get<SettingsResponse>('/admin/settings')
    return response.data
  },

  /**
   * Cập nhật một thông số cấu hình
   * PUT /admin/settings/{key}
   */
  updateSetting: async (key: string, data: UpdateSettingRequest): Promise<SettingItem> => {
    const response = await apiClient.put<SettingItem>(`/admin/settings/${encodeURIComponent(key)}`, data)
    return response.data
  },
}

export default settingsAPI
