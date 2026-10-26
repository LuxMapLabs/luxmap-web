/**
 * Tiện ích định dạng hiển thị địa bàn (Commune Display Formatters)
 * Hoàn toàn không chứa dữ liệu mock; ưu tiên trực tiếp tên xã do Backend API trả về.
 */

/**
 * Hiển thị tên địa bàn thân thiện.
 * Ưu tiên communeName từ Backend, fallback sang communeId hoặc ký tự mặc định.
 */
export function formatFriendlyCommuneName(
  communeName?: string | null,
  communeId?: string | null,
  fallback: string = '—'
): string {
  if (communeName && communeName.trim()) {
    return communeName.trim()
  }
  if (communeId && communeId.trim()) {
    return communeId.trim()
  }
  return fallback
}

/**
 * Hiển thị tên/mã địa bàn chuẩn hóa cho các modal và báo cáo
 */
export function formatCommuneDisplayName(communeId?: string | null): string {
  if (!communeId || !communeId.trim()) {
    return 'Chưa gán địa bàn'
  }
  return communeId.trim()
}

/**
 * Lấy nhãn địa bàn từ communeId
 */
export function getCommuneName(communeId?: string | null): string {
  if (!communeId || !communeId.trim()) {
    return 'Chưa gán địa bàn'
  }
  return communeId.trim()
}
