/**
 * Auto-generated Types for: map/cabinets
 * Sinh tự động từ endpoint Backend
 */
import type { FeederControlMode, FeederPowerState, TopologySource } from '../common/enums'
import type { Geometry } from '../common/base'

export interface CabinetFeederState {
    feeder_id: string | null
    relay_no?: number
    control_mode?: FeederControlMode
    mode_reported_at?: string | null
    power_state?: FeederPowerState
}

export interface CabinetProperties {
    cabinet_id: string | null
    cabinet_name: string | null
    commune_id: string | null
    feeder_ids: string[]
    feeders: CabinetFeederState[]
    iot_node_id?: string | null
}

export interface CabinetPropertiesFeature {
    type?: string | null
    geometry: Geometry
    properties: CabinetProperties
}

export interface CabinetPropertiesFeatureCollection {
    type?: string | null
    crs_note?: string | null
    features: CabinetPropertiesFeature[]
}

export interface CabinetTopologyEdgeProperties {
    feeder_id: string | null
    segment_id: string | null
    branch: number
    order: number
    from_id: string | null
    to_pole_id: string | null
    feeder_source: TopologySource
}

export interface CabinetTopologyEdgePropertiesFeature {
    type?: string | null
    geometry: Geometry
    properties: CabinetTopologyEdgeProperties
}

export interface CabinetTopologyEdgePropertiesFeatureCollection {
    type?: string | null
    crs_note?: string | null
    features: CabinetTopologyEdgePropertiesFeature[]
}

