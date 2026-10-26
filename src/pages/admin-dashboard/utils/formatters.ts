/**
 * Format số byte thành chuỗi có đơn vị (B, KB, MB, GB, TB)
 * Chuẩn quốc tế, dùng dấu chấm thập phân
 */
export const formatBytes = (bytes?: number | null, decimals = 2): string => {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) return '0 B'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const safeI = Math.min(i, sizes.length - 1)

  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`
}

/**
 * Format thời gian quá khứ dạng tương đối (ví dụ: "3 phút trước", "2 giờ trước")
 */
export const formatRelativeTime = (isoString?: string | null): string => {
  if (!isoString) return 'Chưa có'

  const date = new Date(isoString)
  if (isNaN(date.getTime())) return 'Không xác định'

  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 5) return 'Vừa xong'
  if (diffInSeconds < 60) return `${diffInSeconds} giây trước`

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} giờ trước`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) return `${diffInDays} ngày trước`

  // Format ngày tháng đầy đủ
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  const h = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${mi} ${d}/${m}/${y}`
}

/**
 * Format thời gian TƯƠNG LAI dạng tương đối (ví dụ: "Sau 5 phút nữa", "Sau 1 giờ nữa")
 * Tránh nghịch lý tương lai in thành "Vừa xong"
 */
export const formatFutureTime = (isoString?: string | null): string => {
  if (!isoString) return 'Không có lịch'

  const date = new Date(isoString)
  if (isNaN(date.getTime())) return 'Chưa xác định'

  const now = new Date()
  const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000)

  if (diffInSeconds <= 0) return 'Đang đến hạn'
  if (diffInSeconds < 60) return `Sau ${diffInSeconds} giây nữa`

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `Sau ${diffInMinutes} phút nữa`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `Sau ${diffInHours} giờ nữa`

  const diffInDays = Math.floor(diffInHours / 24)
  return `Sau ${diffInDays} ngày nữa`
}

/**
 * Format ngày giờ hiển thị chi tiết (VD: "14:32:05 - 25/10/2026")
 */
export const formatFullDateTime = (isoString?: string | null): string => {
  if (!isoString) return 'Chưa xác định'
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return 'Không xác định'

  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  const h = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${h}:${mi}:${s} - ${d}/${m}/${y}`
}
