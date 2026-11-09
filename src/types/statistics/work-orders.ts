/**
 * Auto-generated Types for: statistics/work-orders
 * Sinh tự động từ endpoint Backend
 */
import type { TaskKind } from '../common/enums'

export interface WorkOrderStatusRow {
    commune_id: string | null
    task_kind: TaskKind
    open: number
    assigned: number
    in_progress: number
    done: number
    verified: number
    cancelled: number
    total: number
}

export interface WorkOrderStatusStatistics {
    as_of: string | null
    group_by: string[]
    rows: WorkOrderStatusRow[]
}

