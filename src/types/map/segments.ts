/**
 * Auto-generated Types for: map/segments
 * Sinh tự động từ endpoint Backend
 */
import type { RoadClass } from '../common/enums'
import type { SegmentId } from './poles'
import type { Geometry } from '../common/base'

export type NodeId = string

export interface SegmentProperties {
    segment_id: SegmentId
    segment_name: string | null
    road_class: RoadClass
    length_m: number
    pole_count: number
    controller_node_ids: NodeId[]
    has_active_segment_fault: boolean
}

export interface SegmentPropertiesFeature {
    type?: string | null
    geometry: Geometry
    properties: SegmentProperties
}

export interface SegmentPropertiesFeatureCollection {
    type?: string | null
    crs_note?: string | null
    features: SegmentPropertiesFeature[]
}

