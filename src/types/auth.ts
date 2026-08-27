/**
 * Auto-generated Types for Module: auth
 * Tự động tạo dựa trên endpoint: /api/v1/auth/*
 */
import type { ApiError, PaginationMeta, UserDto, UserRole } from './common'

export interface AuthResponse {
    accessToken?: string | null
    refreshToken?: string | null
    expiresAt?: string | null
    user?: UserDto
}

export interface LoginRequest {
    emailOrPhone?: string | null
    password?: string | null
}

export interface RefreshTokenRequest {
    refreshToken?: string | null
}

export interface RegisterRequest {
    fullName?: string | null
    email?: string | null
    phoneNumber?: string | null
    password?: string | null
    administrativeUnitId?: string | null
    role?: UserRole
}

export interface AuthResponseApiResponse {
    data?: AuthResponse
    error?: ApiError
    pagination?: PaginationMeta
}


export interface AuthState {
    user: UserDto | null
    accessToken: string | null
    refreshToken: string | null
    loading: boolean
    error: string | null
}
