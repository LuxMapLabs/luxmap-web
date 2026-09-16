/**
 * Auto-generated Types for Module: poles
 * Tự động tạo dựa trên endpoint: /api/v1/poles/*
 */
import type { ApiError } from './common'

export interface ApiErrorResponse {
    error?: ApiError
}

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

export interface LuxReadingResponsePagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: LuxReadingResponse[]
}

export interface PageQuery {
    page?: number
    page_size?: number
}

