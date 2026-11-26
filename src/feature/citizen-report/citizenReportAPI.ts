import apiClient from '../../config/apiClient'
import type { PublicQrInfo, PublicQrLookupRequest } from '../../types/public/qr'
import type { PublicReportReceipt } from '../../types/public/reports'
import type { CitizenReportKind } from '../../types/common/enums'

export type { PublicQrInfo, PublicQrLookupRequest, PublicReportReceipt, CitizenReportKind }

/**
 * Payload người dân gửi báo cáo sự cố (CITIZEN-QR P2b)
 */
export interface PublicReportSubmitPayload {
  code: string
  kind: CitizenReportKind
  description?: string
  lat?: number | null
  lng?: number | null
  client_op_id?: string
  photos?: File[]
}

export const citizenReportAPI = {
  /**
   * Tra cứu thông tin vị trí cột đèn từ mã tem QR 16 ký tự (Public)
   * POST /api/v1/public/qr/lookup
   */
  lookupPublicQr: async (payload: PublicQrLookupRequest): Promise<PublicQrInfo> => {
    const response = await apiClient.post<PublicQrInfo>('/public/qr/lookup', payload)
    return response.data
  },

  /**
   * Nộp phản ánh sự cố công khai của người dân qua multipart/form-data (Public)
   * POST /api/v1/public/reports
   */
  submitReport: async (payload: PublicReportSubmitPayload): Promise<PublicReportReceipt> => {
    const formData = new FormData()
    formData.append('code', payload.code)
    formData.append('kind', payload.kind)

    if (payload.description) {
      formData.append('description', payload.description)
    }
    if (
      typeof payload.lat === 'number' &&
      Number.isFinite(payload.lat) &&
      typeof payload.lng === 'number' &&
      Number.isFinite(payload.lng)
    ) {
      // Luôn dấu chấm thập phân: BE đọc form theo culture invariant trên mọi máy, dấu phẩy là phân cách hàng nghìn (10,82 → 1082 → 400)
      formData.append('lat', String(payload.lat))
      formData.append('lng', String(payload.lng))
    }
    const clientOpId =
      payload.client_op_id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)
    formData.append('client_op_id', clientOpId)
    if (payload.photos && payload.photos.length > 0) {
      payload.photos.forEach((file) => {
        formData.append('photos', file)
      })
    }

    const response = await apiClient.post<PublicReportReceipt>('/public/reports', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}
