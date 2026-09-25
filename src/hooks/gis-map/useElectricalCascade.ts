import { useMemo, useState } from 'react'
import type { PoleFeature, SegmentFeature, SegmentInfo } from '../../pages/gis-map/GisMapPage'
import {
  searchAllCategories,
  type SearchResultItem,
} from '../../utils/gis-map/gisSearchUtils'
import mockPolesData from '../../data/mock-poles.geo.json'
import mockSegmentsData from '../../data/mock-segments.geo.json'
import mockCabinetsData from '../../data/mock-cabinets.geo.json'
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
  // Dynamic Cabinets State for Cascade Simulation
  const [cabinets, setCabinets] = useState<any[]>(() => {
    const raw = (mockCabinetsData.features || []) as any[]
    return raw.map((c) => {
      const p = c.properties || {}
      const atlas = p.atlas || p.landmark_note || ''
      return {
        ...c,
        properties: {
          ...p,
          atlas,
        },
      }
    })
  })

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

  // Physical electrical cascade: sequential pole assignment per cabinet on each segment
  const effectivePoles = useMemo(() => {
    const rawPoles = (mockPolesData.features || []) as unknown as PoleFeature[]

    // Count total poles per segment to divide evenly between cabinets
    const totalPolesBySeg: Record<string, number> = {}
    rawPoles.forEach((f) => {
      const sId = f.properties?.segment_id
      if (sId) totalPolesBySeg[sId] = (totalPolesBySeg[sId] || 0) + 1
    })

    const counter: Record<string, number> = {}

    return rawPoles.map((f) => {
      const segId = f.properties?.segment_id
      const p = (f.properties || {}) as any
      const atlas = p.atlas || p.atlas_note || ''

      const segIdx = counter[segId] || 0
      counter[segId] = segIdx + 1

      // Find Cabinets of this segment
      const segCabs = cabinets.filter((c) => c.properties?.segment_id === segId)
      const numCabs = segCabs.length || 1
      const totalInSeg = totalPolesBySeg[segId] || 1
      const chunkSize = Math.ceil(totalInSeg / numCabs)
      const cabIdx = Math.min(Math.floor(segIdx / chunkSize), numCabs - 1)
      const chosenCab = segCabs[cabIdx] || segCabs[0]
      const cabProps = chosenCab?.properties || {}
      const isCabFault = cabProps.status === 'fault'

      const poleNum = segIdx + 1
      const lampLabel = `Đèn số ${poleNum}`

      if (isCabFault) {
        return {
          ...f,
          properties: {
            ...f.properties,
            lamp_code: lampLabel,
            cabinet_id: cabProps.cabinet_id,
            feeder_id: cabProps.feeder_id,
            atlas: atlas ? `${lampLabel} - ${atlas}` : atlas || lampLabel,
            fixture_status: 'out',
            power_loss_reason: `Mất điện do ${cabProps.cabinet_name || cabProps.cabinet_id} bị ngắt điện`,
          },
        }
      }

      return {
        ...f,
        properties: {
          ...f.properties,
          lamp_code: lampLabel,
          cabinet_id: cabProps.cabinet_id,
          feeder_id: cabProps.feeder_id,
          atlas: atlas ? `${lampLabel} - ${atlas}` : atlas || lampLabel,
        },
      }
    })
  }, [cabinets])

  // Calculate Dynamic Segments List & Info
  const segmentsList = useMemo(() => {
    const rawSegments = (mockSegmentsData.features || []) as unknown as SegmentFeature[]

    return rawSegments.map((f: SegmentFeature, idx: number) => {
      const p = f.properties || {}
      const segId = p.segment_id || `SEG-00${idx + 1}`
      
      const segCabs = cabinets.filter((c) => c.properties?.segment_id === segId)
      const isFault = segCabs.some((c) => c.properties?.status === 'fault')
      
      const poleCount = effectivePoles.filter(
        (pole: PoleFeature) => pole.properties?.segment_id === segId
      ).length || p.pole_count || 0

      let cleanName = segId === 'SEG-001' ? 'Tuyến A' : segId === 'SEG-002' ? 'Tuyến B' : segId === 'SEG-003' ? 'Tuyến C' : segId
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
        cabinet: p.controller_node_id || `NODE-00${idx + 1}-CTRL`,
        road: cleanName,
        poleCount,
        lengthM: p.length_m || 0,
        hasActiveSegmentFault: isFault,
        iotStatus: isFault ? 'offline' : 'online',
      } as SegmentInfo
    })
  }, [cabinets, effectivePoles])

  const segmentInfoMap: Record<string, SegmentInfo> = useMemo(() => {
    const map: Record<string, SegmentInfo> = {}
    segmentsList.forEach((s) => {
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

  // 1. Road Segments Centerline Data (Tuyến đường giao thông cơ sở - đường nét đứt xám)
  const roadSegmentsData = useMemo(() => {
    const allSegments = (mockSegmentsData.features || []) as unknown as SegmentFeature[]
    return allSegments
      .filter((seg) => {
        const segId = seg.properties?.segment_id
        if (!segId) return false
        if (selectedSegment !== 'all' && segId !== selectedSegment) return false
        return true
      })
      .map((seg) => ({
        ...seg,
        properties: {
          ...seg.properties,
          is_road_centerline: true,
        },
      }))
  }, [selectedSegment])

  // 2. Feeder Lines Data per Cabinet (Tuyến dây điện độc lập của từng Tủ điện)
  const feederLinesData = useMemo(() => {
    const builtFeeders: any[] = []

    cabinets.forEach((cab) => {
      const p = cab.properties || {}
      const cabId = p.cabinet_id
      const segId = p.segment_id
      if (!cabId || !segId) return

      if (selectedSegment !== 'all' && segId !== selectedSegment) return

      // Filter poles belonging to this specific cabinet
      const cabPoles = effectivePoles.filter(
        (f) => f.properties?.cabinet_id === cabId && f.properties?.segment_id === segId
      )

      if (cabPoles.length === 0) return

      const cabCoords = cab.geometry?.coordinates as [number, number]
      const poleCoords = cabPoles.map((f) => f.geometry.coordinates as [number, number])

      // Route connects from Cabinet position through all of its managed lamps
      const lineCoords = cabCoords ? [cabCoords, ...poleCoords] : poleCoords

      const feederId = p.feeder_id || `FDR-${cabId}`

      const segCabs = cabinets.filter((c) => c.properties?.segment_id === segId)
      const cabIdx = segCabs.findIndex((c) => c.properties?.cabinet_id === cabId)
      const isSecondCab = cabIdx % 2 !== 0

      const lineColor = p.status === 'fault'
        ? '#f43f5e'
        : isSecondCab
        ? '#06b6d4'
        : '#10b981'

      const lineGlow = p.status === 'fault'
        ? '#e11d48'
        : isSecondCab
        ? '#0891b2'
        : '#059669'

      builtFeeders.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: lineCoords,
        },
        properties: {
          feeder_id: feederId,
          cabinet_id: cabId,
          cabinet_code: p.cabinet_code || cabId,
          cabinet_name: p.cabinet_name || cabId,
          segment_id: segId,
          segment_name: p.segment_name || segId,
          status: p.status || 'active',
          color: lineColor,
          glow_color: lineGlow,
          is_second_feeder: isSecondCab,
          pole_count: cabPoles.length,
          first_pole: cabPoles[0]?.properties?.pole_id,
          last_pole: cabPoles[cabPoles.length - 1]?.properties?.pole_id,
        },
      })
    })

    return builtFeeders
  }, [cabinets, selectedSegment, effectivePoles])

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
  }
}
