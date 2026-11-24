/**
 * Auto-generated Types for: auth/me
 * Sinh tự động từ endpoint Backend
 */
import type { CommuneBbox, MapCenter } from '../admin/communes'

export interface AvatarResponse {
    avatar_url?: string | null
}

export interface CommuneSummary {
    commune_id?: string | null
    name?: string | null
    bbox?: CommuneBbox
    center?: MapCenter
}

export interface CurrentUserResponse {
    user_id?: string | null
    username?: string | null
    email?: string | null
    full_name?: string | null
    role?: string | null
    commune_ids?: string[]
    communes?: CommuneSummary[]
    map_bounds?: MapBounds
    avatar_url?: string | null
    date_of_birth?: string | null
    gender?: 'male' | 'female' | 'other' | null
    address?: string | null
    phone_number?: string | null
    identity_number?: string | null
    identity_type?: 'citizen_id' | 'identity_card' | 'passport' | 'other' | null
}

export interface MapBounds {
    bbox?: CommuneBbox
    center?: MapCenter
}

export interface UpdateProfileRequest {
    full_name?: string | null
}

