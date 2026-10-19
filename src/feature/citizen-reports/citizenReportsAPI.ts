import apiClient from '../../config/apiClient'
import type {
  CitizenReportItemPagedResult,
  CitizenReportDetail,
  AcceptCitizenReportRequest,
  MergeCitizenReportRequest,
  RejectCitizenReportRequest,
} from '../../types/citizen-reports/citizen-reports'

export interface CitizenReportsListParams {
  status?: string // CSV: 'pending,accepted,merged,rejected'
  commune_id?: string[]
  pole_id?: string
  page?: number
  page_size?: number
}

export const citizenReportsAPI = {
  /**
   * Lấy danh sách hàng đợi phản ánh công dân (kèm bộ lọc và phân trang)
   * GET /api/v1/citizen-reports
   */
  list: async (params?: CitizenReportsListParams): Promise<CitizenReportItemPagedResult> => {
    const queryParams: Record<string, string | number | string[]> = {}

    if (params?.status) {
      queryParams.status = params.status
    }
    if (params?.commune_id && params.commune_id.length > 0) {
      queryParams.commune_id = params.commune_id
    }
    if (params?.pole_id) {
      queryParams.pole_id = params.pole_id
    }
    if (typeof params?.page === 'number') {
      queryParams.page = params.page
    }
    if (typeof params?.page_size === 'number') {
      queryParams.page_size = params.page_size
    }

    const response = await apiClient.get<CitizenReportItemPagedResult>('/citizen-reports', {
      params: queryParams,
    })
    return response.data
  },

  /**
   * Lấy chi tiết toàn diện phản ánh công dân (kèm ảnh và kích hoạt gợi ý AI)
   * GET /api/v1/citizen-reports/{reportId}
   */
  detail: async (reportId: string): Promise<CitizenReportDetail> => {
    const response = await apiClient.get<CitizenReportDetail>(`/citizen-reports/${reportId}`)
    return response.data
  },

  /**
   * Chấp thuận phản ánh -> Tạo sự cố mới (Fault)
   * POST /api/v1/citizen-reports/{reportId}/accept
   */
  accept: async (
    reportId: string,
    data: AcceptCitizenReportRequest
  ): Promise<CitizenReportDetail> => {
    const response = await apiClient.post<CitizenReportDetail>(
      `/citizen-reports/${reportId}/accept`,
      data
    )
    return response.data
  },

  /**
   * Gộp phản ánh vào một sự cố đang mở trên cột đèn
   * POST /api/v1/citizen-reports/{reportId}/merge
   */
  merge: async (
    reportId: string,
    data: MergeCitizenReportRequest
  ): Promise<CitizenReportDetail> => {
    const response = await apiClient.post<CitizenReportDetail>(
      `/citizen-reports/${reportId}/merge`,
      data
    )
    return response.data
  },

  /**
   * Từ chối phản ánh công dân (kèm lý do bắt buộc)
   * POST /api/v1/citizen-reports/{reportId}/reject
   */
  reject: async (
    reportId: string,
    data: RejectCitizenReportRequest
  ): Promise<CitizenReportDetail> => {
    const response = await apiClient.post<CitizenReportDetail>(
      `/citizen-reports/${reportId}/reject`,
      data
    )
    return response.data
  },

  /**
   * Sinh đường dẫn ảnh hiện trường (kèm tham số gốc hoặc thumbnail)
   * Đảm bảo xác thực cookie phiên đăng nhập
   */
  getPhotoUrl: (reportId: string, photoId: string, original = false): string => {
    const variant = original ? 'original' : 'thumbnail'
    return `/api/v1/citizen-reports/${encodeURIComponent(reportId)}/photos/${encodeURIComponent(photoId)}/${variant}`
  },

  /**
   * Tải dữ liệu ảnh an toàn qua Blob kèm Access Token Authorization Header
   * Khắc phục triệt để lỗi ảnh bị chặn bởi chính sách [Authorize(Policy = ReviewCitizenReports)]
   *
   * @param reportId Mã phản ánh
   * @param photoId Mã ảnh
   * @param original Tải ảnh gốc (true) hoặc ảnh thu nhỏ thumbnail (false)
   * @returns Chuỗi Object URL (blob:...) sẵn sàng gán vào thẻ <img>
   */
  fetchPhotoBlob: async (
    reportId: string,
    photoId: string,
    original = false
  ): Promise<string> => {
    const variant = original ? 'original' : 'thumbnail'
    const endpoint = `/citizen-reports/${encodeURIComponent(reportId)}/photos/${encodeURIComponent(photoId)}/${variant}`
    const response = await apiClient.get<Blob>(endpoint, {
      responseType: 'blob',
    })
    return URL.createObjectURL(response.data)
  },
}

