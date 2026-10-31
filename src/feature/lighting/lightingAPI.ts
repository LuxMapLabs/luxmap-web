import apiClient from '../../config/apiClient'
import type { LightingPreview } from '../../types/lighting/preview'
import type {
  CreateLightingRequest,
  LightingRequestResult,
  LightingCommandItemPagedResult,
} from '../../types/lighting/commands'

export interface PreviewLightingParams {
  feeder_id?: string
  segment_id?: string
}

export interface GetLightingCommandsParams {
  page?: number
  page_size?: number
  feeder_id?: string
  node_id?: string
  status?: string
  request_id?: string
}

export const lightingAPI = {
  /**
   * Xem trước phạm vi tác động điều khiển chiếu sáng
   * GET /api/v1/lighting/preview
   */
  previewLighting: async (params: PreviewLightingParams): Promise<LightingPreview> => {
    const response = await apiClient.get<LightingPreview>('/lighting/preview', { params })
    return response.data
  },

  /**
   * Gửi lệnh điều khiển bật/tắt/auto chiếu sáng
   * POST /api/v1/lighting/commands
   */
  createLightingCommand: async (data: CreateLightingRequest): Promise<LightingRequestResult> => {
    const response = await apiClient.post<LightingRequestResult>('/lighting/commands', data)
    return response.data
  },

  /**
   * Tra cứu lịch sử & trạng thái các lệnh điều khiển
   * GET /api/v1/lighting/commands
   */
  getLightingCommands: async (
    params?: GetLightingCommandsParams
  ): Promise<LightingCommandItemPagedResult> => {
    const response = await apiClient.get<LightingCommandItemPagedResult>('/lighting/commands', { params })
    return response.data
  },
}

export default lightingAPI
