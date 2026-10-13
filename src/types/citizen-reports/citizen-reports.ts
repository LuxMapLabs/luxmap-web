/**
 * Auto-generated Types for: citizen-reports/citizen-reports
 * Sinh tự động từ endpoint Backend
 */
import type { CitizenPhotoHint, CitizenReportKind, CitizenReportStatus, DataSource, FaultStatus, FaultType, FixtureStatus, PhotosDroppedReason, Severity, SourceChannel } from '../common/enums'

export interface AcceptCitizenReportRequest {
    submission_count?: number
    fault_type?: FaultType
    severity?: Severity
    note?: string | null
}

export interface CitizenPhotoAiHint {
    label: CitizenPhotoHint
    confidence: number
    artifact_version: string | null
    checked_at: string | null
}

export interface CitizenPhotoItem {
    photo_id: string | null
    position: number
    thumbnail_url: string | null
    original_url: string | null
    ai_hint: CitizenPhotoAiHint
}

export interface CitizenReportDetail {
    report_id: string | null
    pole_id: string | null
    commune_id: string | null
    data_source: DataSource
    night_of: string | null
    status: CitizenReportStatus
    created_at: string | null
    last_submitted_at: string | null
    submission_count: number
    photo_count: number
    kinds: CitizenReportKind[]
    far_from_pole: boolean
    fault_id: string | null
    decided_by: string | null
    decided_at: string | null
    decision_note: string | null
    pole: CitizenReportPole
    open_faults: CitizenReportOpenFault[]
    submissions: CitizenSubmissionItem[]
    allowed_actions: string[]
    acceptable_fault_types: FaultType[]
}

export interface CitizenReportItem {
    report_id: string | null
    pole_id: string | null
    commune_id: string | null
    data_source: DataSource
    night_of: string | null
    status: CitizenReportStatus
    created_at: string | null
    last_submitted_at: string | null
    submission_count: number
    photo_count: number
    kinds: CitizenReportKind[]
    far_from_pole: boolean
    fault_id: string | null
    decided_by: string | null
    decided_at: string | null
    decision_note: string | null
}

export interface CitizenReportItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: CitizenReportItem[]
}

export interface CitizenReportOpenFault {
    fault_id: string | null
    fault_type: FaultType
    fault_status: FaultStatus
    severity: Severity
    source_channel: SourceChannel
    detected_at: string | null
}

export interface CitizenReportPole {
    pole_id: string | null
    segment_id: string | null
    location: ReportPoint
    fixture_status: FixtureStatus
    last_seen_at: string | null
}

export interface CitizenSubmissionItem {
    submission_id: string | null
    kind: CitizenReportKind
    description: string | null
    far_from_pole: boolean
    photos_dropped: PhotosDroppedReason
    received_at: string | null
    photo_count: number
    photos: CitizenPhotoItem[]
}

export interface MergeCitizenReportRequest {
    submission_count?: number
    fault_id?: string | null
    note?: string | null
}

export interface RejectCitizenReportRequest {
    submission_count?: number
    reason?: string | null
}

export interface ReportPoint {
    lat?: number
    lng?: number
}

