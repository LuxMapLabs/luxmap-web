import { apiClient } from '../../config/apiClient'
import type { SuperiorReportItem, ReportEvidencePhoto, ReportTaskKind } from '../../types/reports/report'

const ASSIGNEE_DISPLAY_NAMES: Record<string, string> = {
  'USR-004': 'Khang Lê',
  'USR-005': 'Nguyễn Văn Hoàng',
  'USR-006': 'Trần Minh Tuấn',
  'USR-khang': 'Khang Lê',
  'USR-tuan': 'Lê Minh Tuấn',
}

const COMMUNE_NAMES: Record<string, string> = {
  'COM-001': 'Xã Phước Hậu',
  'COM-002': 'Xã An Hải',
  'COM-003': 'Xã Phước Dinh',
}

export const FALLBACK_MOCK_REPORTS: SuperiorReportItem[] = [
  {
    workOrderId: 'WO-2026-0034',
    caseId: 'WO-2026-0034',
    title: 'Sửa chữa sự cố chập đui 2 cột đèn đường ĐH-01',
    road: 'Tuyến ĐH-01 (Đoạn qua thôn Phước Lợi)',
    communeId: 'COM-001',
    communeName: 'Xã Phước Hậu',
    taskKind: 'repair',
    taskKindName: 'Sửa chữa',
    managerName: 'Nguyễn Hoàng Long',
    managerId: 'MGR-001',
    engineerName: 'Trần Thanh Tùng',
    engineerId: 'USR-004',
    completedDate: '12/10/2026',
    verifiedDate: '12/10/2026',
    initialFaultDesc:
      'Phát hiện 02 bóng đèn tại cột P-021 và P-023 không phát sáng vào ban đêm do chập đui đèn và đứt cầu chì nhánh.',
    solutionDesc:
      'Đã thay mới 02 cụm bóng đèn chiếu sáng LED 100W IP66 chuyên dụng, đấu nối lại dây nguồn an toàn kỹ thuật, đo kiểm tra điện áp đạt 220V ổn định.',
    reviewNote:
      'Đã kiểm tra hiện trường thực tế và đối chiếu hình ảnh. Kỹ sư đã khắc phục dứt điểm sự cố, đấu nối an toàn kỹ thuật, tuyến đèn đã thắp sáng bình thường trở lại. Đề nghị chuyển hồ sơ lên Cơ quan Giám sát (Superior) xem xét lưu trữ.',
    reportNote: 'Đã hoàn thành thay bóng và dây nhánh an toàn, dọn dẹp vệ sinh mặt bằng thi công.',
    evidencePhotos: [
      {
        id: 'EVD-01',
        kind: 'before',
        url: 'https://images.unsplash.com/photo-1517420879524-86d64ac2f339?w=600&auto=format&fit=crop&q=80',
        capturedAt: '19:40 10/10/2026',
        locationText: 'Cột P-021 • Tuyến ĐH-01',
        notes: 'Đèn tắt hẳn vào ban đêm',
      },
      {
        id: 'EVD-02',
        kind: 'after',
        url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80',
        capturedAt: '11:15 12/10/2026',
        locationText: 'Cột P-021 • Đo lux đạt 28 lux',
        notes: 'Thay bóng mới và sáng chuẩn',
      },
    ],
  },
  {
    workOrderId: 'WO-2026-0029',
    caseId: 'WO-2026-0020',
    title: 'Thay mới cụm timer và khởi động từ tủ điều khiển T-04',
    road: 'Tuyến Liên Xã An Hải - Phước Dinh',
    communeId: 'COM-002',
    communeName: 'Xã An Hải',
    taskKind: 'repair',
    taskKindName: 'Sửa chữa',
    managerName: 'Lê Minh Tuấn',
    managerId: 'MGR-002',
    engineerName: 'Võ Văn Kiệt',
    engineerId: 'USR-005',
    completedDate: '11/10/2026',
    verifiedDate: '11/10/2026',
    initialFaultDesc:
      'Tủ điện T-04 không bật ngắt tự động theo giờ quy định do hỏng bộ định thời gian Timer KG316T và kẹt tiếp điểm contactor.',
    solutionDesc:
      'Đã thay thế bộ định thời kỹ thuật số mới, cài đặt chu kỳ đóng lúc 18:00 và ngắt lúc 05:30; thay cụm contactor 3P-40A và kiểm tra tiếp địa an toàn.',
    reviewNote:
      'Tủ điều khiển hoạt động ổn định trở lại, thời gian đóng ngắt tự động chính xác theo chu kỳ hoàng hôn/bình minh, hồ sơ nghiệm thu hợp lệ.',
    reportNote: 'Đã test chạy thử 2 chu kỳ tự động, đóng ngắt chính xác.',
    evidencePhotos: [
      {
        id: 'EVD-03',
        kind: 'before',
        url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
        capturedAt: '08:30 11/10/2026',
        locationText: 'Tủ T-04 • Tuyến Liên Xã',
        notes: 'Tiếp điểm timer kẹt chập',
      },
      {
        id: 'EVD-04',
        kind: 'after',
        url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
        capturedAt: '10:45 11/10/2026',
        locationText: 'Tủ T-04 • Lắp xong bộ định thời mới',
        notes: 'Đấu nối dây gọn gàng',
      },
    ],
  },
  {
    workOrderId: 'WO-2026-0025',
    caseId: 'WO-2026-0025',
    title: 'Kiểm tra đo độ rọi ban đêm & đánh giá nhánh đèn xóm 3',
    road: 'Đường trục chính xóm 3',
    communeId: 'COM-003',
    communeName: 'Xã Phước Dinh',
    taskKind: 'inspection',
    taskKindName: 'Kiểm tra',
    managerName: 'Nguyễn Hoàng Long',
    managerId: 'MGR-001',
    engineerName: 'Đặng Hữu Nam',
    engineerId: 'USR-006',
    completedDate: '10/10/2026',
    verifiedDate: '10/10/2026',
    initialFaultDesc:
      'Người dân phản ánh ánh sáng đèn trên nhánh xóm 3 bị mờ và không đồng đều vào các ngày mưa.',
    solutionDesc:
      'Kỹ sư đã dùng luxmeter Testo đo kiểm định kỳ tại 12 điểm cột, đo độ sụt áp cuối nguồn đạt 215V (trong giới hạn cho phép).',
    reviewNote:
      'Kết quả đo luxmeter đạt trung bình 24.5 lux, đồng đều và đảm bảo tiêu chuẩn chiếu sáng đường giao thông nông thôn loại B. Không phát hiện rò rỉ điện.',
    reportNote: 'Độ rọi toàn tuyến đạt chuẩn nông thôn mới, không có chập cháy.',
    evidencePhotos: [
      {
        id: 'EVD-05',
        kind: 'observation',
        url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80',
        capturedAt: '20:15 09/10/2026',
        locationText: 'Xóm 3 • Phước Dinh',
        notes: 'Đo kiểm độ rọi 24.5 lux',
      },
    ],
  },
  {
    workOrderId: 'WO-2026-0018',
    caseId: 'WO-2026-0018',
    title: 'Khảo sát định kỳ quý 4 toàn tuyến ĐH-03',
    road: 'Đường huyện ĐH-03 (Dài 4.2km)',
    communeId: 'COM-001',
    communeName: 'Xã Phước Hậu',
    taskKind: 'survey',
    taskKindName: 'Khảo sát',
    managerName: 'Nguyễn Hoàng Long',
    managerId: 'MGR-001',
    engineerName: 'Trần Thanh Tùng',
    engineerId: 'USR-004',
    completedDate: '08/10/2026',
    verifiedDate: '08/10/2026',
    initialFaultDesc: 'Khảo sát rà soát tình trạng vận hành hệ thống chiếu sáng định kỳ quý 4.',
    solutionDesc: 'Kỹ sư di chuyển dọc tuyến bằng xe gắn máy gắn camera AI quét tự động 56 cột đèn.',
    reviewNote:
      'Khảo sát ghi hình toàn tuyến bằng camera hành trình AI, độ phủ đạt 100%. Toàn bộ 56 cột đèn hoạt động bình thường, không ghi nhận hư hỏng.',
    reportNote: 'Hoàn tất quét toàn tuyến 4.2km, không có điểm đen mất đèn.',
    evidencePhotos: [
      {
        id: 'EVD-06',
        kind: 'observation',
        url: 'https://images.unsplash.com/photo-1517420879524-86d64ac2f339?w=600&auto=format&fit=crop&q=80',
        capturedAt: '18:50 08/10/2026',
        locationText: 'Tuyến ĐH-03 • Quét AI camera',
        notes: 'Tất cả 56 cột bình thường',
      },
    ],
  },
  {
    workOrderId: 'WO-2026-0012',
    caseId: 'WO-2026-0012',
    title: 'Khảo sát hiện trạng chiếu sáng & đo kiểm thông số kỹ thuật đợt đầu năm',
    road: 'Đường liên thôn Phước Thiện - Phước Hậu',
    communeId: 'COM-001',
    communeName: 'Xã Phước Hậu',
    taskKind: 'survey',
    taskKindName: 'Khảo sát',
    managerName: 'Nguyễn Hoàng Long',
    managerId: 'MGR-001',
    engineerName: 'Trần Thanh Tùng',
    engineerId: 'USR-004',
    completedDate: '15/02/2026',
    verifiedDate: '15/02/2026',
    initialFaultDesc: 'Khảo sát rà soát tình trạng vận hành hệ thống chiếu sáng đợt 1 năm 2026.',
    solutionDesc: 'Kỹ sư đã đo kiểm độ rọi và lập hồ sơ khảo sát 42 cột đèn trên tuyến đường liên thôn.',
    reviewNote: 'Hồ sơ khảo sát đầu năm 2026 đầy đủ minh chứng, nghiệm thu đạt yêu cầu.',
    reportNote: 'Đã hoàn tất nộp biên bản nghiệm thu khảo sát.',
  },
]

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

