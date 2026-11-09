/**
 * Auto-generated Types for: statistics/citizen-feedback
 * Sinh tự động từ endpoint Backend
 */
import type { DataSource } from '../common/enums'

export interface CitizenFeedbackRow {
    data_source: DataSource
    commune_id: string | null
    segment_id: string | null
    pending: number
    accepted: number
    merged: number
    rejected: number
    total: number
    resolution_rate: number
}

export interface CitizenFeedbackStatistics {
    as_of: string | null
    group_by: string[]
    rows: CitizenFeedbackRow[]
}

