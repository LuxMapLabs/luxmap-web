/**
 * Auto-generated Types for: sync/bundle
 * Sinh tự động từ endpoint Backend
 */
import type { FaultItem } from '../faults/faults'
import type { SegmentPropertiesFeatureCollection } from '../map/segments'
import type { WorkOrderDetail } from '../workorders/orders'
import type { FixtureStatus, FixtureType, PowerSource, WarrantyStatus } from '../common/enums'
import type { Geometry } from '../common/base'

export interface SyncBundle {
    generated_at: string | null
    segment_ids: string[]
    segments: SegmentPropertiesFeatureCollection
    poles: SyncPolePropertiesFeatureCollection
    open_faults: FaultItem[]
    work_orders: WorkOrderDetail[]
}

export interface SyncPoleProperties {
    pole_id: string | null
    segment_id: string | null
    fixture_status: FixtureStatus
    status_confidence?: number
    power_source?: PowerSource
    fixture_type?: FixtureType
    lamp_watt?: number
    install_date?: string | null
    warranty_expiry?: string | null
    warranty_status: WarrantyStatus
    commune_id: string | null
    last_seen_at?: string | null
    last_sweep_id?: string | null
    open_fault_count: number
    has_iot_node: boolean
    near_sensitive_poi: boolean
    note?: string | null
}

export interface SyncPolePropertiesFeature {
    type?: string | null
    geometry: Geometry
    properties: SyncPoleProperties
}

export interface SyncPolePropertiesFeatureCollection {
    type?: string | null
    crs_note?: string | null
    features: SyncPolePropertiesFeature[]
}

