import { apiClient } from '../../config/apiClient'
import type { SuperiorReportItem, ReportEvidencePhoto, ReportTaskKind } from '../../types/reports/report'
import type {
  WorkOrderItem,
  WorkOrderItemPagedResult,
  WorkOrderDetail,
  EvidenceItemPagedResult,
} from '../../types/workorders/orders'
import type { SegmentListItemPagedResult } from '../../types/assets/segments'
import { formatDate } from '../../utils/dateUtils'
import { segmentLabelFromIds } from '../../utils/work-schedule/workScheduleUtils'

const TASK_KIND_NAMES: Record<string, string> = {
  repair: 'Sửa chữa',
  inspection: 'Kiểm tra',
  survey: 'Khảo sát',
}

// Backend chỉ trả mã tài khoản (assigned_to, created_by), chưa có họ tên: hiển thị mã, thiếu thì '-'
const toReportItem = (
  raw: WorkOrderItem,
  communeNames: Record<string, string>,
  segmentNames: Record<string, string>
): SuperiorReportItem => {
  const communeId = raw.commune_id || ''
  return {
    workOrderId: raw.work_order_id || '',
    caseId: raw.case_id || '',
    title: raw.title || '-',
    road: segmentLabelFromIds([raw.segment_id], segmentNames) || '-',
    communeId,
    communeName: communeNames[communeId] || '-',
    taskKind: raw.task_kind as ReportTaskKind,
    taskKindName: (raw.task_kind && TASK_KIND_NAMES[raw.task_kind]) || '-',
    managerName: '-',
    engineerName: raw.assigned_to || '-',
    engineerId: raw.assigned_to || undefined,
    completedDate: '-',
    verifiedDate: formatDate(raw.updated_at) || '-',
    initialFaultDesc: '-',
    solutionDesc: '-',
    reviewNote: '-',
  }
}

export interface ReportFilterOptions {
  taskKind?: string
  communeId?: string
  month?: number // 0-indexed: 0 = Tháng 1, 1 = Tháng 2, ...
  year?: number // e.g. 2026
  monthYear?: string // e.g. "10/2026"
  searchQuery?: string
}

/**
 * Trích xuất tháng (0-indexed) và năm từ chuỗi ngày (hỗ trợ DD/MM/YYYY, YYYY-MM-DD, ISO string)
 */
export function parseReportMonthYear(dateStr?: string): { month: number; year: number } | null {
  if (!dateStr) return null
  const clean = dateStr.trim()
  const slashParts = clean.split('/')
  if (slashParts.length === 3) {
    const month = parseInt(slashParts[1], 10) - 1
    const year = parseInt(slashParts[2], 10)
    if (!isNaN(month) && !isNaN(year)) {
      return { month, year }
    }
  }
  const dashParts = clean.split('-')
  if (dashParts.length === 3 && dashParts[0].length === 4) {
    const year = parseInt(dashParts[0], 10)
    const month = parseInt(dashParts[1], 10) - 1
    if (!isNaN(month) && !isNaN(year)) {
      return { month, year }
    }
  }
  const d = new Date(clean)
  if (!isNaN(d.getTime())) {
    return { month: d.getMonth(), year: d.getFullYear() }
  }
  return null
}

/** Tên tuyến chỉ để hiển thị: không tải được thì cột tuyến hiện mã tuyến hoặc '-' */
async function loadSegmentNames(): Promise<Record<string, string>> {
  const res = await apiClient
    .get<SegmentListItemPagedResult>('/assets/segments', { params: { page_size: 200 } })
    .catch(() => null)
  const names: Record<string, string> = {}
  res?.data?.items?.forEach((seg) => {
    if (seg.segment_id && seg.segment_name) names[seg.segment_id] = seg.segment_name
  })
  return names
}

