/**
 * Types cho Work Schedule (Lịch làm việc & Tiến trình sự vụ)
 * Tái sử dụng trực tiếp 100% các kiểu dữ liệu đã sinh từ Backend (API Types First).
 * Chỉ định nghĩa tay các kiểu dữ liệu phục vụ riêng cho UI State (ScheduleCase, SchedulePhase).
 */

import type { TaskKind } from './common/enums'

// ==========================================
// 1. RE-EXPORT TRỰC TIẾP TỪ COMMON ENUMS & ORDERS
// Tuyệt đối không tự viết tay lại các enum / DTO đã có
// ==========================================

export type {
  TaskKind,
  WorkOrderStatus,
  InspectionOutcome,
  Severity,
  FaultType,
  FaultStatus,
  AgendaFlag,
} from './common/enums'

export type {
  WorkOrderLocation,
  WorkOrderFaultDetail,
  WorkOrderAssignee,
  WorkOrderItem,
  WorkOrderDetail,
  WorkOrderItemPagedResult,
  WorkOrderAssigneePagedResult,
  WorkOrderPole,
  WorkOrderPolePagedResult,
  CreateWorkOrderRequest,
  PatchWorkOrderRequest,
  AssignWorkOrderRequest,
  CompleteWorkOrderRequest,
  ReviewWorkOrderRequest,
  FollowUpWorkOrderRequest,
  StartWorkOrderRequest,
  FaultOutcomeRequest,
} from './workorders/orders'

// ==========================================
// 2. CẤU TRÚC HỒ SƠ SỰ VỤ & THANH TIẾN TRÌNH (STEPPER) - DÀNH RIÊNG CHO GIAO DIỆN (UI STATE)
// Backend trả về từng WorkOrderItem độc lập có case_id,
// Frontend gom nhóm và hiển thị dưới dạng Stepper 3 giai đoạn (Khảo sát -> Kiểm tra -> Sửa chữa).
// ==========================================

export interface SchedulePhase {
  phaseType: TaskKind
  name: string
  date: string
  assigneeId: string
  assigneeName: string
  status: 'pending' | 'reported' | 'ended'
  notes?: string
  materialsNote?: string // Ghi chú vật tư tự do (textarea)
  workOrderId?: string
  poleIds?: string[] // Danh sách các cột đèn cụ thể cần kiểm tra / sửa chữa
  report?: {
    submittedAt: string
    summary: string
    videoUrl?: string
    photoEvidence?: string[]
    luxMeasured?: string
    suggestedMaterialsNote?: string // Kỹ sư tự do nhập ghi chú đề xuất
    usedMaterialsNote?: string      // Kỹ sư nhập / Quản lý tự do chỉnh sửa
    aiDetections?: Array<{
      poleId: string
      issue: string
      confidence: number
    }>
  }
}

export interface ScheduleCase {
  code: string                  // Ví dụ: SCH-001 (giữ nguyên xuyên suốt)
  title: string
  segment: string
  currentPhaseIndex: number     // 0: Khảo sát, 1: Kiểm tra, 2: Sửa chữa, 3: Cấp trên
  isTerminated: boolean         // True nếu bị từ chối duyệt hoặc đóng sớm
  endReason?: string
  poleIds?: string[]            // Cột đèn liên quan của sự vụ
  phases: SchedulePhase[]       // Lịch sử các giai đoạn
}
