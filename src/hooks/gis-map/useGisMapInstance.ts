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
  toLngLatBounds,
  SATELLITE_TILE_URL,
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
      // Giữ nhiều ô bản đồ trong bộ nhớ: kéo/zoom quay lại chỗ vừa xem thì hiện ngay, không tải và giải mã lại
      maxTileCacheSize: 200,
      attributionControl: false,
    })

    mapRef.current = map
    // Vào thẳng đúng khu vực xã ngay khi tạo bản đồ (cùng công thức zoom với GisMapPage) để ô vệ tinh đầu tiên
    // tải đúng chỗ. Trước đây bản đồ tải ở tâm mặc định rồi mới nhảy sang xã sau 'load' -> hiện nền xanh rồi khựng chờ tải lại.
    const initialBounds = toLngLatBounds(mapBounds?.bbox)
    if (initialBounds && initialCenter !== DEFAULT_MAP_CENTER) {
      const panoramaZoom = map.cameraForBounds(initialBounds, { padding: 40 })?.zoom
      map.jumpTo({
        center: initialCenter,
        zoom:
          typeof panoramaZoom === 'number' && Number.isFinite(panoramaZoom)
            ? Math.max(15.5, panoramaZoom + 1.5)
            : 15.5,
      })
    }

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

    // Tải trước 1 vòng ô vệ tinh quanh khung nhìn vào cache trình duyệt (MapTiler cho cache 8 giờ):
    // kéo ra ngoài thì ô đã có sẵn, không phải chờ ~1s với nền trống.
    // Thêm 3 mức zoom nhỏ hơn (chỉ phủ khung nhìn, không thêm vòng) để zoom nhỏ nhanh nhiều bậc cũng có sẵn ô.
    const prefetched = new Set<string>()
    const prefetchAroundView = () => {
      const topZoom = Math.min(Math.floor(map.getZoom()), 22)
      const b = map.getBounds()
      for (let zoom = topZoom; zoom >= Math.max(topZoom - 3, 0); zoom--) {
        const ring = zoom === topZoom ? 1 : 0
        const n = 2 ** zoom
        const toX = (lng: number) => Math.floor(((lng + 180) / 360) * n)
        const toY = (lat: number) => {
          const r = (Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180
          return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)
        }
        const x0 = Math.max(0, toX(b.getWest()) - ring)
        const x1 = Math.min(n - 1, toX(b.getEast()) + ring)
        const y0 = Math.max(0, toY(b.getNorth()) - ring)
        const y1 = Math.min(n - 1, toY(b.getSouth()) + ring)
        if ((x1 - x0 + 1) * (y1 - y0 + 1) > 64) continue
        for (let x = x0; x <= x1; x++) {
          for (let y = y0; y <= y1; y++) {
            const url = SATELLITE_TILE_URL.replace('{z}', String(zoom)).replace('{x}', String(x)).replace('{y}', String(y))
            if (prefetched.has(url)) continue
            prefetched.add(url)
            fetch(url).catch(() => prefetched.delete(url))
          }
        }
      }
    }
    map.on('idle', prefetchAroundView)    // Canvas phải co giãn theo khung chứa (đổi cỡ cửa sổ, thu gọn sidebar...), nếu không sẽ lộ viền trống.
    // `resize()` xoá canvas và chỉ vẽ lại ở khung hình kế: sidebar đang chạy hiệu ứng thì mỗi khung bị trắng một nhịp
    // (nháy, khựng). `redraw()` vẽ lại ngay trong cùng khung.
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        map.resize()
        map.redraw()
      })
      resizeObserver.observe(mapContainerRef.current)
    }

    return () => {
      resizeObserver?.disconnect()
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
