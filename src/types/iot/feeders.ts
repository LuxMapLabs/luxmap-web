/**
 * Auto-generated Types for: iot/feeders
 * Sinh tự động từ endpoint Backend
 */
import type { FeederPowerState } from '../common/enums'
import type { IotMeasurement } from './nodes'

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
    status?: 'online' | 'offline' | 'no_data' | 'unconfigured'
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

