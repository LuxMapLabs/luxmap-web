import apiClient from '../../config/apiClient'
import type {
  CabinetPropertiesFeatureCollection,
  CabinetTopologyEdgePropertiesFeatureCollection,
} from '../../types/map/cabinets'
import type {
  PolePropertiesFeatureCollection,
  PoleMapDetail,
} from '../../types/map/poles'
import type { SegmentPropertiesFeatureCollection } from '../../types/map/segments'

export interface MapPolesQueryParams {
  bbox: string
  status?: string
  segment_id?: string
  commune_id?: string[]
}

export interface MapCommonQueryParams {
  bbox: string
  commune_id?: string[]
}

export const mapAPI = {
  /**
   * Lấy FeatureCollection các cột điện trong bounding box
   * GET /api/v1/map/poles
   */
  getPoles: async (params: MapPolesQueryParams): Promise<PolePropertiesFeatureCollection> => {
    const response = await apiClient.get<PolePropertiesFeatureCollection>('/map/poles', { params })
    return response.data
  },

  /**
   * Lấy FeatureCollection các tuyến đường trong bounding box
   * GET /api/v1/map/segments
   */
  getSegments: async (params: MapCommonQueryParams): Promise<SegmentPropertiesFeatureCollection> => {
    const response = await apiClient.get<SegmentPropertiesFeatureCollection>('/map/segments', { params })
    return response.data
  },

  /**
   * Lấy FeatureCollection các tủ điện trong bounding box
   * GET /api/v1/map/cabinets
   */
  getCabinets: async (params: MapCommonQueryParams): Promise<CabinetPropertiesFeatureCollection> => {
    const response = await apiClient.get<CabinetPropertiesFeatureCollection>('/map/cabinets', { params })
    return response.data
  },

  /**
   * Lấy sơ đồ topology các cạnh từ tủ qua từng cột
   * GET /api/v1/map/cabinets/{cabinetId}/topology
   */
  getCabinetTopology: async (
    cabinetId: string
  ): Promise<CabinetTopologyEdgePropertiesFeatureCollection> => {
    const response = await apiClient.get<CabinetTopologyEdgePropertiesFeatureCollection>(
      `/map/cabinets/${encodeURIComponent(cabinetId)}/topology`
    )
    return response.data
  },

  /**
   * Lấy thông tin chi tiết một cột điện trên bản đồ
   * GET /api/v1/map/poles/{pole_id}
   */
  getPoleDetail: async (poleId: string): Promise<PoleMapDetail> => {
    const response = await apiClient.get<PoleMapDetail>(`/map/poles/${encodeURIComponent(poleId)}`)
    return response.data
  },
}

export default mapAPI
