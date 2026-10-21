/**
 * Auto-generated Types for: assets/fixtures
 * Sinh tự động từ endpoint Backend
 */
import type { DataSource, FixtureType, PowerSource, WarrantyStatus } from '../common/enums'

export interface ActiveFixture {
    fixture_id: string | null
    fixture_type: FixtureType
    power_source: PowerSource
    lamp_watt: number
    lamp_count: number
    install_date: string | null
    warranty_expiry?: string | null
    warranty_status?: WarrantyStatus
    data_source: DataSource
}

export interface CreateFixtureRequest {
    pole_id: string | null
    fixture_type: FixtureType
    power_source: PowerSource
    lamp_watt: number
    lamp_count?: number
    install_date: string | null
    removed_date?: string | null
    warranty_expiry?: string | null
    data_source: DataSource
}

export interface RetireFixtureRequest {
    removed_date: string | null
}

