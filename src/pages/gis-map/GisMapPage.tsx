import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../redux/store'
import {
  toLngLatBounds,
  toBboxParam,
  FIT_BOUNDS_GIS_PANORAMA,
  FIT_BOUNDS_GIS_SEGMENT,
} from '../../utils/gis-map/mapUtils'
import * as maplibregl from 'maplibre-gl'

import type { FixtureType, PowerSource, RoadClass, DataSource } from '../../types/common/enums'

// GeoJSON & UI Types (Giữ nguyên tại đây để đảm bảo tương thích ngược 100% với các file import)
export interface PoleProperties {
  pole_id: string
  segment_id: string
  feeder_id?: string | null
  fixture_status?: 'normal' | 'dim' | 'out' | 'unknown' | string
  power_source?: PowerSource | string
  fixture_type?: FixtureType | string
  lamp_watt?: number
  install_date?: string | null
  warranty_expiry?: string | null
  warranty_status?: 'active' | 'expiring' | 'expired' | 'unknown' | string
  near_sensitive_poi?: boolean
  data_source?: DataSource | string
  lux_value?: number
  meter_model?: string | null
  has_iot_node?: boolean
  open_fault_count?: number
  maintenance_status?: 'normal' | 'under_repair' | 'fault' | string
  [key: string]: any
}

export interface PoleFeature {
  type: string
  geometry: {
    type: string
    coordinates: [number, number]
  }
  properties: PoleProperties
}

export interface SegmentProperties {
  segment_id: string
  segment_name?: string | null
  road_class?: RoadClass | string
  length_m?: number
  pole_count?: number
  controller_node_id?: string
  has_active_segment_fault?: boolean
  data_source?: DataSource | string
  commune_id?: string | null
  [key: string]: any
}

export interface SegmentFeature {
  type: string
  geometry: {
    type: string
    coordinates: number[][]
  }
  properties: SegmentProperties
}

export interface SegmentInfo {
  id: string
  name: string
  cabinet: string
  road: string
  poleCount: number
  lengthM: number
  hasActiveSegmentFault?: boolean
  iotStatus?: 'online' | 'offline' | string
  [key: string]: any
}

export interface GisStats {
  total: number
  normal: number
  dim: number
  out: number
  unknown: number
}

// Subcomponents, Custom Hooks & Utilities
import { MapControlBar } from './components/MapControlBar'
import { GisMapLegend } from './components/GisMapLegend'
import { GisDrawerPanel } from './components/GisDrawerPanel'
import { useElectricalCascade } from '../../hooks/gis-map/useElectricalCascade'
import { useGisMapInstance } from '../../hooks/gis-map/useGisMapInstance'
import { useFeederLinesLayer } from '../../hooks/gis-map/useFeederLinesLayer'
import { useGisMarkers } from '../../hooks/gis-map/useGisMarkers'
import type { SearchResultItem } from '../../utils/gis-map/gisSearchUtils'

