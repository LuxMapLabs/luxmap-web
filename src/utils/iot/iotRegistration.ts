/**
 * Kiểm tra phía client cho form đăng ký IoT bridge — cùng luật với backend để báo lỗi trước khi gọi API.
 * Server ID: `ValidServerId` (IotDiagnosticsController). Gateway / thiết bị: `DeviceRules.ValidId` (LuxMap.IotBridge).
 */
export function isValidServerId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(id) && id.toLowerCase() !== 'default'
}

export function isValidBridgeId(id: string): boolean {
  return id.length <= 64 && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)
}

/** Mạch đang đấu vào rơ-le #1 của node, đọc từ `GET /assets/feeders` (`control.node_id`). Hồ sơ nguồn đo bridge chỉ dùng rơ-le #1. */
export function feederOnRelayOne<T extends { feeder_id: string | null; control?: { node_id?: string | null; relay_no?: number } }>(
  feeders: T[],
  nodeId: string | null | undefined
): T | undefined {
  if (!nodeId) return undefined
  return feeders.find((f) => f.control?.node_id === nodeId && f.control.relay_no === 1)
}
