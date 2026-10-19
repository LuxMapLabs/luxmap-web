/**
 * Auto-generated Types for: assets/poles
 * Sinh tự động từ endpoint Backend
 */
import type { DataSource, TopologySource } from '../common/enums'
import type { AssetLocation } from '../common/base'
import type { ActiveFixture } from './fixtures'

export interface CreatePoleRequest {
    external_ref?: string | null
    segment_id: string | null
    feeder_id?: string | null
    commune_id: string | null
    geom_wkt: string | null
    near_sensitive_poi?: boolean
    data_source: DataSource
    note?: string | null
    feeder_source?: string | null
}

export interface PoleDetail {
    pole: PoleListItem
    segment_name: string | null
    geom_wkt: string | null
    created_at: string | null
}

export interface PoleListItem {
    pole_id: string | null
    external_ref?: string | null
    segment_id: string | null
    feeder_id?: string | null
    feeder_source?: TopologySource
    cabinet_id?: string | null
    cabinet_name?: string | null
    cabinet_source?: TopologySource
    commune_id: string | null
    data_source: DataSource
    near_sensitive_poi: boolean
    location: AssetLocation
    active_fixture?: ActiveFixture
    note?: string | null
    updated_at: string | null
    updated_by?: string | null
    updated_by_name?: string | null
}

export interface PoleListItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: PoleListItem[]
}

export interface PoleLocationResponse {
    pole_id?: string | null
    lat?: number
    lng?: number
    moved_m?: number
    updated_at?: string | null
    updated_by?: string | null
    updated_by_name?: string | null
}

export interface PoleNoteResponse {
    pole_id?: string | null
    note?: string | null
    updated_at?: string | null
    updated_by?: string | null
    updated_by_name?: string | null
}

export interface SetPoleFeederRequest {
    feeder_id?: string | null
    feeder_source?: string | null
}

export interface SetPoleLocationRequest {
    lat?: number
    lng?: number
}

export interface SetPoleNoteRequest {
    note?: string | null
}

export interface UpdatePoleRequest {
    external_ref?: string | null
    segment_id: string | null
    feeder_id?: string | null
    geom_wkt: string | null
    near_sensitive_poi?: boolean
    data_source: DataSource
    note?: string | null
    feeder_source?: string | null
}

