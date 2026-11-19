import apiClient from '../../config/apiClient'
import type {
  IotGatewayCredential,
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
  IotNodeSourceDetails,
  IotNodeStatusPagedResult,
  RegisterNodeRequest,
  RegisteredNode,
  UpdateNodeRequest,
} from '../../types/iot/nodes'
import type {
  IotDiagnosticHistoryItemPagedResult,
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

  /** GET /api/v1/iot/nodes/{nodeId} — thông tin nguồn đo (chỉ số danh định) của node; 404 khi chưa gán nguồn. */
  getNodeSource: async (nodeId: string): Promise<IotNodeSourceDetails> => {
    const response = await apiClient.get<IotNodeSourceDetails>(
      `/iot/nodes/${encodeURIComponent(nodeId)}`
    )
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

  /** POST /api/v1/iot/servers — backend tự dùng địa chỉ Bridge cấu hình sẵn, không gửi base_url. */
  registerServer: async (body: RegisterServerRequest): Promise<RegisteredServer> => {
    const response = await apiClient.post<RegisteredServer>('/iot/servers', body)
    return response.data
  },

  /** PUT /api/v1/iot/servers/{serverId}/location — 204. */
  updateServerLocation: async (serverId: string, body: ServerLocationRequest): Promise<void> => {
    await apiClient.put(`/iot/servers/${encodeURIComponent(serverId)}/location`, body)
  },

  /** POST /api/v1/iot/servers/{serverId}/credential — cấp key MQTT cho server (200); đã có key → 409. */
  issueServerCredential: async (serverId: string): Promise<IotGatewayCredential> => {
    const response = await apiClient.post<IotGatewayCredential>(
      `/iot/servers/${encodeURIComponent(serverId)}/credential`
    )
    return response.data
  },

  /** GET /api/v1/iot/servers/{serverId}/credential — xem lại key MQTT của server (200); chưa cấp/đã thu hồi → 404; chỉ có hash → 409 IOT_CREDENTIAL_NOT_RETRIEVABLE. */
  getServerCredential: async (serverId: string): Promise<IotGatewayCredential> => {
    const response = await apiClient.get<IotGatewayCredential>(
      `/iot/servers/${encodeURIComponent(serverId)}/credential`
    )
    return response.data
  },

  /** DELETE /api/v1/iot/servers/{serverId}/credential — 204 (idempotent): thu hồi key MQTT của server và ngắt kết nối. */
  revokeServerCredential: async (serverId: string): Promise<void> => {
    await apiClient.delete(`/iot/servers/${encodeURIComponent(serverId)}/credential`)
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
    params: { page?: number; page_size?: number; from?: string; to?: string } = {}
  ): Promise<IotFeederHistoryResult> => {
    const response = await apiClient.get<IotFeederHistoryResult>(
      `/iot/feeders/${encodeURIComponent(feederId)}/electrical/history`,
      { params }
    )
    return response.data
  },

  /** GET /api/v1/iot/feeders/{feederId}/electrical/history/received — lịch sử điện trung bình 30 giây theo giờ Bridge nhận (mẫu gửi bù dồn vào lúc tới), mới nhất trước. */
  getFeederElectricalHistoryReceived: async (
    feederId: string,
    params: { page?: number; page_size?: number; from?: string; to?: string } = {}
  ): Promise<IotFeederHistoryResult> => {
    const response = await apiClient.get<IotFeederHistoryResult>(
      `/iot/feeders/${encodeURIComponent(feederId)}/electrical/history/received`,
      { params }
    )
    return response.data
  },

  /** GET /api/v1/iot/feeders/{feederId}/diagnostics/history — các đợt lỗi của mạch, mới nhất trước; lọc [from, to) theo UTC. */
  getFeederDiagnosticHistory: async (
    feederId: string,
    params: { page?: number; page_size?: number; from?: string; to?: string } = {}
  ): Promise<IotDiagnosticHistoryItemPagedResult> => {
    const response = await apiClient.get<IotDiagnosticHistoryItemPagedResult>(
      `/iot/feeders/${encodeURIComponent(feederId)}/diagnostics/history`,
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
   * POST /api/v1/iot/nodes — tạo node ở tủ, gán mạch vào rơ-le #1, lưu nguồn đo và tuyến MQTT trong một lần.
   * 201 khi tạo mới, 200 khi gửi lại đúng hồ sơ; hồ sơ khác cho cùng mạch / thiết bị → 409.
   */
  registerNode: async (body: RegisterNodeRequest): Promise<RegisteredNode> => {
    const response = await apiClient.post<RegisteredNode>('/iot/nodes', body)
    return response.data
  },

  /**
   * PUT /api/v1/iot/nodes/{nodeId} — cập nhật server, thiết bị, mạch và chỉ số danh định của node.
   * 204 khi thành công; lỗi 400 / 403 / 404 / 409 / 503.
   */
  updateNode: async (nodeId: string, body: UpdateNodeRequest): Promise<void> => {
    await apiClient.put(`/iot/nodes/${encodeURIComponent(nodeId)}`, body)
  },

  /**
   * DELETE /api/v1/iot/nodes/{nodeId}/feeder — gỡ node khỏi mạch hiện tại (không body).
   * 204 khi thành công (gọi lại vẫn 204); lỗi 403 / 404 / 409 / 503.
   */
  detachNodeFeeder: async (nodeId: string): Promise<void> => {
    await apiClient.delete(`/iot/nodes/${encodeURIComponent(nodeId)}/feeder`)
  },
}

export default iotAPI
