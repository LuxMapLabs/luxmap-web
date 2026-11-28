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
    fault_id?: string | null
    fault_status?: 'detected' | 'confirmed' | 'rejected' | 'in_progress' | 'resolved' | 'verified' | null
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
    status?: 'normal' | 'anomaly' | 'stale' | 'no_data' | 'insufficient_samples' | 'repairing'
    measurement?: IotMeasurement
    anomalies?: IotAnomaly[]
    connection_status?: 'online' | 'offline' | 'no_data'
    electrical_status?: 'fresh' | 'stale' | 'no_data' | 'repairing'
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
    status?: 'online' | 'offline' | 'no_data' | 'unconfigured' | 'repairing'
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
    repair_periods?: IotFeederRepairPeriod[]
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

export interface IotFeederRepairPeriod {
    work_order_id?: string | null
    started_at?: string | null
    ended_at?: string | null
}

