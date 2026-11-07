import apiClient from '../../config/apiClient'
import type { NotificationPage } from '../../types/notifications/notifications'
import type { UnreadCountResponse } from '../../types/notifications/unread-count'

export const notificationsAPI = {
  /** GET /api/v1/notifications — thông báo của tôi, mới nhất trước, kèm unread_count */
  list: async (params?: { unread_only?: boolean; page?: number; page_size?: number }): Promise<NotificationPage> => {
    const response = await apiClient.get<NotificationPage>('/notifications', { params })
    return response.data
  },

  /** GET /api/v1/notifications/unread-count — nhẹ, dùng để poll */
  unreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count')
    return response.data
  },

  /** POST /api/v1/notifications/{id}/read */
  markRead: async (notificationId: string): Promise<void> => {
    await apiClient.post(`/notifications/${notificationId}/read`)
  },

  /** POST /api/v1/notifications/read-all */
  markAllRead: async (): Promise<void> => {
    await apiClient.post('/notifications/read-all')
  },
}
