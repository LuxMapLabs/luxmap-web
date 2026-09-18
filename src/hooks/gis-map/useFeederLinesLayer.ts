import { useEffect } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { SegmentInfo } from '../../pages/gis-map/GisMapPage'
import { getFeederTooltipHtml } from '../../utils/gis-map/tooltipUtils'

interface UseFeederLinesLayerProps {
  map: maplibregl.Map | null
  isMapLoaded: boolean
  filteredSegmentsData: any[]
  segmentInfoMap: Record<string, SegmentInfo>
  popupRef: React.MutableRefObject<maplibregl.Popup | null>
  isHoveringMarkerRef: React.MutableRefObject<boolean>
  activeHoverSourceRef: React.MutableRefObject<'pole' | 'cabinet' | 'feeder' | null>
  onSelectSegment: (segmentId: string) => void
}

export function useFeederLinesLayer({
  map,
  isMapLoaded,
  filteredSegmentsData,
  segmentInfoMap,
  popupRef,
  isHoveringMarkerRef,
  activeHoverSourceRef,
  onSelectSegment,
}: UseFeederLinesLayerProps) {
  // 1. Add Source & Layers on Map Load
  useEffect(() => {
    if (!map || !isMapLoaded) return

    if (!map.getSource('feeder-lines')) {
      map.addSource('feeder-lines', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: filteredSegmentsData,
        },
      })

      map.addLayer({
        id: 'feeder-lines-glow',
        type: 'line',
        source: 'feeder-lines',
        minzoom: 9.5,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['case', ['==', ['get', 'status'], 'fault'], '#e11d48', '#059669'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 13, 5, 16, 7],
          'line-opacity': map.getZoom() >= 13.0 ? 0.35 : 0,
          'line-opacity-transition': { duration: 300, delay: 0 },
          'line-blur': 2.5,
        },
      })

      map.addLayer({
        id: 'feeder-lines-core',
        type: 'line',
        source: 'feeder-lines',
        minzoom: 9.5,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['case', ['==', ['get', 'status'], 'fault'], '#f43f5e', '#10b981'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.6, 13, 2.4, 16, 3.0],
          'line-opacity': map.getZoom() >= 13.0 ? 0.95 : 0,
          'line-opacity-transition': { duration: 300, delay: 0 },
        },
      })
    }

    // Event handlers for feeder lines
    const handleMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
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
      const segId = p.segment_id || 'SEG-001'
      const info = segmentInfoMap[segId]

      if (popupRef.current) {
        activeHoverSourceRef.current = 'feeder'
        const html = getFeederTooltipHtml({ featureProps: p, info })
        popupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map)
      }
    }

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = ''
      if (activeHoverSourceRef.current === 'feeder') {
        activeHoverSourceRef.current = null
        if (popupRef.current) popupRef.current.remove()
      }
    }

    const handleClick = (e: maplibregl.MapLayerMouseEvent) => {
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
      onSelectSegment(segId)
    }

    map.on('mousemove', 'feeder-lines-core', handleMouseMove)
    map.on('mouseleave', 'feeder-lines-core', handleMouseLeave)
    map.on('click', 'feeder-lines-core', handleClick)

    return () => {
      if (map.getLayer('feeder-lines-core')) {
        map.off('mousemove', 'feeder-lines-core', handleMouseMove)
        map.off('mouseleave', 'feeder-lines-core', handleMouseLeave)
        map.off('click', 'feeder-lines-core', handleClick)
      }
    }
  }, [map, isMapLoaded, segmentInfoMap, onSelectSegment])

  // 2. Update Source data when dynamic electrical cascade data changes
  useEffect(() => {
    if (!map || !isMapLoaded) return
    const src = map.getSource('feeder-lines') as maplibregl.GeoJSONSource | undefined
    if (src) {
      src.setData({
        type: 'FeatureCollection',
        features: filteredSegmentsData,
      })
    }
  }, [map, isMapLoaded, filteredSegmentsData])
}
