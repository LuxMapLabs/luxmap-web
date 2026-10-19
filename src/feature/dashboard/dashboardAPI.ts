import { apiClient } from '../../config/apiClient'
import type { FixtureStatusStatistics } from '../../types/statistics/fixture-status'
import type { RepairTimelinessStatistics } from '../../types/statistics/repair-timeliness'
import type { WarrantyList, WarrantyItem } from '../../types/statistics/warranty'
import type { FaultItem, FaultItemPagedResult } from '../../types/faults/faults'

export type { WarrantyItem }

// --- FALLBACK MOCK DATA DÀNH CHO XÃ BÌNH MINH (COM-001) ---
export const FALLBACK_FIXTURE_STATS: FixtureStatusStatistics = {
  as_of: '2026-10-15T15:45:00Z',
  group_by: ['data_source', 'segment'],
  rows: [
    {
      data_source: 1 as any,
      commune_id: 'COM-001',
      segment_id: 'SEG-01',
      pole_count: 42,
      normal: 37,
      dim: 3,
      out: 2,
      unknown: 0,
      never_surveyed: 0,
    },
    {
      data_source: 1 as any,
      commune_id: 'COM-001',
      segment_id: 'SEG-02',
      pole_count: 38,
      normal: 33,
      dim: 4,
      out: 1,
      unknown: 0,
      never_surveyed: 0,
    },
    {
      data_source: 1 as any,
      commune_id: 'COM-001',
      segment_id: 'SEG-03',
      pole_count: 28,
      normal: 25,
      dim: 1,
      out: 2,
      unknown: 0,
      never_surveyed: 0,
    },
  ],
}

export const FALLBACK_REPAIR_TIMELINESS: RepairTimelinessStatistics = {
  from: '2026-09-15',
  to: '2026-10-15',
  as_of: '2026-10-15T15:45:00Z',
  group_by: ['commune'],
  rows: [
    {
      commune_id: 'COM-001',
      completed: 6,
      on_time: 6,
      late: 0,
      no_due_date: 0,
      on_time_rate: 1.0,
      open_overdue: 1,
    },
  ],
}

export const FALLBACK_WARRANTY_LIST: WarrantyList = {
  today: '2026-10-15',
  expiring_within_days: 90,
  page: 1,
  page_size: 20,
  total: 11,
  items: [
    {
      pole_id: 'P-BM-009',
      segment_id: 'SEG-01',
      commune_id: 'COM-001',
      data_source: 1 as any,
      fixture_id: 'FX-0012',
      fixture_type: 'LED' as any,
      lamp_watt: 100,
      install_date: '2024-10-01',
      warranty_expiry: '2026-10-01',
      warranty_status: 'expired' as any,
      days_remaining: -18,
    },
    {
      pole_id: 'P-BM-018',
      segment_id: 'SEG-01',
      commune_id: 'COM-001',
      data_source: 1 as any,
      fixture_id: 'FX-0029',
      fixture_type: 'HighPressureSodium' as any,
      lamp_watt: 150,
      install_date: '2024-10-10',
      warranty_expiry: '2026-10-10',
      warranty_status: 'expired' as any,
      days_remaining: -9,
    },
    {
      pole_id: 'P-BM-014',
      segment_id: 'SEG-01',
      commune_id: 'COM-001',
      data_source: 1 as any,
      fixture_id: 'FX-0023',
      fixture_type: 'LED' as any,
      lamp_watt: 100,
      install_date: '2024-10-28',
      warranty_expiry: '2026-10-28',
      warranty_status: 'expiring' as any,
      days_remaining: 9,
    },
    {
      pole_id: 'P-BM-042',
      segment_id: 'SEG-02',
      commune_id: 'COM-001',
      data_source: 1 as any,
      fixture_id: 'FX-0041',
      fixture_type: 'LED' as any,
      lamp_watt: 150,
      install_date: '2024-11-05',
      warranty_expiry: '2026-11-05',
      warranty_status: 'expiring' as any,
      days_remaining: 17,
    },
    {
      pole_id: 'P-BM-078',
      segment_id: 'SEG-03',
      commune_id: 'COM-001',
      data_source: 1 as any,
      fixture_id: 'FX-0089',
      fixture_type: 'LED' as any,
      lamp_watt: 100,
      install_date: '2024-11-18',
      warranty_expiry: '2026-11-18',
      warranty_status: 'expiring' as any,
      days_remaining: 30,
    },
    {
      pole_id: 'P-BM-105',
      segment_id: 'SEG-01',
      commune_id: 'COM-001',
      data_source: 1 as any,
      fixture_id: 'FX-0112',
      fixture_type: 'LED' as any,
      lamp_watt: 100,
      install_date: '2024-11-25',
      warranty_expiry: '2026-11-25',
      warranty_status: 'expiring' as any,
      days_remaining: 37,
    },
  ],
}

