/**
 * Auto-generated Types for: lighting/commands
 * Sinh tự động từ endpoint Backend
 */
import type { DataSource, FeederControlMode, LightingCommandStatus, LightingTargetKind } from '../common/enums'
import type { LightingExclusion } from './preview'

export interface CreateLightingRequest {
    feeder_id?: string | null
    segment_id?: string | null
    mode: FeederControlMode
    client_op_id: string | null
}

export interface LightingCommandItem {
    command_id: string | null
    request_id: string | null
    seq: number
    node_id: string | null
    relay_no: number
    feeder_id: string | null
    cabinet_id: string | null
    data_source: DataSource
    requested_mode: FeederControlMode
    status: LightingCommandStatus
    created_at: string | null
    expires_at: string | null
    delivered_at?: string | null
    completed_at?: string | null
    reported_mode?: FeederControlMode
    error?: string | null
}

export interface LightingCommandItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: LightingCommandItem[]
}

export interface LightingRequestResult {
    request_id: string | null
    client_op_id: string | null
    target_kind: LightingTargetKind
    target_id: string | null
    mode: FeederControlMode
    requested_by: string | null
    requested_at: string | null
    commands: LightingCommandItem[]
    excluded: LightingExclusion[]
    affected_segment_ids: string[]
    uncontrollable_pole_count: number
    unassigned_segment_pole_count: number
}

