/**
 * Auto-generated Types for Module: assets
 * Tự động tạo dựa trên endpoint: /api/v1/assets/*
 */
import type { ApiError } from './common'

export interface ApiErrorResponse {
    error?: ApiError
}

export interface CreateFeederRequest {
    external_ref?: string | null
    feeder_name: string | null
    commune_id: string | null
    geom_wkt?: string | null
}

export interface CreateFixtureRequest {
    pole_id: string | null
    fixture_type: FixtureType
    power_source: PowerSource
    lamp_watt: number
    install_date: string | null
    removed_date?: string | null
    warranty_expiry?: string | null
    data_source: DataSource
}

export interface CreatePoleRequest {
    external_ref?: string | null
    segment_id: string | null
    feeder_id?: string | null
    commune_id: string | null
    geom_wkt: string | null
    near_sensitive_poi?: boolean
    data_source: DataSource
}

export interface CreateSegmentRequest {
    external_ref?: string | null
    segment_name: string | null
    road_class: RoadClass
    length_m: number
    geom_wkt: string | null
    commune_id: string | null
    data_source: DataSource
}

export type DataSource = 'field' | 'public_imagery' | 'calibration_rig' | 'simulated'

export type FixtureType = 'led_road_lamp' | 'solar_all_in_one'

export interface ImportResult {
    inserted?: number
    updated?: number
    failed?: number
    total_errors?: number
    truncated?: boolean
    rows?: ImportRowError[]
}

export interface ImportRowError {
    row?: number
    column?: string | null
    message?: string | null
}

export interface PageQuery {
    page?: number
    page_size?: number
}

export type PowerSource = 'grid' | 'solar'

export interface RetireFixtureRequest {
    removed_date: string | null
}

export type RoadClass = 'inter_commune' | 'inter_village'

export interface StringPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: string | null[]
}

