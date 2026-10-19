/**
 * Auto-generated Types for: admin/communes
 * Sinh tự động từ endpoint Backend
 */
export interface CommuneBbox {
    min_lng?: number
    min_lat?: number
    max_lng?: number
    max_lat?: number
}

export interface CommuneItem {
    commune_id?: string | null
    name?: string | null
    bbox?: CommuneBbox
    center?: MapCenter
    created_at?: string | null
    updated_at?: string | null
}

export interface CommuneItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: CommuneItem[]
}

export interface CreateCommuneRequest {
    name?: string | null
    bbox?: CommuneBbox
}

export interface MapCenter {
    lat?: number
    lng?: number
}

export interface UpdateCommuneRequest {
    name: string | null
    bbox: CommuneBbox
}

