/**
 * Auto-generated Types for: statistics/fixture-status
 * Sinh tự động từ endpoint Backend
 */
import type { DataSource } from '../common/enums'

export interface FixtureStatusRow {
    data_source: DataSource
    commune_id: string | null
    segment_id: string | null
    pole_count: number
    normal: number
    dim: number
    out: number
    unknown: number
    never_surveyed: number
    unassigned_segment_pole_count: number
}

export interface FixtureStatusStatistics {
    as_of: string | null
    group_by: string[]
    rows: FixtureStatusRow[]
}

