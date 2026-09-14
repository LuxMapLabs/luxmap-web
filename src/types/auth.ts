import type { ApiError, PaginationMeta, UserDto } from './common'

export enum UserRole {
  ManagementAgency = 0,
  MaintenanceEngineer = 1,
  FieldCrew = 2,
  Admin = 3,
}

export interface User {
  id?: string
  userId?: string
  fullName: string
  username?: string
  email: string | null
  phoneNumber?: string | null
  role: UserRole
  roleString?: string
  administrativeUnitId?: string
  communeIds?: string[]
}

export interface WebAuthTokenResponse {
  accessToken?: string
  access_token?: string
  tokenType?: string
  token_type?: string
  expiresIn?: number
  expires_in?: number
}

export interface WebLoginRequest {
  username: string
  password: string
  rememberMe?: boolean
  remember_me?: boolean
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

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: User
}

export interface LoginRequest {
  emailOrPhone: string
  password: string
  rememberMe?: boolean
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
