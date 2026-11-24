import type { IotServerStatus } from '../../types/iot/servers'

type LatLng = { lat: number; lng: number }

const EARTH_RADIUS_KM = 6371.0088

/** Khoảng cách mặt cầu (haversine) giữa hai điểm, đơn vị km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/** Server có vị trí và bán kính > 0 thì mới có vùng phủ sóng để so sánh. */
export function serverCoverage(
  server?: Pick<IotServerStatus, 'location' | 'radius_km'> | null
): { center: LatLng; radiusKm: number } | null {
  const loc = server?.location
  const radius = server?.radius_km
  if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return null
  if (typeof radius !== 'number' || !Number.isFinite(radius) || radius <= 0) return null
  return { center: { lat: loc.lat, lng: loc.lng }, radiusKm: radius }
}

/**
 * Điểm có nằm trong vùng phủ sóng của server không.
 * `null` = chưa biết (chưa chọn server, server chưa có vị trí / bán kính, tủ chưa có toạ độ), không dùng để cảnh báo.
 */
export function isWithinCoverage(
  server: Pick<IotServerStatus, 'location' | 'radius_km'> | null | undefined,
  point: LatLng | null | undefined
): boolean | null {
  const coverage = serverCoverage(server)
  if (!coverage || !point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null
  return distanceKm(coverage.center, point) <= coverage.radiusKm
}
