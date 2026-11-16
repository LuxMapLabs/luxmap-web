/**
 * Tìm tài sản theo mã nội bộ trước, chỉ khi không có mới so mã hiển thị (`external_ref`, không phân biệt hoa thường).
 *
 * Không gộp hai điều kiện vào một `find(a || b)`: mã nội bộ của dòng này có thể trùng mã hiển thị của dòng khác
 * (tuyến SEG-003 nội bộ là "Tuyến B", còn "Tuyến C" mang mã hiển thị SEG-003) — `find` gặp dòng nào trước thì lấy dòng đó.
 */
export function findByIdOrRef<T extends { external_ref?: string | null }>(
  items: readonly T[],
  getId: (item: T) => string | null | undefined,
  value: string | null | undefined
): T | undefined {
  if (!value) return undefined
  const byId = items.find((item) => getId(item) === value)
  if (byId) return byId
  const ref = value.toLowerCase()
  return items.find((item) => item.external_ref?.toLowerCase() === ref)
}

/**
 * Tủ điện của một cột: theo mã tủ của cột, rồi tủ có mạch của cột (mã mạch cũ trùng mã tủ cũng tính),
 * cuối cùng mới so mã hiển thị — cùng lý do với `findByIdOrRef`.
 */
export function cabinetOfPole<
  C extends { cabinet_id?: string | null; external_ref?: string | null; feeder_ids?: readonly string[] | null },
>(cabinets: readonly C[], pole: { cabinet_id?: string | null; feeder_id?: string | null }): C | undefined {
  const { cabinet_id: cabinetId, feeder_id: feederId } = pole
  return (
    (cabinetId ? cabinets.find((c) => c.cabinet_id === cabinetId) : undefined) ??
    (feederId ? cabinets.find((c) => c.cabinet_id === feederId || !!c.feeder_ids?.includes(feederId)) : undefined) ??
    findByIdOrRef(cabinets, (c) => c.cabinet_id, cabinetId) ??
    findByIdOrRef(cabinets, (c) => c.cabinet_id, feederId)
  )
}
