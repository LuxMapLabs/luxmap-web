/**
 * Auto-generated Types for: iot/nodes
 * Sinh tự động từ endpoint Backend
 */
import type { DataSource, FeederPowerState, IotCommandHistoryStatus } from '../common/enums'
import type { IotLocation } from './servers'

export interface IotAnomaly {
    code?: string | null
    observed?: number
    reference?: number
    deviation_percent?: number
    limit?: number
}

export interface IotArchivedData {
    timestamp?: string | null
    session_id?: string | null
    sequence_number?: number
    mode?: string | null
    lamp_command?: string | null
    lux?: number
    voltage?: number
    current?: number
    power?: number
}

export interface IotArchivedReading {
    data?: IotArchivedData
    received_at?: string | null
    gateway_id?: string | null
}

export interface IotArchivedSample {
    cursor?: number
    reading?: IotArchivedReading
}

export interface IotArchivedSamplePagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: IotArchivedSample[]
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
    lamp_count?: LampCountEstimate
    sensor_health?: IotSensorHealth
}

export interface IotElectricalResult {
    node_id?: string | null
    server_id?: string | null
    status?: string | null
    measurement?: IotMeasurement
    power_state?: FeederPowerState
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
    status?: string | null
    last_received_at?: string | null
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

export interface IotTelemetryPage {
    items?: IotArchivedSample[]
    next_cursor?: number
    has_more?: boolean
}

export interface LampCountEstimate {
    status?: string | null
    samples?: number
    required_samples?: number
    required_votes?: number
    estimated_lit?: number
    estimated_missing?: number
    votes?: Record<string, number>
    ambiguous_samples?: number
    outside_range_samples?: number
    median_current_ma?: number
    threshold_counts?: LampCountThresholdCounts
}

export interface LampCountThresholdCounts {
    above_65_ma?: number
    at_or_below_52_5_ma?: number
    at_or_above_50_ma?: number
    at_or_above_45_ma?: number
}

export interface NodeProfile {
    server_id?: string | null
    device_id?: string | null
    feeder_id?: string | null
    nominal_voltage?: number
    nominal_current_ma?: number
    nominal_power_mw?: number
    voltage_tolerance_percent?: number
    current_tolerance_percent?: number
    power_tolerance_percent?: number
    off_current_limit_ma?: number
    max_silence_seconds?: number
    use_ten_lamp_calibration?: boolean
    lamp_count_calibration?: string | null
}

export interface RegisterNodeRequest {
    server_id: string | null
    cabinet_id: string | null
    feeder_id: string | null
    device_id: string | null
    data_source: DataSource
    supports_remote_control?: boolean
    nominal_voltage: number
    nominal_current_ma: number
    nominal_power_mw: number
    gateway_id?: string | null
    lamp_count_calibration?: string | null
}

export interface RegisteredNode {
    node_id?: string | null
    server_id?: string | null
    device_id?: string | null
    feeder_id?: string | null
    gateway_id?: string | null
}

