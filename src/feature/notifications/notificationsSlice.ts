import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { NotificationItem, NotificationPage } from '../../types/notifications/notifications'

export interface NotificationsState {
  items: NotificationItem[]
  unreadCount: number
  isFetchingList: boolean
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  isFetchingList: false,
}

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    fetchUnreadCountRequest: () => {},
    fetchUnreadCountSuccess: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload
    },
    fetchNotificationsRequest: (state) => {
      state.isFetchingList = true
    },
    fetchNotificationsSuccess: (state, action: PayloadAction<NotificationPage>) => {
      state.isFetchingList = false
      state.items = action.payload.items || []
      state.unreadCount = action.payload.unread_count ?? state.unreadCount
    },
    fetchNotificationsFailure: (state) => {
      state.isFetchingList = false
    },
    markNotificationReadRequest: (state, action: PayloadAction<string>) => {
      // Lạc quan: đánh dấu đã đọc ngay để UI phản hồi tức thì
      const target = state.items.find((n) => n.notification_id === action.payload)
      if (target && !target.read_at) {
        target.read_at = new Date().toISOString()
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    markAllNotificationsReadRequest: (state) => {
      const now = new Date().toISOString()
      state.items.forEach((n) => {
        if (!n.read_at) n.read_at = now
      })
      state.unreadCount = 0
    },
    resetNotifications: () => initialState,
  },
})

export const {
  fetchUnreadCountRequest,
  fetchUnreadCountSuccess,
  fetchNotificationsRequest,
  fetchNotificationsSuccess,
  fetchNotificationsFailure,
  markNotificationReadRequest,
  markAllNotificationsReadRequest,
  resetNotifications,
} = notificationsSlice.actions

export default notificationsSlice.reducer
