/**
 * Auto-generated Types for Module: auth
 * Tự động tạo dựa trên endpoint: /api/v1/auth/*
 */
import type { ApiError, UserDto } from './common'

export interface ApiErrorResponse {
    error?: ApiError
}

export interface AuthTokenResponse {
    access_token?: string | null
    refresh_token?: string | null
    token_type?: string | null
    expires_in?: number
}

export interface LoginRequest {
    username: string | null
    password: string | null
}

export interface LogoutRequest {
    refresh_token: string | null
}

export interface RefreshRequest {
    refresh_token: string | null
}

export interface RegisterRequest {
    username: string | null
    email: string | null
    full_name: string | null
    password: string | null
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

export interface WebAuthTokenResponse {
    access_token?: string | null
    token_type?: string | null
    expires_in?: number
}

export interface WebLoginRequest {
    username: string | null
    password: string | null
    remember_me?: boolean
}


export interface AuthState {
    user: UserDto | null
    accessToken: string | null
    refreshToken: string | null
    loading: boolean
    error: string | null
}
