/**
 * Auto-generated Types for: map/poles
 * Sinh tự động từ endpoint Backend
 */
import type { FaultStatus, FaultType, FixtureStatus, FixtureType, NodeStatus, PowerSource, Severity, SourceChannel, WarrantyStatus } from '../common/enums'
import type { Geometry } from '../common/base'

export interface PoleMapBaseline {
    baseline_value?: number
    baseline_window_nights?: number
    dim_threshold_ratio?: number
    out_threshold_ratio?: number
    computed_at?: string | null
    direction: string | null
}

export interface PoleMapDetail {
    pole_id: string | null
    segment_id: string | null
    segment_name: string | null
    commune_id: string | null
    location: PoleMapLocation
    fixture?: PoleMapFixture
    current_status: PoleMapStatus
    iot_node?: PoleMapIotNode
    luminance_baseline?: PoleMapBaseline
    luminance_baselines: PoleMapBaseline[]
    luminance_history: PoleMapHistoryPoint[]
    runtime_history: PoleMapRuntimePoint[]
    open_faults: PoleMapOpenFault[]
    recent_frames: PoleMapFrame[]
    note?: string | null
}

export interface PoleMapFixture {
    fixture_type?: FixtureType
    power_source?: PowerSource
    lamp_watt?: number
    lamp_count?: number
    install_date?: string | null
    warranty_expiry?: string | null
    warranty_status?: WarrantyStatus
}

export interface PoleMapFrame {
    frame_id: string | null
    sweep_id: string | null
    captured_at?: string | null
    thumbnail_url: string | null
    distance_m?: number
    heading_deg?: number
}

export interface PoleMapHistoryPoint {
    observed_at?: string | null
    sweep_id: string | null
    normalized_luminance?: number
    baseline_ratio?: number
    classified_as?: FixtureStatus
    peak_lux?: number
    reason_codes: string[]
}

export interface PoleMapIotNode {
    node_id: string | null
    node_status?: NodeStatus
    last_report_at?: string | null
}

export interface PoleMapLocation {
    lat?: number
    lng?: number
}

export interface PoleMapOpenFault {
    fault_id: string | null
    fault_type?: FaultType
    severity?: Severity
    fault_status?: FaultStatus
    priority_score?: number
}

export interface PoleMapRuntimePoint {
    night_of?: string | null
    runtime_hours?: number
    on_at?: string | null
    off_at?: string | null
    source: string | null
}

export interface PoleMapStatus {
    fixture_status?: FixtureStatus
    status_confidence?: number
    determined_at?: string | null
    source_channel?: SourceChannel
}

export interface PoleProperties {
    pole_id: string | null
    segment_id: string | null
    fixture_status: FixtureStatus
    status_confidence?: number
    power_source?: PowerSource
    fixture_type?: FixtureType
    lamp_watt?: number
    lamp_count?: number
    install_date?: string | null
    warranty_expiry?: string | null
    warranty_status: WarrantyStatus
    commune_id: string | null
    last_seen_at?: string | null
    last_sweep_id?: string | null
    open_fault_count: number
    has_iot_node: boolean
    near_sensitive_poi: boolean
}

export interface PolePropertiesFeature {
    type?: string | null
    geometry: Geometry
    properties: PoleProperties
}

export interface PolePropertiesFeatureCollection {
    type?: string | null
    crs_note?: string | null
    features: PolePropertiesFeature[]
}

