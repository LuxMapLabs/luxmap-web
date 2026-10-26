/**
 * LuxMap UI Labels & Badges
 * Chỉ chứa các từ điển nhãn tiếng Việt và định dạng badge phục vụ giao diện người dùng.
 * Toàn bộ kiểu dữ liệu (Types/Enums) nghiệp vụ sử dụng trực tiếp từ src/types/common/enums.ts (API Types First).
 */

/**
 * Ánh xạ nhãn tiếng Việt và màu sắc cho các vai trò RBAC (chuỗi OpenAPI Swagger)
 */
export const USER_ROLE_LABELS: Record<string, string> = {
  system_admin: 'Quản trị hệ thống',
  manager: 'Cán bộ quản lý',
  superior: 'Lãnh đạo cấp trên',
  field_engineer: 'Kỹ sư hiện trường',
}

export const USER_ROLE_BADGES: Record<string, { label: string; colorClass: string }> = {
  system_admin: {
    label: 'Quản trị hệ thống',
    colorClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  manager: {
    label: 'Cán bộ quản lý',
    colorClass: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  superior: {
    label: 'Lãnh đạo cấp trên',
    colorClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  field_engineer: {
    label: 'Kỹ sư hiện trường',
    colorClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
}

export function getUserRoleBadge(role?: string | null) {
  if (!role) {
    return {
      label: 'Chưa phân vai trò',
      colorClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    }
  }
  return (
    USER_ROLE_BADGES[role] || {
      label: role,
      colorClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    }
  )
}

/**
 * Nhãn hiển thị tiếng Việt thân thiện cho nguồn dữ liệu
 */
export const DATA_SOURCE_LABELS: Record<string, string> = {
  field: 'Khảo sát thực địa',
  public_imagery: 'Ảnh vệ tinh / Bản đồ số',
  calibration_rig: 'Thiết bị đo chuẩn',
  simulated: 'Dữ liệu mô phỏng',
}

/**
 * Lấy nhãn tiếng Việt tương ứng cho nguồn dữ liệu
 */
export function getDataSourceDisplayName(source?: string | null): string {
  if (!source) return 'Khảo sát thực địa'
  return DATA_SOURCE_LABELS[source] || source
}
