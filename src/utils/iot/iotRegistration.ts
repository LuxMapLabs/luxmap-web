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
