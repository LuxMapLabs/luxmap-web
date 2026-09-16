/**
 * Auto-generated Types for Module: luxreadings
 * Tự động tạo dựa trên endpoint: /api/v1/luxreadings/*
 */
import type { ApiError } from './common'

export interface ApiErrorResponse {
    error?: ApiError
}

export interface CreateLuxReadingRequest {
    client_op_id: string | null
    pole_id: string | null
    measured_at: string | null
    lux_value: number
    meter_model?: string | null
    data_source: DataSource
    note?: string | null
    lux_id?: string | null
    commune_id?: string | null
}

export type DataSource = 'field' | 'public_imagery' | 'calibration_rig' | 'simulated'

export interface LuxReadingResponse {
    lux_id?: string | null
    client_op_id?: string | null
    pole_id?: string | null
    measured_at?: string | null
    lux_value?: number
    meter_model?: string | null
    data_source?: string | null
    note?: string | null
}

export interface LuxReadingWithLuminanceResponse {
    lux_id?: string | null
    client_op_id?: string | null
    pole_id?: string | null
    measured_at?: string | null
    lux_value?: number
    meter_model?: string | null
    data_source?: string | null
    note?: string | null
    nearest_luminance?: NearestLuminance
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

export interface PageQuery {
    page?: number
    page_size?: number
}

