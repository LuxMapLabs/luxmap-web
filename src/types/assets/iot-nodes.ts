/**
 * Auto-generated Types for: assets/iot-nodes
 * Sinh tự động từ endpoint Backend
 */
import type { DataSource, FeederControlMode, NodeRole } from '../common/enums'

export interface CreateIotNodeRequest {
    cabinet_id: string | null
    data_source: DataSource
    supports_remote_control?: boolean
}

export interface IotNodeCredential {
    node_id?: string | null
    secret?: string | null
    credential_set_at?: string | null
}

export interface IotNodeItem {
    node_id: string | null
    cabinet_id: string | null
    commune_id: string | null
    node_role: NodeRole
    data_source: DataSource
    supports_remote_control: boolean
    has_credential: boolean
    credential_set_at?: string | null
    last_report_at?: string | null
    relays: IotNodeRelay[]
    updated_at: string | null
}

export interface IotNodeItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: IotNodeItem[]
}

export interface IotNodeRelay {
    relay_no: number
    feeder_id: string | null
    control_mode?: FeederControlMode
    mode_reported_at?: string | null
}

export interface SetRelayRequest {
    feeder_id?: string | null
}

export interface UpdateIotNodeRequest {
    data_source: DataSource
    supports_remote_control?: boolean
}

