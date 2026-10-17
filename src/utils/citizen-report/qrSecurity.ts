import type { PoleListItem } from '../../types/assets/poles'
import type { SegmentListItem } from '../../types/assets/segments'

/**
 * DTO thông tin cột đèn giải mã từ mã QR (Local UI Entity)
 * Tái sử dụng trực tiếp các trường định danh từ PoleListItem và SegmentListItem
 * pole_code đại diện cho external_ref của cột đèn ngoài thực địa.
 */
export interface DecryptedPoleInfo {
  pole_code: NonNullable<PoleListItem['external_ref']>
  segment_name: NonNullable<SegmentListItem['segment_name']>
  commune_name: NonNullable<PoleListItem['commune_id']>
  issued_at?: number
}

export interface GeneratePoleQrTokenParams {
  pole_code: NonNullable<PoleListItem['external_ref']>
  segment_name?: SegmentListItem['segment_name']
  commune_name?: PoleListItem['commune_id']
}

/**
 * Hàm giải mã token dự phòng cho CitizenReportSaga (Stub không dùng CryptoJS)
 * Nếu token có định dạng Base64 hoặc chuỗi URL-encoded delimiter, parse an toàn.
 */
export function decryptPoleQrToken(lux: string | null | undefined): DecryptedPoleInfo | null {
  if (!lux || typeof lux !== 'string') return null
  const cleanLux = lux.trim()
  if (!cleanLux) return null

  try {
    let decoded = ''
    try {
      let base64 = cleanLux.replace(/-/g, '+').replace(/_/g, '/')
      while (base64.length % 4 !== 0) {
        base64 += '='
      }
      decoded = atob(base64)
    } catch {
      decoded = cleanLux
    }

    if (decoded.includes('~')) {
      const parts = decoded.replace(/^LUX#/, '').split('~')
      if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
        return {
          pole_code: parts[0],
          segment_name: parts[1],
          commune_name: parts[2],
          issued_at: Math.floor(Date.now() / 1000),
        }
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Hàm wrapper tương thích ngược với CitizenReportSaga
 */
export function decryptAndVerifyQrToken(luxParam: string | null | undefined): DecryptedPoleInfo | null {
  return decryptPoleQrToken(luxParam)
}

/**
 * Hàm loại bỏ dấu Tiếng Việt sang ký tự ASCII tiêu chuẩn
 * Giúp văn bản hiển thị sạch sẽ, chính xác 100% trong file PDF khi dùng font chuẩn (Helvetica) của jsPDF
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}
