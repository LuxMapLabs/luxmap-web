/**
 * Auto-generated Types for: assets/segments
 * Sinh tự động từ endpoint Backend
 */
import type { DataSource, RoadClass, TopologySource } from '../common/enums'

export interface CreateSegmentRequest {
    external_ref?: string | null
    segment_name: string | null
    road_class: RoadClass
    length_m: number
    geom_wkt: string | null
    commune_id: string | null
    data_source: DataSource
}

export interface SegmentDetail {
    segment: SegmentListItem
    geom_wkt: string | null
    created_at: string | null
}

export interface SegmentListItem {
    segment_id: string | null
    external_ref?: string | null
    segment_name: string | null
    road_class: RoadClass
    length_m: number
    commune_id: string | null
    commune_name?: string | null
    data_source: DataSource
    pole_count: number
    updated_at: string | null
    updated_by?: string | null
    updated_by_name?: string | null
}

export interface SegmentListItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: SegmentListItem[]
}

export interface TopologyPole {
    pole_id: string | null
    segment_id: string | null
    feeder_id?: string | null
    feeder_source?: TopologySource
    lat: number
    lng: number
}

export interface TopologyPolePagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: TopologyPole[]
}

export interface UpdateSegmentRequest {
    external_ref?: string | null
    segment_name: string | null
    road_class: RoadClass
    length_m: number
    geom_wkt: string | null
    data_source: DataSource
}

