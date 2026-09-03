/**
 * Barrel export cho toàn bộ Types trong dự án
 */
export * from './common'
export * from './health'

export type {
  User,
  AuthResponse,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  ApiResponse,
  AuthResponseApiResponse,
  AuthState,
} from './auth'

// Re-export UserRole enum từ auth (tương thích cả enum và number union)
export { UserRole } from './auth'
