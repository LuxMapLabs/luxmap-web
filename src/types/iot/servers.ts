/**
 * Auto-generated Types for: iot/servers
 * Sinh tự động từ endpoint Backend
 */
export interface IotGatewayCredential {
    client_id?: string | null
    username?: string | null
    password?: string | null
    node_ids?: string[]
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

export interface IotServerStatus {
    server_id?: string | null
    status?: string | null
    commune_id?: string | null
    location?: IotLocation
}

export interface RegisterServerRequest {
    server_id?: string | null
    base_url?: string | null
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

