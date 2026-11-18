/**
 * Auto-generated Types for: faults/faults
 * Sinh tự động từ endpoint Backend
 */
import type { DataSource, EvidenceKind, FaultStatus, FaultType, Severity, SourceChannel } from '../common/enums'

export interface EvidenceItem {
    evidence_id: string | null
    work_order_id?: string | null
    fault_id?: string | null
    pole_id?: string | null
    kind?: EvidenceKind
    captured_at?: string | null
    lat?: number
    lng?: number
    uploaded_by: string | null
    uploaded_at?: string | null
    thumbnail_url: string | null
    original_url: string | null
}

export interface EvidenceItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: EvidenceItem[]
}

export interface FaultItem {
    fault_id: string | null
    pole_id?: string | null
    fixture_id?: string | null
    segment_id?: string | null
    location: FaultLocation
    fault_type?: FaultType
    fault_status?: FaultStatus
    severity?: Severity
    source_channel?: SourceChannel
    data_source?: DataSource
    priority_score?: number
    status_confidence?: number
    cluster_id?: string | null
    detected_at?: string | null
    updated_at?: string | null
    work_order_id?: string | null
    note?: string | null
    reported_by?: string | null
    review_note?: string | null
    allowed_actions: string[]
    origin_node_id?: string | null
    feeder_id?: string | null
    cabinet_id?: string | null
    iot_anomaly_code?: string | null
    recovered_at?: string | null
}

export interface FaultItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: FaultItem[]
}

export interface FaultLocation {
    lat?: number
    lng?: number
}

export interface PatchFaultRequest {
    fault_status?: any
    override_fault_type?: any
    severity?: any
    note?: any
}

export interface ReportFaultRequest {
    client_op_id?: string | null
    pole_id?: string | null
    fixture_id?: string | null
    location?: ReportLocation
    commune_id?: string | null
    fault_type?: FaultType
    severity?: Severity
    note?: string | null
    detected_at?: string | null
    photo_frame_id?: string | null
}

export interface ReportLocation {
    lat?: number
    lng?: number
}

export interface ReportedFault {
    fault_id: string | null
    pole_id?: string | null
    fixture_id?: string | null
    segment_id?: string | null
    location: FaultLocation
    fault_type?: FaultType
    fault_status?: FaultStatus
    severity?: Severity
    source_channel?: SourceChannel
    data_source?: DataSource
    priority_score?: number
    status_confidence?: number
    cluster_id?: string | null
    detected_at?: string | null
    updated_at?: string | null
    work_order_id?: string | null
    note?: string | null
    reported_by?: string | null
    review_note?: string | null
    allowed_actions: string[]
    origin_node_id?: string | null
    feeder_id?: string | null
    cabinet_id?: string | null
    iot_anomaly_code?: string | null
    recovered_at?: string | null
    client_op_id: string | null
}

