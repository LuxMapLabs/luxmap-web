import { call, put, takeLatest, takeEvery } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import { notificationsAPI } from './notificationsAPI'
import {
  fetchUnreadCountRequest,
  fetchUnreadCountSuccess,
  fetchNotificationsRequest,
  fetchNotificationsSuccess,
  fetchNotificationsFailure,
  markNotificationReadRequest,
  markAllNotificationsReadRequest,
} from './notificationsSlice'
import type { NotificationPage } from '../../types/notifications/notifications'
import type { UnreadCountResponse } from '../../types/notifications/unread-count'

function* handleFetchUnreadCount(): Generator<unknown, void, unknown> {
  try {
    const result = (yield call(notificationsAPI.unreadCount)) as UnreadCountResponse
    yield put(fetchUnreadCountSuccess(result.unread_count ?? 0))
  } catch {
    // Poll nền: lỗi mạng tạm thời không làm gián đoạn UI
  }
}

function* handleFetchNotifications(): Generator<unknown, void, unknown> {
  try {
    const result = (yield call(notificationsAPI.list, { page: 1, page_size: 20 })) as NotificationPage
    yield put(fetchNotificationsSuccess(result))
  } catch {
    yield put(fetchNotificationsFailure())
  }
}

function* handleMarkRead(action: PayloadAction<string>): Generator<unknown, void, unknown> {
  try {
    yield call(notificationsAPI.markRead, action.payload)
  } catch {
    yield put(fetchUnreadCountRequest())
  }
}

function* handleMarkAllRead(): Generator<unknown, void, unknown> {
  try {
    yield call(notificationsAPI.markAllRead)
  } catch {
    yield put(fetchUnreadCountRequest())
    yield put(fetchNotificationsRequest())
  }
}

export default function* notificationsSaga() {
  yield takeLatest(fetchUnreadCountRequest.type, handleFetchUnreadCount)
  yield takeLatest(fetchNotificationsRequest.type, handleFetchNotifications)
  yield takeEvery(markNotificationReadRequest.type, handleMarkRead)
  yield takeLatest(markAllNotificationsReadRequest.type, handleMarkAllRead)
}
