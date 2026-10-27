/**
 * Auto-generated Types for: auth/web
 * Sinh tự động từ endpoint Backend
 */
import type { CurrentUserResponse } from './me'

export interface WebAuthTokenResponse {
    accessToken?: string
    access_token?: string | null
    tokenType?: string
    token_type?: string | null
    expiresIn?: number
    expires_in?: number
}

export interface WebLoginRequest {
    username?: string | null
    password?: string | null
    rememberMe?: boolean
    remember_me?: boolean
    emailOrPhone?: string
}

export enum UserRole {
  ManagementAgency = 0,
  MaintenanceEngineer = 1,
  FieldCrew = 2,
  Admin = 3,
}

export interface JwtPayloadClaims {
  sub: string
  role: string
  commune_ids: string[]
  exp: number
  iat: number
  iss?: string
  aud?: string
}

export interface AuthState {
  user: CurrentUserResponse | null
  isAuthenticated: boolean
  accessToken?: string | null
  refreshToken?: string | null
  loading: boolean
  isRefreshingProfile?: boolean
  error: string | null
}

export interface LoginRequest {
  emailOrPhone: string
  password: string
  rememberMe?: boolean
  username?: string
  remember_me?: boolean
}

export interface RegisterRequest {
  username?: string | null
  fullName?: string
  full_name?: string | null
  email?: string | null
  phoneNumber?: string | null
  password?: string | null
  administrativeUnitId?: string
  role?: UserRole
}

export interface RegisterResponse {
  user_id?: string | null
  username?: string | null
  email?: string | null
  full_name?: string | null
  role?: string | null
  commune_ids?: string | null[]
  message?: string | null
}

export interface ApiResponse<T> {
  data: T | null
  error?: {
    code: string
    message: string
    details?: Record<string, string[]>
  } | null
}
