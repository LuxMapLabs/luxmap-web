/**
 * Auto-generated Types for: iot/diagnostics
 * Sinh tự động từ endpoint Backend
 */
export interface IotDiagnosticSummaryItem {
    node_id?: string | null
    feeder_id?: string | null
    diagnostic_status?: 'normal' | 'anomaly' | 'stale' | 'no_data' | 'unconfigured' | 'source_unavailable'
    anomaly_codes?: ('telemetry_stale' | 'voltage_loss' | 'voltage_deviation' | 'lamp_count_shortfall' | 'ds3231_unavailable' | 'ds3231_read_failed' | 'ds3231_time_invalid' | 'ina226_unavailable' | 'ina226_read_failed' | 'ina226_shunt_out_of_range' | 'bh1750_unavailable' | 'bh1750_read_failed' | 'microsd_unavailable' | 'microsd_read_failed' | 'microsd_write_failed' | 'lora_tx_blocked' | 'lora_rx_frame_error')[]
    estimated_lit?: number
    estimated_missing?: number
    fault_ids?: string[]
    evaluated_at?: string | null
}

export interface IotDiagnosticSummaryItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: IotDiagnosticSummaryItem[]
}

