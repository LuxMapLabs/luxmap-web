/**
 * Role & Permission Utility
 * Chuẩn hóa Role, giải mã JWT Access Token và hỗ trợ kiểm tra phân quyền (RBAC)
 * Khớp hoàn toàn với 4 vai trò của Backend: administrator, management_agency, maintenance_engineer, field_crew
 */

import { UserRole, JwtPayloadClaims } from '../types/auth/web'
import type { CurrentUserResponse } from '../types/auth/me'

/**
 * Giải mã JWT Access Token phía client (Base64Url an toàn với UTF-8, zero-dependency)
 */
export const parseJwt = <T = JwtPayloadClaims>(token: string): T | null => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload) as T
  } catch (error) {
    console.error('Không thể giải mã JWT token:', error)
    return null
  }
}

/**
 * Chuẩn hóa Role từ bất kỳ định dạng nào (chuỗi wire backend, số enum, hoặc flags) thành UserRole enum
 * Khớp 100% Backend C# UserRole.cs:
 * 0 = ManagementAgency (Cơ quan Quản lý)
 * 1 = MaintenanceEngineer (Kỹ sư Bảo trì)
 * 2 = FieldCrew (Đội Khảo sát & Sửa chữa / Đội Hiện trường)
 * 3 = Administrator (Quản trị viên)
 */
export const normalizeRole = (role: any, fallbackFlags?: {
  isAdmin?: boolean
  isAgency?: boolean
  isEngineer?: boolean
  isCrew?: boolean
  isLeader?: boolean
  isOfficer?: boolean
  isCitizen?: boolean
}): UserRole => {
  // 1. Nếu là số hợp lệ trong UserRole enum (Khớp 100% backend C#)
  if (typeof role === 'number' && !isNaN(role)) {
    if (role === 3 || role === UserRole.Admin) return UserRole.Admin
    if (role === 0 || role === UserRole.ManagementAgency) return UserRole.ManagementAgency
    if (role === 1 || role === UserRole.MaintenanceEngineer) return UserRole.MaintenanceEngineer
    if (role === 2 || role === UserRole.FieldCrew) return UserRole.FieldCrew
  }

  // 2. Nếu là chuỗi (backend trả về trong JWT claim: "superior", "manager", "field_engineer", "system_admin")
  if (typeof role === 'string') {
    const clean = role.trim().toLowerCase()
    switch (clean) {
      case 'administrator':
      case 'system_admin':
      case 'admin':
      case '3':
        return UserRole.Admin

      case 'superior':
      case 'management_agency':
      case 'agency':
      case 'leader':
      case '0':
        return UserRole.ManagementAgency

      case 'manager':
      case 'maintenance_engineer':
      case 'engineer':
      case 'officer':
      case '1':
        return UserRole.MaintenanceEngineer

      case 'field_engineer':
      case 'field_crew':
      case 'crew':
      case 'citizen':
      case '2':
        return UserRole.FieldCrew
    }
  }

  // 3. Dự phòng bằng các cờ boolean
  if (fallbackFlags) {
    if (fallbackFlags.isAdmin) return UserRole.Admin
    if (fallbackFlags.isAgency || fallbackFlags.isLeader) return UserRole.ManagementAgency
    if (fallbackFlags.isEngineer || fallbackFlags.isOfficer) return UserRole.MaintenanceEngineer
    if (fallbackFlags.isCrew || fallbackFlags.isCitizen) return UserRole.FieldCrew
  }

  // Mặc định an toàn: Kỹ sư Bảo trì
  return UserRole.MaintenanceEngineer
}

/**
 * Tạo đối tượng User đầy đủ trực tiếp từ JWT Access Token
 */
export const createUserFromToken = (accessToken: string, fallbackUsername?: string): CurrentUserResponse | null => {
  const claims = parseJwt<JwtPayloadClaims>(accessToken)
  if (!claims || !claims.sub) return null

  const userId = claims.sub
  const username = fallbackUsername || userId
  const communeIds = Array.isArray(claims.commune_ids) ? claims.commune_ids : []

  return {
    user_id: userId,
    username: username,
    full_name: username,
    email: username.includes('@') ? username : null,
    role: claims.role,
    commune_ids: communeIds,
    communes: [],
    map_bounds: undefined,
  }
}

/**
 * Giữ nguyên CurrentUserResponse từ GET /api/v1/auth/me (API Types First)
 */
export const mapCurrentUserToUser = (me: CurrentUserResponse): CurrentUserResponse => me

