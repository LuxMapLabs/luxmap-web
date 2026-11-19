/**
 * Auto-generated Types for: iot/servers
 * Sinh tự động từ endpoint Backend
 */
export interface GatewayMigrationRequest {
    legacy_gateway_id?: string | null
}

export interface IotGatewayCredential {
    client_id?: string | null
    username?: string | null
    password?: string | null
    node_ids?: string[]
    server_id?: string | null
}

export interface IotGatewayRoute {
    gateway_id?: string | null
    device_ids?: string[]
    credential_issued?: boolean
}

export interface IotGatewayRouteRequest {
    device_id?: string | null
}

export interface IotLocation {
    lat: number
    lng: number
}

export interface IotServerNode {
    node_id?: string | null
    server_id?: string | null
    device_id?: string | null
    feeder_id?: string | null
    status?: string | null
    last_seen_at?: string | null
    electrical_status?: string | null
}

export interface IotServerNodePagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: IotServerNode[]
}

export interface IotServerStatus {
    server_id?: string | null
    status?: string | null
    commune_id?: string | null
    location?: IotLocation
    credential_issued?: boolean
}

export interface RegisterServerRequest {
    server_id?: string | null
    commune_id?: string | null
    location?: IotLocation
}

export interface RegisteredServer {
    server_id?: string | null
}

export interface ServerLocationRequest {
    commune_id?: string | null
    location?: IotLocation
}

