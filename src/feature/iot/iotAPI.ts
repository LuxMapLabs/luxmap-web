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
  IotCommandHistoryItemPagedResult,
  IotCommandRequest,
  IotCommandStatus,
  IotDiagnosticResult,
  IotElectricalResult,
  IotNodeStatusPagedResult,
  RegisterNodeRequest,
  RegisteredNode,
} from '../../types/iot/nodes'
import type {
  IotFeederElectricalResult,
  IotFeederHistoryResult,
} from '../../types/iot/feeders'
import type { IotDiagnosticSummaryItemPagedResult } from '../../types/iot/diagnostics'

/**
 * IoT bridge (docs/LUXMAP-IOT-FE.md của backend): gateway ESP32 + node LoRa. Lệnh Bật / Tắt / AUTO và nhật ký lệnh
 * đều qua `/iot/nodes/{nodeId}/command...`; web không còn gọi kênh cũ `/lighting/...`.
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

  /** POST /api/v1/iot/nodes/{nodeId}/command — 202: bridge đã nhận lệnh, node CHƯA xác nhận. */
  sendCommand: async (nodeId: string, body: IotCommandRequest): Promise<IotCommandStatus> => {
    const response = await apiClient.post<IotCommandStatus>(`/iot/nodes/${encodeURIComponent(nodeId)}/command`, body)
    return response.data
  },

  /** GET /api/v1/iot/nodes/{nodeId}/command/history — lệnh đã ghi audit, mới nhất trước, kèm `status` success | pending | expired. */
  getCommandHistory: async (
    nodeId: string,
    params: { page?: number; page_size?: number } = {}
  ): Promise<IotCommandHistoryItemPagedResult> => {
    const response = await apiClient.get<IotCommandHistoryItemPagedResult>(
      `/iot/nodes/${encodeURIComponent(nodeId)}/command/history`,
      { params }
    )
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

  // ---- Dữ liệu điện và chẩn đoán (mục 5) ----

  /** GET /api/v1/iot/feeders/{feederId}/electrical — trạng thái điện và mẫu đo gần nhất của mạch. */
  getFeederElectrical: async (feederId: string): Promise<IotFeederElectricalResult> => {
    const response = await apiClient.get<IotFeederElectricalResult>(
      `/iot/feeders/${encodeURIComponent(feederId)}/electrical`
    )
    return response.data
  },

  /** GET /api/v1/iot/feeders/{feederId}/electrical/history — lịch sử điện trung bình 30 giây, mới nhất trước. */
  getFeederElectricalHistory: async (
    feederId: string,
    params: { page?: number; page_size?: number } = {}
  ): Promise<IotFeederHistoryResult> => {
    const response = await apiClient.get<IotFeederHistoryResult>(
      `/iot/feeders/${encodeURIComponent(feederId)}/electrical/history`,
      { params }
    )
    return response.data
  },

  /** GET /api/v1/iot/nodes/{nodeId}/electrical — mẫu mới nhất; `status` + `received_at` phân biệt mẫu mới / cũ. */
  getElectrical: async (nodeId: string): Promise<IotElectricalResult> => {
    const response = await apiClient.get<IotElectricalResult>(`/iot/nodes/${encodeURIComponent(nodeId)}/electrical`)
    return response.data
  },

  /** GET /api/v1/iot/nodes/{nodeId}/diagnostics — `anomalies[]` và ước lượng số bóng thiếu. */
  getDiagnostics: async (nodeId: string): Promise<IotDiagnosticResult> => {
    const response = await apiClient.get<IotDiagnosticResult>(`/iot/nodes/${encodeURIComponent(nodeId)}/diagnostics`)
    return response.data
  },

  /** GET /api/v1/iot/diagnostics/summary — tổng hợp chẩn đoán các node từ job nền, phân trang. */
  getDiagnosticsSummary: async (params: { page?: number; page_size?: number } = {}): Promise<IotDiagnosticSummaryItemPagedResult> => {
    const response = await apiClient.get<IotDiagnosticSummaryItemPagedResult>('/iot/diagnostics/summary', {
      params: { page: 1, page_size: 200, ...params },
    })
    return response.data
  },

  // ---- Admin (ManageSettings): đăng ký node ----

  /**
   * POST /api/v1/iot/nodes/register — tạo node ở tủ, gán mạch vào rơ-le #1, lưu nguồn đo và tuyến MQTT trong một lần.
   * 201 khi tạo mới, 200 khi gửi lại đúng hồ sơ; hồ sơ khác cho cùng mạch / thiết bị → 409.
   */
  registerNode: async (body: RegisterNodeRequest): Promise<RegisteredNode> => {
    const response = await apiClient.post<RegisteredNode>('/iot/nodes/register', body)
    return response.data
  },
}

export default iotAPI
