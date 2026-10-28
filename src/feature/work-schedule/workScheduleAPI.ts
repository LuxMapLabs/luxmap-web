import apiClient from '../../config/apiClient'
import type { TaskKind, WorkOrderStatus } from '../../types/common/enums'
import type {
  WorkOrderDetail,
  WorkOrderItemPagedResult,
  WorkOrderAssigneePagedResult,
  WorkOrderPolePagedResult,
  EvidenceItemPagedResult,
  CreateWorkOrderRequest,
  PatchWorkOrderRequest,
  AssignWorkOrderRequest,
  CompleteWorkOrderRequest,
  ReviewWorkOrderRequest,
  FollowUpWorkOrderRequest,
  StartWorkOrderRequest,
} from '../../types/workorders/orders'

export interface GetWorkOrdersFilter {
  scheduled_from?: string
  scheduled_to?: string
  task_kind?: TaskKind | string
  wo_status?: WorkOrderStatus | string
  assigned_to?: string
  segment_id?: string
  commune_id?: string[]
  cancellation_request_status?: string
  case_id?: string
  page?: number
}

export const workScheduleAPI = {
  /**
   * Lấy danh sách lệnh công tác / lịch làm việc (hỗ trợ lọc theo khoảng ngày để vẽ calendar)
   */
  async getWorkOrders(filter?: GetWorkOrdersFilter): Promise<WorkOrderItemPagedResult> {
    const params: Record<string, any> = {}
    if (filter?.scheduled_from) params.scheduled_from = filter.scheduled_from
    if (filter?.scheduled_to) params.scheduled_to = filter.scheduled_to
    if (filter?.task_kind) params.task_kind = filter.task_kind
    if (filter?.wo_status) params.wo_status = filter.wo_status
    if (filter?.assigned_to) params.assigned_to = filter.assigned_to
    if (filter?.segment_id) params.segment_id = filter.segment_id
    if (filter?.commune_id?.length) params.commune_id = filter.commune_id
    if (filter?.cancellation_request_status) params.cancellation_request_status = filter.cancellation_request_status
    if (filter?.case_id) params.case_id = filter.case_id
    if (filter?.page) params.page = filter.page

    const response = await apiClient.get<WorkOrderItemPagedResult>('/work-orders', { params })
    return (
      response.data || {
        items: [],
        total: 0,
        page: 1,
        page_size: 50,
      }
    )
  },

  /**
   * Lấy chi tiết một lệnh công tác
   */
  async getWorkOrderDetail(id: string): Promise<WorkOrderDetail> {
    const response = await apiClient.get<WorkOrderDetail>(`/work-orders/${id}`)
    return response.data
  },

  /**
   * Lấy danh sách kỹ sư hiện trường theo địa bàn xã
   */
  async getAssignees(communeId: string, page = 1): Promise<WorkOrderAssigneePagedResult> {
    const response = await apiClient.get<WorkOrderAssigneePagedResult>('/work-orders/assignees', {
      params: { commune_id: communeId, page },
    })
    return (
      response.data || {
        items: [],
        total: 0,
        page: 1,
        page_size: 50,
      }
    )
  },

  /**
   * Quản lý tạo lệnh / lịch làm việc mới
   */
  async createWorkOrder(payload: CreateWorkOrderRequest): Promise<WorkOrderDetail> {
    const response = await apiClient.post<WorkOrderDetail>('/work-orders', payload)
    return response.data
  },

  /**
   * Cập nhật ngày hẹn, hạn chót hoặc tiêu đề
   */
  async patchWorkOrder(id: string, payload: PatchWorkOrderRequest): Promise<WorkOrderDetail> {
    const response = await apiClient.patch<WorkOrderDetail>(`/work-orders/${id}`, payload)
    return response.data
  },

  /**
   * Gán / Đổi kỹ sư hiện trường phụ trách
   */
  async assignWorkOrder(id: string, payload: AssignWorkOrderRequest): Promise<WorkOrderDetail> {
    const response = await apiClient.put<WorkOrderDetail>(`/work-orders/${id}/assignee`, payload)
    return response.data
  },

  /**
   * Kỹ sư hiện trường bấm bắt đầu thực hiện (chuyển sang in_progress)
   */
  async startWorkOrder(id: string, payload?: StartWorkOrderRequest): Promise<WorkOrderDetail> {
    const response = await apiClient.post<WorkOrderDetail>(`/work-orders/${id}/start`, payload)
    return response.data
  },

  /**
   * Kỹ sư nộp báo cáo hiện trường kèm ghi chú vật tư (chuyển sang done)
   */
  async completeWorkOrder(id: string, payload: CompleteWorkOrderRequest): Promise<WorkOrderDetail> {
    const response = await apiClient.post<WorkOrderDetail>(`/work-orders/${id}/complete`, payload)
    return response.data
  },

  /**
   * Quản lý duyệt nghiệm thu
   */
  async verifyWorkOrder(
    id: string,
    payload: ReviewWorkOrderRequest & { materials_note?: string | null }
  ): Promise<WorkOrderDetail> {
    const response = await apiClient.post<WorkOrderDetail>(`/work-orders/${id}/verify`, payload)
    return response.data
  },

  /**
   * Quản lý trả về yêu cầu làm lại
   */
  async returnWorkOrder(id: string, payload: ReviewWorkOrderRequest): Promise<WorkOrderDetail> {
    const response = await apiClient.post<WorkOrderDetail>(`/work-orders/${id}/return`, payload)
    return response.data
  },

  /**
   * Quản lý không duyệt / Hủy lệnh (Tự động END có lưu vết)
   */
  async cancelWorkOrder(id: string, payload: ReviewWorkOrderRequest): Promise<WorkOrderDetail> {
    const response = await apiClient.post<WorkOrderDetail>(`/work-orders/${id}/cancel`, payload)
    return response.data
  },

  /**
   * Quản lý mở bước tiếp theo trong chuỗi hồ sơ (kế thừa case_id từ lệnh cha)
   */
  async followUpWorkOrder(id: string, payload: FollowUpWorkOrderRequest): Promise<WorkOrderDetail> {
    const response = await apiClient.post<WorkOrderDetail>(`/work-orders/${id}/follow-up`, payload)
    return response.data
  },

  /**
   * Lấy danh sách cột đèn theo lệnh công tác từ Backend
   */
  async getWorkOrderPoles(id: string, page = 1): Promise<WorkOrderPolePagedResult> {
    const response = await apiClient.get<WorkOrderPolePagedResult>(`/work-orders/${id}/poles`, {
      params: { page },
    })
    return response.data
  },

  /**
   * Lấy danh sách ảnh chụp bằng chứng nghiệm thu từ Backend
   */
  async getWorkOrderEvidence(id: string, page = 1): Promise<EvidenceItemPagedResult> {
    const response = await apiClient.get<EvidenceItemPagedResult>(`/work-orders/${id}/evidence`, {
      params: { page },
    })
    return response.data
  },

  /**
   * Helper lấy URL trực tiếp của ảnh bằng chứng (thumbnail hoặc ảnh gốc)
   */
  getEvidenceImageUrl(evidenceId: string, type: 'thumbnail' | 'original' = 'thumbnail'): string {
    return `/api/v1/evidence/${evidenceId}/${type}`
  },

  /**
   * Tải ảnh bằng chứng nghiệm thu an toàn qua Blob kèm Access Token Authorization Header
   * Khắc phục triệt để lỗi ảnh bị chặn bởi chính sách [Authorize(Policy = ReadWorkOrders)]
   *
   * @param evidenceId Mã bằng chứng ảnh (ví dụ: EVD-0005)
   * @param original Tải ảnh gốc chất lượng cao (true) hoặc ảnh thu nhỏ thumbnail (false)
   * @returns Chuỗi Object URL (blob:...) sẵn sàng gán vào thẻ <img>
   */
  async fetchEvidenceBlob(evidenceId: string, original = false): Promise<string> {
    const variant = original ? 'original' : 'thumbnail'
    const endpoint = `/evidence/${encodeURIComponent(evidenceId)}/${variant}`
    const response = await apiClient.get<Blob>(endpoint, {
      responseType: 'blob',
    })
    return URL.createObjectURL(response.data)
  },

  /**
   * Tải ảnh bằng chứng và chuyển đổi thành Base64 Data URL (phục vụ nhúng trực tiếp vào PDF hoặc canvas)
   */
  async fetchEvidenceBase64(evidenceId: string, original = false): Promise<string> {
    const variant = original ? 'original' : 'thumbnail'
    const endpoint = `/evidence/${encodeURIComponent(evidenceId)}/${variant}`
    const response = await apiClient.get<Blob>(endpoint, {
      responseType: 'blob',
    })
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(response.data)
    })
  },

  /**
   * Quản lý từ chối (bác bỏ) yêu cầu xin hủy lịch từ kỹ sư hiện trường
   */
  async rejectCancellation(id: string, rejectReason: string): Promise<WorkOrderDetail> {
    const response = await apiClient.post<WorkOrderDetail>(`/work-orders/${id}/reject-cancellation`, {
      reject_reason: rejectReason,
    })
    return response.data
  },

  /**
   * Quản lý duyệt yêu cầu xin hủy và điều phối lại (Dời ngày làm việc hoặc Đổi kỹ sư)
   * Tận dụng endpoint Backend PUT /api/v1/work-orders/{id}/assignee (PR #190)
   * hỗ trợ gán kỹ sư mới cùng ngày hẹn trong 1 request duy nhất và tự động reset cờ xin hủy.
   */
  async approveCancellationReassign(
    id: string,
    params: {
      newAssigneeId?: string
      scheduledDate?: string
      dueDate?: string
      note?: string
    }
  ): Promise<WorkOrderDetail> {
    if (params.newAssigneeId) {
      const response = await apiClient.put<WorkOrderDetail>(`/work-orders/${id}/assignee`, {
        assigned_to: params.newAssigneeId,
        scheduled_date: params.scheduledDate,
        due_date: params.dueDate,
      })
      return response.data
    } else {
      // Trường hợp chỉ dời ngày mà không thay đổi kỹ sư
      const response = await apiClient.patch<WorkOrderDetail>(`/work-orders/${id}`, {
        scheduled_date: params.scheduledDate,
        due_date: params.dueDate,
      })
      return response.data
    }
  },
}
