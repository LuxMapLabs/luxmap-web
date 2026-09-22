import { useEffect } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { SegmentInfo } from '../../pages/gis-map/GisMapPage'
import { getFeederTooltipHtml, getRoadSegmentTooltipHtml } from '../../utils/gis-map/tooltipUtils'

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
  // 1. Add Sources & Layers on Map Load
  useEffect(() => {
    if (!map || !isMapLoaded) return

    // A. Road Segments Centerline (Trục tim đường giao thông cơ sở - đường nét đứt xám bạc / xanh slate)
    if (!map.getSource('road-segments')) {
      map.addSource('road-segments', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: roadSegmentsData || [],
        },
      })

      // Lớp viền nền mờ cho tim đường (nổi bật trên ảnh vệ tinh)
      map.addLayer({
        id: 'road-segments-bg',
        type: 'line',
        source: 'road-segments',
        minzoom: 8.5,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0f172a',
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2.5, 12, 4.0, 16, 5.5],
          'line-opacity': 0.45,
        },
      })

      // Lớp nét đứt màu slate thể hiện trục tuyến đường giao thông
      map.addLayer({
        id: 'road-segments-line',
        type: 'line',
        source: 'road-segments',
        minzoom: 8.5,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#94a3b8',
          'line-dasharray': [4, 2.5],
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.8, 12, 2.6, 16, 3.8],
          'line-opacity': 0.85,
        },
      })
    }

    // B. Electrical Feeder Lines (Tuyến dây điện chiếu sáng nổi phía trên tim đường)
    const initialFeeders = feederLinesData || filteredSegmentsData
    if (!map.getSource('feeder-lines')) {
      map.addSource('feeder-lines', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: initialFeeders,
        },
      })

      // Glow layer (Hào quang phát sáng nhận diện đường dây)
      map.addLayer({
        id: 'feeder-lines-glow',
        type: 'line',
        source: 'feeder-lines',
        minzoom: 9.5,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['coalesce', ['get', 'glow_color'], ['case', ['==', ['get', 'status'], 'fault'], '#e11d48', '#059669']],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 13, 5.5, 16, 8],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 12.0, 0, 13.0, 0.45],
          'line-blur': 2.5,
        },
      })

      // Core layer (Đường dây điện sắc nét, liên tục từ Tủ điện qua các cột đèn)
      map.addLayer({
        id: 'feeder-lines-core',
        type: 'line',
        source: 'feeder-lines',
        minzoom: 9.5,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['coalesce', ['get', 'color'], ['case', ['==', ['get', 'status'], 'fault'], '#f43f5e', '#10b981']],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.8, 13, 2.6, 16, 3.6],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 12.0, 0, 13.0, 0.95],
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

      if (onSelectCabinet && p.cabinet_id) {
        onSelectCabinet(p, [e.lngLat.lng, e.lngLat.lat])
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
  }, [map, isMapLoaded, onSelectSegment, onSelectCabinet])

  // 2. Update Source data when dynamic data changes
  useEffect(() => {
    if (!map || !isMapLoaded) return

    const roadSrc = map.getSource('road-segments') as maplibregl.GeoJSONSource | undefined
    if (roadSrc) {
      roadSrc.setData({
        type: 'FeatureCollection',
        features: roadSegmentsData || [],
      })
    }

    const feederSrc = map.getSource('feeder-lines') as maplibregl.GeoJSONSource | undefined
    const feats = feederLinesData || filteredSegmentsData || []
    if (feederSrc) {
      feederSrc.setData({
        type: 'FeatureCollection',
        features: feats,
      })
    }
  }, [map, isMapLoaded, roadSegmentsData, feederLinesData, filteredSegmentsData])

  // 3. Highlight Selected Cabinet's Feeder Line (Làm nổi bật tuyến dây của Tủ đang chọn)
  useEffect(() => {
    if (!map || !isMapLoaded) return
    if (!map.getLayer('feeder-lines-core')) return

    const selCabId = selectedCabinet?.cabinet_id

    if (selCabId) {
      map.setPaintProperty('feeder-lines-core', 'line-opacity', [
        'case',
        ['==', ['get', 'cabinet_id'], selCabId],
        1.0,
        0.2,
      ])
      map.setPaintProperty('feeder-lines-core', 'line-width', [
        'case',
        ['==', ['get', 'cabinet_id'], selCabId],
        4.5,
        1.8,
      ])
      if (map.getLayer('feeder-lines-glow')) {
        map.setPaintProperty('feeder-lines-glow', 'line-opacity', [
          'case',
          ['==', ['get', 'cabinet_id'], selCabId],
          0.85,
          0.05,
        ])
        map.setPaintProperty('feeder-lines-glow', 'line-width', [
          'case',
          ['==', ['get', 'cabinet_id'], selCabId],
          9.0,
          3.0,
        ])
      }
    } else {
      map.setPaintProperty('feeder-lines-core', 'line-opacity', [
        'interpolate',
        ['linear'],
        ['zoom'],
        12.0,
        0,
        13.0,
        0.95,
      ])
      map.setPaintProperty('feeder-lines-core', 'line-width', [
        'interpolate',
        ['linear'],
        ['zoom'],
        10,
        1.8,
        13,
        2.6,
        16,
        3.6,
      ])
      if (map.getLayer('feeder-lines-glow')) {
        map.setPaintProperty('feeder-lines-glow', 'line-opacity', [
          'interpolate',
          ['linear'],
          ['zoom'],
          12.0,
          0,
          13.0,
          0.45,
        ])
        map.setPaintProperty('feeder-lines-glow', 'line-width', [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          3,
          13,
          5.5,
          16,
          8,
        ])
      }
    }
  }, [map, isMapLoaded, selectedCabinet])
}
