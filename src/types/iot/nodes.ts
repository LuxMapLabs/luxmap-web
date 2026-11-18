/**
 * Auto-generated Types for: iot/nodes
 * Sinh tự động từ endpoint Backend
 */
import type { DataSource, FeederPowerState, IotCommandHistoryStatus } from '../common/enums'
import type { IotLocation } from './servers'

export interface IotAnomaly {
    code: 'telemetry_stale' | 'voltage_loss' | 'voltage_deviation' | 'lamp_count_shortfall' | 'ds3231_unavailable' | 'ds3231_read_failed' | 'ds3231_time_invalid' | 'ina226_unavailable' | 'ina226_read_failed' | 'ina226_shunt_out_of_range' | 'bh1750_unavailable' | 'bh1750_read_failed' | 'microsd_unavailable' | 'microsd_read_failed' | 'microsd_write_failed' | 'lora_tx_blocked' | 'lora_rx_frame_error'
    observed: number
    reference: number
    deviation_percent: number
    limit: number
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
    mode?: 'AUTO' | 'MANUAL'
    command?: 'ON' | 'OFF' | null
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
    mode?: 'AUTO' | 'MANUAL'
    command?: 'ON' | 'OFF' | null
    auto_schedule?: IotAutoSchedule
}

export interface IotCommandStatus {
    node_id?: string | null
    command_id?: string | null
    mode?: 'AUTO' | 'MANUAL'
    command?: 'ON' | 'OFF' | null
    command_acknowledged?: boolean
    auto_schedule?: IotAutoSchedule
    expires_at?: string | null
    power_state?: FeederPowerState
}

export interface IotDiagnosticResult {
    node_id?: string | null
    feeder_id?: string | null
    status?: 'normal' | 'anomaly' | 'stale' | 'no_data'
    measurement?: IotMeasurement
    anomalies?: IotAnomaly[]
    lamp_count?: LampCountEstimate
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
    status?: 'fresh' | 'stale' | 'unknown'
    received_at?: string | null
}

export interface LampCountEstimate {
    status?: 'insufficient_samples' | 'undetermined' | 'estimated'
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
    installed_lamp_count?: number
    lamp_count_calibration?: '4v' | '5v' | '5v-quiet-v1' | null
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
    lamp_count_calibration?: '4v' | '5v' | '5v-quiet-v1' | null
    installed_lamp_count?: number
}

export interface RegisteredNode {
    node_id?: string | null
    server_id?: string | null
    device_id?: string | null
    feeder_id?: string | null
    gateway_id?: string | null
}

