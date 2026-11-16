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
    /** Ghi chú bộ đèn (trường hợp đặc biệt), tối đa 1000 ký tự; BE trim, rỗng = không có. */
    note?: string | null
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
    /** Ghi chú bộ đèn (trường hợp đặc biệt), tối đa 1000 ký tự; BE trim, rỗng = không có. */
    note?: string | null
}

/**
 * PUT /api/v1/assets/fixtures/{fixtureId} — thay toàn bộ thông số (204). Bộ đã tháo → 400.
 * Ngày lắp bắt buộc; `note` null = xoá ghi chú. Chỉ để sửa thông tin nhập sai của bộ đang dùng; đổi cột hoặc thay đèn thật = tháo rồi gắn bộ mới.
 */
export interface UpdateFixtureRequest {
    fixture_type: FixtureType
    power_source: PowerSource
    lamp_watt: number
    lamp_count: number
    install_date: string
    warranty_expiry: string | null
    note: string | null
}

export interface RetireFixtureRequest {
    removed_date: string | null
}

