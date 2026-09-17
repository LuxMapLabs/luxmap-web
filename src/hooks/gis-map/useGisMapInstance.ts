import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  GOOGLE_HYBRID_STYLE,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from '../../utils/gis-map/mapUtils'

export function useGisMapInstance() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false)

  useEffect(() => {
    if (!mapContainerRef.current) return

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: GOOGLE_HYBRID_STYLE,
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      minZoom: 6,
      maxZoom: 20,
      attributionControl: false,
    })

    mapRef.current = map

    // Base Controls
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
      'bottom-right'
    )

    // GPS Geolocate Control
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      showUserLocation: true,
    })

    geolocate.on('trackuserlocationstart', () => {
      const btn = document.querySelector('.maplibregl-ctrl-geolocate')
      btn?.classList.add('is-searching-location')
    })

    geolocate.on('geolocate', (e: maplibregl.GeolocatePositionEvent) => {
      const btn = document.querySelector('.maplibregl-ctrl-geolocate')
      btn?.classList.add('is-searching-location')

      if (e?.coords) {
        map.flyTo({
          center: [e.coords.longitude, e.coords.latitude],
          zoom: 17,
          speed: 1.2,
        })
        map.once('moveend', () => {
          btn?.classList.remove('is-searching-location')
        })
      } else {
        btn?.classList.remove('is-searching-location')
      }
    })

    geolocate.on('error', (err: maplibregl.GeolocateErrorEvent) => {
      const btn = document.querySelector('.maplibregl-ctrl-geolocate')
      btn?.classList.remove('is-searching-location')
      console.warn('Geolocation error:', err)
      if (err?.code === 1) {
        alert(
          'Trình duyệt chưa được cấp quyền Vị trí (Location). Bạn vui lòng bấm vào biểu tượng cài đặt trên thanh địa chỉ URL để cấp quyền nhé!'
        )
      }
    })

    map.addControl(geolocate, 'bottom-right')

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
