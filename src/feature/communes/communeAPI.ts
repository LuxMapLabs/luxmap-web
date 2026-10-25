import apiClient from '../../config/apiClient'
import type {
  CommuneItemPagedResult,
  CommuneItem,
  CreateCommuneRequest,
  UpdateCommuneRequest,
} from '../../types/admin/communes'

export interface CommuneQueryParams {
  page?: number
  page_size?: number
}

export const communeAPI = {
  /**
   * Lấy danh sách địa bàn xã/thị trấn
   * GET /api/v1/admin/communes
   */
  getCommunes: async (params?: CommuneQueryParams): Promise<CommuneItemPagedResult> => {
    const response = await apiClient.get<CommuneItemPagedResult>('/admin/communes', { params })
    return response.data
  },

  /**
   * Xem chi tiết thông tin và khung BBox của một địa bàn
   * GET /api/v1/admin/communes/{id}
   */
  getCommuneDetail: async (id: string): Promise<CommuneItem> => {
    const response = await apiClient.get<CommuneItem>(`/admin/communes/${id}`)
    return response.data
  },

  /**
   * Tạo địa bàn mới kèm khung BBox
   * POST /api/v1/admin/communes
   */
  createCommune: async (payload: CreateCommuneRequest): Promise<CommuneItem> => {
    const response = await apiClient.post<CommuneItem>('/admin/communes', payload)
    return response.data
  },

  /**
   * Cập nhật thông tin và khung BBox của địa bàn
   * PUT /api/v1/admin/communes/{id}
   */
  updateCommune: async (id: string, payload: UpdateCommuneRequest): Promise<CommuneItem> => {
    const response = await apiClient.put<CommuneItem>(`/admin/communes/${id}`, payload)
    return response.data
  },
}

export const adminCommuneAPI = communeAPI