export const FALLBACK_FAULTS_LIST: FaultItem[] = [
  {
    fault_id: 'FLT-001',
    pole_id: 'P-BM-014',
    segment_id: 'SEG-01',
    fixture_id: 'FX-0023',
    location: { lat: 10.9745, lng: 106.4982 },
    fault_type: 'blackout' as any,
    fault_status: 'in_progress' as any,
    severity: 'critical' as any,
    source_channel: 'sweep' as any,
    detected_at: '2026-10-14T22:30:00Z',
    work_order_id: 'WO-0004',
    note: 'Đo được: 0 Lux - Mất sáng hoàn toàn',
    allowed_actions: ['confirm', 'reclassify'],
  },
  {
    fault_id: 'FLT-002',
    pole_id: 'P-BM-022',
    segment_id: 'SEG-01',
    fixture_id: 'FX-0031',
    location: { lat: 10.9752, lng: 106.4991 },
    fault_type: 'blackout' as any,
    fault_status: 'reported' as any,
    severity: 'critical' as any,
    source_channel: 'citizen' as any,
    detected_at: '2026-10-15T08:30:00Z',
    work_order_id: null,
    note: 'Người dân báo vỡ chóa đèn và mất sáng',
    allowed_actions: ['confirm', 'reject'],
  },
  {
    fault_id: 'FLT-003',
    pole_id: 'P-BM-038',
    segment_id: 'SEG-02',
    fixture_id: 'FX-0055',
    location: { lat: 10.9768, lng: 106.5015 },
    fault_type: 'dim' as any,
    fault_status: 'scheduled' as any,
    severity: 'medium' as any,
    source_channel: 'sweep' as any,
    detected_at: '2026-10-14T23:15:00Z',
    work_order_id: 'WO-0007',
    note: 'Độ rọi chỉ đạt 3.8 Lux (Chuẩn 20 Lux)',
    allowed_actions: ['confirm'],
  },
  {
    fault_id: 'FLT-004',
    pole_id: 'P-BM-049',
    segment_id: 'SEG-02',
    fixture_id: 'FX-0068',
    location: { lat: 10.9781, lng: 106.5032 },
    fault_type: 'blackout' as any,
    fault_status: 'reported' as any,
    severity: 'critical' as any,
    source_channel: 'iot' as any,
    detected_at: '2026-10-15T02:15:00Z',
    work_order_id: null,
    note: 'Mất pha điện nhánh theo cảnh báo từ tủ',
    allowed_actions: ['confirm'],
  },
  {
    fault_id: 'FLT-005',
    pole_id: 'P-BM-063',
    segment_id: 'SEG-03',
    fixture_id: 'FX-0092',
    location: { lat: 10.9802, lng: 106.5065 },
    fault_type: 'dim' as any,
    fault_status: 'reported' as any,
    severity: 'medium' as any,
    source_channel: 'sweep' as any,
    detected_at: '2026-10-14T23:45:00Z',
    work_order_id: null,
    note: 'Độ rọi đo được 5.2 Lux',
    allowed_actions: ['confirm'],
  },
]

import type { SegmentListItem, SegmentListItemPagedResult } from '../../types/assets/segments'

// --- CÁC HÀM GỌI API BACKEND THỰC TẾ ---

/**
 * 0. Lấy danh sách tuyến đường thực tế của địa bàn
 * GET /api/v1/assets/segments
 */
export async function fetchSegmentsList(communeId?: string): Promise<SegmentListItem[]> {
  try {
    const params: Record<string, any> = { page_size: 100 }
    if (communeId) params.commune_id = communeId

    const res = await apiClient.get<SegmentListItemPagedResult>('/assets/segments', { params })
    return res.data?.items || []
  } catch (error) {
    console.warn('[DashboardAPI] Fetch segments failed:', error)
    return []
  }
}

/**
 * 1. Thống kê tình trạng bóng đèn (Normal / Dim / Out / Unknown)
 * GET /api/v1/statistics/fixture-status
 */
export async function fetchFixtureStatusStatistics(params: {
  commune_id?: string
  segment_id?: string
  group_by?: string
}): Promise<FixtureStatusStatistics> {
  try {
    // Làm sạch params rỗng
    const cleanParams: Record<string, any> = {}
    if (params.commune_id) cleanParams.commune_id = params.commune_id
    if (params.segment_id) cleanParams.segment_id = params.segment_id
    if (params.group_by) cleanParams.group_by = params.group_by

    const res = await apiClient.get<FixtureStatusStatistics>('/statistics/fixture-status', { params: cleanParams })
    if (res.data && res.data.rows) {
      return res.data
    }
    return { as_of: new Date().toISOString(), group_by: ['data_source', 'segment'], rows: [] }
  } catch (error) {
    console.warn('[DashboardAPI] Fetch fixture status failed:', error)
    return { as_of: new Date().toISOString(), group_by: ['data_source', 'segment'], rows: [] }
  }
}

