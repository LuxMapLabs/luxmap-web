/**
 * Administrative units dictionary for Cu Chi District, Ho Chi Minh City.
 * Used for GIS data normalization and user-friendly commune name display.
 *
 * NOTE: Temporarily mocked on Frontend because Backend does not yet have a dedicated
 * commune master API endpoint. Once Backend provides GET /api/v1/administrative/communes,
 * this static dictionary will be replaced with dynamic API fetching.
 */
export const CU_CHI_COMMUNES_MAP: Record<string, string> = {
  'COM-001': 'Thị trấn Củ Chi',
  'COM-002': 'Xã Tân An Hội',
  'COM-003': 'Xã Phước Vĩnh An',
  'COM-004': 'Xã Tân Thông Hội',
  'COM-005': 'Xã Phú Hòa Đông',
  'COM-006': 'Xã Tân Thạnh Đông',
  'COM-007': 'Xã Tân Thạnh Tây',
  'COM-008': 'Xã Trung Lập Hạ',
  'COM-009': 'Xã Trung Lập Thượng',
  'COM-010': 'Xã An Nhơn Tây',
  'COM-011': 'Xã An Phú',
  'COM-012': 'Xã Phú Mỹ Hưng',
  'COM-013': 'Xã Nhuận Đức',
  'COM-014': 'Xã Phạm Văn Cội',
  'COM-015': 'Xã Thái Mỹ',
  'COM-016': 'Xã Phước Hiệp',
  'COM-017': 'Xã Phước Thạnh',
  'COM-018': 'Xã Hòa Phú',
  'COM-019': 'Xã Bình Mỹ',
  'COM-020': 'Xã Trung An',
  'COM-021': 'Xã Tân Phú Trung',
  cuchi_01: 'Thị trấn Củ Chi',
}

/**
 * Lấy tên xã thân thiện từ mã commune_id
 */
export function getCommuneName(communeId?: string | null): string {
  if (!communeId) return 'Chưa gán địa bàn'
  const trimmed = communeId.trim()
  return CU_CHI_COMMUNES_MAP[trimmed] || trimmed
}

/**
 * Hiển thị tên xã kèm ID: "Thị trấn Củ Chi (COM-001)"
 */
export function formatCommuneDisplayName(communeId?: string | null): string {
  if (!communeId) return 'Chưa gán địa bàn'
  const trimmed = communeId.trim()
  const name = CU_CHI_COMMUNES_MAP[trimmed]
  if (name && name !== trimmed) {
    return `${name} (${trimmed})`
  }
  return trimmed
}

/**
 * Trả về tên địa bàn thân thiện (chuỗi tiếng Việt chuẩn).
 * Ưu tiên commune_name từ Backend, nếu chưa có thì tra cứu CU_CHI_COMMUNES_MAP.
 * Tuyệt đối KHÔNG hiển thị mã ID thô (COM-001, UUID) lên giao diện người dùng.
 */
export function formatFriendlyCommuneName(
  communeName?: string | null,
  communeId?: string | null,
  fallback: string = '—'
): string {
  if (communeName && communeName.trim()) {
    return communeName.trim()
  }
  if (communeId && communeId.trim()) {
    const trimmedId = communeId.trim()
    const mapped = CU_CHI_COMMUNES_MAP[trimmedId]
    if (mapped) {
      return mapped
    }
  }
  return fallback
}
