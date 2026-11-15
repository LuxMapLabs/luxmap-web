import apiClient from '../../config/apiClient'
import type {
  IotGatewayCredential,
  IotGatewayRoute,
  IotGatewayRouteRequest,
  IotServerStatus,
  RegisterServerRequest,
  RegisteredServer,
  ServerLocationRequest,
} from '../../types/iot/servers'
import type {
  IotCommandRequest,
  IotCommandStatus,
  IotNodeStatusPagedResult,
  NodeProfile,
  RegisteredSource,
} from '../../types/iot/nodes'
import type { IotPoleControl } from '../../types/iot/poles'

/**
 * IoT bridge (docs/LUXMAP-IOT-FE.md của backend): gateway ESP32 + node LoRa, điều khiển qua `/iot/...`.
 * Khác kênh `/lighting/...` (MQTT EMQX): trụ nào dùng kênh nào do `GET /iot/poles/{id}/control` quyết.
 */
export const iotAPI = {
  /** GET /api/v1/iot/servers — gateway trong phạm vi xã, kèm `status` và `location` (có thể null). */
  getServers: async (): Promise<IotServerStatus[]> => {
    const response = await apiClient.get<IotServerStatus[]>('/iot/servers')
    return response.data
  },

  /** GET /api/v1/iot/nodes — node theo xã, phân trang (tối đa 200 mỗi trang). */
  getNodes: async (params?: { page?: number; page_size?: number }): Promise<IotNodeStatusPagedResult> => {
    const response = await apiClient.get<IotNodeStatusPagedResult>('/iot/nodes', { params })
    return response.data
  },

  /** GET /api/v1/iot/poles/{poleId}/control — mạch, node, rơ-le của trụ và có điều khiển qua bridge được không. */
  getPoleControl: async (poleId: string): Promise<IotPoleControl> => {
    const response = await apiClient.get<IotPoleControl>(`/iot/poles/${encodeURIComponent(poleId)}/control`)
    return response.data
  },

  /** POST /api/v1/iot/nodes/{nodeId}/command — 202: bridge đã nhận lệnh, node CHƯA xác nhận. */
  sendCommand: async (nodeId: string, body: IotCommandRequest): Promise<IotCommandStatus> => {
    const response = await apiClient.post<IotCommandStatus>(`/iot/nodes/${encodeURIComponent(nodeId)}/command`, body)
    return response.data
  },

  /** GET /api/v1/iot/nodes/{nodeId}/command — lệnh hiện tại, lịch AUTO và cờ ACK của node. */
  getCommand: async (nodeId: string): Promise<IotCommandStatus> => {
    const response = await apiClient.get<IotCommandStatus>(`/iot/nodes/${encodeURIComponent(nodeId)}/command`)
    return response.data
  },

  // ---- Admin (ManageSettings): đăng ký server, tuyến gateway, secret MQTT ----

  /** POST /api/v1/iot/servers — `base_url` phải nằm trong allowlist của backend. */
  registerServer: async (body: RegisterServerRequest): Promise<RegisteredServer> => {
    const response = await apiClient.post<RegisteredServer>('/iot/servers', body)
    return response.data
  },

  /** PUT /api/v1/iot/servers/{serverId}/location — 204. */
  updateServerLocation: async (serverId: string, body: ServerLocationRequest): Promise<void> => {
    await apiClient.put(`/iot/servers/${encodeURIComponent(serverId)}/location`, body)
  },

  /** GET /api/v1/iot/servers/{serverId}/gateways/routes — tuyến gateway → thiết bị trên bridge. */
  getGatewayRoutes: async (serverId: string): Promise<IotGatewayRoute[]> => {
    const response = await apiClient.get<IotGatewayRoute[]>(`/iot/servers/${encodeURIComponent(serverId)}/gateways/routes`)
    return response.data
  },

  /** PUT /api/v1/iot/servers/{serverId}/gateways/{gatewayId}/route — 204, gửi lại đúng cặp vẫn 204. */
  putGatewayRoute: async (serverId: string, gatewayId: string, body: IotGatewayRouteRequest): Promise<void> => {
    await apiClient.put(
      `/iot/servers/${encodeURIComponent(serverId)}/gateways/${encodeURIComponent(gatewayId)}/route`,
      body
    )
  },

  /** POST /api/v1/iot/servers/{serverId}/gateways/{gatewayId}/credential — password chỉ trả MỘT lần; cấp lại → 409. */
  issueGatewayCredential: async (serverId: string, gatewayId: string): Promise<IotGatewayCredential> => {
    const response = await apiClient.post<IotGatewayCredential>(
      `/iot/servers/${encodeURIComponent(serverId)}/gateways/${encodeURIComponent(gatewayId)}/credential`
    )
    return response.data
  },

  // ---- Quản lý (ManageAssets): nguồn đo của node ----

  /** POST /api/v1/iot/nodes/{nodeId}/source — 201, lần đầu gán nguồn. */
  registerNodeSource: async (nodeId: string, profile: NodeProfile): Promise<RegisteredSource> => {
    const response = await apiClient.post<RegisteredSource>(`/iot/nodes/${encodeURIComponent(nodeId)}/source`, profile)
    return response.data
  },

  /** PUT /api/v1/iot/nodes/{nodeId}/source — 204, gửi lại đầy đủ hồ sơ. */
  updateNodeSource: async (nodeId: string, profile: NodeProfile): Promise<void> => {
    await apiClient.put(`/iot/nodes/${encodeURIComponent(nodeId)}/source`, profile)
  },

  /** DELETE /api/v1/iot/nodes/{nodeId}/source — 204; lịch sử, tuyến, secret trên bridge vẫn giữ. */
  deleteNodeSource: async (nodeId: string): Promise<void> => {
    await apiClient.delete(`/iot/nodes/${encodeURIComponent(nodeId)}/source`)
  },
}

export default iotAPI
