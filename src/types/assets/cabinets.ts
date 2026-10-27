/**
 * Auto-generated Types for: assets/cabinets
 * Sinh tự động từ endpoint Backend
 */
import type { DataSource } from '../common/enums'
import type { AssetLocation } from '../common/base'

export interface CabinetDetail {
    cabinet: CabinetListItem
    geom_wkt: string | null
    created_at: string | null
}

export interface CabinetListItem {
    cabinet_id: string | null
    external_ref?: string | null
    cabinet_name: string | null
    commune_id: string | null
    commune_name: string | null
    data_source: DataSource
    location: AssetLocation
    feeder_ids: string[]
    iot_node_id?: string | null
    updated_at: string | null
    updated_by?: string | null
    updated_by_name?: string | null
}

export interface CabinetListItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: CabinetListItem[]
}

export interface CreateCabinetRequest {
    external_ref?: string | null
    cabinet_name: string | null
    commune_id: string | null
    geom_wkt: string | null
    data_source: DataSource
}

export interface UpdateCabinetRequest {
    external_ref?: string | null
    cabinet_name: string | null
    geom_wkt: string | null
    data_source: DataSource
}

