import apiClient from '../../config/apiClient'
import type { FaultType, Severity } from '../../types/common/enums'
import type { PoleListItem } from '../../types/assets/poles'

/**
 * Payload người dân gửi báo cáo sự cố (Citizen Report - Local DTO trước khi Backend có Swagger chính thức)
 */
export interface CitizenReportPayload {
  qr_token: string
  pole_code: NonNullable<PoleListItem['external_ref']>
  fault_type: FaultType
  severity: Severity
  description: string
  photo_file?: File | null
  media_files?: File[]
  reporter_name?: string
  reporter_phone?: string
}

/**
 * Phản hồi thành công từ hệ thống tiếp nhận báo cáo
 */
export interface CitizenReportResponse {
  report_id: string
  status: 'received' | 'processing'
  message: string
  pole_code: string
  submitted_at: string
}

export const citizenReportAPI = {
  /**
   * Gửi phản ánh sự cố công khai của người dân qua mã QR
   * POST /api/v1/public/pole-reports
   */
  submitReport: async (payload: CitizenReportPayload): Promise<CitizenReportResponse> => {
    const hasMedia = (payload.media_files && payload.media_files.length > 0) || Boolean(payload.photo_file)

    // Nếu có file ảnh / video, gửi dưới dạng FormData multipart
    if (hasMedia) {
      const formData = new FormData()
      formData.append('qr_token', payload.qr_token)
      formData.append('pole_code', payload.pole_code)
      formData.append('fault_type', payload.fault_type)
      formData.append('severity', payload.severity)
      formData.append('description', payload.description)

      if (payload.media_files && payload.media_files.length > 0) {
        payload.media_files.forEach((file) => {
          formData.append('media_files', file)
        })
      } else if (payload.photo_file) {
        formData.append('photo_file', payload.photo_file)
      }

      if (payload.reporter_name) formData.append('reporter_name', payload.reporter_name)
      if (payload.reporter_phone) formData.append('reporter_phone', payload.reporter_phone)

      const response = await apiClient.post<CitizenReportResponse>('/public/pole-reports', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    }

    const response = await apiClient.post<CitizenReportResponse>('/public/pole-reports', payload)
    return response.data
  },
}