/**
 * Chuẩn hóa đối tượng người dùng từ response Backend
 */
export const normalizeUser = (raw: any): CurrentUserResponse => {
  if (!raw) {
    return {
      user_id: '',
      full_name: 'Người dùng',
      username: 'user',
      email: null,
      role: 'maintenance_engineer',
      commune_ids: [],
      communes: [],
      map_bounds: undefined,
    }
  }

  const communeIds = Array.isArray(raw.commune_ids || raw.communeIds)
    ? raw.commune_ids || raw.communeIds
    : []
  const communes = Array.isArray(raw.communes) ? raw.communes : []

  return {
    user_id: String(raw.user_id || raw.userId || raw.id || ''),
    username: raw.username || '',
    full_name: String(raw.full_name || raw.fullName || raw.name || raw.username || 'Người dùng'),
    email: raw.email || null,
    role: String(raw.role || raw.roleString || ''),
    commune_ids: communeIds,
    communes,
    map_bounds: raw.map_bounds || raw.mapBounds || undefined,
  }
}

export const getRoleName = (role?: UserRole | string | number | null): string => {
  const normalized = normalizeRole(role)
  switch (normalized) {
    case UserRole.Admin:
      return 'Quản trị hệ thống (Admin)'
    case UserRole.ManagementAgency:
      return 'Cấp trên / Giám sát (Superior)'
    case UserRole.MaintenanceEngineer:
      return 'Quản lý (Manager)'
    case UserRole.FieldCrew:
      return 'Kỹ sư hiện trường (Field Engineer)'
    default:
      return 'Cán bộ kỹ thuật'
  }
}

/**
 * Kiểm tra xem người dùng có vai trò cụ thể hay không
 */
export const hasRole = (
  userRole: UserRole | string | number | null | undefined,
  targetRole: UserRole | string | number
): boolean => {
  if (userRole === undefined || userRole === null) return false
  return normalizeRole(userRole) === normalizeRole(targetRole)
}

/**
 * Kiểm tra xem người dùng có một trong các vai trò được cho phép hay không
 */
export const hasAnyRole = (
  userRole: UserRole | string | number | null | undefined,
  allowedRoles: (UserRole | string | number)[]
): boolean => {
  if (userRole === undefined || userRole === null) return false
  if (!allowedRoles || allowedRoles.length === 0) return true
  const current = normalizeRole(userRole)
  return allowedRoles.some((r) => normalizeRole(r) === current)
}

export const isAdmin = (role?: UserRole | string | number | null): boolean => {
  return normalizeRole(role) === UserRole.Admin
}

export const isSystemAdmin = (role?: UserRole | string | number | null): boolean => {
  return isAdmin(role)
}

export const isManager = (role?: UserRole | string | number | null): boolean => {
  return normalizeRole(role) === UserRole.MaintenanceEngineer
}

export const isManagementAgency = (role?: UserRole | string | number | null): boolean => {
  return normalizeRole(role) === UserRole.ManagementAgency
}

export const isMaintenanceEngineer = (role?: UserRole | string | number | null): boolean => {
  return normalizeRole(role) === UserRole.MaintenanceEngineer
}

export const isFieldCrew = (role?: UserRole | string | number | null): boolean => {
  return normalizeRole(role) === UserRole.FieldCrew
}

/**
 * Kiểm tra quyền hiển thị và truy cập tab trên Sidebar / Navigation Bar
 * - system_admin: Truy cập 'admin-system'
 * - manager: Truy cập 'gis-map', 'work-schedule', 'assets', 'citizen-reports'
 * - management_agency (superior): Truy cập 'reports', 'gis-map' (chỉ Superior mới có tab 'reports')
 * - các vai trò khác: Tạm thời chưa có tab
 */
export const canAccessTab = (
  tabId: 'dashboard' | 'gis-map' | 'work-schedule' | 'assets' | 'admin-system' | 'reports' | 'citizen-reports',
  role?: UserRole | string | number | null
): boolean => {
  if (isSystemAdmin(role)) {
    return tabId === 'admin-system'
  }
  if (isManagementAgency(role)) {
    return tabId === 'reports' || tabId === 'gis-map'
  }
  if (isManager(role)) {
    return (
      tabId === 'dashboard' ||
      tabId === 'gis-map' ||
      tabId === 'work-schedule' ||
      tabId === 'assets' ||
      tabId === 'citizen-reports'
    )
  }
  return false
}