export const GisMapPage: React.FC = () => {
  const isHoveringMarkerRef = useRef<boolean>(false)
  const activeHoverSourceRef = useRef<'pole' | 'cabinet' | 'feeder' | null>(null)

  // 1. Khởi tạo MapLibre instance và các điều khiển bản đồ
  const { mapContainerRef, mapRef, popupRef, isMapLoaded } = useGisMapInstance()

  // Open on the account's commune center (GET /auth/me map_bounds.center) taken 100% directly from backend.
  // Restrict zoom-out (minZoom) to the entire commune panorama bbox (map_bounds.bbox) and restrict panning (maxBounds).
  const mapBounds = useSelector((state: RootState) => state.auth.user?.map_bounds)
  const lastFramedBboxRef = useRef<string | null>(null)
  useEffect(() => {
    const bounds = toLngLatBounds(mapBounds?.bbox)
    const bboxKey = toBboxParam(mapBounds?.bbox)
    const centerLng = mapBounds?.center?.lng
    const centerLat = mapBounds?.center?.lat

    if (
      !isMapLoaded ||
      !mapRef.current ||
      !bounds ||
      !bboxKey ||
      typeof centerLng !== 'number' ||
      !Number.isFinite(centerLng) ||
      typeof centerLat !== 'number' ||
      !Number.isFinite(centerLat) ||
      lastFramedBboxRef.current === bboxKey
    ) {
      return
    }

    // 1. Tính mức zoom toàn cảnh vừa khít cái Bbox của xã từ Backend
    const camera = mapRef.current.cameraForBounds(bounds, { padding: 40 })
    const panoramaZoom = camera?.zoom
    if (typeof panoramaZoom === 'number' && Number.isFinite(panoramaZoom)) {
      mapRef.current.setMinZoom(panoramaZoom)
    }
    mapRef.current.setMaxBounds(bounds)

    // 2. Mở bản đồ cận cảnh tại Tâm (Center) lấy 100% trực tiếp từ Backend
    const detailedZoom = typeof panoramaZoom === 'number' && Number.isFinite(panoramaZoom)
      ? Math.max(15.5, panoramaZoom + 1.5)
      : 15.5

    mapRef.current.jumpTo({
      center: [centerLng, centerLat],
      zoom: detailedZoom,
    })

    lastFramedBboxRef.current = bboxKey
  }, [isMapLoaded, mapBounds, mapRef])

  // 2. Trạng thái bộ lọc & thanh tìm kiếm
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchInput, setSearchInput] = useState<string>('')
  const [appliedSearchQuery, setAppliedSearchQuery] = useState<string>('')
  const [selectedSegment, setSelectedSegment] = useState<string>('all')
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false)

  // 3. Trạng thái đối tượng được chọn & mở Panel bên phải
  const [selectedPole, setSelectedPole] = useState<PoleFeature | null>(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [selectedCabinet, setSelectedCabinet] = useState<any | null>(null)
  const [selectedFeeder, setSelectedFeeder] = useState<any | null>(null)

  // 4. Hook quản lý logic điện học cascade & danh mục phân tuyến
  const {
    cabinets,
    feederStatusMap,
    handleToggleFeeder,
    effectivePoles,
    segmentsList,
    segmentInfoMap,
    searchSuggestions,
    filteredFeatures,
    roadSegmentsData,
    feederLinesData,
    filteredSegmentsData,
  } = useElectricalCascade({
    statusFilter,
    selectedSegment,
    searchQuery: appliedSearchQuery,
    searchInput: searchInput,
  })

  // Thống kê nhanh trạng thái chiếu sáng (đồng bộ thời gian thực theo cascade)
  const stats: GisStats = useMemo(() => {
    let normal = 0
    let dim = 0
    let out = 0
    let unknown = 0
    effectivePoles.forEach((f: PoleFeature) => {
      const s = f.properties?.fixture_status
      if (s === 'normal') normal++
      else if (s === 'dim') dim++
      else if (s === 'out') out++
      else unknown++
    })
    return { total: effectivePoles.length, normal, dim, out, unknown }
  }, [effectivePoles])

  // Chi tiết tuyến đường đang chọn
  const activeSegmentDetail = useMemo(() => {
    if (selectedSegmentId && segmentInfoMap[selectedSegmentId]) {
      return segmentInfoMap[selectedSegmentId]
    }
    return (
      segmentsList[0] || {
        id: 'SEG-001',
        name: 'Tuyến A',
        cabinet: 'NODE-001-CTRL',
        road: 'Tuyến A',
        poleCount: 46,
        lengthM: 1600,
        hasActiveSegmentFault: false,
        iotStatus: 'online',
      }
    )
  }, [selectedSegmentId, segmentInfoMap, segmentsList])

  // 5. Chọn cột đèn
  const handleSelectPole = useCallback(
    (f: PoleFeature) => {
      setSelectedPole(f)
      setSelectedCabinet(null)
      setSelectedFeeder(null)
      setSelectedSegmentId(f.properties?.segment_id || null)

      if (mapRef.current) {
        mapRef.current.flyTo({
          center: f.geometry.coordinates,
          zoom: 17.5,
          speed: 1.2,
        })
      }
    },
    [mapRef]
  )

  // 6. Chọn tủ điện
  const handleSelectCabinet = useCallback(
    (cabinetData: any, coords: [number, number]) => {
      const p = cabinetData.properties || cabinetData
      setSelectedCabinet(p)
      setSelectedPole(null)
      setSelectedFeeder(null)
      if (p.segment_id) {
        setSelectedSegmentId(p.segment_id)
      }
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: coords,
          zoom: 17.2,
          speed: 1.2,
        })
      }
    },
    [mapRef]
  )

  // 7. Chọn tuyến cáp (Click trực tiếp lên đường dây)
  const handleSelectFeeder = useCallback((feederData: any) => {
    setSelectedFeeder(feederData)
    setSelectedPole(null)
    setSelectedCabinet(null)
    setSelectedSegmentId(null)
  }, [])

  // 7. Chọn tuyến cáp (Click trực tiếp lên đường dây)
  const handleSelectSegmentLine = useCallback((segId: string) => {
    setSelectedSegmentId(segId)
    setSelectedPole(null)
    setSelectedCabinet(null)
    setSelectedFeeder(null)
  }, [])

  // 8. Hook quản lý lớp đường dây cáp điện GeoJSON
  useFeederLinesLayer({
    map: mapRef.current,
    isMapLoaded,
    roadSegmentsData,
    feederLinesData,
    filteredSegmentsData,
    selectedCabinet,
    selectedSegment,
    segmentInfoMap,
    popupRef,
    isHoveringMarkerRef,
    activeHoverSourceRef,
    onSelectSegment: handleSelectSegmentLine,
    onSelectCabinet: handleSelectCabinet,
    onSelectFeeder: handleSelectFeeder,
  })

  // 9. Hook quản lý Marker Cột đèn & Tủ điện + Phân cấp Zoom (LOD)
  useGisMarkers({
    map: mapRef.current,
    isMapLoaded,
    filteredFeatures,
    cabinets,
    selectedPole,
    selectedCabinet,
    popupRef,
    isHoveringMarkerRef,
    activeHoverSourceRef,
    onSelectPole: handleSelectPole,
    onSelectCabinet: handleSelectCabinet,
  })

  // 10. Lọc tuyến từ Dropdown & Zoom vào tuyến (không mở Drawer)
  const handleSegmentSelect = useCallback(
    (segId: string, fromSearch = false) => {
      setSelectedSegment(segId)
      setSelectedSegmentId(null)
      setSelectedPole(null)
      setSelectedCabinet(null)
      setSelectedFeeder(null)

      if (segId === 'all' || !fromSearch) {
        setSearchInput('')
        setAppliedSearchQuery('')
        setIsSearchFocused(false)
      }

      if (!mapRef.current) return
      const map = mapRef.current

      const targetPoles =
        segId === 'all'
          ? effectivePoles
          : effectivePoles.filter((f: PoleFeature) => f.properties?.segment_id === segId)

      if (targetPoles.length > 0) {
        const bounds = new maplibregl.LngLatBounds()
        targetPoles.forEach((f: PoleFeature) => bounds.extend(f.geometry.coordinates))
        map.fitBounds(
          bounds,
          segId === 'all' ? FIT_BOUNDS_GIS_PANORAMA : FIT_BOUNDS_GIS_SEGMENT
        )
      }
    },
    [effectivePoles, mapRef]
  )

  // 11. Chọn đối tượng từ gợi ý tìm kiếm (Đa danh mục: Tuyến, Cột, Tủ điện, Atlas)
  const handleSelectSearchResult = useCallback(
    (item: SearchResultItem) => {
      setIsSearchFocused(false)
      if (item.category === 'segment') {
        setSearchInput(item.title)
        setAppliedSearchQuery('')
        setSelectedPole(null)
        setSelectedCabinet(null)
        setSelectedSegmentId(null)
        handleSegmentSelect(item.id, true)
      } else if (item.category === 'cabinet') {
        setSearchInput(item.title)
        setAppliedSearchQuery('')
        const cab = item.data
        const p = cab?.properties || {}
        setSelectedCabinet(p)
        setSelectedPole(null)
        if (p.segment_id) {
          setSelectedSegmentId(p.segment_id)
          if (selectedSegment !== 'all' && selectedSegment !== p.segment_id) {
            setSelectedSegment(p.segment_id)
          }
        }
        if (mapRef.current && item.coordinates) {
          mapRef.current.flyTo({
            center: item.coordinates,
            zoom: 17.5,
            speed: 1.2,
          })
        }
      } else if (item.category === 'pole') {
        setSearchInput(item.title)
        setAppliedSearchQuery('')
        const f = item.data as PoleFeature
        const segId = f.properties?.segment_id
        if (segId && selectedSegment !== 'all' && selectedSegment !== segId) {
          setSelectedSegment(segId)
        }
        handleSelectPole(f)
      }
    },
    [handleSegmentSelect, handleSelectPole, mapRef, selectedSegment]
  )

  // 12. Xử lý khi nhấn Enter trên ô tìm kiếm
  const handleSearchSubmit = useCallback(
    (query: string) => {
      const trimmed = query.trim()
      setIsSearchFocused(false)

      if (!trimmed) {
        setAppliedSearchQuery('')
        return
      }

      if (searchSuggestions.length > 0) {
        handleSelectSearchResult(searchSuggestions[0])
        return
      }

      setAppliedSearchQuery(trimmed)
    },
    [handleSelectSearchResult, searchSuggestions]
  )

  const handleSearchClear = useCallback(() => {
    setSearchInput('')
    setAppliedSearchQuery('')
    setIsSearchFocused(false)
  }, [])

  const isPanelOpen = Boolean(selectedPole || selectedSegmentId || selectedCabinet || selectedFeeder)

  return (
    <div className="flex-1 flex h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950 relative select-none">
      {/* Map Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden h-full">
        {/* Map Canvas Container */}
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Top Control Bar */}
        <MapControlBar
          searchQuery={searchInput}
          setSearchQuery={setSearchInput}
          isSearchFocused={isSearchFocused}
          setIsSearchFocused={setIsSearchFocused}
          searchSuggestions={searchSuggestions}
          handleSelectSearchResult={handleSelectSearchResult}
          handleSearchSubmit={handleSearchSubmit}
          handleSearchClear={handleSearchClear}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          stats={stats}
          selectedSegment={selectedSegment}
          handleSegmentSelect={handleSegmentSelect}
          segmentsList={segmentsList}
          isPanelOpen={isPanelOpen}
        />

        {/* Bottom Left Legend Box */}
        <GisMapLegend />
      </div>

      {/* Right Drawer Side Panel */}
      {isPanelOpen && (
        <GisDrawerPanel
          selectedPole={selectedPole}
          setSelectedPole={setSelectedPole}
          setSelectedSegmentId={setSelectedSegmentId}
          activeSegmentDetail={activeSegmentDetail}
          handleSelectPole={handleSelectPole}
          selectedCabinet={selectedCabinet}
          setSelectedCabinet={setSelectedCabinet}
          selectedFeeder={selectedFeeder}
          setSelectedFeeder={setSelectedFeeder}
          cabinets={cabinets}
          effectivePoles={effectivePoles}
                    feederStatusMap={feederStatusMap}
          onToggleFeeder={handleToggleFeeder}
        />
      )}
    </div>
  )
}

export default GisMapPage
