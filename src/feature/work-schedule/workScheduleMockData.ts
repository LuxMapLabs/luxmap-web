import { WorkOrderItem, WorkOrderDetail, WorkOrderAssignee } from '../../types/workorders/orders'

// Lấy ngày hôm nay và ngày mai động theo thời gian hệ thống
const today = new Date()
const todayStr = today.toISOString().substring(0, 10)

const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)
const tomorrowStr = tomorrow.toISOString().substring(0, 10)

const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)
const yesterdayStr = yesterday.toISOString().substring(0, 10)

/**
 * Danh sách Kỹ sư hiện trường demo phục vụ kiểm thử
 */
export const MOCK_ASSIGNEES_DEMO: WorkOrderAssignee[] = [
  {
    user_id: 'USR-004',
    full_name: 'Nguyễn Văn Tuấn',
  },
  {
    user_id: 'USR-005',
    full_name: 'Trần Đình Trọng',
  },
  {
    user_id: 'USR-006',
    full_name: 'Lê Hoàng Nam',
  },
  {
    user_id: 'USR-007',
    full_name: 'Phạm Quốc Hưng',
  },
]

/**
 * Kho dữ liệu Mock trong bộ nhớ (In-memory store)
 * Cho phép người dùng thao tác Duyệt (đổi kỹ sư, hủy lịch) hoặc Từ chối và thấy UI cập nhật phản hồi ngay lập tức
 */
let mockWorkOrdersStore: WorkOrderItem[] = [
  // --------------------------------------------------------------------------
  // CASE 1: ĐANG CÓ YÊU CẦU XIN HỦY LỊCH (PENDING) - Ưu tiên kiểm thử giao diện
  // --------------------------------------------------------------------------
  {
    work_order_id: 'WO-MOCK-CANCEL-01',
    case_id: 'CASE-2026-9901',
    title: 'Kiểm tra chập điện tủ điều khiển chiếu sáng TL8',
    commune_id: 'COM-070',
    task_kind: 'inspection',
    segment_id: 'SEG-001',
    cluster_id: null,
    parent_work_order_id: null,
    fault_ids: ['FLT-001'],
    wo_status: 'open',
    assigned_to: 'USR-004',
    priority_score: 95,
    scheduled_date: todayStr,
    due_date: todayStr,
    created_at: `${todayStr}T07:30:00Z`,
    updated_at: `${todayStr}T08:15:00Z`,
    // Dữ liệu yêu cầu xin hủy từ kỹ sư
    cancellation_request_status: 'pending',
    cancellation_request_note:
      'Xe bán tải chuyên dụng gặp sự cố nổ lốp trên đường đèo và thời tiết mưa dông sạt lở cục bộ, không thể tiếp cận tủ điều khiển đúng hẹn. Kính đề nghị Quản lý duyệt điều phối kỹ sư khác thay thế hoặc dời lịch tác nghiệp.',
    cancellation_requested_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(), // 35 phút trước
    cancellation_reject_note: null,
    cancellation_rejected_at: null,
  },

  // --------------------------------------------------------------------------
  // CASE 2: YÊU CẦU XIN HỦY ĐÃ BỊ TỪ CHỐI (REJECTED) - Kiểm tra banner thông báo
  // --------------------------------------------------------------------------
  {
    work_order_id: 'WO-MOCK-REJECT-02',
    case_id: 'CASE-2026-9902',
    title: 'Sửa chữa thay bóng đèn LED ngã tư Chợ Mới',
    commune_id: 'COM-070',
    task_kind: 'repair',
    segment_id: 'SEG-002',
    cluster_id: null,
    parent_work_order_id: null,
    fault_ids: ['FLT-002'],
    wo_status: 'assigned',
    assigned_to: 'USR-005',
    priority_score: 80,
    scheduled_date: tomorrowStr,
    due_date: tomorrowStr,
    created_at: `${yesterdayStr}T14:00:00Z`,
    updated_at: `${todayStr}T09:00:00Z`,
    // Dữ liệu yêu cầu xin hủy đã bị từ chối
    cancellation_request_status: 'rejected',
    cancellation_request_note:
      'Trùng lịch kiểm tra mạng lưới điện sinh hoạt với đơn vị điện lực khu vực vào sáng mai.',
    cancellation_requested_at: `${yesterdayStr}T15:30:00Z`,
    cancellation_reject_note:
      'Nhiệm vụ sửa chữa chiếu sáng tại khu chợ theo chỉ đạo khẩn cấp của UBND xã, bắt buộc ưu tiên hoàn thành trước 18h.',
    cancellation_rejected_at: `${yesterdayStr}T16:15:00Z`,
  },
]