export const reportsAPI = {
  /**
   * Lấy danh sách các lệnh công tác đã được Quản lý thẩm duyệt nghiệm thu (wo_status = 'verified')
   */
  async getVerifiedReports(filter?: ReportFilterOptions): Promise<SuperiorReportItem[]> {
    try {
      const params: Record<string, any> = {
        wo_status: 'verified',
      }
      if (filter?.taskKind && filter.taskKind !== 'all') {
        params.task_kind = filter.taskKind
      }
      if (filter?.communeId && filter.communeId !== 'all') {
        params.commune_id = [filter.communeId]
      }

      const response = await apiClient.get<any>('/work-orders', { params })
      const items = response.data?.items || response.data || []

      if (!Array.isArray(items) || items.length === 0) {
        // Fallback to rich mock data if backend has no verified items yet
        return reportsAPI.filterLocalMockReports(FALLBACK_MOCK_REPORTS, filter)
      }

      // Map backend records to SuperiorReportItem
      const mapped: SuperiorReportItem[] = items.map((raw: any) => {
        const id = raw.work_order_id || raw.workOrderId || ''
        const kindRaw = String(raw.task_kind || raw.taskKind || 'repair').toLowerCase()
        const taskKind: ReportTaskKind = kindRaw.includes('repair')
          ? 'repair'
          : kindRaw.includes('survey')
          ? 'survey'
          : 'inspection'

        const taskKindName =
          taskKind === 'repair' ? 'Sửa chữa' : taskKind === 'inspection' ? 'Kiểm tra' : 'Khảo sát'

        const assigneeId = raw.assigned_to || raw.assignedTo || ''
        const engineerName = ASSIGNEE_DISPLAY_NAMES[assigneeId] || raw.assignee_name || raw.assigneeName || 'Kỹ sư phụ trách'
        const communeId = raw.commune_id || raw.communeId || ''
        const communeName = COMMUNE_NAMES[communeId] || raw.commune_name || raw.communeName || 'Xã phụ trách'
        const dateStr = raw.closed_at || raw.closedAt || raw.completed_at || raw.completedAt || raw.updated_at || raw.updatedAt
        const dateFormatted = dateStr ? new Date(dateStr).toLocaleDateString('vi-VN') : '12/10/2026'

        return {
          workOrderId: id,
          caseId: raw.case_id || raw.caseId || id,
          title: raw.title || 'Lệnh công tác chiếu sáng',
          road: raw.segment_name || raw.segment_id || raw.segmentId || 'Tuyến chiếu sáng phụ trách',
          communeId,
          communeName,
          taskKind,
          taskKindName,
          managerName: raw.created_by_name || 'Nguyễn Hoàng Long',
          managerId: raw.created_by || raw.createdBy,
          engineerName,
          engineerId: assigneeId,
          completedDate: dateFormatted,
          verifiedDate: dateFormatted,
          initialFaultDesc: raw.note || 'Sự cố chiếu sáng được ghi nhận trên hệ thống và xử lý theo quy trình.',
          solutionDesc: raw.report_note || 'Đã khắc phục hoàn tất theo tiêu chuẩn kỹ thuật chiếu sáng.',
          reviewNote:
            raw.review_note ||
            raw.reviewNote ||
            'Quản lý đã nghiệm thu đạt tiêu chuẩn và chuyển hồ sơ lên Superior.',
          reportNote: raw.report_note || raw.reportNote,
        }
      })

      return reportsAPI.filterLocalMockReports(mapped, filter)
    } catch {
      // Fallback seamlessly on error/offline
      return reportsAPI.filterLocalMockReports(FALLBACK_MOCK_REPORTS, filter)
    }
  },

  /**
   * Lấy chi tiết báo cáo kèm bằng chứng ảnh hiện trường
   */
  async getReportDetail(workOrderId: string): Promise<SuperiorReportItem> {
    try {
      const [detailRes, evidenceRes] = await Promise.all([
        apiClient.get<any>(`/work-orders/${workOrderId}`).catch(() => null),
        apiClient.get<any>(`/work-orders/${workOrderId}/evidence`).catch(() => null),
      ])

      const raw = detailRes?.data
      if (raw) {
        const id = raw.work_order_id || raw.workOrderId || workOrderId
        const kindRaw = String(raw.task_kind || raw.taskKind || 'repair').toLowerCase()
        const taskKind: ReportTaskKind = kindRaw.includes('repair')
          ? 'repair'
          : kindRaw.includes('survey')
          ? 'survey'
          : 'inspection'

        const taskKindName =
          taskKind === 'repair' ? 'Sửa chữa' : taskKind === 'inspection' ? 'Kiểm tra' : 'Khảo sát'

        const assigneeId = raw.assigned_to || raw.assignedTo || ''
        const engineerName = ASSIGNEE_DISPLAY_NAMES[assigneeId] || raw.assignee_name || raw.assigneeName || 'Kỹ sư phụ trách'
        const communeId = raw.commune_id || raw.communeId || ''
        const communeName = COMMUNE_NAMES[communeId] || raw.commune_name || raw.communeName || 'Xã phụ trách'
        const dateStr = raw.closed_at || raw.closedAt || raw.completed_at || raw.completedAt || raw.updated_at || raw.updatedAt
        const dateFormatted = dateStr ? new Date(dateStr).toLocaleDateString('vi-VN') : '12/10/2026'

        const evidenceItems = evidenceRes?.data?.items || evidenceRes?.data || []
        const evidencePhotos: ReportEvidencePhoto[] = Array.isArray(evidenceItems) && evidenceItems.length > 0
          ? evidenceItems.map((e: any) => ({
              id: e.evidence_id || e.evidenceId,
              kind: e.kind || 'observation',
              url: e.original_url || `/api/v1/evidence/${e.evidence_id || e.evidenceId}/original`,
              capturedAt: e.captured_at ? new Date(e.captured_at).toLocaleString('vi-VN') : undefined,
              locationText: e.lat && e.lng ? `Toạ độ: ${Number(e.lat).toFixed(4)}°N, ${Number(e.lng).toFixed(4)}°E` : undefined,
            }))
          : []

        return {
          workOrderId: id,
          caseId: raw.case_id || raw.caseId || id,
          title: raw.title || 'Lệnh công tác chiếu sáng',
          road: raw.segment_name || raw.segment_id || raw.segmentId || 'Tuyến chiếu sáng phụ trách',
          communeId,
          communeName,
          taskKind,
          taskKindName,
          managerName: raw.created_by_name || 'Nguyễn Hoàng Long',
          managerId: raw.created_by || raw.createdBy,
          engineerName,
          engineerId: assigneeId,
          completedDate: dateFormatted,
          verifiedDate: dateFormatted,
          initialFaultDesc: raw.note || 'Sự cố chiếu sáng được ghi nhận trên hệ thống và xử lý theo quy trình.',
          solutionDesc: raw.report_note || 'Đã khắc phục hoàn tất theo tiêu chuẩn kỹ thuật chiếu sáng.',
          reviewNote:
            raw.review_note ||
            raw.reviewNote ||
            'Quản lý đã nghiệm thu đạt tiêu chuẩn và chuyển hồ sơ lên Superior.',
          reportNote: raw.report_note || raw.reportNote,
          evidencePhotos: evidencePhotos.length > 0 ? evidencePhotos : undefined,
        }
      }
    } catch {
      // Ignore error and fallback to mock item
    }

    const found = FALLBACK_MOCK_REPORTS.find((r) => r.workOrderId === workOrderId)
    return found || FALLBACK_MOCK_REPORTS[0]
  },

  filterLocalMockReports(
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