/**
 * 2. Thống kê độ kịp thời sửa chữa đêm & phiếu quá hạn
 * GET /api/v1/statistics/repair-timeliness
 */
export async function fetchRepairTimelinessStatistics(params: {
  commune_id?: string
  from?: string
  to?: string
  group_by?: string
}): Promise<RepairTimelinessStatistics> {
  try {
    const cleanParams: Record<string, any> = {}
    if (params.commune_id) cleanParams.commune_id = params.commune_id
    if (params.from) cleanParams.from = params.from
    if (params.to) cleanParams.to = params.to
    if (params.group_by) cleanParams.group_by = params.group_by

    const res = await apiClient.get<RepairTimelinessStatistics>('/statistics/repair-timeliness', { params: cleanParams })
    if (res.data && res.data.rows) {
      return res.data
    }
    return { from: '', to: '', as_of: new Date().toISOString(), group_by: [], rows: [] }
  } catch (error) {
    console.warn('[DashboardAPI] Fetch repair timeliness failed:', error)
    return { from: '', to: '', as_of: new Date().toISOString(), group_by: [], rows: [] }
  }
}

/**
 * 3. Thống kê và danh sách bóng đèn bảo hành (Lọc: Quá hạn hoặc Sắp hết hạn trong vòng 1 tháng / 30 ngày)
 * GET /api/v1/statistics/warranty
 */
export async function fetchWarrantyStatistics(params: {
  commune_id?: string
  segment_id?: string
  status?: string
  within_days?: number
  page?: number
  page_size?: number
}): Promise<WarrantyList> {
  try {
    const cleanParams: Record<string, any> = {
      within_days: params.within_days || 30, // Mặc định 1 tháng (30 ngày)
      status: params.status || 'expired,expiring', // Chỉ lấy đã quá hạn hoặc sắp hết hạn
      page_size: params.page_size || 100,
    }
    if (params.commune_id) cleanParams.commune_id = params.commune_id
    if (params.segment_id) cleanParams.segment_id = params.segment_id
    if (params.page) cleanParams.page = params.page

    const res = await apiClient.get<WarrantyList>('/statistics/warranty', { params: cleanParams })
    if (res.data && res.data.items) {
      // Đảm bảo lọc chuẩn: Chỉ giữ lại bóng đã hết hạn (days_remaining < 0) hoặc sắp hết hạn trong 30 ngày (0 <= days_remaining <= 30)
      const validFilteredItems = res.data.items.filter(
        (i) => i.days_remaining != null && i.days_remaining <= 30
      )
      return {
        ...res.data,
        total: validFilteredItems.length,
        items: validFilteredItems,
      }
    }
    return { today: new Date().toISOString().split('T')[0], expiring_within_days: 30, page: 1, page_size: 50, total: 0, items: [] }
  } catch (error) {
    console.warn('[DashboardAPI] Fetch warranty failed:', error)
    return { today: new Date().toISOString().split('T')[0], expiring_within_days: 30, page: 1, page_size: 50, total: 0, items: [] }
  }
}

/**
 * 4. Lấy danh sách bóng đèn đang gặp sự cố
 * GET /api/v1/faults
 */
export async function fetchFaultsList(params: {
  commune_id?: string
  segment_id?: string
  status?: string
  sort?: string
  page?: number
  page_size?: number
}): Promise<FaultItem[]> {
  try {
    const cleanParams: Record<string, any> = {
      page_size: params.page_size || 100,
      sort: params.sort || '-detected_at',
    }
    if (params.commune_id) cleanParams.commune_id = params.commune_id
    if (params.segment_id) cleanParams.segment_id = params.segment_id
    if (params.status) cleanParams.status = params.status
    if (params.page) cleanParams.page = params.page

    const res = await apiClient.get<FaultItemPagedResult>('/faults', { params: cleanParams })
    return res.data?.items || []
  } catch (error) {
    console.warn('[DashboardAPI] Fetch faults failed:', error)
    return []
  }
}

/**
 * 5. Tải file báo cáo CSV từ Backend (tận dụng format=csv)
 */
export async function downloadStatisticsCsv(
  endpoint: 'fixture-status' | 'repair-timeliness' | 'warranty',
  params: Record<string, any>,
  fileName: string
): Promise<void> {
  try {
    const res = await apiClient.get(`/statistics/${endpoint}`, {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('[DashboardAPI] Download CSV failed:', error)
    throw error
  }
}
