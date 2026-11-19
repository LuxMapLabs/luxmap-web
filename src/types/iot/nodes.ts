/**
 * Auto-generated Types for: iot/nodes
 * Sinh tự động từ endpoint Backend
 */
import type { FeederPowerState, IotCommandHistoryStatus } from '../common/enums'
import type { IotLocation } from './servers'

export interface ElectricalWindowAssessment {
    status?: string | null
    samples?: number
    required_samples?: number
    voltage_avg?: number
    current_ma_avg?: number
    power_mw_avg?: number
    current_evaluation_available?: boolean
}

export interface IotAnomaly {
    code?: string | null
    observed?: number
    reference?: number
    deviation_percent?: number
    limit?: number
}

export interface IotAutoSchedule {
    day_start?: string | null
    night_start?: string | null
}

export interface IotCommandHistoryItem {
    command_id?: string | null
    node_id?: string | null
    feeder_id?: string | null
    server_id?: string | null
    device_id?: string | null
    mode?: string | null
    command?: string | null
    auto_schedule?: IotAutoSchedule
    requested_by?: string | null
    requested_at?: string | null
    bridge_accepted_at?: string | null
    status?: IotCommandHistoryStatus
}

export interface IotCommandHistoryItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: IotCommandHistoryItem[]
}

export interface IotCommandRequest {
    mode?: string | null
    command?: string | null
    auto_schedule?: IotAutoSchedule
}

export interface IotCommandStatus {
    node_id?: string | null
    command_id?: string | null
    mode?: string | null
    command?: string | null
    command_acknowledged?: boolean
    auto_schedule?: IotAutoSchedule
    expires_at?: string | null
    power_state?: FeederPowerState
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

export interface IotElectricalResult {
    node_id?: string | null
    server_id?: string | null
    status?: 'online' | 'offline' | 'no_data'
    measurement?: IotMeasurement
    power_state?: FeederPowerState
    electrical_status?: 'fresh' | 'stale' | 'no_data'
    last_seen_at?: string | null
    last_command_ack_at?: string | null
}

export interface IotMeasurement {
    received_at?: string | null
    lamp_command?: string | null
    voltage?: number
    current_ma?: number
    power_mw?: number
}

export interface IotNodeStatus {
    node_id?: string | null
    server_id?: string | null
    status?: 'online' | 'offline' | 'no_data' | 'unconfigured' | 'source_unavailable'
    last_received_at?: string | null
    electrical_status?: 'fresh' | 'stale' | 'no_data' | 'unconfigured' | 'source_unavailable'
    last_seen_at?: string | null
    last_command_ack_at?: string | null
    cabinet_id?: string | null
    commune_id?: string | null
    location?: IotLocation
}

export interface IotNodeStatusPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: IotNodeStatus[]
}

export interface IotSensorHealth {
    status?: string | null
    received_at?: string | null
}

export interface RegisterNodeRequest {
    server_id: string | null
    cabinet_id: string | null
    feeder_id: string | null
    device_id: string | null
    nominal_voltage: number
    nominal_current_ma: number
    nominal_power_mw: number
}

export interface RegisteredNode {
    node_id?: string | null
    server_id?: string | null
    device_id?: string | null
    feeder_id?: string | null
}

export interface UpdateNodeRequest {
    server_id: string | null
    device_id: string | null
    feeder_id: string | null
    nominal_voltage: number
    nominal_current_ma: number
    nominal_power_mw: number
}

