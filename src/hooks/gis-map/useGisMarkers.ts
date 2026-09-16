import { useEffect, useRef, useCallback } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { PoleFeature } from '../../pages/gis-map/GisMapPage'
import {
  createPoleMarkerElement,
  createCabinetMarkerElement,
} from '../../utils/gis-map/markerUtils'
import {
  getPoleTooltipHtml,
  getCabinetTooltipHtml,
} from '../../utils/gis-map/tooltipUtils'

interface UseGisMarkersProps {
  map: maplibregl.Map | null
  isMapLoaded: boolean
  filteredFeatures: PoleFeature[]
  cabinets: any[]
  selectedPole: PoleFeature | null
  selectedCabinet: any | null
  popupRef: React.MutableRefObject<maplibregl.Popup | null>
  isHoveringMarkerRef: React.MutableRefObject<boolean>
  activeHoverSourceRef: React.MutableRefObject<'pole' | 'cabinet' | 'feeder' | null>
  onSelectPole: (feature: PoleFeature) => void
  onSelectCabinet: (cabinetData: any, coords: [number, number]) => void
}

export function useGisMarkers({
  map,
  isMapLoaded,
  filteredFeatures,
  cabinets,
  selectedPole,
  selectedCabinet,
  popupRef,
  isHoveringMarkerRef,
  activeHoverSourceRef,
  onSelectPole,
  onSelectCabinet,
}: UseGisMarkersProps) {
  const poleMarkersRef = useRef<maplibregl.Marker[]>([])
  const cabinetMarkersRef = useRef<{ marker: maplibregl.Marker; isRoot: boolean }[]>([])
  const lastShowPolesAndLinesRef = useRef<boolean | null>(null)

  // Level of Detail (LOD) visibility based on Zoom level
  const updateZoomVisibility = useCallback(() => {
    if (!map) return
    const zoom = map.getZoom()
    const showPolesAndLines = zoom >= 13.0
    const showRootCab = zoom >= 9.5

    // 1. Pole Markers
    poleMarkersRef.current.forEach((m) => {
      const wrap = m.getElement()?.firstElementChild as HTMLElement | null
      if (wrap) {
        wrap.classList.toggle('gis-marker-visible', showPolesAndLines)
        wrap.classList.toggle('gis-marker-hidden', !showPolesAndLines)
      }
    })

    // 2. Cabinet Markers
    cabinetMarkersRef.current.forEach(({ marker, isRoot }) => {
      const wrap = marker.getElement()?.firstElementChild as HTMLElement | null
      if (wrap) {
        const isVisible = isRoot ? showRootCab : showPolesAndLines
        wrap.classList.toggle('gis-marker-visible', isVisible)
        wrap.classList.toggle('gis-marker-hidden', !isVisible)
      }
    })

    // 3. Feeder lines sync with poles
    if (lastShowPolesAndLinesRef.current !== showPolesAndLines) {
      lastShowPolesAndLinesRef.current = showPolesAndLines
      if (map.getLayer('feeder-lines-core')) {
        map.setPaintProperty('feeder-lines-core', 'line-opacity', showPolesAndLines ? 0.95 : 0)
      }
      if (map.getLayer('feeder-lines-glow')) {
        map.setPaintProperty('feeder-lines-glow', 'line-opacity', showPolesAndLines ? 0.45 : 0)
      }
    }
  }, [map])

  // Register Zoom LOD listeners
  useEffect(() => {
    if (!map || !isMapLoaded) return

    const handleZoomChange = () => {
      isHoveringMarkerRef.current = false
      activeHoverSourceRef.current = null
      if (popupRef.current && popupRef.current.isOpen()) {
        popupRef.current.remove()
      }
      updateZoomVisibility()
    }

    map.on('zoomstart', handleZoomChange)
    map.on('zoom', handleZoomChange)
    map.on('zoomend', handleZoomChange)

    updateZoomVisibility()

    return () => {
      map.off('zoomstart', handleZoomChange)
      map.off('zoom', handleZoomChange)
      map.off('zoomend', handleZoomChange)
    }
  }, [map, isMapLoaded, updateZoomVisibility])

  // 1. Render Pole Markers
  useEffect(() => {
    if (!map || !isMapLoaded) return

    poleMarkersRef.current.forEach((m) => m.remove())
    poleMarkersRef.current = []

    const cabinetCoordKeys = new Set(
      cabinets.map((c: any) => {
        const cCoords = c.geometry?.coordinates
        return cCoords ? `${cCoords[0].toFixed(5)},${cCoords[1].toFixed(5)}` : ''
      })
    )

    filteredFeatures.forEach((f: PoleFeature) => {
      const coords = f.geometry.coordinates as [number, number]
      const coordKey = `${coords[0].toFixed(5)},${coords[1].toFixed(5)}`
      const isSelected = selectedPole && selectedPole.properties?.pole_id === f.properties?.pole_id

      // Không vẽ marker cột đèn bên dưới tủ điện khi trùng vị trí để tránh đè layer
      if (cabinetCoordKeys.has(coordKey) && !isSelected) {
        return
      }

      const el = createPoleMarkerElement({
        feature: f,
        isSelected: Boolean(isSelected),
        onClick: (feature) => {
          if (!map || map.getZoom() < 13.0) return
          if (popupRef.current) popupRef.current.remove()
          activeHoverSourceRef.current = null
          onSelectPole(feature)
        },
        onHover: (feature, c) => {
          if (!map || map.getZoom() < 13.0) return
          activeHoverSourceRef.current = 'pole'
          isHoveringMarkerRef.current = true
          if (popupRef.current) {
            const html = getPoleTooltipHtml({ pole: feature })
            popupRef.current.setLngLat(c).setHTML(html).addTo(map)
          }
        },
        onLeave: () => {
          isHoveringMarkerRef.current = false
          if (activeHoverSourceRef.current === 'pole') {
            activeHoverSourceRef.current = null
            if (popupRef.current) popupRef.current.remove()
          }
        },
      })

      const marker = new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(map)
      poleMarkersRef.current.push(marker)
    })

    updateZoomVisibility()
  }, [map, isMapLoaded, filteredFeatures, selectedPole, cabinets, onSelectPole, updateZoomVisibility])

  // 2. Render Cabinet Markers
  useEffect(() => {
    if (!map || !isMapLoaded) return

    cabinetMarkersRef.current.forEach(({ marker }) => marker.remove())
    cabinetMarkersRef.current = []

    cabinets.forEach((cab) => {
      const p = cab.properties || {}
      const coords = cab.geometry.coordinates as [number, number]
      const isRoot = p.role === 'root_cabinet'
      const isSelected = selectedCabinet && selectedCabinet.cabinet_id === p.cabinet_id

      const el = createCabinetMarkerElement({
        cabinet: cab,
        isSelected: Boolean(isSelected),
        onClick: (cabinetData, c) => {
          const curZoom = map.getZoom() ?? 0
          if (!isRoot && curZoom < 13.0) return
          if (isRoot && curZoom < 9.5) return

          if (popupRef.current) popupRef.current.remove()
          activeHoverSourceRef.current = null
          onSelectCabinet(cabinetData, c)
        },
        onHover: (cabinetData, c) => {
          const curZoom = map.getZoom() ?? 0
          if (!isRoot && curZoom < 13.0) return
          if (isRoot && curZoom < 9.5) return

          activeHoverSourceRef.current = 'cabinet'
          isHoveringMarkerRef.current = true
          if (popupRef.current) {
            const tooltipHtml = getCabinetTooltipHtml({ cabinet: cabinetData })
            popupRef.current.setLngLat(c).setHTML(tooltipHtml).addTo(map)
          }
        },
        onLeave: () => {
          isHoveringMarkerRef.current = false
          if (activeHoverSourceRef.current === 'cabinet') {
            activeHoverSourceRef.current = null
            if (popupRef.current) popupRef.current.remove()
          }
        },
      })

      const marker = new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(map)
      cabinetMarkersRef.current.push({ marker, isRoot })
    })

    updateZoomVisibility()
  }, [map, isMapLoaded, cabinets, selectedCabinet, onSelectCabinet, updateZoomVisibility])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      poleMarkersRef.current.forEach((m) => m.remove())
      cabinetMarkersRef.current.forEach(({ marker }) => marker.remove())
    }
  }, [])
}
