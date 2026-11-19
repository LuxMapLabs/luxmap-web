/**
 * Auto-generated Types for: iot/diagnostics
 * Sinh tự động từ endpoint Backend
 */
export interface IotDiagnosticSummaryItem {
    node_id?: string | null
    feeder_id?: string | null
    diagnostic_status?: string | null
    anomaly_codes?: string[]
    estimated_lit?: number
    estimated_missing?: number
    fault_ids?: string[]
    evaluated_at?: string | null
    connection_status?: 'online' | 'offline' | 'no_data' | 'unconfigured' | 'source_unavailable'
    electrical_status?: 'fresh' | 'stale' | 'no_data' | 'unconfigured' | 'source_unavailable'
    last_seen_at?: string | null
    last_command_ack_at?: string | null
}

export interface IotDiagnosticSummaryItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: IotDiagnosticSummaryItem[]
}

