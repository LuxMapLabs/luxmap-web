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
          // Track if sub-cabinet has its own internal breaker trip
          internal_tripped: p.status === 'fault',
          local_fault_reason: p.status === 'fault' ? p.fault_reason : undefined,
        },
      }
    })
  })

  // Toggle Cabinet breaker (Trip / Restore) with Physical Cascade Interlocking
  const handleToggleCabinet = (cabId: string, onSelectedCabinetUpdate?: (updater: (prev: any) => any) => void) => {
    const targetCab = cabinets.find((c) => c.properties?.cabinet_id === cabId)
    if (!targetCab) return

    const targetProps = targetCab.properties || {}
    const isRoot = targetProps.role === 'root_cabinet'

    // 1. Interlock check: If trying to activate a sub-cabinet while its parent root cabinet is in FAULT
    if (!isRoot && targetProps.status === 'fault') {
      const parentRoot = cabinets.find(
        (c) =>
          c.properties?.role === 'root_cabinet' &&
          (c.properties?.cabinet_id === targetProps.parent_cabinet_id ||
            c.properties?.segment_id === targetProps.segment_id)
      )

      if (parentRoot && parentRoot.properties?.status === 'fault') {
        showToast.warning(
          'Không thể đóng Aptomat tủ nhánh!',
          `Tủ nhánh đang mất nguồn cấp do Tủ đỉnh (${parentRoot.properties?.cabinet_name || 'Tủ đỉnh'}) bị ngắt. Cần đóng điện Tủ đỉnh trước!`
        )
        return
      }
    }

    const currentStatus = targetProps.status
    const nextStatus = currentStatus === 'fault' ? 'active' : 'fault'

    setCabinets((prev) =>
      prev.map((c) => {
        const cp = c.properties || {}
        // A. Direct target cabinet update
        if (cp.cabinet_id === cabId) {
          const isNowActive = nextStatus === 'active'
          const faultReason =
            nextStatus === 'fault'
              ? isRoot
                ? 'Ngắt Aptomat thủ công'
                : cp.local_fault_reason || 'Nhảy Aptomat (Trip MCCB 63A) do ngắn mạch phân đoạn 2'
              : undefined
          return {
            ...c,
            properties: {
              ...cp,
              status: nextStatus,
              internal_tripped: !isNowActive,
              local_fault_reason: isNowActive ? undefined : faultReason,
              voltage_v: nextStatus === 'fault' ? 0 : 220,
              current_load_kw: nextStatus === 'fault' ? 0 : isRoot ? 18.2 : 8.5,
              power_factor: nextStatus === 'fault' ? 0 : 0.95,
              fault_reason: faultReason,
            },
          }
        }

        // B. Cascade effect: If target is a ROOT CABINET, cascade only to its subordinate child SUB-CABINETS
        const isChildSubCabinet =
          isRoot &&
          cp.role === 'sub_cabinet' &&
          (cp.parent_cabinet_id ? cp.parent_cabinet_id === cabId : cp.segment_id === targetProps.segment_id)

        if (isChildSubCabinet) {
          if (nextStatus === 'fault') {
            // Root turned off -> Sub-cabinets lose power input (0V, fault)
            return {
              ...c,
              properties: {
                ...cp,
                status: 'fault',
                voltage_v: 0,
                current_load_kw: 0,
                power_factor: 0,
                fault_reason: `Mất nguồn cấp do Tủ đỉnh (${targetProps.cabinet_name || targetProps.cabinet_code}) bị ngắt điện`,
              },
            }
          } else {
            // Root turned on -> If sub-cabinet was independently tripped, it STAYS in fault!
            if (cp.internal_tripped) {
              return {
                ...c,
                properties: {
                  ...cp,
                  status: 'fault',
                  voltage_v: 0,
                  current_load_kw: 0,
                  power_factor: 0,
                  fault_reason: cp.local_fault_reason || 'Nhảy Aptomat (Trip MCCB 63A) do sự cố phân đoạn',
                },
              }
            }

            return {
              ...c,
              properties: {
                ...cp,
                status: 'active',
                voltage_v: 220,
                current_load_kw: 8.5,
                power_factor: 0.95,
                fault_reason: undefined,
              },
            }
          }
        }

        return c
      })
    )

    if (onSelectedCabinetUpdate) {
      onSelectedCabinetUpdate((prev: any) => {
        if (!prev) return prev
        if (prev.cabinet_id === cabId) {
          const isNowActive = nextStatus === 'active'
          const faultReason =
            nextStatus === 'fault'
              ? isRoot
                ? 'Ngắt Aptomat thủ công'
                : prev.local_fault_reason || 'Nhảy Aptomat (Trip MCCB 63A) do ngắn mạch phân đoạn 2'
              : undefined
          return {
            ...prev,
            status: nextStatus,
            internal_tripped: !isNowActive,
            local_fault_reason: isNowActive ? undefined : faultReason,
            voltage_v: nextStatus === 'fault' ? 0 : 220,
            current_load_kw: nextStatus === 'fault' ? 0 : isRoot ? 18.2 : 8.5,
            power_factor: nextStatus === 'fault' ? 0 : 0.95,
            fault_reason: faultReason,
          }
        }
        const isChildSubCabinet =
          isRoot &&
          prev.role === 'sub_cabinet' &&
          (prev.parent_cabinet_id ? prev.parent_cabinet_id === cabId : prev.segment_id === targetProps.segment_id)

        if (isChildSubCabinet) {
          if (nextStatus === 'fault') {
            return {
              ...prev,
              status: 'fault',
              voltage_v: 0,
              current_load_kw: 0,
              power_factor: 0,
              fault_reason: `Mất nguồn cấp do Tủ đỉnh (${targetProps.cabinet_name || targetProps.cabinet_code}) bị ngắt điện`,
            }
          } else {
            if (prev.internal_tripped) {
              return {
                ...prev,
                status: 'fault',
                voltage_v: 0,
                current_load_kw: 0,
                power_factor: 0,
                fault_reason: prev.local_fault_reason || 'Nhảy Aptomat (Trip MCCB 63A) do sự cố phân đoạn',
              }
            }
            return {
              ...prev,
              status: 'active',
              voltage_v: 220,
              current_load_kw: 8.5,
              power_factor: 0.95,
              fault_reason: undefined,
            }
          }
        }
        return prev
      })
    }

    // Informative Feedback Toast
    if (isRoot) {
      if (nextStatus === 'fault') {
        showToast.error(
          'Đã ngắt Aptomat Tủ đỉnh!',
          `Toàn bộ tuyến cáp và các tủ nhánh thuộc tuyến đã bị cắt điện do mất nguồn.`
        )
      } else {
        showToast.success(
          'Đã đóng điện Tủ đỉnh!',
          `Tuyến cáp và các tủ nhánh hạ nguồn đã được cấp điện trở lại.`
        )
      }
    } else {
      if (nextStatus === 'fault') {
        showToast.error('Đã ngắt Aptomat Tủ nhánh!', `Phân đoạn hạ nguồn đã bị ngắt điện.`)
      } else {
        showToast.success('Đã đóng Aptomat Tủ nhánh!', `Phân đoạn hạ nguồn đã được cấp điện.`)
      }
    }
  }

  // Physical electrical cascade: calculate power status of each pole based on route root & sub-cabinet
  const effectivePoles = useMemo(() => {
    const rawPoles = (mockPolesData.features || []) as unknown as PoleFeature[]

    return rawPoles.map((f, idx) => {
      const segId = f.properties?.segment_id
      const p = (f.properties || {}) as any
      const atlas = p.atlas || p.atlas_note || ''

      // 1. Find Root Cabinet for this route
      const rootCab = cabinets.find(
        (c) => c.properties?.role === 'root_cabinet' && c.properties?.segment_id === segId
      )

      if (rootCab && rootCab.properties?.status === 'fault') {
        return {
          ...f,
          properties: {
            ...f.properties,
            atlas,
            fixture_status: 'out',
            power_loss_reason: `Mất nguồn toàn tuyến do ${rootCab.properties.cabinet_name} bị ngắt điện`,
          },
        }
      }

      // 2. Find any sub-cabinet of this route controlling this pole
      const subCab = cabinets.find(
        (c) =>
          c.properties?.role === 'sub_cabinet' &&
          c.properties?.segment_id === segId &&
          (c.properties?.branch_start_pole
            ? p.pole_id >= c.properties.branch_start_pole
            : typeof c.properties?.start_pole_idx === 'number'
            ? idx >= c.properties.start_pole_idx
            : false)
      )

      if (subCab && subCab.properties?.status === 'fault') {
        return {
          ...f,
          properties: {
            ...f.properties,
            atlas,
            fixture_status: 'out',
            power_loss_reason: `Mất điện phân đoạn do ${subCab.properties.cabinet_name} bị ngắt điện`,
          },
        }
      }

      return {
        ...f,
        properties: {
          ...f.properties,
          atlas,
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
        const seg = p.segment_id?.toLowerCase() || ''
        const atlas = (p.atlas || p.atlas_note || '').toLowerCase()
        const segInfo = segmentInfoMap[p.segment_id || '']
        const segName = segInfo?.name?.toLowerCase() || ''
        const road = segInfo?.road?.toLowerCase() || ''

        if (
          !id.includes(q) &&
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

  // Filtered Cabinets (luôn hiển thị trên bản đồ, không bị ẩn khi filter trạng thái cột đèn)
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

  // Filtered Segments GeoJSON Data (partitioned by feeder sections, continuous geometry and synced with cabinet status)
  const filteredSegmentsData = useMemo(() => {
    const allSegments = (mockSegmentsData.features || []) as unknown as SegmentFeature[]
    
    // Chỉ lấy các cột đèn ĐANG HIỂN THỊ (phù hợp với statusFilter, selectedSegment & search) để vẽ đường dây
    // Khi cột đèn bị ẩn thì đường dây tương ứng tự ẩn theo, không bị vẽ dư trên bản đồ
    const polesBySeg: Record<string, PoleFeature[]> = {}
    filteredFeatures.forEach((pole) => {
      const segId = pole.properties?.segment_id
      if (segId) {
        if (!polesBySeg[segId]) polesBySeg[segId] = []
        polesBySeg[segId].push(pole)
      }
    })

    const builtSegments: SegmentFeature[] = []

    allSegments.forEach((seg) => {
      const segId = seg.properties?.segment_id
      if (!segId) return

      // 1. Filter by Segment
      if (selectedSegment !== 'all' && segId !== selectedSegment) {
        return
      }

      const segPoles = polesBySeg[segId] || []
      if (segPoles.length < 2) return

      const rootCab = cabinets.find(
        (c) => c.properties?.role === 'root_cabinet' && c.properties?.segment_id === segId
      )
      const subCab = cabinets.find(
        (c) => c.properties?.role === 'sub_cabinet' && c.properties?.segment_id === segId
      )

      const isRootFault = rootCab?.properties?.status === 'fault'
      const isSubFault = subCab?.properties?.status === 'fault'
      const branchPoleId = subCab?.properties?.branch_start_pole
      const subStartIdx = subCab
        ? branchPoleId
          ? segPoles.findIndex((p) => p.properties.pole_id === branchPoleId)
          : typeof subCab.properties?.start_pole_idx === 'number'
          ? subCab.properties.start_pole_idx
          : -1
        : -1
      const segName = seg.properties?.segment_name || segId

      // If route has a sub-cabinet, partition into 2 electrical sections
      if (subCab && subStartIdx >= 0) {
        const sec1Poles = segPoles.slice(0, subStartIdx + 1)
        const sec2Poles = segPoles.slice(subStartIdx)

        const sec1Status = isRootFault ? 'fault' : 'active'
        const sec2Status = isRootFault || isSubFault ? 'fault' : 'active'

        // Chỉ vẽ đoạn dây nếu đoạn đó có từ 2 cột đèn trở lên đang hiển thị
        if (sec1Poles.length >= 2) {
          builtSegments.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: sec1Poles.map((p) => p.geometry.coordinates),
            },
            properties: {
              ...seg.properties,
              section_id: `${segId}-SEC-1`,
              section_name: `${segName} (Đoạn 1 - Tủ Đỉnh)`,
              cabinet_id: rootCab?.properties?.cabinet_id,
              cabinet_code: rootCab?.properties?.cabinet_code,
              status: sec1Status,
            },
          })
        }

        if (sec2Poles.length >= 2) {
          builtSegments.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: sec2Poles.map((p) => p.geometry.coordinates),
            },
            properties: {
              ...seg.properties,
              section_id: `${segId}-SEC-2`,
              section_name: `${segName} (Đoạn 2 - Tủ Nhánh)`,
              cabinet_id: subCab?.properties?.cabinet_id,
              cabinet_code: subCab?.properties?.cabinet_code,
              status: sec2Status,
            },
          })
        }
      } else {
        const segStatus = isRootFault ? 'fault' : 'active'

        if (segPoles.length >= 2) {
          builtSegments.push({
            ...seg,
            geometry: {
              type: 'LineString',
              coordinates: segPoles.map((p) => p.geometry.coordinates),
            },
            properties: {
              ...seg.properties,
              section_id: `${segId}-SEC-1`,
              section_name: segName,
              cabinet_id: rootCab?.properties?.cabinet_id,
              cabinet_code: rootCab?.properties?.cabinet_code,
              status: segStatus,
            },
          })
        }
      }
    })

    return builtSegments
  }, [cabinets, selectedSegment, filteredFeatures])

  return {
    cabinets: filteredCabinets,
    allCabinets: cabinets,
    handleToggleCabinet,
    effectivePoles,
    segmentsList,
    segmentInfoMap,
    searchSuggestions,
    filteredFeatures,
    filteredSegmentsData,
  }
}
