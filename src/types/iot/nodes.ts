/**
 * Auto-generated Types for: iot/nodes
 * Sinh tự động từ endpoint Backend
 */
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

export interface IotAutoSchedule {
    day_start?: string | null
    night_start?: string | null
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
    expires_at?: string | null
    command_acknowledged?: boolean
    auto_schedule?: IotAutoSchedule
}

export interface IotDiagnosticResult {
    node_id?: string | null
    feeder_id?: string | null
    pole_id?: string | null
    relay_no?: number
    status?: string | null
    measurement?: IotMeasurement
    anomalies?: IotAnomaly[]
    lamp_count?: LampCountEstimate
}

export interface IotElectricalResult {
    node_id?: string | null
    server_id?: string | null
    status?: string | null
    measurement?: IotMeasurement
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
}

export interface NodeProfile {
    server_id?: string | null
    relay_no?: number
    device_id?: string | null
    feeder_id?: string | null
    pole_id?: string | null
    nominal_voltage?: number
    nominal_current_ma?: number
    nominal_power_mw?: number
    voltage_tolerance_percent?: number
    current_tolerance_percent?: number
    power_tolerance_percent?: number
    off_current_limit_ma?: number
    max_silence_seconds?: number
    use_ten_lamp_calibration?: boolean
}

export interface RegisteredSource {
    node_id?: string | null
    server_id?: string | null
    device_id?: string | null
}

