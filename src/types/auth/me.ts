/**
 * Auto-generated Types for: auth/me
 * Sinh tự động từ endpoint Backend
 */
import type { CommuneBbox, MapCenter } from '../admin/communes'

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
}

export interface MapBounds {
    bbox?: CommuneBbox
    center?: MapCenter
}