export const reportsAPI = {
  /**
   * Lấy danh sách các lệnh công tác đã được Quản lý thẩm duyệt nghiệm thu (wo_status = 'verified').
   * Lỗi mạng / máy chủ được ném ra để trang hiển thị trạng thái lỗi.
   */
  async getVerifiedReports(
    filter: ReportFilterOptions | undefined,
    communeNames: Record<string, string>
  ): Promise<SuperiorReportItem[]> {
    const [ordersRes, segmentNames] = await Promise.all([
      apiClient.get<WorkOrderItemPagedResult>('/work-orders', { params: { wo_status: 'verified', page_size: 200 } }),
      loadSegmentNames(),
    ])
    const items = (ordersRes.data?.items || []).map((raw) => toReportItem(raw, communeNames, segmentNames))
    return reportsAPI.filterReports(items, filter)
  },

  /**
   * Bổ sung cho một dòng báo cáo phần chỉ có ở chi tiết lệnh: ghi chú, mốc thời gian và ảnh hiện trường
   */
  async getReportDetail(summary: SuperiorReportItem): Promise<SuperiorReportItem> {
    const [detailRes, evidenceRes, segmentNames] = await Promise.all([
      apiClient.get<WorkOrderDetail>(`/work-orders/${summary.workOrderId}`),
      apiClient.get<EvidenceItemPagedResult>(`/work-orders/${summary.workOrderId}/evidence`).catch(() => null),
      loadSegmentNames(),
    ])
    const raw = detailRes.data
    const evidencePhotos: ReportEvidencePhoto[] = (evidenceRes?.data?.items || [])
      .filter((e) => e.evidence_id && e.original_url && e.kind)
      .map((e) => ({
        id: e.evidence_id as string,
        kind: e.kind as ReportEvidencePhoto['kind'],
        url: e.original_url as string,
        capturedAt: e.captured_at ? new Date(e.captured_at).toLocaleString('vi-VN') : undefined,
        locationText:
          e.lat != null && e.lng != null ? `Toạ độ: ${e.lat.toFixed(4)}°N, ${e.lng.toFixed(4)}°E` : undefined,
      }))

    return {
      ...summary,
      road: segmentLabelFromIds([raw.segment_id, ...(raw.segment_ids ?? [])], segmentNames) || summary.road,
      managerName: raw.created_by || '-',
      managerId: raw.created_by || undefined,
      completedDate: formatDate(raw.completed_at) || '-',
      verifiedDate: formatDate(raw.closed_at) || summary.verifiedDate,
      initialFaultDesc: raw.note || '-',
      solutionDesc: raw.report_note || '-',
      reviewNote: raw.review_note || '-',
      reportNote: raw.report_note || undefined,
      evidencePhotos: evidencePhotos.length > 0 ? evidencePhotos : undefined,
    }
  },

  filterReports(
    reports: SuperiorReportItem[],
    filter?: ReportFilterOptions
  ): SuperiorReportItem[] {
    return reports.filter((item) => {
      // 1. Lọc theo Tháng & Năm (dựa vào verifiedDate hoặc completedDate)
      if (filter?.month !== undefined && filter?.year !== undefined) {
        const dateObj = parseReportMonthYear(item.verifiedDate || item.completedDate)
        if (dateObj) {
          if (dateObj.month !== filter.month || dateObj.year !== filter.year) {
            return false
          }
        }
      }

      // 2. Lọc task kind (Giai đoạn)
      if (filter?.taskKind && filter.taskKind !== 'all' && item.taskKind !== filter.taskKind) {
        return false
      }

      // 3. Lọc commune (Địa bàn xã)
      if (filter?.communeId && filter.communeId !== 'all') {
        if (item.communeId !== filter.communeId && item.communeName !== filter.communeId) {
          return false
        }
      }

      // 4. Lọc search query (Từ khóa)
      if (filter?.searchQuery) {
        const q = filter.searchQuery.toLowerCase().trim()
        const match =
          item.workOrderId.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.road.toLowerCase().includes(q) ||
          item.managerName.toLowerCase().includes(q) ||
          item.engineerName.toLowerCase().includes(q) ||
          item.communeName.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  },
}
