import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '../../redux/store'
import { fetchCommuneBoundariesRequest } from '../../feature/map/mapSlice'
import { mergeGeometries } from '../../utils/communeBoundary'
import type { Geometry } from '../../types/common/base'

/**
 * Ranh giới (Polygon/MultiPolygon) của địa bàn `communeId`; không truyền thì gộp mọi địa bàn của tài khoản.
 * Tự tải một lần từ GET /map/communes; chưa có ranh giới thì trả null để nơi dùng quay về khung bbox.
 */
export function useCommuneBoundary(communeId?: string | null): Geometry | null {
  const dispatch = useDispatch<AppDispatch>()
  const { communeBoundaries, isLoadingBoundaries, boundariesLoaded } = useSelector((state: RootState) => state.map)

  useEffect(() => {
    if (!boundariesLoaded && !isLoadingBoundaries) dispatch(fetchCommuneBoundariesRequest())
  }, [boundariesLoaded, isLoadingBoundaries, dispatch])

  return useMemo(() => {
    const matched = communeId
      ? communeBoundaries.filter((f) => f.properties?.commune_id === communeId)
      : communeBoundaries
    return mergeGeometries(matched.map((f) => f.geometry))
  }, [communeBoundaries, communeId])
}