/**
 * Trả về danh sách work orders demo
 */
export function getMockDemoWorkOrders(): WorkOrderItem[] {
  return [...mockWorkOrdersStore]
}

/**
 * Hợp nhất danh sách từ backend với các ca mock demo
 */
export function mergeWithMockDemoWorkOrders(backendItems: WorkOrderItem[]): WorkOrderItem[] {
  const existingIds = new Set(backendItems.map((item) => item.work_order_id))
  const newMocks = mockWorkOrdersStore.filter((m) => !existingIds.has(m.work_order_id))
  return [...newMocks, ...backendItems]
}

/**
 * Trả về chi tiết lệnh công tác mock
 */
export function getMockDemoWorkOrderDetail(id: string): WorkOrderDetail | null {
  const item = mockWorkOrdersStore.find((m) => m.work_order_id === id)
  if (!item) return null

  return {
    ...item,
    note:
      item.work_order_id === 'WO-MOCK-CANCEL-01'
        ? 'Cần tiếp cận kiểm tra tủ phân phối sau phản ánh chập chờn từ người dân.'
        : 'Thay thế 02 bóng LED 100W bị sét đánh hư hỏng.',
    created_by: 'USR-001',
    allowed_actions: ['edit', 'cancel', 'reassign'],
    faults: [
      {
        fault_id: item.fault_ids[0] || 'FLT-001',
        pole_id: 'POLE-0019',
        fault_type: 'lamp_out',
        fault_status: 'confirmed',
        severity: 'high',
      },
    ],
  }
}

/**
 * Cập nhật trạng thái từ chối xin hủy trong mock store
 */
export function updateMockCancellationStatus(
  workOrderId: string,
  status: 'rejected' | 'none' | 'pending',
  rejectReason?: string
): void {
  mockWorkOrdersStore = mockWorkOrdersStore.map((wo) => {
    if (wo.work_order_id === workOrderId) {
      return {
        ...wo,
        cancellation_request_status: status,
        cancellation_reject_note: rejectReason || null,
        cancellation_rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }
    return wo
  })
}

/**
 * Cập nhật gán kỹ sư mới trong mock store (khi duyệt đổi kỹ sư)
 */
export function updateMockAssignee(workOrderId: string, newAssigneeId: string): void {
  mockWorkOrdersStore = mockWorkOrdersStore.map((wo) => {
    if (wo.work_order_id === workOrderId) {
      return {
        ...wo,
        assigned_to: newAssigneeId,
        cancellation_request_status: 'none', // Đã xử lý xong yêu cầu xin hủy
        updated_at: new Date().toISOString(),
      }
    }
    return wo
  })
}

/**
 * Cập nhật trạng thái lệnh công tác trong mock store (khi duyệt hủy lịch)
 */
export function updateMockWorkOrderStatus(
  workOrderId: string,
  woStatus: 'cancelled' | 'verified' | 'done',
  _endReason?: string
): void {
  mockWorkOrdersStore = mockWorkOrdersStore.map((wo) => {
    if (wo.work_order_id === workOrderId) {
      return {
        ...wo,
        wo_status: woStatus,
        cancellation_request_status: 'none',
        updated_at: new Date().toISOString(),
      }
    }
    return wo
  })
}

/**
 * Cập nhật ngày hẹn, hạn chót hoặc tiêu đề trong mock store
 */
export function patchMockWorkOrder(
  id: string,
  payload: { title?: string | null; scheduled_date?: string | null; due_date?: string | null }
): void {
  mockWorkOrdersStore = mockWorkOrdersStore.map((wo) => {
    if (wo.work_order_id === id) {
      return {
        ...wo,
        title: payload.title || wo.title,
        scheduled_date: payload.scheduled_date || wo.scheduled_date,
        due_date: payload.due_date || wo.due_date,
        updated_at: new Date().toISOString(),
      }
    }
    return wo
  })
}

/**
 * Xóa trạng thái xin hủy trong mock store (khi quản lý duyệt điều phối lại)
 */
export function clearMockCancellation(workOrderId: string): void {
  mockWorkOrdersStore = mockWorkOrdersStore.map((wo) => {
    if (wo.work_order_id === workOrderId) {
      return {
        ...wo,
        cancellation_request_status: 'none',
        cancellation_request_note: null,
        cancellation_requested_at: null,
        updated_at: new Date().toISOString(),
      }
    }
    return wo
  })
}

