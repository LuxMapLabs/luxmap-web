import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Bell, CheckCheck, ClipboardList, Users, AlertTriangle, ScanSearch } from 'lucide-react'
import type { RootState } from '../redux/rootReducer'
import {
  fetchUnreadCountRequest,
  fetchNotificationsRequest,
  markNotificationReadRequest,
  markAllNotificationsReadRequest,
} from '../feature/notifications/notificationsSlice'
import type { NotificationItem } from '../types/notifications/notifications'
import { formatRelativeTime, getNotificationRoute } from '../utils/notifications/notificationRoute'

const POLL_INTERVAL_MS = 45_000

const EntityIcon: React.FC<{ type?: NotificationItem['entity_type'] }> = ({ type }) => {
  const cls = 'w-4 h-4'
  switch (type) {
    case 'citizen_report':
      return <Users className={cls} />
    case 'fault':
      return <AlertTriangle className={cls} />
    case 'survey_sweep':
      return <ScanSearch className={cls} />
    default:
      return <ClipboardList className={cls} />
  }
}

export const NotificationBell: React.FC = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { items, unreadCount, isFetchingList } = useSelector((s: RootState) => s.notifications)

  // Poll số chưa đọc (chỉ khi tab đang hiển thị)
  useEffect(() => {
    dispatch(fetchUnreadCountRequest())
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') dispatch(fetchUnreadCountRequest())
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [dispatch])

  // Đóng khi click ra ngoài / nhấn Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) dispatch(fetchNotificationsRequest())
  }

  const handleClickItem = (n: NotificationItem) => {
    if (n.notification_id && !n.read_at) dispatch(markNotificationReadRequest(n.notification_id))
    const route = getNotificationRoute(n)
    setOpen(false)
    if (route) navigate(route)
  }

  const badge = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggle}
        className="bell-trigger relative w-10 h-10 rounded-2xl flex items-center justify-center bg-white text-slate-600 hover:text-teal-700 shadow-ops hover:shadow-ops-hover hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer"
        title={unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Thông báo'}
        aria-label={unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Thông báo'}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell className="bell-icon w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-4 text-center ring-2 ring-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-[22rem] max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Thông báo
              {unreadCount > 0 && (
                <span className="ml-1.5 text-xs font-semibold text-rose-600">({unreadCount} chưa đọc)</span>
              )}
            </h3>
            <button
              type="button"
              disabled={unreadCount === 0}
              onClick={() => dispatch(markAllNotificationsReadRequest())}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-300 disabled:cursor-not-allowed cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Đánh dấu tất cả đã đọc
            </button>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {isFetchingList && items.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">Đang tải thông báo...</div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">Chưa có thông báo nào</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n, idx) => {
                  const unread = !n.read_at
                  return (
                    <li key={n.notification_id || idx}>
                      <button
                        type="button"
                        onClick={() => handleClickItem(n)}
                        className={`w-full text-left flex gap-3 px-4 py-3 transition cursor-pointer hover:bg-slate-50 ${
                          unread ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <span
                          className={`mt-0.5 w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${
                            unread ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <EntityIcon type={n.entity_type} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-[13px] leading-snug ${
                              unread ? 'font-bold text-slate-900' : 'font-medium text-slate-600'
                            }`}
                          >
                            {n.title}
                          </span>
                          {n.body && (
                            <span className="block mt-0.5 text-xs text-slate-500 line-clamp-2">{n.body}</span>
                          )}
                          <span className="block mt-1 text-[11px] text-slate-400">
                            {formatRelativeTime(n.created_at)}
                          </span>
                        </span>
                        {unread && <span className="mt-2 w-2 h-2 shrink-0 rounded-full bg-blue-500" aria-hidden />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
