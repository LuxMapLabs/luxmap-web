/**
 * Auto-generated Types for: lighting/preview
 * Sinh tự động từ endpoint Backend
 */
import type { LightingExclusionReason, LightingTargetKind } from '../common/enums'

export interface LightingExclusion {
    feeder_id: string | null
    node_id?: string | null
    relay_no?: number
    reason: LightingExclusionReason
}

export interface LightingPreview {
    target_kind: LightingTargetKind
    target_id: string | null
    targets: LightingTarget[]
    excluded: LightingExclusion[]
    affected_segment_ids: string[]
    uncontrollable_pole_count: number
    unassigned_segment_pole_count: number
}

export interface LightingTarget {
    node_id: string | null
    relay_no: number
    feeder_id: string | null
    cabinet_id: string | null
}

