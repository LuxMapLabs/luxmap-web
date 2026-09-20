/**
 * Role & Permission Utility
 * Chuẩn hóa Role, giải mã JWT Access Token và hỗ trợ kiểm tra phân quyền (RBAC)
 * Khớp hoàn toàn với 4 vai trò của Backend: administrator, management_agency, maintenance_engineer, field_crew
 */

import { UserRole, User, JwtPayloadClaims, CurrentUserResponse } from '../types/auth'

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

  // 2. Nếu là chuỗi (backend trả về trong JWT claim: "administrator", "management_agency", "maintenance_engineer", "field_crew")
  if (typeof role === 'string') {
    const clean = role.trim().toLowerCase()
    switch (clean) {
      case 'administrator':
      case 'admin':
      case '3':
        return UserRole.Admin

      case 'management_agency':
      case 'agency':
      case 'leader':
      case '0':
        return UserRole.ManagementAgency

      case 'maintenance_engineer':
      case 'engineer':
      case 'officer':
      case '1':
        return UserRole.MaintenanceEngineer

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
export const createUserFromToken = (accessToken: string, fallbackUsername?: string): User | null => {
  const claims = parseJwt<JwtPayloadClaims>(accessToken)
  if (!claims || !claims.sub) return null

  const role = normalizeRole(claims.role)
  const roleName = getRoleName(role)
  const userId = claims.sub
  const username = fallbackUsername || userId
  const communeIds = Array.isArray(claims.commune_ids) ? claims.commune_ids : []

  // Tạo tên hiển thị đẹp từ username hoặc role
  let fullName = username
  if (username.startsWith('USR-') || username === userId) {
    fullName = `${roleName} (${userId})`
  }

  return {
    id: userId,
    userId: userId,
    username: username,
    fullName: fullName,
    email: username.includes('@') ? username : null,
    phoneNumber: null,
    role,
    roleString: claims.role,
    administrativeUnitId: communeIds[0] || '',
    communeIds,
  }
}

/**
 * Chuyển đổi trực tiếp CurrentUserResponse từ GET /api/v1/auth/me thành đối tượng User chuẩn
 */
export const mapCurrentUserToUser = (me: CurrentUserResponse): User => {
  const role = normalizeRole(me.role)
  const communeIds = Array.isArray(me.commune_ids) ? me.commune_ids : []
  const userId = me.user_id || ''
  const fullName = me.full_name?.trim() || me.username || 'Cán bộ kỹ thuật'

  return {
    id: userId,
    userId: userId,
    username: me.username,
    fullName: fullName,
    email: me.email || null,
    phoneNumber: null,
    role,
    roleString: me.role,
    administrativeUnitId: communeIds[0] || '',
    communeIds,
  }
}

/**
 * Chuẩn hóa toàn bộ đối tượng User từ response Backend
 */
export const normalizeUser = (raw: any): User => {
  if (!raw) {
    return {
      id: '',
      fullName: 'Người dùng',
      email: null,
      phoneNumber: null,
      role: UserRole.MaintenanceEngineer,
      administrativeUnitId: '',
    }
  }

  // Nếu là CurrentUserResponse từ /auth/me
  if (raw.user_id && raw.full_name !== undefined) {
    return mapCurrentUserToUser(raw as CurrentUserResponse)
  }

  const role = normalizeRole(raw.role, {
    isAdmin: raw.isAdmin,
    isLeader: raw.isLeader,
    isOfficer: raw.isOfficer,
    isCitizen: raw.isCitizen,
  })

  const communeIds = Array.isArray(raw.communeIds || raw.commune_ids)
    ? raw.communeIds || raw.commune_ids
    : []

  return {
    id: String(raw.id || raw.userId || raw.user_id || ''),
    userId: String(raw.id || raw.userId || raw.user_id || ''),
    fullName: String(raw.fullName || raw.full_name || raw.name || raw.username || 'Người dùng'),
    username: raw.username,
    email: raw.email || null,
    phoneNumber: raw.phoneNumber || raw.phone || null,
    role,
    roleString: raw.roleString || raw.role,
    administrativeUnitId: String(raw.administrativeUnitId || communeIds[0] || ''),
    communeIds,
  }
}

/**
 * Trả về tên hiển thị tiếng Việt thân thiện của 4 Role
 */
export const getRoleName = (role?: UserRole | string | number): string => {
  const normalized = normalizeRole(role)
  switch (normalized) {
    case UserRole.Admin:
      return 'Quản trị viên'
    case UserRole.ManagementAgency:
      return 'Cơ quan Quản lý'
    case UserRole.MaintenanceEngineer:
      return 'Kỹ sư Bảo trì'
    case UserRole.FieldCrew:
      return 'Đội Khảo sát & Sửa chữa'
    default:
      return 'Kỹ sư Vận hành'
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

export const isAdmin = (role?: UserRole | string | number): boolean => {
  return normalizeRole(role) === UserRole.Admin
}

export const isManagementAgency = (role?: UserRole | string | number): boolean => {
  return normalizeRole(role) === UserRole.ManagementAgency
}

export const isMaintenanceEngineer = (role?: UserRole | string | number): boolean => {
  return normalizeRole(role) === UserRole.MaintenanceEngineer
}

export const isFieldCrew = (role?: UserRole | string | number): boolean => {
  return normalizeRole(role) === UserRole.FieldCrew
}
