/**
 * Auto-generated Types for: statistics/citizen-screening
 * Sinh tự động từ endpoint Backend
 */
import type { CitizenClaim, DataSource } from '../common/enums'

export interface CitizenScreeningAgreement {
    decided: number
    cv_off_upheld: number
    cv_off_rejected: number
    cv_on_upheld: number
    cv_on_rejected: number
    agreement_rate: number
    cv_off_upheld_rate: number
    cv_on_rejected_rate: number
}

export interface CitizenScreeningClaim {
    claim: CitizenClaim
    reports: number
    by_verdict: CitizenScreeningVerdictCounts
}

export interface CitizenScreeningNight {
    night_of: string | null
    reports: number
    cv_off: number
    cv_on: number
    inconclusive: number
    not_analyzed: number
    no_photo: number
    contradicted: number
}

export interface CitizenScreeningPole {
    pole_id: string | null
    segment_id: string | null
    reports: number
    submissions: number
    contradicted: number
    last_night_of: string | null
}

export interface CitizenScreeningSource {
    data_source: DataSource
    reports: number
    submissions: number
    far_from_pole: number
    by_status: CitizenScreeningStatusCounts
    by_verdict: CitizenScreeningVerdictCounts
    by_claim: CitizenScreeningClaim[]
    contradicted: number
    agreement: CitizenScreeningAgreement
    by_night: CitizenScreeningNight[]
    top_poles: CitizenScreeningPole[]
    artifact_versions: CitizenScreeningVersion[]
}

export interface CitizenScreeningStatistics {
    as_of: string | null
    from: string | null
    to: string | null
    sources: CitizenScreeningSource[]
}

export interface CitizenScreeningStatusCounts {
    pending: number
    accepted: number
    merged: number
    rejected: number
}

export interface CitizenScreeningVerdictCounts {
    cv_off: number
    cv_on: number
    inconclusive: number
    not_analyzed: number
    no_photo: number
}

export interface CitizenScreeningVersion {
    artifact_version: string | null
    photos: number
}

