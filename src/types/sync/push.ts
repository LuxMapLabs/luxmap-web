/**
 * Auto-generated Types for: sync/push
 * Sinh tự động từ endpoint Backend
 */
export interface SyncApplied {
    client_op_id?: string | null
    op_type?: string | null
    id?: string | null
    replayed?: boolean
}

export interface SyncConflict {
    client_op_id?: string | null
    op_type?: string | null
    reason?: string | null
    message?: string | null
    server_state?: any
}

export interface SyncError {
    code?: string | null
    message?: string | null
    details?: Record<string, any>
}

export interface SyncOperationRequest {
    client_op_id?: string | null
    op_type?: string | null
    payload?: any
}

export interface SyncPushRequest {
    operations?: SyncOperationRequest[]
}

export interface SyncPushResult {
    applied: SyncApplied[]
    conflicts: SyncConflict[]
    rejected: SyncRejected[]
}

export interface SyncRejected {
    client_op_id?: string | null
    op_type?: string | null
    error?: SyncError
}

