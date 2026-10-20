import { apiClient } from '../../config/apiClient'
import type { FixtureStatusStatistics } from '../../types/statistics/fixture-status'
import type { RepairTimelinessStatistics } from '../../types/statistics/repair-timeliness'
import type { WarrantyList, WarrantyItem } from '../../types/statistics/warranty'
import type { FaultItem, FaultItemPagedResult } from '../../types/faults/faults'

export type { WarrantyItem }

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
