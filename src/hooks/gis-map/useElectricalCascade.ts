import { useMemo, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../../redux/store'
import type { PoleFeature, SegmentInfo } from '../../pages/gis-map/GisMapPage'
import type { PolePropertiesFeature } from '../../types/map/poles'
import type { SegmentPropertiesFeature } from '../../types/map/segments'
import {
  searchAllCategories,
  type SearchResultItem,
} from '../../utils/gis-map/gisSearchUtils'
import { fetchMapLayersRequest } from '../../feature/map/mapSlice'
import { fetchAssetsRequest } from '../../feature/assets/assetSlice'
import { fetchDashboardDataRequest } from '../../feature/dashboard/dashboardSlice'
import { toBboxParam } from '../../utils/gis-map/mapUtils'

interface UseElectricalCascadeProps {
  statusFilter: string
  selectedSegment: string
  searchQuery: string // Applied search query (only active after Enter or item selection)
  searchInput?: string // Live typing input for real-time autocomplete suggestions
}

export function useElectricalCascade({
  statusFilter,
  selectedSegment,
  searchQuery,
  searchInput = '',
}: UseElectricalCascadeProps) {
  const dispatch = useDispatch<AppDispatch>()
  const {
    poles: rawPoles,
    cabinets: rawCabinets,
    segments: rawSegments,
    isLoadingMap: isLoadingMapData,
  } = useSelector((state: RootState) => state.map)

  const {
    poles: assetPoles,
    cabinets: assetCabinets,
    feeders: assetFeeders,
    segments: assetSegments,
  } = useSelector((state: RootState) => state.assets)
  const dashboardSegments = useSelector((state: RootState) => state.dashboard?.segmentsList || [])

  // Load map layers for the account's communes (the saga reads map_bounds from the profile); reload if that frame changes.
  const boundsKey = useSelector((state: RootState) => toBboxParam(state.auth.user?.map_bounds?.bbox) ?? '')
  useEffect(() => {
    dispatch(fetchMapLayersRequest())
  }, [dispatch, boundsKey])

  // Tự động nạp dữ liệu kiểm kê tài sản (assets) và danh mục tuyến đường để đảm bảo luôn có đủ tuyến cho cả Manager & Superior
  useEffect(() => {
    if (!assetPoles || assetPoles.length === 0) {
      dispatch(fetchAssetsRequest())
    }
    if (!dashboardSegments || dashboardSegments.length === 0) {
      dispatch(fetchDashboardDataRequest())
    }
  }, [dispatch, assetPoles, dashboardSegments])

  // Tủ điện từ API bản đồ; landmark_note và atlas là hai tên của cùng một ghi chú vị trí
  const cabinets = useMemo(
    () =>
      (rawCabinets || []).map((c: any) => {
        const p = (c.properties || {}) as any
        const landmark = p.landmark_note || p.atlas || ''
        return { ...c, properties: { ...p, atlas: landmark, landmark_note: landmark } }
      }),
    [rawCabinets]
  )

  // Dữ liệu cột điện thực tế từ Backend API kết hợp thông tin kiểm kê từ Redux store
  const effectivePoles: PoleFeature[] = useMemo(() => {
    // Map tra cứu nhanh từ kho tài sản (Asset Inventory) để lấy external_ref, feeder, cabinet
    const assetPoleMap = new Map<string, any>()
    ;(assetPoles || []).forEach((ap) => {
      if (ap.pole_id) assetPoleMap.set(ap.pole_id, ap)
    })

    const assetFeederMap = new Map<string, any>()
    ;(assetFeeders || []).forEach((af) => {
      if (af.feeder_id) assetFeederMap.set(af.feeder_id, af)
    })

    const assetCabinetMap = new Map<string, any>()
    ;(assetCabinets || []).forEach((ac) => {
      if (ac.cabinet_id) assetCabinetMap.set(ac.cabinet_id, ac)
      if (ac.external_ref) assetCabinetMap.set(ac.external_ref, ac)
    })

    // Map từ cabinet_id -> cabinet status để cập nhật trực tiếp vào pole
    const cabinetStatusMap: Record<string, any> = {}
    cabinets.forEach((c) => {
      const p = c.properties || {}
      if (p.cabinet_id) {
        cabinetStatusMap[p.cabinet_id] = p
      }
    })

    return rawPoles.map((f: PolePropertiesFeature) => {
      const p = (f.properties || {}) as any
      const assetPole = p.pole_id ? assetPoleMap.get(p.pole_id) : null

      // Ưu tiên mã ngoài thực địa (external_ref)
      const externalRef = assetPole?.external_ref || p.external_ref || p.pole_id
      const feederId = assetPole?.feeder_id || p.feeder_id
      const assetFeeder = feederId ? assetFeederMap.get(feederId) : null
      const feederExternalRef = assetFeeder?.external_ref
      const feederName = assetFeeder?.feeder_name

      const rawCabinetId = assetPole?.cabinet_id || assetFeeder?.cabinet?.cabinet_id || p.cabinet_id
      const assetCabinet = rawCabinetId ? assetCabinetMap.get(rawCabinetId) : null
      const cabProps = rawCabinetId ? cabinetStatusMap[rawCabinetId] : null
      const cabinetExternalRef = assetCabinet?.external_ref
      const cabinetName =
        assetCabinet?.cabinet_name ||
        cabProps?.cabinet_name ||
        p.cabinet_name ||
        (rawCabinetId ? `Tủ ${cabinetExternalRef || rawCabinetId}` : undefined)

      const geom = f.geometry || { type: 'Point', coordinates: [106.6, 10.8] }

      // Trạng thái cột luôn lấy từ API (lần quan sát đã công bố gần nhất), không suy từ lệnh điều khiển mạch
      return {
        type: 'Feature',
        geometry: geom as any,
        properties: {
          ...p,
          external_ref: externalRef,
          feeder_id: feederId,
          feeder_external_ref: feederExternalRef,
          feeder_name: feederName,
          cabinet_id: rawCabinetId,
          cabinet_name: cabinetName,
          cabinet_external_ref: cabinetExternalRef,
        },
      } as PoleFeature
    })
  }, [rawPoles, cabinets, assetPoles, assetFeeders, assetCabinets])

  // Calculate Dynamic Segments List & Info from rawSegments (API) merged with dashboardSegments / assetSegments
  const segmentsList = useMemo(() => {
    const byId = new Map<string, SegmentInfo>()

    // Tên ngắn của tuyến: phần trước dấu " - " của tên tuyến; chưa có tên thì dùng mã
    const formatCleanName = (segId: string, segName?: string | null) =>
      segName ? segName.split(' - ')[0] : segId

    rawSegments.forEach((f: SegmentPropertiesFeature) => {
      const p = (f.properties || {}) as any
      const segId = p.segment_id
      if (!segId) return
      const isFault = Boolean(p.has_active_segment_fault)
      const poleCount =
        effectivePoles.filter((pole: PoleFeature) => pole.properties?.segment_id === segId).length ||
        p.pole_count ||
        0
      const cleanName = formatCleanName(segId, p.segment_name)

      byId.set(segId, {
        id: segId,
        name: cleanName,
        fullName: p.segment_name || cleanName,
        externalRef: p.external_ref || undefined,
        cabinet: (p.controller_node_ids && p.controller_node_ids[0]) || '',
        road: p.segment_name || cleanName,
        poleCount,
        lengthM: p.length_m || 0,
        hasActiveSegmentFault: isFault,
        iotStatus: isFault ? 'offline' : 'online',
      } as SegmentInfo)
    })

    // Bổ sung các tuyến từ danh mục tài sản / dashboard nếu lớp LineString (/map/segments) chưa trả về hoặc thiếu
    const fallbackCatalog = [
      ...(dashboardSegments || []),
      ...(assetSegments || []),
    ]
    fallbackCatalog.forEach((s) => {
      const segId = s.segment_id
      if (!segId) return
      const existing = byId.get(segId)
      const poleCount =
        effectivePoles.filter((pole: PoleFeature) => pole.properties?.segment_id === segId).length ||
        s.pole_count ||
        existing?.poleCount ||
        0
      const cleanName = formatCleanName(segId, s.segment_name)
      if (!existing) {
        byId.set(segId, {
          id: segId,
          name: cleanName,
          fullName: s.segment_name || cleanName,
          externalRef: s.external_ref || undefined,
          cabinet: '',
          road: s.segment_name || cleanName,
          poleCount,
          lengthM: s.length_m || 0,
          hasActiveSegmentFault: false,
          iotStatus: 'online',
        } as SegmentInfo)
      } else {
        if (s.segment_name && (!existing.fullName || existing.fullName === existing.name)) {
          existing.fullName = s.segment_name
          existing.road = s.segment_name
        }
        if (s.external_ref && !existing.externalRef) {
          existing.externalRef = s.external_ref
        }
        if (!existing.poleCount && poleCount > 0) {
          existing.poleCount = poleCount
        }
      }
    })

    return Array.from(byId.values())
  }, [rawSegments, dashboardSegments, assetSegments, cabinets, effectivePoles])

  const segmentInfoMap: Record<string, SegmentInfo> = useMemo(() => {
    const map: Record<string, SegmentInfo> = {}
    segmentsList.forEach((s: SegmentInfo) => {
      map[s.id] = s
    })
    return map
  }, [segmentsList])

  // Autocomplete Suggestions (Đa danh mục: Tuyến đường, Tủ điện, Atlas địa danh, Cột đèn)
  const searchSuggestions: SearchResultItem[] = useMemo(() => {
    const rawQuery = (searchInput || searchQuery).trim()
    if (!rawQuery) return []
    return searchAllCategories({
      query: rawQuery,
      segmentsList,
      cabinets,
      poles: effectivePoles,
      maxResults: 10,
    })
  }, [searchInput, searchQuery, segmentsList, cabinets, effectivePoles])

  // Filtered Poles Features
  const filteredFeatures = useMemo(() => {
    return effectivePoles.filter((f: PoleFeature) => {
      const p = f.properties || {}

      if (selectedSegment !== 'all' && p.segment_id !== selectedSegment) {
        return false
      }

      if (statusFilter !== 'all' && p.fixture_status !== statusFilter) {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const id = p.pole_id?.toLowerCase() || ''
        const lamp = (p.lamp_code || '').toLowerCase()
        const seg = p.segment_id?.toLowerCase() || ''
        const atlas = (p.atlas || p.atlas_note || '').toLowerCase()
        const segInfo = segmentInfoMap[p.segment_id || '']
        const segName = segInfo?.name?.toLowerCase() || ''
        const road = segInfo?.road?.toLowerCase() || ''

        if (
          !id.includes(q) &&
          !lamp.includes(q) &&
          !seg.includes(q) &&
          !atlas.includes(q) &&
          !segName.includes(q) &&
          !road.includes(q)
        ) {
          return false
        }
      }

      return true
    })
  }, [effectivePoles, statusFilter, selectedSegment, searchQuery, segmentInfoMap])

  // Filtered Cabinets (luôn hiển thị trên bản đồ)
  const filteredCabinets = useMemo(() => {
    return cabinets.filter((cab) => {
      const p = cab.properties || {}
      const segId = p.segment_id

      // 1. Filter by Segment
      if (selectedSegment !== 'all' && segId !== selectedSegment) {
        return false
      }

      // 2. Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const id = p.cabinet_id?.toLowerCase() || ''
        const code = p.cabinet_code?.toLowerCase() || ''
        const name = p.cabinet_name?.toLowerCase() || ''
        const seg = p.segment_id?.toLowerCase() || ''
        const atlas = (p.atlas || p.landmark_note || '').toLowerCase()
        if (
          !id.includes(q) &&
          !code.includes(q) &&
          !name.includes(q) &&
          !seg.includes(q) &&
          !atlas.includes(q)
        ) {
          return false
        }
      }

      return true
    })
  }, [cabinets, selectedSegment, searchQuery])

  // 1. Road Segments Centerline Data (Tuyến đường giao thông từ Backend API - nét liền to bản)
  const roadSegmentsData = useMemo(() => {
    return rawSegments
      .filter((seg: any) => {
        const segId = seg.properties?.segment_id
        if (!segId) return false
        if (selectedSegment !== 'all' && segId !== selectedSegment) return false
        return true
      })
      .map((seg: any) => ({
        ...seg,
        properties: {
          ...seg.properties,
          is_road_centerline: true,
        },
      }))
  }, [rawSegments, selectedSegment])

  // 2. Feeder Lines Data: Không còn logic tự stitching tọa độ ở Frontend.
  // Dữ liệu dây điện/topology thực tế được nạp động từ GET /map/cabinets/{id}/topology
  const feederLinesData = useMemo(() => {
    return []
  }, [])

  return {
    cabinets: filteredCabinets,
    allCabinets: cabinets,
    effectivePoles,
    segmentsList,
    segmentInfoMap,
    searchSuggestions,
    filteredFeatures,
    roadSegmentsData,
    feederLinesData,
    filteredSegmentsData: feederLinesData,
    isLoadingMapData,
  }
}
