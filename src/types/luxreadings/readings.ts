/**
 * Auto-generated Types for: luxreadings/readings
 * Sinh tự động từ endpoint Backend
 */
import type { DataSource } from '../common/enums'

export interface CreateLuxReadingRequest {
    client_op_id: string | null
    pole_id: string | null
    measured_at: string | null
    lux_value: number
    photo_id?: string | null
    meter_model?: string | null
    data_source: DataSource
    note?: string | null
    lux_id?: string | null
    commune_id?: string | null
    protocol?: LuxProtocolRequest
}

export interface LuxEvaluationResponse {
    classified_as?: string | null
    baseline_ratio?: number
    baseline_value?: number
    baseline_member_count?: number
    dim_threshold_ratio?: number
    dim_evaluation_eligible?: boolean
    expected_ratio?: number
    reason_codes?: string[]
    evaluated_at?: string | null
}

export interface LuxProtocolRequest {
    samples: number[]
    sensor_height_m: number
    module_id: string | null
    module_firmware_version_id?: number
    optical_filter_transmittance?: number
}

export interface LuxProtocolResponse {
    sensor_height_m?: number
    module_id?: string | null
    module_firmware_version_id?: number
    optical_filter_transmittance?: number
    window_spread?: number
    sample_count?: number
}

export interface LuxReadingResponse {
    lux_id?: string | null
    client_op_id?: string | null
    pole_id?: string | null
    photo_id?: string | null
    measured_at?: string | null
    lux_value?: number
    meter_model?: string | null
    data_source?: string | null
    note?: string | null
    protocol?: LuxProtocolResponse
    evaluation?: LuxEvaluationResponse
}

export interface LuxReadingResponsePagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: LuxReadingResponse[]
}

export interface LuxReadingWithLuminanceResponse {
    lux_id?: string | null
    client_op_id?: string | null
    pole_id?: string | null
    photo_id?: string | null
    measured_at?: string | null
    lux_value?: number
    meter_model?: string | null
    data_source?: string | null
    note?: string | null
    nearest_luminance?: NearestLuminance
    protocol?: LuxProtocolResponse
    evaluation?: LuxEvaluationResponse
}

export interface LuxReadingWithLuminanceResponsePagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: LuxReadingWithLuminanceResponse[]
}

export interface NearestLuminance {
    baseline_ratio?: number
    classified_as?: string | null
    observed_at?: string | null
}

