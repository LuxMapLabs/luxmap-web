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
  PolePhotoItem,
  PolePhotoItemPagedResult,
  PolePhotoDecisionRequest,
  AutoDispatchPreview,
  AutoDispatchRequest,
  BatchCreateWorkOrdersResponse,
} from '../../types/workorders/orders'
import type {
  SurveyRecurringItem,
  SurveyRecurringItemPagedResult,
  CreateSurveyRecurringRequest,
  PatchSurveyRecurringRequest,
} from '../../types/survey-schedules/recurring'

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

  /**
   * Lấy danh sách ảnh chụp từng cột đèn trong lệnh công tác (kèm phân loại AI và review của kỹ sư)
   * GET /api/v1/work-orders/{id}/pole-photos
   */
  async getWorkOrderPolePhotos(
    id: string,
    params?: { pole_id?: string; page?: number; page_size?: number }
  ): Promise<PolePhotoItemPagedResult> {
    try {
      const response = await apiClient.get<PolePhotoItemPagedResult>(`/work-orders/${id}/pole-photos`, {
        params: { page_size: 100, ...params },
      })
      return (
        response.data || {
          items: [],
          total: 0,
          page: 1,
          page_size: 100,
        }
      )
    } catch (error) {
      console.warn(`[WorkScheduleAPI] getWorkOrderPolePhotos failed for ${id}:`, error)
      return { items: [], total: 0, page: 1, page_size: 100 }
    }
  },

  /**
   * Lấy chi tiết một ảnh cột đèn
   * GET /api/v1/work-orders/{id}/pole-photos/{photo_id}
   */
  async getPolePhotoDetail(id: string, photoId: string): Promise<PolePhotoItem> {
    const response = await apiClient.get<PolePhotoItem>(`/work-orders/${id}/pole-photos/${photoId}`)
    return response.data
  },

  /**
   * Tải ảnh cột đèn qua Blob URL (tự động kèm Authorization Bearer token)
   * GET /api/v1/work-orders/{id}/pole-photos/{photo_id}/thumbnail | /original
   */
  async fetchPolePhotoBlob(workOrderId: string, photoId: string, original = false): Promise<string> {
    const variant = original ? 'original' : 'thumbnail'
    const endpoint = `/work-orders/${encodeURIComponent(workOrderId)}/pole-photos/${encodeURIComponent(photoId)}/${variant}`
    const response = await apiClient.get<Blob>(endpoint, {
      responseType: 'blob',
    })
    return URL.createObjectURL(response.data)
  },

  /**
   * Quản lý phê duyệt (confirm / reject) một ảnh khảo sát cột đèn
   * POST /api/v1/work-orders/{id}/pole-photos/{photo_id}/decision
   */
  async decidePolePhoto(
    workOrderId: string,
    photoId: string,
    payload: PolePhotoDecisionRequest
  ): Promise<PolePhotoItem> {
    const response = await apiClient.post<PolePhotoItem>(
      `/work-orders/${workOrderId}/pole-photos/${photoId}/decision`,
      payload
    )
    return response.data
  },

  /**
   * Tự động xác nhận toàn bộ các ảnh cột đèn chưa duyệt trong ca khảo sát
   * Gọi khi Quản lý bấm Duyệt báo cáo khảo sát hoặc Tạo lịch tiếp theo
   */
  async confirmAllPendingPolePhotos(workOrderId: string): Promise<void> {
    try {
      const photosRes = await this.getWorkOrderPolePhotos(workOrderId)
      const items = photosRes.items || []
      // Lọc các ảnh chưa có quyết định decision
      const pendingItems = items.filter((p) => p.photo_id && !p.decision && p.decision !== 'confirm')
      if (pendingItems.length === 0) return

      // Xác nhận song song các ảnh để Backend chuyển cột thành out và tạo fault detected
      await Promise.allSettled(
        pendingItems.map((p) =>
          this.decidePolePhoto(workOrderId, p.photo_id!, {
            decision: 'confirm',
            note: 'Quản lý duyệt báo cáo khảo sát hiện trường.',
          })
        )
      )
    } catch (err) {
      console.warn(`[WorkScheduleAPI] confirmAllPendingPolePhotos error for ${workOrderId}:`, err)
    }
  },

  // =========================================================================
  // 1. TÍNH NĂNG SMART AUTO-DISPATCH (XEM TRƯỚC ĐỀ XUẤT & TẠO HÀNG LOẠT)
  // =========================================================================

  /**
   * Lấy đề xuất phân ca kiểm tra tự động từ Backend (WO-AUTODISPATCH-1)
   * POST /api/v1/work-orders/auto-dispatch/preview
   */
  async getAutoDispatchPreview(request?: AutoDispatchRequest): Promise<AutoDispatchPreview> {
    const response = await apiClient.post<AutoDispatchPreview>(
      '/work-orders/auto-dispatch/preview',
      request || {}
    )
    return response.data
  },

  /**
   * Tạo hàng loạt ca công tác trong một transaction duy nhất (WO-BATCH-1)
   * POST /api/v1/work-orders/batch
   */
  async createBatchWorkOrders(items: CreateWorkOrderRequest[]): Promise<BatchCreateWorkOrdersResponse> {
    const response = await apiClient.post<BatchCreateWorkOrdersResponse>(
      '/work-orders/batch',
      { items }
    )
    return response.data
  },

  // =========================================================================
  // 2. TÍNH NĂNG KHẢO SÁT ĐỊNH KỲ TUẦN (WEEKLY RECURRING SURVEY SCHEDULES)
  // =========================================================================

  /**
   * Lấy danh sách cấu hình lịch khảo sát định kỳ tuần
   * GET /api/v1/survey-schedules/recurring
   */
  async getRecurringSurveySchedules(communeId?: string): Promise<SurveyRecurringItemPagedResult> {
    const params: Record<string, any> = { page_size: 100 }
    if (communeId) params.commune_id = communeId

    const response = await apiClient.get<SurveyRecurringItemPagedResult>(
      '/survey-schedules/recurring',
      { params }
    )
    return response.data || { items: [], total: 0, page: 1, page_size: 100 }
  },

  /**
   * Tạo mới lịch khảo sát định kỳ tuần (Mốc chốt 17:00 Thứ Năm)
   * POST /api/v1/survey-schedules/recurring
   */
  async createRecurringSurveySchedule(
    payload: CreateSurveyRecurringRequest
  ): Promise<SurveyRecurringItem> {
    const response = await apiClient.post<SurveyRecurringItem>(
      '/survey-schedules/recurring',
      payload
    )
    return response.data
  },

  /**
   * Cập nhật lịch khảo sát định kỳ tuần (Bật/Tắt is_active, đổi người, ghi chú)
   * PATCH /api/v1/survey-schedules/recurring/{id}
   */
  async patchRecurringSurveySchedule(
    id: string,
    payload: PatchSurveyRecurringRequest
  ): Promise<SurveyRecurringItem> {
    const response = await apiClient.patch<SurveyRecurringItem>(
      `/survey-schedules/recurring/${encodeURIComponent(id)}`,
      payload
    )
    return response.data
  },

  /**
   * Xóa cấu hình lịch khảo sát định kỳ tuần
   * DELETE /api/v1/survey-schedules/recurring/{id}
   */
  async deleteRecurringSurveySchedule(id: string): Promise<void> {
    await apiClient.delete(`/survey-schedules/recurring/${encodeURIComponent(id)}`)
  },
}
