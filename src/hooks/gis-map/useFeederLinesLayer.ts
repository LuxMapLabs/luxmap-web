import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../../redux/store'
import * as maplibregl from 'maplibre-gl'
import type { SegmentInfo } from '../../pages/gis-map/GisMapPage'
import { getFeederTooltipHtml, getRoadSegmentTooltipHtml } from '../../utils/gis-map/tooltipUtils'
import { fetchCabinetTopologyRequest, clearCabinetTopology } from '../../feature/map/mapSlice'
import { findByIdOrRef } from '../../utils/assets/findByIdOrRef'
import { FEEDER_HEALTH_UI, feederHealthUi } from '../../utils/gis-map/poleLampState'

interface UseFeederLinesLayerProps {
  map: maplibregl.Map | null
  isMapLoaded: boolean
  roadSegmentsData?: any[]
  feederLinesData?: any[]
  filteredSegmentsData?: any[]
  selectedCabinet?: any | null
  selectedSegment?: string
  segmentInfoMap: Record<string, SegmentInfo>
  popupRef: React.MutableRefObject<maplibregl.Popup | null>
  isHoveringMarkerRef: React.MutableRefObject<boolean>
  activeHoverSourceRef: React.MutableRefObject<'pole' | 'cabinet' | 'feeder' | 'road' | null>
  onSelectSegment: (segmentId: string) => void
  onSelectCabinet?: (cabData: any, coords: [number, number]) => void
  onSelectFeeder?: (feederData: any) => void
}

