/**
 * Auto-generated Types for: iot/feeders
 * Sinh tự động từ endpoint Backend
 */
import type { ElectricalWindowAssessment, IotAnomaly, IotMeasurement, IotSensorHealth } from './nodes'
import type { FeederPowerState } from '../common/enums'

export interface IotDiagnosticHistoryItem {
    history_id?: number
    feeder_id?: string | null
    node_id?: string | null
    code?: 'telemetry_stale' | 'voltage_loss' | 'voltage_deviation' | 'current_drop' | 'ds3231_unavailable' | 'ds3231_read_failed' | 'ds3231_time_invalid' | 'ina226_unavailable' | 'ina226_read_failed' | 'ina226_shunt_out_of_range' | 'bh1750_unavailable' | 'bh1750_read_failed' | 'microsd_unavailable' | 'microsd_read_failed' | 'microsd_write_failed' | 'lora_tx_blocked' | 'lora_rx_frame_error'
    status?: 'active' | 'resolved' | 'interrupted'
    started_at?: string | null
    ended_at?: string | null
    closed_at?: string | null
    anomaly?: IotAnomaly
}

export interface IotDiagnosticHistoryItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: IotDiagnosticHistoryItem[]
}

export interface IotDiagnosticResult {
    node_id?: string | null
    feeder_id?: string | null
    status?: 'normal' | 'anomaly' | 'stale' | 'no_data'
    measurement?: IotMeasurement
    anomalies?: IotAnomaly[]
    connection_status?: 'online' | 'offline' | 'no_data'
    electrical_status?: 'fresh' | 'stale' | 'no_data'
    last_seen_at?: string | null
    last_command_ack_at?: string | null
    electrical_window?: ElectricalWindowAssessment
    measured_at?: string | null
    measurement_key?: string | null
    sensor_health_key?: string | null
    firmware_version?: string | null
    calibration_version?: string | null
    measurement_sequence?: number
    sensor_health?: IotSensorHealth
}

export interface IotFeederElectricalResult {
    feeder_id?: string | null
    node_id?: string | null
    server_id?: string | null
    status?: 'online' | 'offline' | 'no_data' | 'unconfigured'
    measurement?: IotMeasurement
    power_state?: FeederPowerState
}

export interface IotFeederHistoryResult {
    feeder_id?: string | null
    sort_by?: 'measured_at' | 'received_at'
    page?: number
    page_size?: number
    total?: number
    items?: IotFeederHistorySample[]
}

export interface IotFeederHistorySample {
    node_id?: string | null
    measured_at?: string | null
    received_at?: string | null
    reception_type?: 'live' | 'backfill' | null
    voltage?: number
    current_ma?: number
    power_mw?: number
    lamp_command?: string | null
}

