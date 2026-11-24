const EARTH_RADIUS_KM = 6371.0088
const CIRCLE_STEPS = 96

/** Bán kính km hợp lệ để vẽ: số hữu hạn > 0, ngoài ra (0, rỗng, NaN) thì không vẽ vòng. */
export const isDrawableRadiusKm = (radiusKm?: number | null): radiusKm is number =>
  typeof radiusKm === 'number' && Number.isFinite(radiusKm) && radiusKm > 0

/** Vòng tròn mặt cầu tâm (lng, lat), bán kính km, dạng ring GeoJSON khép kín [lng, lat]. */
export function circleRing(lng: number, lat: number, radiusKm: number, steps = CIRCLE_STEPS): [number, number][] {
  const angular = radiusKm / EARTH_RADIUS_KM
  const lat1 = (lat * Math.PI) / 180
  const lng1 = (lng * Math.PI) / 180
  const ring: [number, number][] = []
  for (let i = 0; i < steps; i++) {
    const bearing = (2 * Math.PI * i) / steps
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing))
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
        Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2)
      )
    ring.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI])
  }
  ring.push(ring[0])
  return ring
}