export function useFeederLinesLayer({
  map,
  isMapLoaded,
  roadSegmentsData = [],
  feederLinesData,
  filteredSegmentsData = [],
  selectedCabinet,
  selectedSegment = 'all',
  popupRef,
  isHoveringMarkerRef,
  activeHoverSourceRef,
  onSelectSegment,
  onSelectCabinet,
  onSelectFeeder,
}: UseFeederLinesLayerProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { cabinetTopologyEdges, allTopologyEdges } = useSelector((state: RootState) => state.map)
  const {
    cabinets: assetCabinets,
    feeders: assetFeeders,
    poles: assetPoles,
    segments: assetSegments,
  } = useSelector((state: RootState) => state.assets)

  // Cạnh topology từ backend chỉ mang id nội bộ; tooltip phải hiện mã hiển thị (external_ref) như các tooltip khác.
  const displayLookupRef = useRef<(p: any) => any>((p) => p)
  displayLookupRef.current = (p: any) => {
    const poleRef = new Map<string, string>()
    ;(assetPoles || []).forEach((x: any) => x.pole_id && x.external_ref && poleRef.set(x.pole_id, x.external_ref))
    const cab = (assetCabinets || []).find((x: any) => x.cabinet_id === (p.cabinet_id || p.from_id))
    const fdr = (assetFeeders || []).find((x: any) => x.feeder_id === p.feeder_id)
    const seg = (assetSegments || []).find((x: any) => x.segment_id === p.segment_id)
    return {
      ...p,
      external_ref: fdr?.external_ref || p.external_ref,
      cabinet_external_ref: cab?.external_ref || p.cabinet_external_ref,
      segment_name: seg?.segment_name || p.segment_name,
      from_code: poleRef.get(p.from_id) || cab?.external_ref || p.from_code,
      to_pole_code: poleRef.get(p.to_pole_id) || p.to_pole_code,
    }
  }
  // 1. Add Sources & Layers on Map Load
  useEffect(() => {
    if (!map || !isMapLoaded) return

    // A. Road Segments Centerline (Hành lang trục tuyến đường - Nét liền to bản, vững chắc)
    if (!map.getSource('road-segments')) {
      map.addSource('road-segments', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: roadSegmentsData || [],
        },
      })

      // Lớp viền nền đậm tạo độ tương phản cho tuyến đường trên nền ảnh vệ tinh / bản đồ
      map.addLayer({
        id: 'road-segments-bg',
        type: 'line',
        source: 'road-segments',
        minzoom: 8.5,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0f172a',
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 4.0, 12, 7.5, 16, 12.0],
          'line-opacity': 0.55,
        },
      })

      // Lớp mặt tuyến đường nét liền (Solid line, không nét đứt) to bản màu xám slate
      map.addLayer({
        id: 'road-segments-line',
        type: 'line',
        source: 'road-segments',
        minzoom: 8.5,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#64748b',
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 3.0, 12, 5.5, 16, 9.0],
          'line-opacity': 0.85,
        },
      })
    }

    // B. Electrical Feeder & Topology Edges (Sơ đồ cấp nguồn Trụ → Cột 100% từ Backend PostGIS, thanh mảnh nằm ĐÈ LÊN TRÊN tuyến đường)
    const rawInitialFeeders = allTopologyEdges && allTopologyEdges.length > 0 ? allTopologyEdges : (feederLinesData || filteredSegmentsData || [])
    // Chưa có sức khỏe mạch từ API: tô xám "Chưa có IoT", effect bên dưới tô lại theo power_state
    const initialFeeders = rawInitialFeeders.map((feat: any) => ({
      ...feat,
      properties: {
        ...(feat.properties || {}),
        color: FEEDER_HEALTH_UI.unknown.color,
        glow_color: FEEDER_HEALTH_UI.unknown.glow,
      },
    }))

    if (!map.getSource('feeder-lines')) {
      map.addSource('feeder-lines', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: initialFeeders,
        },
      })

      // Glow layer (Hào quang nhẹ quanh đường dây điện)
      map.addLayer({
        id: 'feeder-lines-glow',
        type: 'line',
        source: 'feeder-lines',
        minzoom: 8.5,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': [
            'coalesce',
            ['get', 'glow_color'],
            FEEDER_HEALTH_UI.unknown.glow,
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2.0, 12, 3.5, 16, 5.0],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 9.5, 0, 11.0, 0.45],
          'line-blur': 1.5,
        },
      })

      // Core layer (Đường nét liền thanh mảnh, sắc nét 1.4px - 2.8px, nổi trên lòng đường)
      map.addLayer({
        id: 'feeder-lines-core',
        type: 'line',
        source: 'feeder-lines',
        minzoom: 8.5,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': [
            'coalesce',
            ['get', 'color'],
            FEEDER_HEALTH_UI.unknown.color,
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.2, 12, 1.8, 16, 2.6],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 9.5, 0, 11.0, 0.95],
        },
      })

      // Mạch đang TẮT (lamp_state = off): vạch trắng đứt đè lên màu sức khỏe, để màu vẫn đọc được "đang tắt"
      map.addLayer({
        id: 'feeder-lines-alert-off',
        type: 'line',
        source: 'feeder-lines',
        minzoom: 8.5,
        filter: ['==', ['get', 'lamp_state'], 'off'],
        layout: { 'line-join': 'round', 'line-cap': 'butt' },
        paint: {
          'line-color': '#ffffff',
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.2, 12, 1.8, 16, 2.6],
          'line-dasharray': [2, 2],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 9.5, 0, 11.0, 0.95],
        },
      })
    }

    // --- Events for Road Segments ---
    const handleRoadMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
      if (
        isHoveringMarkerRef.current ||
        activeHoverSourceRef.current === 'pole' ||
        activeHoverSourceRef.current === 'cabinet' ||
        activeHoverSourceRef.current === 'feeder'
      ) {
        return
      }

      if (!e.features || e.features.length === 0) return
      map.getCanvas().style.cursor = 'pointer'
      const feat = e.features[0]
      const p = feat.properties || {}

      if (popupRef.current) {
        activeHoverSourceRef.current = 'road'
        const html = getRoadSegmentTooltipHtml({ featureProps: p })
        popupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map)
      }
    }

    const handleRoadMouseLeave = () => {
      if (activeHoverSourceRef.current === 'road') {
        map.getCanvas().style.cursor = ''
        activeHoverSourceRef.current = null
        if (popupRef.current) popupRef.current.remove()
      }
    }

    const handleRoadClick = (e: maplibregl.MapLayerMouseEvent) => {
      if (
        isHoveringMarkerRef.current ||
        activeHoverSourceRef.current === 'pole' ||
        activeHoverSourceRef.current === 'cabinet' ||
        activeHoverSourceRef.current === 'feeder'
      ) {
        return
      }
      if (!e.features || e.features.length === 0) return
      const p = e.features[0].properties || {}
      const segId = p.segment_id || 'SEG-001'
      onSelectSegment(segId)
    }

    map.on('mousemove', 'road-segments-line', handleRoadMouseMove)
    map.on('mouseleave', 'road-segments-line', handleRoadMouseLeave)
    map.on('click', 'road-segments-line', handleRoadClick)

    // --- Events for Feeder Lines ---
    const handleFeederMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
      if (map.getZoom() < 13.0) {
        map.getCanvas().style.cursor = ''
        if (activeHoverSourceRef.current === 'feeder') {
          activeHoverSourceRef.current = null
          if (popupRef.current) popupRef.current.remove()
        }
        return
      }

      if (
        isHoveringMarkerRef.current ||
        activeHoverSourceRef.current === 'pole' ||
        activeHoverSourceRef.current === 'cabinet'
      ) {
        return
      }

      if (!e.features || e.features.length === 0) return
      map.getCanvas().style.cursor = 'pointer'
      const feat = e.features[0]
      const p = feat.properties || {}

      if (popupRef.current) {
        activeHoverSourceRef.current = 'feeder'
        const html = getFeederTooltipHtml({ featureProps: displayLookupRef.current(p) })
        popupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map)
      }
    }

    const handleFeederMouseLeave = () => {
      if (activeHoverSourceRef.current === 'feeder') {
        map.getCanvas().style.cursor = ''
        activeHoverSourceRef.current = null
        if (popupRef.current) popupRef.current.remove()
      }
    }

    const handleFeederClick = (e: maplibregl.MapLayerMouseEvent) => {
      if (map.getZoom() < 13.0) return
      if (
        isHoveringMarkerRef.current ||
        activeHoverSourceRef.current === 'pole' ||
        activeHoverSourceRef.current === 'cabinet'
      ) {
        return
      }
      if (!e.features || e.features.length === 0) return
      const p = e.features[0].properties || {}
      const segId = p.segment_id || 'SEG-001'

      // BẮT BUỘC: Khi click vào đường dây điện chạy dọc theo tuyến đường, luôn mở Panel Tuyến đường (Segment), tuyệt đối không mở panel Feeder hay Cabinet.
      const fId = p.feeder_id
      if (onSelectFeeder && fId) {
        const found = findByIdOrRef(assetFeeders ?? [], (f: any) => f.feeder_id, fId)
        onSelectFeeder({
          ...p,
          ...(found || {}),
          feeder_id: fId,
          feeder_name: found?.feeder_name || p.feeder_name || `Mạch ${fId}`,
          external_ref: found?.external_ref || p.external_ref || fId,
          cabinet_id: p.cabinet_id || found?.cabinet?.cabinet_id || (p.from_id?.startsWith('CAB') ? p.from_id : undefined),
          cabinet_name: p.cabinet_name || found?.cabinet?.cabinet_name,
          segment_id: p.segment_id,
        })
      } else {
        onSelectSegment(segId)
      }
    }

    map.on('mousemove', 'feeder-lines-core', handleFeederMouseMove)
    map.on('mouseleave', 'feeder-lines-core', handleFeederMouseLeave)
    map.on('click', 'feeder-lines-core', handleFeederClick)

    return () => {
      if (map.getLayer('road-segments-line')) {
        map.off('mousemove', 'road-segments-line', handleRoadMouseMove)
        map.off('mouseleave', 'road-segments-line', handleRoadMouseLeave)
        map.off('click', 'road-segments-line', handleRoadClick)
      }
      if (map.getLayer('feeder-lines-core')) {
        map.off('mousemove', 'feeder-lines-core', handleFeederMouseMove)
        map.off('mouseleave', 'feeder-lines-core', handleFeederMouseLeave)
        map.off('click', 'feeder-lines-core', handleFeederClick)
      }
    }
  }, [map, isMapLoaded, onSelectSegment, onSelectCabinet, onSelectFeeder, assetFeeders])

  // 2. Fetch and render Cabinet Topology Edges via Redux Saga when a Cabinet is selected
  useEffect(() => {
    if (!map || !isMapLoaded) return

    const selCabId = selectedCabinet?.cabinet_id

    if (selCabId) {
      dispatch(fetchCabinetTopologyRequest(selCabId))
    } else {
      dispatch(clearCabinetTopology())
    }
  }, [dispatch, map, isMapLoaded, selectedCabinet])

  // 3. Render Topology Edges into MapLibre Source when Redux edges change
  useEffect(() => {
    if (!map || !isMapLoaded) return

    const feederSrc = map.getSource('feeder-lines') as maplibregl.GeoJSONSource | undefined
    if (!feederSrc) return

    const selCabId = selectedCabinet?.cabinet_id

    // Nguồn dữ liệu: Ưu tiên cabinetTopologyEdges nếu đang click chọn tủ, hoặc nạp toàn bộ allTopologyEdges từ Backend ngay khi mở tab
    let sourceEdges = (selCabId && cabinetTopologyEdges && cabinetTopologyEdges.length > 0)
      ? cabinetTopologyEdges
      : (allTopologyEdges && allTopologyEdges.length > 0)
      ? allTopologyEdges
      : cabinetTopologyEdges || []

    // Nếu đang chọn lọc theo tuyến đường cụ thể, chỉ hiển thị các cạnh thuộc tuyến đó
    if (selectedSegment && selectedSegment !== 'all') {
      sourceEdges = sourceEdges.filter(
        (e: any) => e.properties?.segment_id === selectedSegment
      )
    }

    if (!sourceEdges || sourceEdges.length === 0) {
      feederSrc.setData({
        type: 'FeatureCollection',
        features: [],
      })
      return
    }

    // Feeder -> Cabinet, sức khỏe (power_state), bật/tắt (lamp_state) và control_mode: đọc nguyên từ GET /assets/feeders
    const feederToCabinetMap = new Map<string, string>()
    const feederHealthMap = new Map<string, string>()
    const feederLampMap = new Map<string, string>()
    const feederControlModeMap = new Map<string, string>()

    if (selectedCabinet?.feeders && Array.isArray(selectedCabinet.feeders)) {
      // GET /map/cabinets: power_state ở đây là bật/tắt (on/off/unknown), chỉ dùng khi danh sách feeder chưa có lamp_state
      selectedCabinet.feeders.forEach((cf: any) => {
        if (cf.feeder_id) {
          if (cf.power_state) feederLampMap.set(cf.feeder_id, cf.power_state)
          if (cf.control_mode) feederControlModeMap.set(cf.feeder_id, cf.control_mode)
        }
      })
    }

    if (assetFeeders && assetFeeders.length > 0) {
      assetFeeders.forEach((fdr: any) => {
        if (fdr.feeder_id) {
          if (fdr.cabinet?.cabinet_id) {
            feederToCabinetMap.set(fdr.feeder_id, fdr.cabinet.cabinet_id)
          }
          if (fdr.power_state) feederHealthMap.set(fdr.feeder_id, fdr.power_state)
          if (fdr.lamp_state) feederLampMap.set(fdr.feeder_id, fdr.lamp_state)
          if (fdr.control?.control_mode && !feederControlModeMap.has(fdr.feeder_id)) {
            feederControlModeMap.set(fdr.feeder_id, fdr.control.control_mode)
          }
        }
      })
    }

    // Màu đường chỉ theo power_state (sức khỏe); lamp_state = off thêm vạch trắng đứt (lớp feeder-lines-alert-off)
    const features = sourceEdges.map((feat: any) => {
      const p = feat.properties || {}
      const feederId = p.feeder_id
      const linkedCabinetId =
        p.cabinet_id ||
        (feederId ? feederToCabinetMap.get(feederId) : null) ||
        (p.order === 1 ? p.from_id : null)

      const linkedCabinetName =
        p.cabinet_name ||
        (selectedCabinet?.cabinet_id === linkedCabinetId ? selectedCabinet.cabinet_name : null) ||
        (linkedCabinetId ? `Tủ ${linkedCabinetId}` : undefined)

      const powerState = feederId ? feederHealthMap.get(feederId) : undefined
      const lampState = feederId ? feederLampMap.get(feederId) : undefined
      const health = feederHealthUi(powerState) ?? FEEDER_HEALTH_UI.unknown

      return {
        ...feat,
        properties: {
          ...p,
          cabinet_id: linkedCabinetId,
          cabinet_name: linkedCabinetName,
          power_state: powerState,
          lamp_state: lampState,
          control_mode: feederId ? feederControlModeMap.get(feederId) : undefined,
          color: health.color,
          glow_color: health.glow,
        },
      }
    })

    feederSrc.setData({
      type: 'FeatureCollection',
      features,
    })
  }, [
    map,
    isMapLoaded,
    selectedCabinet,
    cabinetTopologyEdges,
    allTopologyEdges,
    assetFeeders,
    selectedSegment,
  ])

  // 3. Update Road Segments Source data
  useEffect(() => {
    if (!map || !isMapLoaded) return

    const roadSrc = map.getSource('road-segments') as maplibregl.GeoJSONSource | undefined
    if (roadSrc) {
      roadSrc.setData({
        type: 'FeatureCollection',
        features: roadSegmentsData || [],
      })
    }
  }, [map, isMapLoaded, roadSegmentsData])
}
