import apiClient from '../../config/apiClient'
import type {
  ArtifactVersionItem,
  ArtifactVersionItemPagedResult,
  ArtifactVersionUsage,
  RegisterArtifactVersionRequest,
} from '../../types/admin/artifact-versions'

export interface ArtifactVersionQueryParams {
  component?: string
  page?: number
  page_size?: number
}

export const artifactVersionAPI = {
  /**
   * Danh sách toàn bộ phiên bản đã đăng ký, hỗ trợ lọc theo component và phân trang
   * GET /api/v1/admin/artifact-versions
   */
  getArtifactVersions: async (
    params?: ArtifactVersionQueryParams
  ): Promise<ArtifactVersionItemPagedResult> => {
    const response = await apiClient.get<ArtifactVersionItemPagedResult>(
      '/admin/artifact-versions',
      { params }
    )
    return response.data
  },

  /**
   * Đăng ký trước một firmware (node_firmware hoặc lux_module_firmware)
   * POST /api/v1/admin/artifact-versions
   */
  registerArtifactVersion: async (
    data: RegisterArtifactVersionRequest
  ): Promise<ArtifactVersionItem> => {
    const response = await apiClient.post<ArtifactVersionItem>(
      '/admin/artifact-versions',
      data
    )
    return response.data
  },

  /**
   * Thống kê số lượng kết quả mà phiên bản này đã tạo ra trong hệ thống
   * GET /api/v1/admin/artifact-versions/{id}/usage
   */
  getArtifactVersionUsage: async (id: number): Promise<ArtifactVersionUsage> => {
    const response = await apiClient.get<ArtifactVersionUsage>(
      `/admin/artifact-versions/${id}/usage`
    )
    return response.data
  },
}
