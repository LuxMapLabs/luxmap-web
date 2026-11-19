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
    code?: string | null
    status?: string | null
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
    status?: string | null
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

export interface IotFeederAverage {
    period_start?: string | null
    period_end?: string | null
    sample_count?: number
    voltage_avg?: number
    current_ma_avg?: number
    power_mw_avg?: number
    is_complete?: boolean
}

export interface IotFeederElectricalResult {
    feeder_id?: string | null
    node_id?: string | null
    server_id?: string | null
    status?: string | null
    measurement?: IotMeasurement
    power_state?: FeederPowerState
}

export interface IotFeederHistoryResult {
    feeder_id?: string | null
    time_basis?: 'measured_at' | 'received_at'
    interval_seconds?: number
    page?: number
    page_size?: number
    total?: number
    items?: IotFeederAverage[]
}

