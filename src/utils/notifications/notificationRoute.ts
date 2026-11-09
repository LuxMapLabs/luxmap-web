import type { NotificationItem } from '../../types/notifications/notifications'

/** Tên tham số URL để trang đích làm nổi bật đúng mục được thông báo */
export const NOTIFICATION_TARGET_PARAMS = {
  citizenReport: 'report',
  workOrder: 'work_order',
} as const

/**
 * Trả về đường dẫn đích của một thông báo.
 * - citizen_report / work_order: mở đúng trang và làm nổi bật đúng mục.
 * - fault / survey_sweep: hiện chưa có trang chi tiết riêng nên chuyển tới trang liên quan nhất.
 */
export const getNotificationRoute = (n: NotificationItem): string | null => {
  const id = n.entity_id ? encodeURIComponent(n.entity_id) : ''
  switch (n.entity_type) {
    case 'citizen_report':
      return id ? `/citizen-reports?${NOTIFICATION_TARGET_PARAMS.citizenReport}=${id}` : '/citizen-reports'
    case 'work_order':
      return id ? `/work-schedule?${NOTIFICATION_TARGET_PARAMS.workOrder}=${id}` : '/work-schedule'
    case 'fault':
      return '/gis-map'
    case 'survey_sweep':
      return '/dashboard'
    default:
      return null
  }
}

/** "vừa xong", "5 phút trước", "3 giờ trước", hoặc dd/MM/yyyy */
export const formatRelativeTime = (value?: string | null): string => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} giờ trước`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay} ngày trước`
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}
