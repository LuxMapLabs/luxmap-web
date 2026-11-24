/**
 * Auto-generated Types for: admin/users
 * Sinh tự động từ endpoint Backend
 */
import type { UserRole } from '../common/enums'

export interface ChangeUserEmailRequest {
    email: string | null
}

export interface ChangeUserEmailResponse {
    user?: UserAccountItem
    notification_sent?: boolean
}

export interface CreateUserRequest {
    date_of_birth?: string | null
    gender?: 'male' | 'female' | 'other' | null
    address?: string | null
    phone_number?: string | null
    identity_number?: string | null
    identity_type?: 'citizen_id' | 'identity_card' | 'passport' | 'other' | null
    username?: any
    email: string | null
    full_name: string | null
    role: UserRole
    commune_ids?: string[]
}

export interface CreateUserResponse {
    user?: UserAccountItem
    invitation_sent?: boolean
}

export interface InvitationResponse {
    invitation_sent?: boolean
    expires_at?: string | null
}

export interface ProblemDetails {
    type?: string | null
    title?: string | null
    status?: number
    detail?: string | null
    instance?: string | null
}

export interface UpdateUserRequest {
    date_of_birth?: string | null
    gender?: 'male' | 'female' | 'other' | null
    address?: string | null
    phone_number?: string | null
    identity_number?: string | null
    identity_type?: 'citizen_id' | 'identity_card' | 'passport' | 'other' | null
    full_name?: string | null
    role?: UserRole
    commune_ids?: string[]
}

export interface UserAccountItem {
    user_id?: string | null
    username?: string | null
    email?: string | null
    full_name?: string | null
    role?: string | null
    commune_ids?: string[]
    status?: string | null
    created_at?: string | null
    password_set_at?: string | null
    avatar_url?: string | null
    date_of_birth?: string | null
    gender?: 'male' | 'female' | 'other' | null
    address?: string | null
    phone_number?: string | null
    identity_number?: string | null
    identity_type?: 'citizen_id' | 'identity_card' | 'passport' | 'other' | null
}

export interface UserAccountItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: UserAccountItem[]
}

