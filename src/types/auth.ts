import type { ApiError, PaginationMeta, UserDto } from './common'

export enum UserRole {
  Citizen = 0,
  Officer = 1,
  Leader = 2,
  Admin = 3,
}

export interface User {
  id?: string
  userId?: string
  fullName: string
  email: string | null
  phoneNumber?: string | null
  role: UserRole
  administrativeUnitId: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: User
}

export interface LoginRequest {
  emailOrPhone: string
  password: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RegisterRequest {
  fullName: string
  email?: string | null
  phoneNumber?: string | null
  password: string
  administrativeUnitId: string
  role?: UserRole
}

export interface ApiResponse<T> {
  data: T | null
  error?: {
    code: string
    message: string
    details?: Record<string, string[]>
  } | null
}

export interface AuthResponseApiResponse {
  data?: AuthResponse
  error?: ApiError
  pagination?: PaginationMeta
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  accessToken?: string | null
  refreshToken?: string | null
  loading: boolean
  error: string | null
}

export type { UserDto }
