/**
 * Auto-generated Types for: admin/settings
 * Sinh tự động từ endpoint Backend
 */
export interface SettingItem {
    key?: string | null
    value?: number
    default_value?: number
    min?: number
    max?: number
    unit?: string | null
    updated_at?: string | null
    updated_by?: string | null
}

export interface SettingsResponse {
    items?: SettingItem[]
}

export interface UpdateSettingRequest {
    value?: number
    note?: string | null
}

