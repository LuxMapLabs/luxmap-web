import { useMemo, useState, useEffect } from 'react'
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
import { showToast } from '../../utils/toastUtils'

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

  // Dispatch Saga action to load map layers if not yet loaded
  useEffect(() => {
    dispatch(fetchMapLayersRequest({ bbox: '106.35,10.85,106.65,11.10' }))
  }, [dispatch])

  // Local state for Cabinet Trip/Restore (Simulation)
  const [cabinets, setCabinets] = useState<any[]>([])

  // Đồng bộ cabinets từ Redux Store vào local simulation state
  useEffect(() => {
    if (rawCabinets && rawCabinets.length > 0) {
      const formattedCabs = rawCabinets.map((c: any) => {
        const p = (c.properties || {}) as any
        const landmark = p.landmark_note || p.atlas || ''
        return {
          ...c,
          properties: {
            ...p,
            atlas: landmark,
            landmark_note: landmark,
            status: p.status || 'active',
            voltage_v: p.voltage_v != null ? p.voltage_v : 220,
            current_load_kw: p.current_load_kw != null ? p.current_load_kw : 12.5,
            power_factor: p.power_factor != null ? p.power_factor : 0.95,
          },
        }
      })
      setCabinets(formattedCabs)
    }
  }, [rawCabinets])

  // Toggle Cabinet breaker (Trip / Restore) - Independent Cabinet Control
  const handleToggleCabinet = (cabId: string, onSelectedCabinetUpdate?: (updater: (prev: any) => any) => void) => {
    const targetCab = cabinets.find((c) => c.properties?.cabinet_id === cabId)
    if (!targetCab) return

    const targetProps = targetCab.properties || {}
    const currentStatus = targetProps.status
    const nextStatus = currentStatus === 'fault' ? 'active' : 'fault'

    setCabinets((prev) =>
      prev.map((c) => {
        const cp = c.properties || {}
        if (cp.cabinet_id === cabId) {
          const faultReason = nextStatus === 'fault' ? 'Ngắt Aptomat lộ điện (Chế độ tiết giảm đêm hoặc sự cố)' : undefined
          return {
            ...c,
            properties: {
              ...cp,
              status: nextStatus,
              voltage_v: nextStatus === 'fault' ? 0 : 220,
              current_load_kw: nextStatus === 'fault' ? 0 : 10.0,
              power_factor: nextStatus === 'fault' ? 0 : 0.95,
              fault_reason: faultReason,
            },
          }
        }
        return c
      })
    )

    if (onSelectedCabinetUpdate) {
      onSelectedCabinetUpdate((prev: any) => {
        if (!prev) return prev
        if (prev.cabinet_id === cabId) {
          return {
            ...prev,
            status: nextStatus,
            voltage_v: nextStatus === 'fault' ? 0 : 220,
            current_load_kw: nextStatus === 'fault' ? 0 : 10.0,
            power_factor: nextStatus === 'fault' ? 0 : 0.95,
            fault_reason: nextStatus === 'fault' ? 'Ngắt Aptomat lộ điện (Chế độ tiết giảm đêm hoặc sự cố)' : undefined,
          }
        }
        return prev
      })
    }

    if (nextStatus === 'fault') {
      showToast.error(
        'Đã ngắt Aptomat Tủ điện!',
        `Đã ngắt nguồn điện ${targetProps.cabinet_name || cabId}. Toàn bộ đèn do tủ này quản lý đã tắt.`
      )
    } else {
      showToast.success(
        'Đã đóng điện Tủ điện!',
        `Đã cấp điện trở lại cho ${targetProps.cabinet_name || cabId}.`
      )
    }
  }

  // Dữ liệu cột điện thực tế từ Backend API (Không còn logic chunkSize tự chia cột)
  const effectivePoles: PoleFeature[] = useMemo(() => {
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
      const cabProps = p.cabinet_id ? cabinetStatusMap[p.cabinet_id] : null
      const isCabFault = cabProps?.status === 'fault'

      const geom = f.geometry || { type: 'Point', coordinates: [106.6, 10.8] }

      if (isCabFault) {
        return {
          type: 'Feature',
          geometry: geom as any,
          properties: {
            ...p,
            cabinet_name: cabProps.cabinet_name || cabProps.cabinet_id,
            fixture_status: 'out',
            power_loss_reason: `Mất điện do ${cabProps.cabinet_name || cabProps.cabinet_id} bị ngắt điện`,
          },
        } as PoleFeature
      }

      return {
        type: 'Feature',
        geometry: geom as any,
        properties: {
          ...p,
          cabinet_name: cabProps?.cabinet_name || p.cabinet_name || p.cabinet_id,
        },
      } as PoleFeature
    })
  }, [rawPoles, cabinets])

  // Calculate Dynamic Segments List & Info from rawSegments (API)
  const segmentsList = useMemo(() => {
    return rawSegments.map((f: SegmentPropertiesFeature, idx: number) => {
      const p = (f.properties || {}) as any
      const segId = p.segment_id || `SEG-00${idx + 1}`

      const segCabs = cabinets.filter((c) => c.properties?.segment_id === segId)
      const isFault = segCabs.some((c) => c.properties?.status === 'fault')

      const poleCount =
        effectivePoles.filter((pole: PoleFeature) => pole.properties?.segment_id === segId).length ||
        p.pole_count ||
        0

      let cleanName =
        segId === 'SEG-001'
          ? 'Tuyến A'
          : segId === 'SEG-002'
          ? 'Tuyến B'
          : segId === 'SEG-003'
          ? 'Tuyến C'
          : segId
      if (p.segment_name) {
        const raw = p.segment_name.split(' - ')[0]
        if (raw.toLowerCase().includes('tuyen a')) cleanName = 'Tuyến A'
        else if (raw.toLowerCase().includes('tuyen b')) cleanName = 'Tuyến B'
        else if (raw.toLowerCase().includes('tuyen c')) cleanName = 'Tuyến C'
        else cleanName = raw
      }

      return {
        id: segId,
        name: cleanName,
        cabinet: (p.controller_node_ids && p.controller_node_ids[0]) || `NODE-00${idx + 1}-CTRL`,
        road: cleanName,
        poleCount,
        lengthM: p.length_m || 0,
        hasActiveSegmentFault: isFault || Boolean(p.has_active_segment_fault),
        iotStatus: isFault ? 'offline' : 'online',
      } as SegmentInfo
    })
  }, [rawSegments, cabinets, effectivePoles])

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
    handleToggleCabinet,
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
