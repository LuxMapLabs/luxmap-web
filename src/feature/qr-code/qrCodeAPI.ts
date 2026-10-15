import apiClient from '../../config/apiClient'
import type {
  IssueQrCodeRequest,
  QrCodeItem,
  QrCodeItemPagedResult,
} from '../../types/qr-codes/qr-codes'

export interface QrCodeListQuery {
  pole_id?: string | null
  commune_id?: string[]
  active?: boolean
  page?: number
  page_size?: number
}

export const qrCodeAPI = {
  /**
   * Cấp mã QR mới cho cột đèn (Nếu có mã active cũ, mã cũ sẽ tự động thu hồi)
   * POST /api/v1/qr-codes
   */
  issueQrCode: async (payload: IssueQrCodeRequest): Promise<QrCodeItem> => {
    const response = await apiClient.post<QrCodeItem>('/qr-codes', payload)
    return response.data
  },

  /**
   * Thu hồi thủ công một mã QR theo qr_id
   * POST /api/v1/qr-codes/{qr_id}/revoke
   */
  revokeQrCode: async (qrId: string): Promise<QrCodeItem> => {
    const response = await apiClient.post<QrCodeItem>(`/qr-codes/${encodeURIComponent(qrId)}/revoke`)
    return response.data
  },

  /**
   * Tra cứu danh sách mã QR theo bộ lọc và phân trang
   * GET /api/v1/qr-codes
   */
  getQrCodes: async (params?: QrCodeListQuery): Promise<QrCodeItemPagedResult> => {
    const response = await apiClient.get<QrCodeItemPagedResult>('/qr-codes', { params })
    return response.data
  },
}
