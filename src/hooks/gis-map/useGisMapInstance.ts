import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../redux/store'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  GOOGLE_HYBRID_STYLE,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_MAX_ZOOM,
  MAP_DEFAULT_MIN_ZOOM,
} from '../../utils/gis-map/mapUtils'

export function useGisMapInstance() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false)
  const mapBounds = useSelector((state: RootState) => state.auth.user?.map_bounds)

  useEffect(() => {
    if (!mapContainerRef.current) return

    const centerLng = mapBounds?.center?.lng
    const centerLat = mapBounds?.center?.lat
    const initialCenter: [number, number] =
      typeof centerLng === 'number' && Number.isFinite(centerLng) &&
      typeof centerLat === 'number' && Number.isFinite(centerLat)
        ? [centerLng, centerLat]
        : DEFAULT_MAP_CENTER

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: GOOGLE_HYBRID_STYLE,
      center: initialCenter,
      zoom: DEFAULT_MAP_ZOOM,
      minZoom: MAP_DEFAULT_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      attributionControl: false,
    })

    mapRef.current = map

    // Base Controls
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
      'bottom-right'
    )

    // Tooltip Popup
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: [0, -14],
      className: 'feeder-hover-tooltip',
    })
    popupRef.current = popup

    map.on('load', () => {
      setIsMapLoaded(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
      popupRef.current = null
    }
  }, [])

  return {
    mapContainerRef,
    mapRef,
    popupRef,
    isMapLoaded,
  }
}
