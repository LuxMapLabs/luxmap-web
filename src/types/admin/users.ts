/**
 * Auto-generated Types for: admin/users
 * Sinh tự động từ endpoint Backend
 */
import type { UserRole } from '../common/enums'

export interface CreateUserRequest {
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

export interface UpdateUserRequest {
    email?: string | null
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
}

export interface UserAccountItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: UserAccountItem[]
}

