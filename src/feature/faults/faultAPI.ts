import apiClient from '../../config/apiClient'
import type { FaultItemPagedResult, FaultItem } from '../../types/faults/faults'

export interface GetFaultsFilter {
  segment_id?: string
  pole_id?: string
  status?: string
  severity?: string
  fault_type?: string
  commune_id?: string[]
  page?: number
  page_size?: number
}

export const faultAPI = {
  /**
   * Lấy danh sách sự cố từ Backend API
   * GET /api/v1/faults
   */
  async getFaults(filter?: GetFaultsFilter): Promise<FaultItemPagedResult> {
    const params: Record<string, any> = {}
    if (filter?.segment_id) params.segment_id = filter.segment_id
    if (filter?.pole_id) params.pole_id = filter.pole_id
    if (filter?.status) params.status = filter.status
    if (filter?.severity) params.severity = filter.severity
    if (filter?.fault_type) params.fault_type = filter.fault_type
    if (filter?.commune_id?.length) params.commune_id = filter.commune_id
    if (filter?.page) params.page = filter.page
    if (filter?.page_size) params.page_size = filter.page_size

    const response = await apiClient.get<FaultItemPagedResult>('/faults', { params })
    return response.data
  },

  /**
   * Lấy chi tiết một sự cố
   * GET /api/v1/faults/{id}
   */
  async getFaultDetail(id: string): Promise<FaultItem> {
    const response = await apiClient.get<FaultItem>(`/faults/${encodeURIComponent(id)}`)
    return response.data
  },
}

export default faultAPI
