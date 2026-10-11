import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../../redux/store'
import * as maplibregl from 'maplibre-gl'
import type { SegmentInfo } from '../../pages/gis-map/GisMapPage'
import { getFeederTooltipHtml, getRoadSegmentTooltipHtml } from '../../utils/gis-map/tooltipUtils'
import { fetchCabinetTopologyRequest, clearCabinetTopology } from '../../feature/map/mapSlice'

interface UseFeederLinesLayerProps {
  map: maplibregl.Map | null
  isMapLoaded: boolean
  roadSegmentsData?: any[]
  feederLinesData?: any[]
  filteredSegmentsData?: any[]
  selectedCabinet?: any | null
  segmentInfoMap: Record<string, SegmentInfo>
  popupRef: React.MutableRefObject<maplibregl.Popup | null>
  isHoveringMarkerRef: React.MutableRefObject<boolean>
  activeHoverSourceRef: React.MutableRefObject<'pole' | 'cabinet' | 'feeder' | 'road' | null>
  onSelectSegment: (segmentId: string) => void
  onSelectCabinet?: (cabData: any, coords: [number, number]) => void
}

export function useFeederLinesLayer({
  map,
  isMapLoaded,
  roadSegmentsData = [],
  feederLinesData,
  filteredSegmentsData = [],
  selectedCabinet,
  popupRef,
  isHoveringMarkerRef,
  activeHoverSourceRef,
  onSelectSegment,
  onSelectCabinet,
}: UseFeederLinesLayerProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { cabinetTopologyEdges } = useSelector((state: RootState) => state.map)
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

    // B. Electrical Feeder & Topology Edges (Sơ đồ cấp nguồn Trụ → Cột, thanh mảnh nằm ĐÈ LÊN TRÊN tuyến đường)
    const initialFeeders = feederLinesData || filteredSegmentsData
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
        minzoom: 9.5,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': [
            'coalesce',
            ['get', 'glow_color'],
            ['case', ['==', ['get', 'status'], 'fault'], '#e11d48', '#10b981'],
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 13, 4.0, 16, 5.5],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 11.5, 0, 12.5, 0.45],
          'line-blur': 1.5,
        },
      })

      // Core layer (Đường nét liền thanh mảnh, sắc nét 1.4px - 2.8px, nổi trên lòng đường)
      map.addLayer({
        id: 'feeder-lines-core',
        type: 'line',
        source: 'feeder-lines',
        minzoom: 9.5,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': [
            'coalesce',
            ['get', 'color'],
            ['case', ['==', ['get', 'status'], 'fault'], '#f43f5e', '#10b981'],
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.4, 13, 2.0, 16, 2.8],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 11.5, 0, 12.5, 0.95],
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
        const html = getFeederTooltipHtml({ featureProps: p })
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
      onSelectSegment(segId)
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
  }, [map, isMapLoaded, onSelectSegment, onSelectCabinet])

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

    if (!selCabId || !cabinetTopologyEdges || cabinetTopologyEdges.length === 0) {
      feederSrc.setData({
        type: 'FeatureCollection',
        features: feederLinesData || filteredSegmentsData || [],
      })
      return
    }

    const FEEDER_COLOR_PALETTE = [
      { core: '#10b981', glow: '#059669' }, // Emerald
      { core: '#3b82f6', glow: '#2563eb' }, // Blue
      { core: '#f59e0b', glow: '#d97706' }, // Amber
      { core: '#8b5cf6', glow: '#7c3aed' }, // Purple
      { core: '#06b6d4', glow: '#0891b2' }, // Cyan
      { core: '#ec4899', glow: '#db2777' }, // Pink
      { core: '#f97316', glow: '#ea580c' }, // Orange
    ]

    const getFeederTheme = (feederId?: string | null) => {
      if (!feederId) return FEEDER_COLOR_PALETTE[0]
      let hash = 0
      for (let i = 0; i < feederId.length; i++) {
        hash = feederId.charCodeAt(i) + ((hash << 5) - hash)
      }
      const index = Math.abs(hash) % FEEDER_COLOR_PALETTE.length
      return FEEDER_COLOR_PALETTE[index]
    }

    const features = cabinetTopologyEdges.map((feat: any) => {
      const p = feat.properties || {}
      const isFault = selectedCabinet?.status === 'fault'
      const theme = getFeederTheme(p.feeder_id)
      return {
        ...feat,
        properties: {
          ...p,
          cabinet_id: selCabId,
          cabinet_name: selectedCabinet?.cabinet_name || selCabId,
          status: isFault ? 'fault' : 'active',
          color: isFault ? '#f43f5e' : theme.core,
          glow_color: isFault ? '#e11d48' : theme.glow,
        },
      }
    })

    feederSrc.setData({
      type: 'FeatureCollection',
      features,
    })
  }, [map, isMapLoaded, selectedCabinet, cabinetTopologyEdges, feederLinesData, filteredSegmentsData])

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
