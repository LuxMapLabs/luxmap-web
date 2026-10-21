/**
 * Auto-generated Types for: workorders/orders
 * Sinh tự động từ endpoint Backend
 */
import type { AgendaFlag, DataSource, EvidenceKind, FaultStatus, FaultType, FixtureStatus, FixtureType, InspectionOutcome, Severity, TaskKind, WorkOrderStatus } from '../common/enums'

export interface AgendaWorkOrder {
    work_order_id: string | null
    title: string | null
    commune_id: string | null
    task_kind?: TaskKind
    segment_id?: string | null
    cluster_id?: string | null
    parent_work_order_id?: string | null
    case_id: string | null
    fault_ids: string[]
    wo_status?: WorkOrderStatus
    assigned_to?: string | null
    priority_score?: number
    created_at?: string | null
    updated_at?: string | null
    due_date?: string | null
    scheduled_date?: string | null
    segment_ids?: string[]
    flags?: AgendaFlag[]
    location?: WorkOrderLocation
}

export interface AssignWorkOrderRequest {
    assigned_to: string | null
}

export interface CompleteWorkOrderRequest {
    report_note: string | null
    materials_used?: string | null
    fault_outcomes?: FaultOutcomeRequest[]
    performed_at?: string | null
}

export interface CreateWorkOrderRequest {
    task_kind: TaskKind
    title: string | null
    fault_ids?: string[]
    segment_id?: string | null
    segment_ids?: string[]
    assigned_to?: string | null
    due_date?: string | null
    scheduled_date?: string | null
    note?: string | null
    materials_note?: string | null
    commune_id?: string | null
}

export interface EvidenceItem {
    evidence_id: string | null
    work_order_id?: string | null
    fault_id?: string | null
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

export interface FaultOutcomeRequest {
    fault_id?: string | null
    outcome?: InspectionOutcome
}

export interface FollowUpWorkOrderRequest {
    task_kind: TaskKind
    title?: string | null
    fault_ids?: string[]
    assigned_to?: string | null
    due_date?: string | null
    scheduled_date?: string | null
    note?: string | null
    materials_note?: string | null
}

export interface PatchWorkOrderRequest {
    title?: string | null
    due_date?: string | null
    scheduled_date?: string | null
    materials_note?: any
}

export interface PolePhotoDecisionRequest {
    decision: 'confirm' | 'reject'
    note?: string | null
}

export interface PolePhotoItem {
    photo_id?: string | null
    work_order_id?: string | null
    pole_id?: string | null
    data_source?: DataSource
    captured_at?: string | null
    lat?: number
    lng?: number
    uploaded_by?: string | null
    uploaded_at?: string | null
    ai_status?: 'available' | 'unavailable'
    cv_state?: 'on' | 'off' | 'inconclusive'
    confidence?: number
    model_version?: string | null
    artifact_version?: string | null
    analyzed_at?: string | null
    final_cv_state?: 'on' | 'off'
    review_note?: string | null
    reviewed_by?: string | null
    reviewed_at?: string | null
    decision?: 'confirm' | 'reject'
    decided_by?: string | null
    decided_at?: string | null
    decision_note?: string | null
    status_applied?: boolean
    status_reason?: 'applied' | 'classification_preserved' | 'not_newer' | 'rejected'
    thumbnail_url?: string | null
    original_url?: string | null
}

export interface PolePhotoItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: PolePhotoItem[]
}

export interface PolePhotoReviewRequest {
    final_cv_state: 'on' | 'off'
    review_note?: string | null
}

export interface ReviewWorkOrderRequest {
    note?: string | null
}

export interface StartWorkOrderRequest {
    performed_at?: string | null
}

export interface WorkOrderAgenda {
    night_of?: string | null
    assigned_to: string | null
    upcoming_count?: number
    groups: WorkOrderAgendaGroup[]
}

export interface WorkOrderAgendaGroup {
    segment_id?: string | null
    segment_name?: string | null
    commune_id: string | null
    location?: WorkOrderLocation
    distance_m?: number
    work_orders: AgendaWorkOrder[]
}

export interface WorkOrderAssignee {
    user_id?: string | null
    full_name?: string | null
}

export interface WorkOrderAssigneePagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: WorkOrderAssignee[]
}

export interface WorkOrderDetail {
    work_order_id: string | null
    title: string | null
    commune_id: string | null
    task_kind?: TaskKind
    segment_id?: string | null
    cluster_id?: string | null
    parent_work_order_id?: string | null
    case_id: string | null
    fault_ids: string[]
    wo_status?: WorkOrderStatus
    assigned_to?: string | null
    priority_score?: number
    created_at?: string | null
    updated_at?: string | null
    due_date?: string | null
    scheduled_date?: string | null
    segment_ids?: string[]
    note?: string | null
    review_note?: string | null
    report_note?: string | null
    materials_note?: string | null
    materials_used?: string | null
    created_by: string | null
    assigned_at?: string | null
    started_at?: string | null
    completed_at?: string | null
    closed_at?: string | null
    assignee_eligible?: boolean
    allowed_actions: string[]
    faults: WorkOrderFaultDetail[]
}

export interface WorkOrderFaultDetail {
    fault_id?: string | null
    pole_id?: string | null
    segment_id?: string | null
    location?: WorkOrderLocation
    fault_type?: FaultType
    fault_status?: FaultStatus
    severity?: Severity
    inspection_outcome?: InspectionOutcome
}

export interface WorkOrderItem {
    work_order_id: string | null
    title: string | null
    commune_id: string | null
    task_kind?: TaskKind
    segment_id?: string | null
    cluster_id?: string | null
    parent_work_order_id?: string | null
    case_id: string | null
    fault_ids: string[]
    wo_status?: WorkOrderStatus
    assigned_to?: string | null
    priority_score?: number
    created_at?: string | null
    updated_at?: string | null
    due_date?: string | null
    scheduled_date?: string | null
}

export interface WorkOrderItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: WorkOrderItem[]
}

export interface WorkOrderLocation {
    lat?: number
    lng?: number
}

export interface WorkOrderPole {
    pole_id: string | null
    segment_id: string | null
    position?: number
    location: WorkOrderLocation
    fixture_status?: FixtureStatus
    status_confidence?: number
    last_seen_at?: string | null
    open_fault_count?: number
    near_sensitive_poi?: boolean
    fixture_type?: FixtureType
    lamp_watt?: number
    work_order_fault_ids: string[]
    note?: string | null
}

export interface WorkOrderPolePagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: WorkOrderPole[]
}

