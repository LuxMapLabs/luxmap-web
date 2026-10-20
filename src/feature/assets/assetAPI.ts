import apiClient from '../../config/apiClient'
import type { ImportResult } from '../../types/assets/import'
import type {
  SegmentListItemPagedResult,
  CreateSegmentRequest,
  UpdateSegmentRequest,
} from '../../types/assets/segments'
import type {
  CabinetListItemPagedResult,
  CreateCabinetRequest,
  UpdateCabinetRequest,
  CabinetDetail,
} from '../../types/assets/cabinets'
import type {
  FeederListItemPagedResult,
  CreateFeederRequest,
  UpdateFeederRequest,
  FeederDetail,
} from '../../types/assets/feeders'
import type {
  PoleListItemPagedResult,
  CreatePoleRequest,
  UpdatePoleRequest,
} from '../../types/assets/poles'
import type {
  CreateFixtureRequest,
  RetireFixtureRequest,
} from '../../types/assets/fixtures'

export type ImportAssetCategory = 'segments' | 'cabinets' | 'feeders' | 'poles' | 'fixtures' | 'poles_and_fixtures'

export interface AssetQueryParams {
  page?: number
  page_size?: number
  commune_id?: string[]
}

export const assetAPI = {
  /**
   * Lấy danh sách Tuyến đường
   * GET /api/v1/assets/segments
   */
  getSegments: async (params?: AssetQueryParams): Promise<SegmentListItemPagedResult> => {
    const response = await apiClient.get<SegmentListItemPagedResult>('/assets/segments', { params })
    return response.data
  },

  /**
   * Lấy danh sách Tủ điện
   * GET /api/v1/assets/cabinets
   */
  getCabinets: async (params?: AssetQueryParams): Promise<CabinetListItemPagedResult> => {
    const response = await apiClient.get<CabinetListItemPagedResult>('/assets/cabinets', { params })
    return response.data
  },

  /**
   * Lấy chi tiết Tủ điện
   * GET /api/v1/assets/cabinets/{cabinetId}
   */
  getCabinetDetail: async (cabinetId: string): Promise<CabinetDetail> => {
    const response = await apiClient.get<CabinetDetail>(`/assets/cabinets/${encodeURIComponent(cabinetId)}`)
    return response.data
  },

  /**
   * Lấy danh sách Mạch điện (Feeders)
   * GET /api/v1/assets/feeders
   */
  getFeeders: async (params?: AssetQueryParams): Promise<FeederListItemPagedResult> => {
    const response = await apiClient.get<FeederListItemPagedResult>('/assets/feeders', { params })
    return response.data
  },

  /**
   * Lấy chi tiết Mạch điện
   * GET /api/v1/assets/feeders/{feederId}
   */
  getFeederDetail: async (feederId: string): Promise<FeederDetail> => {
    const response = await apiClient.get<FeederDetail>(`/assets/feeders/${encodeURIComponent(feederId)}`)
    return response.data
  },

  /**
   * Thêm mới Mạch điện
   * POST /api/v1/assets/feeders
   */
  createFeeder: async (data: CreateFeederRequest): Promise<void> => {
    await apiClient.post('/assets/feeders', data)
  },

  /**
   * Cập nhật Mạch điện
   * PUT /api/v1/assets/feeders/{feederId}
   */
  updateFeeder: async (feederId: string, data: UpdateFeederRequest): Promise<void> => {
    await apiClient.put(`/assets/feeders/${encodeURIComponent(feederId)}`, data)
  },

  /**
   * Xóa Mạch điện
   * DELETE /api/v1/assets/feeders/{feederId}
   */
  deleteFeeder: async (feederId: string): Promise<void> => {
    await apiClient.delete(`/assets/feeders/${encodeURIComponent(feederId)}`)
  },

  /**
   * Lấy danh sách Cột điện chiếu sáng
   * GET /api/v1/assets/poles
   */
  getPoles: async (params?: AssetQueryParams): Promise<PoleListItemPagedResult> => {
    const response = await apiClient.get<PoleListItemPagedResult>('/assets/poles', { params })
    return response.data
  },

  /**
   * Thêm mới Cột điện
   * POST /api/v1/assets/poles
   */
  createPole: async (data: CreatePoleRequest): Promise<void> => {
    await apiClient.post('/assets/poles', data)
  },

  /**
   * Cập nhật Cột điện
   * PUT /api/v1/assets/poles/{poleId}
   */
  updatePole: async (poleId: string, data: UpdatePoleRequest): Promise<void> => {
    await apiClient.put(`/assets/poles/${encodeURIComponent(poleId)}`, data)
  },

  /**
   * Thêm mới Tủ điện
   * POST /api/v1/assets/cabinets
   */
  createCabinet: async (data: CreateCabinetRequest): Promise<string | null> => {
    const response = await apiClient.post('/assets/cabinets', data)
    const loc = (response.headers?.location || response.headers?.Location) as string | undefined
    if (loc) {
      const parts = loc.split('/')
      return parts[parts.length - 1] || null
    }
    return null
  },

  /**
   * Cập nhật Tủ điện
   * PUT /api/v1/assets/cabinets/{cabinetId}
   */
  updateCabinet: async (cabinetId: string, data: UpdateCabinetRequest): Promise<void> => {
    await apiClient.put(`/assets/cabinets/${encodeURIComponent(cabinetId)}`, data)
  },

  /**
   * Thêm mới Tuyến đường
   * POST /api/v1/assets/segments
   */
  createSegment: async (data: CreateSegmentRequest): Promise<void> => {
    await apiClient.post('/assets/segments', data)
  },

  /**
   * Cập nhật Tuyến đường
   * PUT /api/v1/assets/segments/{segmentId}
   */
  updateSegment: async (segmentId: string, data: UpdateSegmentRequest): Promise<void> => {
    await apiClient.put(`/assets/segments/${encodeURIComponent(segmentId)}`, data)
  },

  /**
   * Gắn bóng đèn mới lên cột
   * POST /api/v1/assets/fixtures
   */
  createFixture: async (data: CreateFixtureRequest): Promise<void> => {
    await apiClient.post('/assets/fixtures', data)
  },

  /**
   * Tháo gỡ bóng đèn (Retire fixture)
   * PUT /api/v1/assets/fixtures/{fixtureId}/removal
   */
  retireFixture: async (fixtureId: string, data: RetireFixtureRequest): Promise<void> => {
    await apiClient.put(`/assets/fixtures/${encodeURIComponent(fixtureId)}/removal`, data)
  },

  /**
   * Nạp danh mục Tuyến đường qua CSV/GeoJSON
   * POST /api/v1/assets/import/segments
   */
  importSegments: async (file: File): Promise<ImportResult> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<ImportResult>('/assets/import/segments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  /**
   * Nạp danh mục Tủ điện qua CSV
   * POST /api/v1/assets/import/cabinets
   */
  importCabinets: async (file: File): Promise<ImportResult> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<ImportResult>('/assets/import/cabinets', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  /**
   * Nạp danh mục Mạch điện qua CSV
   * POST /api/v1/assets/import/feeders
   */
  importFeeders: async (file: File): Promise<ImportResult> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<ImportResult>('/assets/import/feeders', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  /**
   * Nạp danh mục Cột điện chiếu sáng qua CSV
   * POST /api/v1/assets/import/poles
   */
  importPoles: async (file: File): Promise<ImportResult> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<ImportResult>('/assets/import/poles', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  /**
   * Nạp danh mục Bóng đèn chiếu sáng qua CSV
   * POST /api/v1/assets/import/fixtures
   */
  importFixtures: async (file: File): Promise<ImportResult> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<ImportResult>('/assets/import/fixtures', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

export default assetAPI
