/**
 * Auto-generated Types for: iot/feeders
 * Sinh tự động từ endpoint Backend
 */
import type { IotArchivedReading, IotMeasurement } from './nodes'
import type { FeederPowerState } from '../common/enums'

export interface IotFeederArchivedSample {
    cursor?: number
    reading?: IotArchivedReading
    node_id?: string | null
    server_id?: string | null
}

export interface IotFeederArchivedSamplePagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: IotFeederArchivedSample[]
}

export interface IotFeederElectricalResult {
    feeder_id?: string | null
    node_id?: string | null
    server_id?: string | null
    status?: string | null
    measurement?: IotMeasurement
    power_state?: FeederPowerState
}

