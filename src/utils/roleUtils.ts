/**
 * Role & Permission Utility
 * Chuẩn hóa Role và hỗ trợ kiểm tra phân quyền người dùng (RBAC)
 * Giải quyết triệt để lỗi mất Role sau F5 do không đồng nhất kiểu dữ liệu (số vs chuỗi lowercase từ /auth/me)
 */

import { UserRole, User } from '../types/auth'

/**
 * Chuẩn hóa Role từ bất kỳ định dạng nào (số, chuỗi, hoặc flags) thành UserRole enum
 * - Số: 0 (Citizen), 1 (Officer), 2 (Leader), 3 (Admin)
 * - Chuỗi: "admin", "Admin", "ADMIN", "3" -> UserRole.Admin (3)
 * - Chuỗi: "leader", "Leader", "LEADER", "2" -> UserRole.Leader (2)
 * - Chuỗi: "officer", "Officer", "OFFICER", "1" -> UserRole.Officer (1)
 * - Chuỗi: "citizen", "Citizen", "CITIZEN", "0" -> UserRole.Citizen (0)
 */
export const normalizeRole = (role: any, fallbackFlags?: {
  isAdmin?: boolean
  isLeader?: boolean
  isOfficer?: boolean
  isCitizen?: boolean
}): UserRole => {
  // 1. Nếu là số hợp lệ trong UserRole enum
  if (typeof role === 'number' && !isNaN(role)) {
    if (role === UserRole.Admin || role === 3) return UserRole.Admin
    if (role === UserRole.Leader || role === 2) return UserRole.Leader
    if (role === UserRole.Officer || role === 1) return UserRole.Officer
    if (role === UserRole.Citizen || role === 0) return UserRole.Citizen
  }

  // 2. Nếu là chuỗi (backend /auth/me trả về ClaimTypes.Role dạng "admin", "officer", "leader", "citizen")
  if (typeof role === 'string') {
    const clean = role.trim().toLowerCase()
    switch (clean) {
      case 'admin':
      case '3':
        return UserRole.Admin
      case 'leader':
      case '2':
        return UserRole.Leader
      case 'officer':
      case '1':
        return UserRole.Officer
      case 'citizen':
      case '0':
        return UserRole.Citizen
    }
  }

  // 3. Dự phòng bằng các cờ boolean nếu backend trả về trong object
  if (fallbackFlags) {
    if (fallbackFlags.isAdmin) return UserRole.Admin
    if (fallbackFlags.isLeader) return UserRole.Leader
    if (fallbackFlags.isOfficer) return UserRole.Officer
    if (fallbackFlags.isCitizen) return UserRole.Citizen
  }

  // Mặc định an toàn
  return UserRole.Citizen
}

/**
 * Chuẩn hóa toàn bộ đối tượng User từ response Backend
 * Đảm bảo các trường id, fullName, role, administrativeUnitId luôn đầy đủ và đúng kiểu
 */
export const normalizeUser = (raw: any): User => {
  if (!raw) {
    return {
      id: '',
      fullName: '',
      email: null,
      phoneNumber: null,
      role: UserRole.Citizen,
      administrativeUnitId: '',
    }
  }

  const role = normalizeRole(raw.role, {
    isAdmin: raw.isAdmin,
    isLeader: raw.isLeader,
    isOfficer: raw.isOfficer,
    isCitizen: raw.isCitizen,
  })

  return {
    id: String(raw.id || raw.userId || ''),
    fullName: String(raw.fullName || raw.name || 'Người dùng'),
    email: raw.email || null,
    phoneNumber: raw.phoneNumber || raw.phone || null,
    role,
    administrativeUnitId: String(raw.administrativeUnitId || ''),
  }
}

/**
 * Trả về tên hiển thị tiếng Việt thân thiện của Role
 */
export const getRoleName = (role?: UserRole | string | number): string => {
  const normalized = normalizeRole(role)
  switch (normalized) {
    case UserRole.Admin:
      return 'Quản trị hệ thống'
    case UserRole.Leader:
      return 'Lãnh đạo đơn vị'
    case UserRole.Officer:
      return 'Cán bộ quản lý'
    case UserRole.Citizen:
      return 'Người dân phản ánh'
    default:
      return 'Không xác định'
  }
}

/**
 * Kiểm tra xem người dùng có vai trò cụ thể hay không
 */
export const hasRole = (
  userRole: UserRole | string | number | undefined,
  targetRole: UserRole | string | number
): boolean => {
  if (userRole === undefined || userRole === null) return false
  return normalizeRole(userRole) === normalizeRole(targetRole)
}

/**
 * Kiểm tra xem người dùng có một trong các vai trò được cho phép hay không
 */
export const hasAnyRole = (
  userRole: UserRole | string | number | undefined,
  allowedRoles: (UserRole | string | number)[]
): boolean => {
  if (userRole === undefined || userRole === null) return false
  if (!allowedRoles || allowedRoles.length === 0) return true
  const current = normalizeRole(userRole)
  return allowedRoles.some((r) => normalizeRole(r) === current)
}

/**
 * Helper kiểm tra nhanh vai trò Quản trị viên
 */
export const isAdmin = (role?: UserRole | string | number): boolean => {
  return normalizeRole(role) === UserRole.Admin
}

/**
 * Helper kiểm tra nhanh vai trò Lãnh đạo
 */
export const isLeader = (role?: UserRole | string | number): boolean => {
  return normalizeRole(role) === UserRole.Leader
}

/**
 * Helper kiểm tra nhanh vai trò Cán bộ quản lý
 */
export const isOfficer = (role?: UserRole | string | number): boolean => {
  return normalizeRole(role) === UserRole.Officer
}

/**
 * Helper kiểm tra nhanh vai trò Người dân
 */
export const isCitizen = (role?: UserRole | string | number): boolean => {
  return normalizeRole(role) === UserRole.Citizen
}
