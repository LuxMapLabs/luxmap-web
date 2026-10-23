/**
 * Auto-generated Types for: admin/system
 * Sinh tự động từ endpoint Backend
 */
import type { JobState, StorageBucket } from '../common/enums'

export interface BucketReconciliation {
    checked_at?: string | null
    store_object_count?: number
    store_bytes?: number
    orphan_count?: number
    orphan_bytes?: number
    missing_count?: number
    orphan_sample?: string[]
    missing_sample?: string[]
}

export interface BucketUsage {
    bucket?: StorageBucket
    object_count?: number
    bytes?: number
    reconciliation?: BucketReconciliation
}

export interface DiskUsage {
    total_bytes?: number
    free_bytes?: number
    free_ratio?: number
    low?: boolean
}

export interface JobStatusItem {
    name?: string | null
    state?: JobState
    next_run_at?: string | null
    last_started_at?: string | null
    last_finished_at?: string | null
    last_error?: string | null
    last_failed_at?: string | null
    consecutive_failures?: number
    run_count?: number
}

export interface StorageSummary {
    disk?: DiskUsage
    database_bytes?: number
    buckets?: BucketUsage[]
}

export interface SurveyProcessingSummary {
    by_status?: SweepProcessingCounts
    stuck?: number
    recent_failures?: SurveyRunFailure[]
}

export interface SurveyRunFailure {
    sweep_id?: string | null
    attempt?: number
    error_code?: string | null
    stage?: string | null
    finished_at?: string | null
}

export interface SweepProcessingCounts {
    not_started?: number
    queued?: number
    processing?: number
    succeeded?: number
    failed?: number
}

export interface SystemStatusResponse {
    generated_at?: string | null
    jobs?: JobStatusItem[]
    survey_processing?: SurveyProcessingSummary
    storage?: StorageSummary
}

