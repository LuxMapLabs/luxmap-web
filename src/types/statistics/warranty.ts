/**
 * Auto-generated Types for: statistics/warranty
 * Sinh tự động từ endpoint Backend
 */
import type { DataSource, FixtureType, WarrantyStatus } from '../common/enums'

export interface WarrantyItem {
    pole_id: string | null
    segment_id: string | null
    commune_id: string | null
    data_source: DataSource
    fixture_id: string | null
    fixture_type: FixtureType
    lamp_watt: number
    install_date: string | null
    warranty_expiry: string | null
    warranty_status: WarrantyStatus
    days_remaining: number
}

export interface WarrantyList {
    today: string | null
    expiring_within_days: number
    page: number
    page_size: number
    total: number
    items: WarrantyItem[]
}

